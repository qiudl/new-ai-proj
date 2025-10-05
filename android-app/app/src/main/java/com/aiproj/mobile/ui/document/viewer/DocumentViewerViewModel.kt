package com.aiproj.mobile.ui.document.viewer

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Document
import com.aiproj.mobile.data.repository.DocumentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 文档查看ViewModel
 */
@HiltViewModel
class DocumentViewerViewModel @Inject constructor(
    private val documentRepository: DocumentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val taskId: Int = savedStateHandle["taskId"] ?: 0
    private val documentId: Int = savedStateHandle["documentId"] ?: 0

    private val _uiState = MutableStateFlow(DocumentViewerUiState())
    val uiState: StateFlow<DocumentViewerUiState> = _uiState.asStateFlow()

    init {
        loadDocument()
    }

    /**
     * 加载文档
     */
    fun loadDocument() {
        if (taskId == 0 || documentId == 0) {
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                error = "无效的任务ID或文档ID"
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            documentRepository.getDocument(taskId, documentId)
                .onSuccess { document ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        document = document,
                        error = null
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "加载文档失败"
                    )
                }
        }
    }

    /**
     * 切换全屏模式
     */
    fun toggleFullScreen() {
        _uiState.value = _uiState.value.copy(
            isFullScreen = !_uiState.value.isFullScreen
        )
    }

    /**
     * 删除文档
     */
    fun deleteDocument(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDeleting = true)

            documentRepository.deleteDocument(taskId, documentId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(isDeleting = false)
                    onSuccess()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isDeleting = false,
                        error = exception.message ?: "删除文档失败"
                    )
                }
        }
    }
}

/**
 * 文档查看UI状态
 */
data class DocumentViewerUiState(
    val isLoading: Boolean = false,
    val document: Document? = null,
    val error: String? = null,
    val isFullScreen: Boolean = false,
    val isDeleting: Boolean = false
)
