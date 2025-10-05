package com.aiproj.mobile.ui.document.editor

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Document
import com.aiproj.mobile.data.models.DocumentRequest
import com.aiproj.mobile.data.repository.DocumentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DocumentEditorViewModel @Inject constructor(
    private val documentRepository: DocumentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val taskId: Int = savedStateHandle["taskId"] ?: 0
    private val documentId: Int? = savedStateHandle["documentId"]

    private val _uiState = MutableStateFlow(DocumentEditorUiState())
    val uiState: StateFlow<DocumentEditorUiState> = _uiState.asStateFlow()

    init {
        documentId?.let { loadDocument(it) }
    }

    private fun loadDocument(docId: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            documentRepository.getDocument(taskId, docId)
                .onSuccess { doc ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        document = doc,
                        title = doc.title,
                        content = doc.content,
                        type = doc.type,
                        status = doc.status
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "加载失败"
                    )
                }
        }
    }

    fun updateTitle(newTitle: String) {
        _uiState.value = _uiState.value.copy(title = newTitle)
    }

    fun updateContent(newContent: String) {
        _uiState.value = _uiState.value.copy(content = newContent)
    }

    fun updateStatus(newStatus: String) {
        _uiState.value = _uiState.value.copy(status = newStatus)
    }

    fun togglePreview() {
        _uiState.value = _uiState.value.copy(
            isPreviewMode = !_uiState.value.isPreviewMode
        )
    }

    fun insertMarkdown(prefix: String, suffix: String = "") {
        val current = _uiState.value.content
        val newContent = if (suffix.isEmpty()) {
            "$current\n$prefix"
        } else {
            "$current$prefix$suffix"
        }
        updateContent(newContent)
    }

    fun saveDocument(onSuccess: () -> Unit = {}) {
        if (_uiState.value.title.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "标题不能为空")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)

            val request = DocumentRequest(
                title = _uiState.value.title,
                content = _uiState.value.content,
                type = _uiState.value.type,
                status = _uiState.value.status
            )

            val result = if (documentId != null) {
                documentRepository.updateDocument(taskId, documentId, request)
            } else {
                documentRepository.createDocument(taskId, request)
            }

            result.onSuccess {
                    _uiState.value = _uiState.value.copy(isSaving = false)
                    onSuccess()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        error = e.message ?: "保存失败"
                    )
                }
        }
    }
}

data class DocumentEditorUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val document: Document? = null,
    val title: String = "",
    val content: String = "",
    val type: String = "markdown",
    val status: String = "draft",
    val isPreviewMode: Boolean = false,
    val error: String? = null
)
