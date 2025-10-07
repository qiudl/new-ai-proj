package com.aiproj.mobile.ui.screens.timer.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.aiproj.mobile.data.models.TimeStatsData
import com.aiproj.mobile.data.models.TimerLog
import com.aiproj.mobile.data.repository.TimerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * 计时器历史记录页ViewModel
 *
 * 功能:
 * 1. 分页加载计时器历史记录
 * 2. 支持日期范围、任务、状态筛选
 * 3. 加载统计数据
 */
@HiltViewModel
class TimerHistoryViewModel @Inject constructor(
    private val timerRepository: TimerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TimerHistoryUiState())
    val uiState: StateFlow<TimerHistoryUiState> = _uiState.asStateFlow()

    // 计时器历史记录分页流
    private val _timerLogs = MutableStateFlow<Flow<PagingData<TimerLog>>?>(null)
    val timerLogs: StateFlow<Flow<PagingData<TimerLog>>?> = _timerLogs.asStateFlow()

    init {
        loadTimerHistory()
        loadStats()
    }

    /**
     * 加载计时器历史记录
     */
    fun loadTimerHistory() {
        val currentFilter = _uiState.value.filter

        _timerLogs.value = timerRepository.getTimerHistoryPager(
            startDate = currentFilter.startDate,
            endDate = currentFilter.endDate,
            taskId = currentFilter.taskId,
            status = currentFilter.status
        ).cachedIn(viewModelScope)
    }

    /**
     * 加载统计数据
     */
    fun loadStats() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingStats = true) }

            val result = timerRepository.getTimerHistoryStats(
                startDate = _uiState.value.filter.startDate,
                endDate = _uiState.value.filter.endDate
            )

            result.onSuccess { stats ->
                _uiState.update {
                    it.copy(
                        stats = stats,
                        isLoadingStats = false,
                        statsError = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoadingStats = false,
                        statsError = error.message ?: "加载统计数据失败"
                    )
                }
            }
        }
    }

    /**
     * 更新筛选条件
     */
    fun updateFilter(newFilter: TimerHistoryFilter) {
        _uiState.update { it.copy(filter = newFilter) }
        loadTimerHistory()
        loadStats()
    }

    /**
     * 设置日期范围
     */
    fun setDateRange(startDate: String?, endDate: String?) {
        val newFilter = _uiState.value.filter.copy(
            startDate = startDate,
            endDate = endDate
        )
        updateFilter(newFilter)
    }

    /**
     * 设置任务筛选
     */
    fun setTaskFilter(taskId: Long?) {
        val newFilter = _uiState.value.filter.copy(taskId = taskId)
        updateFilter(newFilter)
    }

    /**
     * 设置状态筛选
     */
    fun setStatusFilter(status: String?) {
        val newFilter = _uiState.value.filter.copy(status = status)
        updateFilter(newFilter)
    }

    /**
     * 清除所有筛选
     */
    fun clearFilters() {
        updateFilter(TimerHistoryFilter())
    }

    /**
     * 快速设置日期范围（今天、本周、本月）
     */
    fun setQuickDateRange(range: DateRange) {
        val today = LocalDate.now()
        val (startDate, endDate) = when (range) {
            DateRange.TODAY -> {
                today.toString() to today.toString()
            }
            DateRange.THIS_WEEK -> {
                val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1)
                startOfWeek.toString() to today.toString()
            }
            DateRange.THIS_MONTH -> {
                val startOfMonth = today.withDayOfMonth(1)
                startOfMonth.toString() to today.toString()
            }
            DateRange.LAST_7_DAYS -> {
                today.minusDays(6).toString() to today.toString()
            }
            DateRange.LAST_30_DAYS -> {
                today.minusDays(29).toString() to today.toString()
            }
            DateRange.ALL -> {
                null to null
            }
        }
        setDateRange(startDate, endDate)
    }
}

/**
 * UI状态
 */
data class TimerHistoryUiState(
    val filter: TimerHistoryFilter = TimerHistoryFilter(),
    val stats: TimeStatsData? = null,
    val isLoadingStats: Boolean = false,
    val statsError: String? = null
)

/**
 * 筛选条件
 */
data class TimerHistoryFilter(
    val startDate: String? = null,
    val endDate: String? = null,
    val taskId: Long? = null,
    val status: String? = null
) {
    /**
     * 是否有活跃的筛选条件
     */
    fun hasActiveFilters(): Boolean {
        return startDate != null || endDate != null || taskId != null || status != null
    }

    /**
     * 获取筛选说明文本
     */
    fun getFilterDescription(): String {
        val parts = mutableListOf<String>()
        if (startDate != null || endDate != null) {
            when {
                startDate != null && endDate != null && startDate == endDate -> {
                    parts.add("日期: $startDate")
                }
                startDate != null && endDate != null -> {
                    parts.add("日期: $startDate 至 $endDate")
                }
                startDate != null -> {
                    parts.add("起始: $startDate")
                }
                endDate != null -> {
                    parts.add("截止: $endDate")
                }
            }
        }
        if (taskId != null) {
            parts.add("任务ID: $taskId")
        }
        if (status != null) {
            parts.add("状态: $status")
        }
        return if (parts.isEmpty()) "全部记录" else parts.joinToString(", ")
    }
}

/**
 * 快速日期范围选项
 */
enum class DateRange {
    TODAY,
    THIS_WEEK,
    THIS_MONTH,
    LAST_7_DAYS,
    LAST_30_DAYS,
    ALL
}
