package com.aiproj.mobile.ui.screens.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskRequest
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 任务编辑/创建 ViewModel
 */
@HiltViewModel
class TaskEditViewModel @Inject constructor(
    private val taskRepository: TaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskEditUiState())
    val uiState: StateFlow<TaskEditUiState> = _uiState.asStateFlow()

    private var currentTaskId: Int? = null

    /**
     * 加载任务(编辑模式)
     */
    fun loadTask(taskId: Int) {
        currentTaskId = taskId
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = taskRepository.getTaskById(taskId)
            result.onSuccess { task ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        title = task.title,
                        description = task.description ?: "",
                        status = task.status ?: TaskStatus.TODO,
                        priority = task.priority,
                        dueDate = task.dueDate
                    )
                }
            }
            result.onFailure { error ->
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
     * 更新标题
     */
    fun updateTitle(title: String) {
        _uiState.update {
            it.copy(
                title = title,
                titleError = if (title.isBlank()) "标题不能为空" else null
            )
        }
    }

    /**
     * 更新描述
     */
    fun updateDescription(description: String) {
        _uiState.update { it.copy(description = description) }
    }

    /**
     * 更新状态
     */
    fun updateStatus(status: TaskStatus) {
        _uiState.update { it.copy(status = status) }
    }

    /**
     * 更新优先级
     */
    fun updatePriority(priority: TaskPriority?) {
        _uiState.update { it.copy(priority = priority) }
    }

    /**
     * 更新截止日期
     */
    fun updateDueDate(dueDate: String) {
        _uiState.update { it.copy(dueDate = dueDate) }
    }

    /**
     * 切换状态下拉菜单
     */
    fun toggleStatusDropdown() {
        _uiState.update { it.copy(showStatusDropdown = !it.showStatusDropdown) }
    }

    /**
     * 切换优先级下拉菜单
     */
    fun togglePriorityDropdown() {
        _uiState.update { it.copy(showPriorityDropdown = !it.showPriorityDropdown) }
    }

    /**
     * 保存任务
     */
    fun saveTask(onSuccess: () -> Unit) {
        val state = _uiState.value

        // 验证
        if (state.title.isBlank()) {
            _uiState.update { it.copy(titleError = "标题不能为空") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val request = TaskRequest(
                title = state.title,
                description = state.description.ifBlank { null },
                status = state.status,
                priority = state.priority,
                dueDate = state.dueDate
            )

            val result = if (currentTaskId != null) {
                // 更新任务
                taskRepository.updateTask(
                    taskId = currentTaskId!!,
                    request = request
                )
            } else {
                // 创建任务
                taskRepository.createTask(request)
            }

            result.onSuccess {
                _uiState.update { it.copy(isSaving = false) }
                onSuccess()
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = error.message ?: "保存失败"
                    )
                }
            }
        }
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

/**
 * 任务编辑 UI 状态
 */
data class TaskEditUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val title: String = "",
    val description: String = "",
    val status: TaskStatus = TaskStatus.TODO,
    val priority: TaskPriority? = null,
    val dueDate: String? = null,
    val titleError: String? = null,
    val showStatusDropdown: Boolean = false,
    val showPriorityDropdown: Boolean = false,
    val error: String? = null
)
