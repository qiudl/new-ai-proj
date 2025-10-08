package com.aiproj.mobile.ui.screens.tasks

import android.util.Log
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
 * 任务编辑/创建 ViewModel
 */
@HiltViewModel
class TaskEditViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository
) : ViewModel() {

    companion object {
        private const val TAG = "TaskEditViewModel"
    }

    private val _uiState = MutableStateFlow(TaskEditUiState())
    val uiState: StateFlow<TaskEditUiState> = _uiState.asStateFlow()

    // 项目列表
    private val _projects = MutableStateFlow<List<Project>>(emptyList())
    val projects: StateFlow<List<Project>> = _projects.asStateFlow()

    // 项目加载状态
    private val _projectsLoading = MutableStateFlow(false)
    val projectsLoading: StateFlow<Boolean> = _projectsLoading.asStateFlow()

    private var currentTaskId: Int? = null
    private var originalProjectId: Int? = null
    private var initialProjectId: Int? = null

    init {
        // 页面打开时加载项目列表
        loadProjects()
    }

    /**
     * 设置初始项目ID（创建模式使用）
     */
    fun setInitialProjectId(projectId: Int?) {
        initialProjectId = projectId
        if (currentTaskId == null) { // 仅在创建模式下更新UI状态
            _uiState.update { it.copy(projectId = projectId) }
        }
    }

    /**
     * 加载任务(编辑模式)
     */
    fun loadTask(taskId: Int) {
        currentTaskId = taskId
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = taskRepository.getTaskById(taskId)
            result.onSuccess { task ->
                // 保存原始projectId
                originalProjectId = task.projectId

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        title = task.title,
                        description = task.description ?: "",
                        status = task.status ?: TaskStatus.TODO,
                        priority = task.priority,
                        projectId = task.projectId,
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
     * 更新项目ID
     */
    fun updateProjectId(projectId: Int?) {
        _uiState.update { it.copy(projectId = projectId) }
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
     * 切换项目下拉菜单
     */
    fun toggleProjectDropdown() {
        _uiState.update { it.copy(showProjectDropdown = !it.showProjectDropdown) }
    }

    /**
     * 加载项目列表
     */
    fun loadProjects() {
        viewModelScope.launch {
            Log.d(TAG, "loadProjects: Starting...")
            _projectsLoading.value = true

            try {
                val result = projectRepository.getProjectsCached(
                    page = 1,
                    pageSize = 50, // 加载足够多的项目
                    status = "active", // 只加载活跃项目
                    forceRefresh = false
                )

                result.onSuccess { data ->
                    _projects.value = data.data
                    Log.d(TAG, "loadProjects: Success - loaded ${data.data.size} projects")

                    // 如果是创建模式且没有设置projectId，选择第一个项目作为默认值
                    if (currentTaskId == null && _uiState.value.projectId == null && data.data.isNotEmpty()) {
                        Log.d(TAG, "loadProjects: Auto-selecting first project: ${data.data.first().name}")
                        _uiState.update { it.copy(projectId = data.data.first().id) }
                    }
                }.onFailure { error ->
                    Log.e(TAG, "loadProjects: Failed - ${error.message}", error)
                    _uiState.update {
                        it.copy(error = error.message ?: "加载项目列表失败")
                    }
                }
            } finally {
                _projectsLoading.value = false
            }
        }
    }

    /**
     * 保存任务
     */
    fun saveTask(onSuccess: () -> Unit) {
        val state = _uiState.value

        // 验证标题
        if (state.title.isBlank()) {
            _uiState.update { it.copy(titleError = "标题不能为空") }
            return
        }

        // 验证并获取projectId
        // 优先级: UI状态中的projectId → 编辑模式的原始projectId → 初始projectId → 默认projectId(1)
        val projectIdToUse = state.projectId
            ?: originalProjectId
            ?: initialProjectId
            ?: 1 // 默认使用项目1

        if (projectIdToUse <= 0) {
            _uiState.update { it.copy(error = "项目ID无效，无法保存任务") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val request = TaskRequest(
                title = state.title,
                description = state.description.ifBlank { null },
                status = state.status,
                priority = state.priority,
                projectId = projectIdToUse,
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
    val projectId: Int? = null,
    val dueDate: String? = null,
    val titleError: String? = null,
    val showStatusDropdown: Boolean = false,
    val showPriorityDropdown: Boolean = false,
    val showProjectDropdown: Boolean = false,
    val error: String? = null
)
