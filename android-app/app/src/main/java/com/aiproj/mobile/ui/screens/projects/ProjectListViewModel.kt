package com.aiproj.mobile.ui.screens.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.repository.ProjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 项目列表 ViewModel
 */
@HiltViewModel
class ProjectListViewModel @Inject constructor(
    private val projectRepository: ProjectRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProjectListUiState())
    val uiState: StateFlow<ProjectListUiState> = _uiState.asStateFlow()

    init {
        loadProjects()
    }

    /**
     * 加载项目列表
     */
    fun loadProjects() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            projectRepository.getProjects(
                page = 1,
                limit = 50
            ).collect { result ->
                result.onSuccess { response ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            projects = response.projects,
                            totalCount = response.total,
                            error = null
                        )
                    }
                    applyFiltersAndSort()
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
    }

    /**
     * 搜索项目
     */
    fun searchProjects(query: String) {
        _uiState.update {
            it.copy(searchQuery = query)
        }
        applyFiltersAndSort()
    }

    /**
     * 按状态过滤
     */
    fun filterByStatus(status: String?) {
        _uiState.update {
            it.copy(selectedStatus = status)
        }
        applyFiltersAndSort()
    }

    /**
     * 排序
     */
    fun sortBy(sortType: SortType, order: SortOrder = SortOrder.DESC) {
        _uiState.update {
            it.copy(sortBy = sortType, sortOrder = order)
        }
        applyFiltersAndSort()
    }

    /**
     * 应用过滤和排序
     */
    private fun applyFiltersAndSort() {
        val currentState = _uiState.value
        var filtered = currentState.projects

        // 搜索过滤
        if (currentState.searchQuery.isNotBlank()) {
            filtered = filtered.filter { project ->
                project.name.contains(currentState.searchQuery, ignoreCase = true) ||
                        project.description?.contains(currentState.searchQuery, ignoreCase = true) == true
            }
        }

        // 状态过滤
        if (currentState.selectedStatus != null) {
            filtered = filtered.filter { it.status == currentState.selectedStatus }
        }

        // 排序
        filtered = when (currentState.sortBy) {
            SortType.NAME -> {
                if (currentState.sortOrder == SortOrder.ASC) {
                    filtered.sortedBy { it.name }
                } else {
                    filtered.sortedByDescending { it.name }
                }
            }

            SortType.UPDATE_TIME -> {
                if (currentState.sortOrder == SortOrder.ASC) {
                    filtered.sortedBy { it.updatedAt }
                } else {
                    filtered.sortedByDescending { it.updatedAt }
                }
            }

            SortType.CREATE_TIME -> {
                if (currentState.sortOrder == SortOrder.ASC) {
                    filtered.sortedBy { it.createdAt }
                } else {
                    filtered.sortedByDescending { it.createdAt }
                }
            }

            SortType.TASK_COUNT -> {
                if (currentState.sortOrder == SortOrder.ASC) {
                    filtered.sortedBy { it.taskCount ?: 0 }
                } else {
                    filtered.sortedByDescending { it.taskCount ?: 0 }
                }
            }

            SortType.COMPLETION -> {
                if (currentState.sortOrder == SortOrder.ASC) {
                    filtered.sortedBy { it.completionRate ?: 0f }
                } else {
                    filtered.sortedByDescending { it.completionRate ?: 0f }
                }
            }
        }

        _uiState.update { it.copy(filteredProjects = filtered) }
    }

    /**
     * 刷新列表
     */
    fun refresh() {
        loadProjects()
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 清空搜索
     */
    fun clearSearch() {
        _uiState.update { it.copy(searchQuery = "") }
        applyFiltersAndSort()
    }
}

/**
 * 项目列表 UI 状态
 */
data class ProjectListUiState(
    val isLoading: Boolean = false,
    val projects: List<Project> = emptyList(),
    val totalCount: Int = 0,
    val error: String? = null,

    // 搜索和过滤
    val searchQuery: String = "",
    val selectedStatus: String? = null,
    val sortBy: SortType = SortType.UPDATE_TIME,
    val sortOrder: SortOrder = SortOrder.DESC,

    // 过滤后的项目列表
    val filteredProjects: List<Project> = emptyList()
)
