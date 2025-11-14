package com.aiproj.mobile.ui.screens.requirement

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.RequirementRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 需求表单 ViewModel
 *
 * 职责:
 * - 管理表单状态(创建/编辑)
 * - 处理表单提交
 * - 表单验证
 * - 加载已有需求(编辑模式)
 */
@HiltViewModel
class RequirementFormViewModel @Inject constructor(
    private val requirementRepository: RequirementRepository
) : ViewModel() {

    companion object {
        private const val TAG = "RequirementFormVM"
    }

    // UI状态
    private val _uiState = MutableStateFlow(RequirementFormUiState())
    val uiState: StateFlow<RequirementFormUiState> = _uiState.asStateFlow()

    // 表单状态
    private val _formState = MutableStateFlow(RequirementFormState())
    val formState: StateFlow<RequirementFormState> = _formState.asStateFlow()

    /**
     * 初始化表单 (编辑模式)
     */
    fun loadRequirement(requirementId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            requirementRepository.getRequirement(requirementId).fold(
                onSuccess = { requirement ->
                    _formState.value = RequirementFormState(
                        projectId = requirement.projectId,
                        title = requirement.title,
                        description = requirement.description ?: "",
                        priority = requirement.priority,
                        category = requirement.category,
                        acceptanceCriteria = requirement.acceptanceCriteria ?: ""
                    )
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isEditMode = true
                        )
                    }
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to load requirement", exception)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "加载失败: ${exception.message}"
                        )
                    }
                }
            )
        }
    }

    /**
     * 更新表单字段
     */
    fun updateTitle(title: String) {
        _formState.update { it.copy(title = title) }
    }

    fun updateDescription(description: String) {
        _formState.update { it.copy(description = description) }
    }

    fun updatePriority(priority: RequirementPriority) {
        _formState.update { it.copy(priority = priority) }
    }

    fun updateCategory(category: RequirementCategory) {
        _formState.update { it.copy(category = category) }
    }

    fun updateAcceptanceCriteria(criteria: String) {
        _formState.update { it.copy(acceptanceCriteria = criteria) }
    }

    fun updateProjectId(projectId: Int) {
        _formState.update { it.copy(projectId = projectId) }
    }

    /**
     * 提交表单 (创建需求)
     */
    fun createRequirement() {
        if (!validateForm()) {
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val dto = CreateRequirementDTO(
                projectId = _formState.value.projectId,
                title = _formState.value.title.trim(),
                description = _formState.value.description.trim().ifEmpty { null },
                priority = _formState.value.priority,
                category = _formState.value.category,
                acceptanceCriteria = _formState.value.acceptanceCriteria.trim().ifEmpty { null }
            )

            requirementRepository.createRequirement(dto).fold(
                onSuccess = { requirement ->
                    Log.d(TAG, "Created requirement: ${requirement.id}")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            isSaved = true
                        )
                    }
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to create requirement", exception)
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = "创建失败: ${exception.message}"
                        )
                    }
                }
            )
        }
    }

    /**
     * 更新需求
     */
    fun updateRequirement(requirementId: Int) {
        if (!validateForm()) {
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            val dto = UpdateRequirementDTO(
                title = _formState.value.title.trim(),
                description = _formState.value.description.trim().ifEmpty { null },
                priority = _formState.value.priority,
                category = _formState.value.category,
                acceptanceCriteria = _formState.value.acceptanceCriteria.trim().ifEmpty { null }
            )

            requirementRepository.updateRequirement(requirementId, dto).fold(
                onSuccess = { requirement ->
                    Log.d(TAG, "Updated requirement: ${requirement.id}")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            isSaved = true
                        )
                    }
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to update requirement", exception)
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = "更新失败: ${exception.message}"
                        )
                    }
                }
            )
        }
    }

    /**
     * 表单验证
     */
    private fun validateForm(): Boolean {
        val state = _formState.value

        if (state.title.trim().isEmpty()) {
            _uiState.update { it.copy(error = "请输入需求标题") }
            return false
        }

        if (state.title.trim().length < 5) {
            _uiState.update { it.copy(error = "标题至少需要5个字符") }
            return false
        }

        if (state.projectId <= 0) {
            _uiState.update { it.copy(error = "请选择项目") }
            return false
        }

        return true
    }
}

/**
 * 需求表单 UI 状态
 */
data class RequirementFormUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isSaved: Boolean = false,
    val error: String? = null,
    val isEditMode: Boolean = false
)

/**
 * 需求表单状态
 */
data class RequirementFormState(
    val projectId: Int = 39, // 默认项目ID
    val title: String = "",
    val description: String = "",
    val priority: RequirementPriority = RequirementPriority.MEDIUM,
    val category: RequirementCategory = RequirementCategory.FEATURE,
    val acceptanceCriteria: String = ""
)
