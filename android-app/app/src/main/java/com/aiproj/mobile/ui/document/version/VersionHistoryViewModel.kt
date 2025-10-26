package com.aiproj.mobile.ui.document.version

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.core.error.AppException
import com.aiproj.mobile.core.error.getUserMessage
import com.aiproj.mobile.data.models.DocumentVersionDto
import com.aiproj.mobile.domain.usecases.document.GetVersionHistoryUseCase
import com.aiproj.mobile.domain.usecases.document.RestoreVersionUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 版本历史 ViewModel
 *
 * 管理版本历史列表的状态和业务逻辑
 */
@HiltViewModel
class VersionHistoryViewModel @Inject constructor(
    private val getVersionHistoryUseCase: GetVersionHistoryUseCase,
    private val restoreVersionUseCase: RestoreVersionUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(VersionHistoryUiState())
    val uiState: StateFlow<VersionHistoryUiState> = _uiState.asStateFlow()

    // 当前文档信息
    private var currentProjectId: Long = 0
    private var currentTaskId: Long = 0
    private var currentDocumentId: Long = 0

    /**
     * 初始化并加载版本历史
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     */
    fun initialize(projectId: Long, taskId: Long, documentId: Long) {
        currentProjectId = projectId
        currentTaskId = taskId
        currentDocumentId = documentId
        loadVersionHistory(refresh = true)
    }

    /**
     * 加载版本历史
     *
     * @param refresh 是否刷新（重置分页）
     */
    fun loadVersionHistory(refresh: Boolean = false) {
        if (_uiState.value.isLoading) return

        viewModelScope.launch {
            val currentState = _uiState.value

            // 如果刷新，重置状态
            if (refresh) {
                _uiState.update {
                    it.copy(
                        versions = emptyList(),
                        currentPage = 0,
                        hasMore = true,
                        error = null,
                        isRefreshing = true
                    )
                }
            } else {
                _uiState.update { it.copy(isLoading = true, error = null) }
            }

            getVersionHistoryUseCase(
                projectId = currentProjectId,
                taskId = currentTaskId,
                documentId = currentDocumentId,
                limit = 20,
                offset = currentState.currentPage * 20,
                includeContent = false
            ).collect { result ->
                result.fold(
                    onSuccess = { response ->
                        val newList = response.versions ?: emptyList()
                        _uiState.update {
                            it.copy(
                                versions = if (refresh) newList else it.versions + newList,
                                isLoading = false,
                                isRefreshing = false,
                                hasMore = response.pagination?.hasMore ?: (newList.size >= 20),
                                currentPage = if (refresh) 1 else it.currentPage + 1,
                                totalVersions = response.totalVersions,
                                isEmpty = newList.isEmpty(),
                                error = null
                            )
                        }
                    },
                    onFailure = { throwable ->
                        val errorMessage = if (throwable is AppException) {
                            throwable.getUserMessage()
                        } else {
                            throwable.message ?: "加载失败"
                        }
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                error = errorMessage
                            )
                        }
                    }
                )
            }
        }
    }

    /**
     * 加载更多版本
     */
    fun loadMore() {
        if (_uiState.value.hasMore && !_uiState.value.isLoading) {
            loadVersionHistory(refresh = false)
        }
    }

    /**
     * 刷新版本列表
     */
    fun refresh() {
        loadVersionHistory(refresh = true)
    }

    /**
     * 恢复到指定版本
     *
     * @param versionNumber 版本号
     */
    fun restoreVersion(versionNumber: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = restoreVersionUseCase(
                projectId = currentProjectId,
                taskId = currentTaskId,
                documentId = currentDocumentId,
                versionNumber = versionNumber
            )

            result.fold(
                onSuccess = { restoredVersion ->
                    // 恢复成功，显示成功消息并刷新列表
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            successMessage = "已成功恢复到版本 ${restoredVersion.versionNumber}"
                        )
                    }
                    loadVersionHistory(refresh = true)
                },
                onFailure = { throwable ->
                    val errorMessage = if (throwable is AppException) {
                        throwable.getUserMessage()
                    } else {
                        throwable.message ?: "恢复失败"
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
     * 清除错误信息
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 清除成功消息
     */
    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    /**
     * 重试加载
     */
    fun retry() {
        loadVersionHistory(refresh = true)
    }

    /**
     * 进入/退出对比选择模式
     */
    fun toggleComparisonMode() {
        _uiState.update {
            it.copy(
                isComparisonMode = !it.isComparisonMode,
                selectedVersion1 = null,
                selectedVersion2 = null
            )
        }
    }

    /**
     * 选择版本用于对比
     *
     * @param versionNumber 版本号
     */
    fun selectVersionForComparison(versionNumber: Int) {
        _uiState.update { state ->
            when {
                // 如果已经选了这个版本，取消选择
                state.selectedVersion1 == versionNumber -> {
                    state.copy(selectedVersion1 = null)
                }
                state.selectedVersion2 == versionNumber -> {
                    state.copy(selectedVersion2 = null)
                }
                // 如果还没选版本1，设置为版本1
                state.selectedVersion1 == null -> {
                    state.copy(selectedVersion1 = versionNumber)
                }
                // 如果还没选版本2，设置为版本2
                state.selectedVersion2 == null -> {
                    state.copy(selectedVersion2 = versionNumber)
                }
                // 如果两个都选了，替换版本2
                else -> {
                    state.copy(selectedVersion2 = versionNumber)
                }
            }
        }
    }

    /**
     * 清除选择
     */
    fun clearSelection() {
        _uiState.update {
            it.copy(
                selectedVersion1 = null,
                selectedVersion2 = null
            )
        }
    }
}
