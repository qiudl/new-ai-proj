package com.aiproj.mobile.ui.screens.requirement

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.api.ApproveRequest
import com.aiproj.mobile.data.api.RejectRequest
import com.aiproj.mobile.data.models.Requirement
import com.aiproj.mobile.data.repository.RequirementRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 需求详情 ViewModel
 *
 * 负责管理需求详情的状态、数据加载和用户操作
 */
@HiltViewModel
class RequirementDetailViewModel @Inject constructor(
    private val requirementRepository: RequirementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val requirementId: Int = checkNotNull(savedStateHandle["requirementId"])

    private val _uiState = MutableStateFlow(RequirementDetailUiState())
    val uiState: StateFlow<RequirementDetailUiState> = _uiState.asStateFlow()

    init {
        loadRequirement()
    }

    /**
     * 加载需求详情
     */
    fun loadRequirement() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            requirementRepository.getRequirement(requirementId)
                .onSuccess { requirement ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        requirement = requirement,
                        error = null
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "加载需求详情失败"
                    )
                }
        }
    }

    /**
     * 刷新需求详情
     */
    fun refresh() {
        loadRequirement()
    }

    /**
     * 删除需求
     */
    fun deleteRequirement(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDeleting = true)

            requirementRepository.deleteRequirement(requirementId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(isDeleting = false)
                    onSuccess()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isDeleting = false,
                        error = exception.message ?: "删除需求失败"
                    )
                }
        }
    }

    /**
     * 提交需求评审
     */
    fun submitRequirement() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true)

            requirementRepository.submitRequirement(requirementId)
                .onSuccess { requirement ->
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        requirement = requirement,
                        showSuccessMessage = "需求已提交评审"
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        error = exception.message ?: "提交评审失败"
                    )
                }
        }
    }

    /**
     * 清除成功消息
     */
    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(showSuccessMessage = null)
    }

    /**
     * 清除错误消息
     */
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}

/**
 * 需求详情 UI 状态
 */
data class RequirementDetailUiState(
    val isLoading: Boolean = false,
    val requirement: Requirement? = null,
    val isDeleting: Boolean = false,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val showSuccessMessage: String? = null
)
