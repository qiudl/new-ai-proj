package com.aiproj.mobile.ui.screens.projects

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.repository.ProjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 项目表单 ViewModel（创建/编辑）
 */
@HiltViewModel
class ProjectFormViewModel @Inject constructor(
    private val projectRepository: ProjectRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val projectId: Int? = savedStateHandle["projectId"]
    val isEditMode: Boolean = projectId != null

    private val _uiState = MutableStateFlow(ProjectFormUiState())
    val uiState: StateFlow<ProjectFormUiState> = _uiState.asStateFlow()

    init {
        if (isEditMode && projectId != null) {
            loadProject(projectId)
        }
    }

    /**
     * 加载项目（编辑模式）
     */
    private fun loadProject(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = projectRepository.getProjectById(id)

            result.onSuccess { project ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        name = project.name,
                        description = project.description ?: "",
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
     * 更新项目名称
     */
    fun onNameChanged(name: String) {
        _uiState.update { it.copy(name = name) }
    }

    /**
     * 更新项目描述
     */
    fun onDescriptionChanged(description: String) {
        _uiState.update { it.copy(description = description) }
    }

    /**
     * 保存项目
     */
    fun saveProject(onSuccess: () -> Unit) {
        val state = _uiState.value

        // 验证
        if (state.name.isBlank()) {
            _uiState.update { it.copy(error = "请输入项目名称") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val result = if (isEditMode && projectId != null) {
                // 编辑模式
                projectRepository.updateProject(
                    id = projectId,
                    name = state.name,
                    description = state.description.ifBlank { null }
                )
            } else {
                // 创建模式
                projectRepository.createProject(
                    name = state.name,
                    description = state.description.ifBlank { null }
                )
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
 * 项目表单 UI 状态
 */
data class ProjectFormUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val name: String = "",
    val description: String = "",
    val error: String? = null
)
