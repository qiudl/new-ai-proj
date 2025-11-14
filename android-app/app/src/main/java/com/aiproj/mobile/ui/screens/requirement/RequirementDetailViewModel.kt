package com.aiproj.mobile.ui.screens.requirement

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Requirement
import com.aiproj.mobile.data.repository.RequirementRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 需求详情 ViewModel
 *
 * 职责:
 * - 加载需求详情
 * - 提交需求评审
 * - 处理删除操作
 * - 管理UI状态
 */
@HiltViewModel
class RequirementDetailViewModel @Inject constructor(
    private val requirementRepository: RequirementRepository
) : ViewModel() {

    companion object {
        private const val TAG = "RequirementDetailVM"
    }

    // UI状态
    private val _uiState = MutableStateFlow(RequirementDetailUiState())
    val uiState: StateFlow<RequirementDetailUiState> = _uiState.asStateFlow()

    // 需求详情数据
    private val _requirement = MutableStateFlow<Requirement?>(null)
    val requirement: StateFlow<Requirement?> = _requirement.asStateFlow()

    /**
     * 加载需求详情
     */
    fun loadRequirement(requirementId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            requirementRepository.getRequirement(requirementId).fold(
                onSuccess = { req ->
                    Log.d(TAG, "Loaded requirement: ${req.title}")
                    _requirement.value = req
                    _uiState.update { it.copy(isLoading = false, error = null) }
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to load requirement", exception)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "加载失败"
                        )
                    }
                }
            )
        }
    }

    /**
     * 提交需求评审
     */
    fun submitRequirement() {
        val currentRequirement = _requirement.value ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }

            requirementRepository.submitRequirement(currentRequirement.id).fold(
                onSuccess = { updatedRequirement ->
                    Log.d(TAG, "Submitted requirement: ${updatedRequirement.id}")
                    _requirement.value = updatedRequirement
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            showSubmitSuccess = true
                        )
                    }
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to submit requirement", exception)
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = "提交失败: ${exception.message}"
                        )
                    }
                }
            )
        }
    }

    /**
     * 删除需求
     */
    fun deleteRequirement() {
        val currentRequirement = _requirement.value ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isDeleting = true) }

            requirementRepository.deleteRequirement(currentRequirement.id).fold(
                onSuccess = {
                    Log.d(TAG, "Deleted requirement: ${currentRequirement.id}")
                    _uiState.update {
                        it.copy(
                            isDeleting = false,
                            isDeleted = true
                        )
                    }
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to delete requirement", exception)
                    _uiState.update {
                        it.copy(
                            isDeleting = false,
                            error = "删除失败: ${exception.message}"
                        )
                    }
                }
            )
        }
    }

    /**
     * 清除提交成功状态
     */
    fun clearSubmitSuccess() {
        _uiState.update { it.copy(showSubmitSuccess = false) }
    }

    /**
     * 显示删除确认对话框
     */
    fun showDeleteDialog() {
        _uiState.update { it.copy(showDeleteDialog = true) }
    }

    /**
     * 隐藏删除确认对话框
     */
    fun hideDeleteDialog() {
        _uiState.update { it.copy(showDeleteDialog = false) }
    }
}

/**
 * 需求详情 UI 状态
 */
data class RequirementDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSubmitting: Boolean = false,
    val showSubmitSuccess: Boolean = false,
    val isDeleting: Boolean = false,
    val isDeleted: Boolean = false,
    val showDeleteDialog: Boolean = false
)
