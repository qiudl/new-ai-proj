package com.aiproj.mobile.ui.screens.projects

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.Task
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

    private val _uiState = MutableStateFlow(ProjectDetailUiState())
    val uiState: StateFlow<ProjectDetailUiState> = _uiState.asStateFlow()

    // 视图模式
    private val _viewMode = MutableStateFlow(ViewMode.DETAIL)
    val viewMode: StateFlow<ViewMode> = _viewMode.asStateFlow()

    init {
        loadProjectDetail()
    }

    /**
     * 加载项目详情
     */
    fun loadProjectDetail() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // 并行加载项目详情和任务列表
            val projectDeferred = async { projectRepository.getProjectById(projectId) }
            val tasksDeferred = async {
                taskRepository.getTasks(
                    page = 1,
                    limit = 100,
                    projectId = projectId
                ).first()
            }

            val projectResult = projectDeferred.await()
            val tasksResult = tasksDeferred.await()

            projectResult.onSuccess { project ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        project = project,
                        tasks = tasksResult.getOrNull()?.tasks ?: emptyList(),
                        error = null
                    )
                }
            }

            projectResult.onFailure { error ->
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
     * 切换视图模式
     */
    fun switchViewMode(mode: ViewMode) {
        _viewMode.update { mode }
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
    val isLoading: Boolean = false,
    val project: Project? = null,
    val tasks: List<Task> = emptyList(),
    val error: String? = null
)

/**
 * 视图模式
 */
enum class ViewMode {
    DETAIL,  // 详情视图
    KANBAN   // 看板视图
}
