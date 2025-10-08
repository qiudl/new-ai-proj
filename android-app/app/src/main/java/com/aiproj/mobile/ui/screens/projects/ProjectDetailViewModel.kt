package com.aiproj.mobile.ui.screens.projects

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.repository.ProjectRepository
import com.aiproj.mobile.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 项目详情 ViewModel
 */
@HiltViewModel
class ProjectDetailViewModel @Inject constructor(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val projectId: Int = checkNotNull(savedStateHandle["projectId"])
    private val TAG = "ProjectDetailVM"

    private val _uiState = MutableStateFlow(ProjectDetailUiState())
    val uiState: StateFlow<ProjectDetailUiState> = _uiState.asStateFlow()

    init {
        Log.d(TAG, "Init with projectId: $projectId")
        loadProjectDetail()
        loadProjectTasks()
    }

    /**
     * 加载项目详情
     */
    fun loadProjectDetail() {
        viewModelScope.launch {
            Log.d(TAG, "Loading project detail for ID: $projectId")
            _uiState.update { it.copy(isLoadingProject = true, error = null) }

            val projectResult = projectRepository.getProjectById(projectId)

            projectResult.onSuccess { project ->
                Log.d(TAG, "Project loaded successfully: ${project.name}")
                _uiState.update {
                    it.copy(
                        isLoadingProject = false,
                        project = project,
                        error = null
                    )
                }
            }

            projectResult.onFailure { error ->
                Log.e(TAG, "Failed to load project", error)
                _uiState.update {
                    it.copy(
                        isLoadingProject = false,
                        error = error.message ?: "加载失败,请重试"
                    )
                }
            }
        }
    }

    /**
     * 加载项目任务列表
     */
    fun loadProjectTasks() {
        viewModelScope.launch {
            Log.d(TAG, "Loading tasks for project ID: $projectId")
            _uiState.update { it.copy(isLoadingTasks = true) }

            taskRepository.getTasks(
                page = 1,
                limit = 100,
                projectId = projectId
            ).first().onSuccess { taskListResponse ->
                val tasks = taskListResponse.data?.tasks ?: emptyList()
                Log.d(TAG, "Tasks loaded successfully: ${tasks.size} tasks")
                _uiState.update {
                    it.copy(
                        isLoadingTasks = false,
                        tasks = tasks,
                        totalTaskCount = taskListResponse.data?.pagination?.total ?: 0,
                        filteredTasks = tasks
                    )
                }
            }.onFailure { error ->
                Log.e(TAG, "Failed to load tasks", error)
                _uiState.update {
                    it.copy(
                        isLoadingTasks = false,
                        error = error.message ?: "加载任务失败"
                    )
                }
            }
        }
    }

    /**
     * 搜索任务
     */
    fun searchTasks(query: String) {
        _uiState.update { it.copy(taskSearchQuery = query) }
        applyTaskFilter()
    }

    /**
     * 按状态过滤任务
     */
    fun filterTasksByStatus(status: TaskStatus?) {
        _uiState.update { it.copy(selectedTaskStatus = status) }
        applyTaskFilter()
    }

    /**
     * 应用任务过滤
     */
    private fun applyTaskFilter() {
        val currentState = _uiState.value
        val filtered = currentState.tasks.filter { task ->
            // 状态过滤
            val matchesStatus = currentState.selectedTaskStatus == null ||
                              task.status == currentState.selectedTaskStatus

            // 搜索过滤
            val matchesSearch = currentState.taskSearchQuery.isBlank() ||
                               task.title.contains(currentState.taskSearchQuery, ignoreCase = true) ||
                               task.description?.contains(currentState.taskSearchQuery, ignoreCase = true) == true

            matchesStatus && matchesSearch
        }

        _uiState.update { it.copy(filteredTasks = filtered) }
    }

    /**
     * 清除任务搜索
     */
    fun clearTaskSearch() {
        _uiState.update { it.copy(taskSearchQuery = "") }
        applyTaskFilter()
    }

    /**
     * 选择Tab
     */
    fun selectTab(tabIndex: Int) {
        _uiState.update { it.copy(selectedTabIndex = tabIndex) }
    }

    /**
     * 删除项目
     */
    fun deleteProject(onSuccess: () -> Unit) {
        viewModelScope.launch {
            val result = projectRepository.deleteProject(projectId)
            result.onSuccess {
                onSuccess()
            }
            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = error.message ?: "删除失败")
                }
            }
        }
    }

    /**
     * 刷新
     */
    fun refresh() {
        loadProjectDetail()
        loadProjectTasks()
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

/**
 * 项目详情 UI 状态
 */
data class ProjectDetailUiState(
    val isLoadingProject: Boolean = false,
    val project: Project? = null,
    val isLoadingTasks: Boolean = false,
    val tasks: List<Task> = emptyList(),
    val totalTaskCount: Int = 0,
    val taskSearchQuery: String = "",
    val selectedTaskStatus: TaskStatus? = null,
    val filteredTasks: List<Task> = emptyList(),
    val selectedTabIndex: Int = 0,
    val error: String? = null
)

/**
 * 项目详情 Tab
 */
enum class ProjectDetailTab(val title: String) {
    TASKS("任务"),
    STATISTICS("统计"),
    MEMBERS("成员")
}
