package com.aiproj.mobile.ui.document.version

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.core.error.AppException
import com.aiproj.mobile.core.error.getUserMessage
import com.aiproj.mobile.domain.usecases.document.CompareVersionsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 版本对比 ViewModel
 *
 * 管理版本对比的状态和业务逻辑
 */
@HiltViewModel
class VersionComparisonViewModel @Inject constructor(
    private val compareVersionsUseCase: CompareVersionsUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(VersionComparisonUiState())
    val uiState: StateFlow<VersionComparisonUiState> = _uiState.asStateFlow()

    // 当前文档信息
    private var currentProjectId: Long = 0
    private var currentTaskId: Long = 0
    private var currentDocumentId: Long = 0

    /**
     * 初始化并加载版本对比
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param version1Number 版本1的版本号（旧版本）
     * @param version2Number 版本2的版本号（新版本）
     */
    fun initialize(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        version1Number: Int,
        version2Number: Int
    ) {
        currentProjectId = projectId
        currentTaskId = taskId
        currentDocumentId = documentId
        compareVersions(version1Number, version2Number)
    }

    /**
     * 对比两个版本
     *
     * @param version1Number 版本1的版本号（旧版本）
     * @param version2Number 版本2的版本号（新版本）
     */
    fun compareVersions(version1Number: Int, version2Number: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = compareVersionsUseCase(
                projectId = currentProjectId,
                taskId = currentTaskId,
                documentId = currentDocumentId,
                version1 = version1Number,
                version2 = version2Number
            )

            result.fold(
                onSuccess = { response ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            version1 = response.version1,
                            version2 = response.version2,
                            changes = response.changes,
                            unifiedDiff = response.diff,
                            additions = response.additions,
                            deletions = response.deletions,
                            modifications = response.changes.count { change ->
                                change.type == "modified"
                            },
                            error = null
                        )
                    }
                },
                onFailure = { throwable ->
                    val errorMessage = if (throwable is AppException) {
                        throwable.getUserMessage()
                    } else {
                        throwable.message ?: "对比失败"
                    }
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = errorMessage
                        )
                    }
                }
            )
        }
    }

    /**
     * 切换显示模式
     *
     * @param mode 新的显示模式
     */
    fun setDisplayMode(mode: DiffDisplayMode) {
        _uiState.update { it.copy(displayMode = mode) }
    }

    /**
     * 清除错误信息
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 重试加载
     */
    fun retry(version1Number: Int, version2Number: Int) {
        compareVersions(version1Number, version2Number)
    }
}
