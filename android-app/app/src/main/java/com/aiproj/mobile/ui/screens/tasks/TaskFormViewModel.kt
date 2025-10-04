package com.aiproj.mobile.ui.screens.tasks

import androidx.lifecycle.SavedStateHandle
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
 * 任务表单 ViewModel（创建/编辑）
 */
@HiltViewModel
class TaskFormViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val taskId: Int? = savedStateHandle["taskId"]
    val isEditMode: Boolean = taskId != null

    private val _uiState = MutableStateFlow(TaskFormUiState())
    val uiState: StateFlow<TaskFormUiState> = _uiState.asStateFlow()

    init {
        if (isEditMode && taskId != null) {
            loadTask(taskId)
        }
    }

    /**
     * 加载任务（编辑模式）
     */
    private fun loadTask(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = taskRepository.getTaskById(id)

            result.onSuccess { task ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        title = task.title,
                        description = task.description ?: "",
                        status = task.status,
                        priority = task.priority,
                        projectId = task.projectId?.toString() ?: "",
                        dueDate = task.dueDate ?: "",
                        error = null
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
    fun onTitleChanged(title: String) {
        _uiState.update { it.copy(title = title) }
    }

    /**
     * 更新描述
     */
    fun onDescriptionChanged(description: String) {
        _uiState.update { it.copy(description = description) }
    }

    /**
     * 更新状态
     */
    fun onStatusChanged(status: TaskStatus) {
        _uiState.update { it.copy(status = status) }
    }

    /**
     * 更新优先级
     */
    fun onPriorityChanged(priority: TaskPriority?) {
        _uiState.update { it.copy(priority = priority) }
    }

    /**
     * 更新项目ID
     */
    fun onProjectIdChanged(projectId: String) {
        _uiState.update { it.copy(projectId = projectId) }
    }

    /**
     * 更新截止日期
     */
    fun onDueDateChanged(dueDate: String) {
        _uiState.update { it.copy(dueDate = dueDate) }
    }

    /**
     * 保存任务
     */
    fun saveTask(onSuccess: () -> Unit) {
        val state = _uiState.value

        // 验证
        if (state.title.isBlank()) {
            _uiState.update { it.copy(error = "请输入任务标题") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val request = TaskRequest(
                title = state.title,
                description = state.description.ifBlank { null },
                status = state.status,
                priority = state.priority,
                projectId = state.projectId.toIntOrNull(),
                dueDate = state.dueDate.ifBlank { null }
            )

            val result = if (isEditMode && taskId != null) {
                // 编辑模式
                taskRepository.updateTask(taskId, request)
            } else {
                // 创建模式
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
 * 任务表单 UI 状态
 */
data class TaskFormUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val title: String = "",
    val description: String = "",
    val status: TaskStatus = TaskStatus.TODO,
    val priority: TaskPriority? = null,
    val projectId: String = "",
    val dueDate: String = "",
    val error: String? = null
)
