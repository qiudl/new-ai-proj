package com.aiproj.mobile.ui.screens.details.todaytasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.TodayTasksDetail
import com.aiproj.mobile.data.repository.DetailRepository
import com.aiproj.mobile.data.repository.TimeLogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * 今日任务详情页ViewModel
 */
@HiltViewModel
class TodayTasksDetailViewModel @Inject constructor(
    private val detailRepository: DetailRepository,
    private val timeLogRepository: TimeLogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TodayTasksDetailUiState())
    val uiState: StateFlow<TodayTasksDetailUiState> = _uiState.asStateFlow()

    init {
        loadTodayTasks()
    }

    /**
     * 加载今日任务
     */
    fun loadTodayTasks(date: String = LocalDate.now().toString()) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = detailRepository.getTodayTasksDetail(
                date = date,
                projectId = _uiState.value.selectedProjectId
            )

            result.onSuccess { data ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        todayTasksDetail = data,
                        selectedDate = date,
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
        loadTodayTasks(_uiState.value.selectedDate)
    }

    /**
     * 开始任务计时
     */
    fun startTaskTimer(taskId: Int) {
        viewModelScope.launch {
            val result = timeLogRepository.startTimer(taskId.toLong(), description = "开始任务")
            result.onSuccess { timeLog ->
                // 可选：刷新数据或显示提示
            }.onFailure { error ->
                _uiState.update {
                    it.copy(error = "启动计时失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 更新筛选条件
     */
    fun updateFilter(filter: TaskFilter) {
        _uiState.update { it.copy(currentFilter = filter) }
    }

    /**
     * 切换筛选面板
     */
    fun toggleFilterSheet() {
        _uiState.update { it.copy(isFilterSheetOpen = !it.isFilterSheetOpen) }
    }

    /**
     * 切换优先级图表展开状态
     */
    fun togglePriorityChart() {
        _uiState.update { it.copy(isPriorityChartExpanded = !it.isPriorityChartExpanded) }
    }
}

/**
 * UI状态
 */
data class TodayTasksDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val todayTasksDetail: TodayTasksDetail? = null,
    val selectedDate: String = LocalDate.now().toString(),
    val selectedProjectId: Int? = null,
    val currentFilter: TaskFilter = TaskFilter.ALL,
    val isPriorityChartExpanded: Boolean = true,
    val isFilterSheetOpen: Boolean = false
)

/**
 * 任务筛选器枚举
 */
enum class TaskFilter {
    ALL, COMPLETED, IN_PROGRESS, TODO
}
