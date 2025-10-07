package com.aiproj.mobile.ui.screens.tasks

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskRequest
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.repository.ProjectRepository
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
    private val projectRepository: ProjectRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val taskId: Int? = savedStateHandle.get<Int>("taskId")?.takeIf { it > 0 }
    val isEditMode: Boolean = taskId != null

    private val _uiState = MutableStateFlow(TaskFormUiState())
    val uiState: StateFlow<TaskFormUiState> = _uiState.asStateFlow()

    private val _projects = MutableStateFlow<List<Project>>(emptyList())
    val projects: StateFlow<List<Project>> = _projects.asStateFlow()

    init {
        loadProjects()
        if (isEditMode && taskId != null) {
            loadTask(taskId)
        }
    }

    /**
     * 加载项目列表
     */
    private fun loadProjects() {
        viewModelScope.launch {
            projectRepository.getProjects(page = 1, limit = 100).collect { result ->
                result.onSuccess { response ->
                    _projects.value = response.data?.projects ?: emptyList()

                    // 自动设置默认项目ID（仅创建模式）
                    if (!isEditMode && _uiState.value.projectId.isBlank()) {
                        when (_projects.value.size) {
                            1 -> {
                                // 如果只有一个项目，自动选中
                                _uiState.update { it.copy(projectId = _projects.value.first().id.toString()) }
                            }
                            0 -> {
                                // 如果没有项目数据，使用默认项目ID=1
                                _uiState.update { it.copy(projectId = "1") }
                                android.util.Log.w("TaskFormViewModel", "项目列表为空，使用默认projectId=1")
                            }
                            else -> {
                                // 多个项目时，不自动选中，等待用户选择
                                // 但可以选择第一个作为默认值
                                _uiState.update { it.copy(projectId = _projects.value.first().id.toString()) }
                            }
                        }
                    }
                }
                result.onFailure { error ->
                    // 加载失败时设置默认项目ID（仅创建模式）
                    if (!isEditMode && _uiState.value.projectId.isBlank()) {
                        _uiState.update { it.copy(projectId = "1") }
                        android.util.Log.w("TaskFormViewModel", "加载项目列表失败，使用默认projectId=1", error)
                    }
                    android.util.Log.e("TaskFormViewModel", "加载项目列表失败", error)
                }
            }
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
        // 实时验证
        validateProjectId()
    }

    /**
     * 验证项目ID
     */
    private fun validateProjectId(): Boolean {
        val state = _uiState.value
        val projectIdInt = state.projectId.toIntOrNull()

        val error = when {
            state.projectId.isBlank() -> "请选择项目"
            projectIdInt == null || projectIdInt <= 0 -> "项目ID无效"
            else -> null
        }

        _uiState.update { it.copy(projectIdError = error) }
        return error == null
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

        // 验证标题
        if (state.title.isBlank()) {
            _uiState.update { it.copy(error = "请输入任务标题") }
            return
        }

        // 验证项目ID
        if (!validateProjectId()) {
            _uiState.update { it.copy(error = "请选择有效的项目") }
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
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        successMessage = if (isEditMode) "任务更新成功" else "任务创建成功"
                    )
                }
                onSuccess()
            }

            result.onFailure { error ->
                val errorMessage = when {
                    error is java.net.UnknownHostException -> "网络连接失败，请检查网络设置"
                    error is java.net.SocketTimeoutException -> "网络请求超时，请稍后重试"
                    error.message?.contains("400") == true -> "请求参数错误，请检查输入内容"
                    error.message?.contains("401") == true -> "登录已过期，请重新登录"
                    error.message?.contains("403") == true -> "没有权限执行此操作"
                    error.message?.contains("404") == true -> "项目不存在，请选择其他项目"
                    error.message?.contains("500") == true -> "服务器错误，请稍后重试"
                    error.message?.contains("project_id") == true -> "项目ID无效，请重新选择项目"
                    else -> error.message ?: if (isEditMode) "更新任务失败" else "创建任务失败"
                }

                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = errorMessage
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
    val projectIdError: String? = null,
    val dueDate: String = "",
    val error: String? = null,
    val successMessage: String? = null
)
