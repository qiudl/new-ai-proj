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
}

/**
 * 项目列表 UI 状态
 */
data class ProjectListUiState(
    val isLoading: Boolean = false,
    val projects: List<Project> = emptyList(),
    val totalCount: Int = 0,
    val error: String? = null
)
