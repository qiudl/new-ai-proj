package com.aiproj.mobile.ui.screens.requirement

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.RequirementRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 需求表单 ViewModel
 *
 * 负责管理需求创建和编辑的状态和逻辑
 */
@HiltViewModel
class RequirementFormViewModel @Inject constructor(
    private val requirementRepository: RequirementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val requirementId: Int? = savedStateHandle["requirementId"]
    private val projectId: Int = savedStateHandle["projectId"] ?: 0

    private val _uiState = MutableStateFlow(RequirementFormUiState())
    val uiState: StateFlow<RequirementFormUiState> = _uiState.asStateFlow()

    val isEditMode: Boolean get() = requirementId != null

    init {
        if (isEditMode) {
            loadRequirement()
        } else {
            // 新建模式，设置默认项目 ID
            _uiState.value = _uiState.value.copy(projectId = projectId)
        }
    }

    /**
     * 加载需求（编辑模式）
     */
    private fun loadRequirement() {
        requirementId?.let { id ->
            viewModelScope.launch {
                _uiState.value = _uiState.value.copy(isLoading = true)

                requirementRepository.getRequirement(id)
                    .onSuccess { requirement ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            projectId = requirement.projectId,
                            title = requirement.title,
                            description = requirement.description ?: "",
                            priority = requirement.priority,
                            category = requirement.category,
                            acceptanceCriteria = requirement.acceptanceCriteria ?: ""
                        )
                    }
                    .onFailure { exception ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = exception.message ?: "加载需求失败"
                        )
                    }
            }
        }
    }

    /**
     * 更新标题
     */
    fun updateTitle(title: String) {
        _uiState.value = _uiState.value.copy(title = title)
    }

    /**
     * 更新描述
     */
    fun updateDescription(description: String) {
        _uiState.value = _uiState.value.copy(description = description)
    }

    /**
     * 更新优先级
     */
    fun updatePriority(priority: RequirementPriority) {
        _uiState.value = _uiState.value.copy(priority = priority)
    }

    /**
     * 更新类别
     */
    fun updateCategory(category: RequirementCategory) {
        _uiState.value = _uiState.value.copy(category = category)
    }

    /**
     * 更新验收标准
     */
    fun updateAcceptanceCriteria(criteria: String) {
        _uiState.value = _uiState.value.copy(acceptanceCriteria = criteria)
    }

    /**
     * 保存需求
     */
    fun saveRequirement(onSuccess: () -> Unit) {
        viewModelScope.launch {
            // 验证表单
            if (_uiState.value.title.isBlank()) {
                _uiState.value = _uiState.value.copy(error = "请输入需求标题")
                return@launch
            }

            _uiState.value = _uiState.value.copy(isSaving = true, error = null)

            val result = if (isEditMode) {
                // 编辑模式
                val dto = UpdateRequirementDTO(
                    title = _uiState.value.title,
                    description = _uiState.value.description.ifBlank { null },
                    priority = _uiState.value.priority,
                    category = _uiState.value.category,
                    acceptanceCriteria = _uiState.value.acceptanceCriteria.ifBlank { null }
                )
                requirementRepository.updateRequirement(requirementId!!, dto)
            } else {
                // 创建模式
                val dto = CreateRequirementDTO(
                    projectId = _uiState.value.projectId,
                    title = _uiState.value.title,
                    description = _uiState.value.description.ifBlank { null },
                    priority = _uiState.value.priority,
                    category = _uiState.value.category,
                    acceptanceCriteria = _uiState.value.acceptanceCriteria.ifBlank { null }
                )
                requirementRepository.createRequirement(dto)
            }

            result
                .onSuccess {
                    _uiState.value = _uiState.value.copy(isSaving = false)
                    onSuccess()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        error = exception.message ?: "保存失败"
                    )
                }
        }
    }

    /**
     * 清除错误消息
     */
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}

/**
 * 需求表单 UI 状态
 */
data class RequirementFormUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val projectId: Int = 0,
    val title: String = "",
    val description: String = "",
    val priority: RequirementPriority = RequirementPriority.MEDIUM,
    val category: RequirementCategory = RequirementCategory.FEATURE,
    val acceptanceCriteria: String = "",
    val error: String? = null
)
