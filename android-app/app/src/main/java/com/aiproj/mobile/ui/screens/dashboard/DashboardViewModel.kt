package com.aiproj.mobile.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.DashboardData
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TimeLog
import com.aiproj.mobile.data.repository.DashboardRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Dashboard ViewModel
 */
@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val dashboardRepository: DashboardRepository,
    private val timeLogRepository: com.aiproj.mobile.data.repository.TimeLogRepository,
    private val dailyFocusTaskRepository: com.aiproj.mobile.data.repository.DailyFocusTaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboardData()
    }

    /**
     * 加载 Dashboard 数据
     * @param forceRefresh 是否强制刷新，跳过缓存
     */
    fun loadDashboardData(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = dashboardRepository.getDashboardData(forceRefresh)

            result.onSuccess { data ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        dashboardData = data,
                        error = null
                    )
                }
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "加载失败，请重试"
                    )
                }
            }
        }
    }

    /**
     * 刷新数据（强制从网络加载）
     */
    fun refresh() {
        loadDashboardData(forceRefresh = true)
    }

    /**
     * 清除错误信息
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 开始任务计时
     */
    fun startTaskTimer(taskId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            try {
                // 调用Repository开始计时
                val result = timeLogRepository.startTimer(
                    taskId = taskId.toLong(),
                    description = null
                )

                result.onSuccess {
                    // 成功后刷新Dashboard数据
                    refresh()
                }

                result.onFailure { error ->
                    _uiState.update {
                        it.copy(error = "启动计时失败: ${error.message}")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = "启动计时失败: ${e.message}")
                }
            }
        }
    }

    /**
     * 停止当前计时器
     */
    fun stopTimer() {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            try {
                // 调用Repository停止计时
                val result = timeLogRepository.stopCurrentTimer()

                result.onSuccess {
                    // 成功后刷新Dashboard数据
                    refresh()
                }

                result.onFailure { error ->
                    _uiState.update {
                        it.copy(error = "停止计时失败: ${error.message}")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = "停止计时失败: ${e.message}")
                }
            }
        }
    }

    /**
     * 更新当前计时器状态（轻量级更新，不刷新全部数据）
     */
    fun updateCurrentTimer(timer: TimeLog?) {
        _uiState.update { state ->
            state.dashboardData?.let { data ->
                state.copy(
                    dashboardData = data.copy(currentTimer = timer)
                )
            } ?: state
        }
    }

    /**
     * 完成焦点任务
     */
    fun completeDailyFocusTask(focusTaskId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            try {
                val result = dailyFocusTaskRepository.completeDailyFocusTask(focusTaskId)

                result.onSuccess {
                    // 成功后刷新Dashboard数据
                    refresh()
                }

                result.onFailure { error ->
                    _uiState.update {
                        it.copy(error = "完成任务失败: ${error.message}")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = "完成任务失败: ${e.message}")
                }
            }
        }
    }

    /**
     * 添加任务到焦点列表
     */
    fun addTaskToFocus(taskId: Int, priorityLevel: String = "medium") {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            try {
                val result = dailyFocusTaskRepository.createDailyFocusTask(
                    taskId = taskId,
                    priorityLevel = priorityLevel
                )

                result.onSuccess {
                    // 成功后刷新Dashboard数据
                    refresh()
                }

                result.onFailure { error ->
                    _uiState.update {
                        it.copy(error = "添加焦点任务失败: ${error.message}")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = "添加焦点任务失败: ${e.message}")
                }
            }
        }
    }

    /**
     * 删除焦点任务
     */
    fun removeDailyFocusTask(focusTaskId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            try {
                val result = dailyFocusTaskRepository.deleteDailyFocusTask(focusTaskId)

                result.onSuccess {
                    // 成功后刷新Dashboard数据
                    refresh()
                }

                result.onFailure { error ->
                    _uiState.update {
                        it.copy(error = "删除焦点任务失败: ${error.message}")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = "删除焦点任务失败: ${e.message}")
                }
            }
        }
    }
}

/**
 * Dashboard UI 状态
 */
data class DashboardUiState(
    val isLoading: Boolean = false,
    val dashboardData: DashboardData? = null,
    val error: String? = null
) {
    val stats get() = dashboardData?.stats
    val priorityTasks: List<Task> get() = dashboardData?.priorityTasks ?: emptyList()
    val recentProjects: List<Project> get() = dashboardData?.recentProjects ?: emptyList()
    val currentTimer: TimeLog? get() = dashboardData?.currentTimer
    val dailyFocusTasks get() = dashboardData?.dailyFocusTasks ?: emptyList()
    val focusTaskSuggestions get() = dashboardData?.focusTaskSuggestions ?: emptyList()
}
