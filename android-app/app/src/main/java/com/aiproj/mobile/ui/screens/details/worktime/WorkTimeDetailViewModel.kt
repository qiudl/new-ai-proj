package com.aiproj.mobile.ui.screens.details.worktime

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.DetailedWorkTimeStats
import com.aiproj.mobile.data.repository.DetailRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * 工作时长详情页ViewModel
 */
@HiltViewModel
class WorkTimeDetailViewModel @Inject constructor(
    private val detailRepository: DetailRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkTimeDetailUiState())
    val uiState: StateFlow<WorkTimeDetailUiState> = _uiState.asStateFlow()

    init {
        loadWorkTimeStats()
    }

    /**
     * 加载工作时长统计
     */
    fun loadWorkTimeStats() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val (startDate, endDate) = calculateDateRange(_uiState.value.selectedTimeRange)

            val result = detailRepository.getWorkTimeStats(
                startDate = startDate,
                endDate = endDate,
                granularity = "day"
            )

            result.onSuccess { data ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        workTimeStats = data,
                        error = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "加载失败"
                    )
                }
            }
        }
    }

    /**
     * 刷新数据
     */
    fun refreshData() {
        loadWorkTimeStats()
    }

    /**
     * 更新时间范围
     */
    fun updateTimeRange(range: TimeRange) {
        _uiState.update { it.copy(selectedTimeRange = range) }
        loadWorkTimeStats()
    }

    /**
     * 计算日期范围
     */
    private fun calculateDateRange(range: TimeRange): Pair<String, String> {
        val today = LocalDate.now()
        return when (range) {
            TimeRange.LAST_7_DAYS -> {
                val start = today.minusDays(6)
                start.toString() to today.toString()
            }
            TimeRange.LAST_30_DAYS -> {
                val start = today.minusDays(29)
                start.toString() to today.toString()
            }
            TimeRange.CUSTOM -> {
                // TODO: 实现自定义日期选择
                today.minusDays(6).toString() to today.toString()
            }
        }
    }
}

/**
 * UI状态
 */
data class WorkTimeDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val workTimeStats: DetailedWorkTimeStats? = null,
    val selectedTimeRange: TimeRange = TimeRange.LAST_7_DAYS
)

/**
 * 时间范围枚举
 */
enum class TimeRange {
    LAST_7_DAYS,
    LAST_30_DAYS,
    CUSTOM
}
