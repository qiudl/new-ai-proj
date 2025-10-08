package com.aiproj.mobile.ui.screens.analytics

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TaskStatusDetailViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    // 从导航参数获取
    private val status: String = savedStateHandle["status"] ?: ""
    private val startDate: String = savedStateHandle["startDate"] ?: ""
    private val endDate: String = savedStateHandle["endDate"] ?: ""
    private val projectId: Int? = savedStateHandle.get<Int>("projectId")?.takeIf { it > 0 }

    private val _uiState = MutableStateFlow(TaskStatusDetailUiState())
    val uiState: StateFlow<TaskStatusDetailUiState> = _uiState.asStateFlow()

    init {
        Log.d(TAG, "TaskStatusDetailViewModel initialized")
        Log.d(TAG, "Status: $status, DateRange: $startDate ~ $endDate, ProjectId: $projectId")
        loadTasks()
    }

    fun loadTasks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                Log.d(TAG, "Loading tasks with status: $status")

                // 将状态字符串转换为TaskStatus枚举
                val taskStatus = when (status) {
                    "completed" -> com.aiproj.mobile.data.models.TaskStatus.COMPLETED
                    "in_progress" -> com.aiproj.mobile.data.models.TaskStatus.IN_PROGRESS
                    "todo" -> com.aiproj.mobile.data.models.TaskStatus.TODO
                    else -> null
                }

                taskRepository.getTasks(
                    page = 1,
                    limit = 100,
                    status = taskStatus,
                    projectId = projectId,
                    sortBy = "updated_at",
                    sortOrder = "desc"
                ).collect { result ->
                    result.fold(
                        onSuccess = { response ->
                            val taskList = response.data?.data ?: emptyList()
                            val totalCount = response.data?.pagination?.total ?: 0
                            Log.d(TAG, "Tasks loaded: ${taskList.size}, Total: $totalCount")
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    tasks = taskList,
                                    totalCount = totalCount
                                )
                            }
                        },
                        onFailure = { error ->
                            Log.e(TAG, "Failed to load tasks", error)
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    error = error.message ?: "加载失败"
                                )
                            }
                        }
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception loading tasks", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "加载失败"
                    )
                }
            }
        }
    }

    fun refresh() {
        Log.d(TAG, "Refreshing tasks...")
        loadTasks()
    }

    /**
     * 获取页面标题
     */
    fun getPageTitle(): String {
        return when (status) {
            "completed" -> "已完成任务"
            "in_progress" -> "进行中任务"
            "todo" -> "待办任务"
            else -> "任务列表"
        }
    }

    /**
     * 获取日期范围文本
     */
    fun getDateRangeText(): String {
        return if (startDate == endDate) {
            startDate
        } else {
            "$startDate ~ $endDate"
        }
    }

    companion object {
        private const val TAG = "TaskStatusDetailVM"
    }
}

/**
 * 任务状态详情页UI状态
 */
data class TaskStatusDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val tasks: List<Task> = emptyList(),
    val totalCount: Int = 0
)
