package com.aiproj.mobile.ui.screens.ai.document

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.AIDocumentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AIDocumentViewModel @Inject constructor(
    private val repository: AIDocumentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    // 从导航参数获取任务ID
    private val taskId: Int = savedStateHandle.get<Int>("taskId") ?: 0

    // UI状态
    private val _uiState = MutableStateFlow<AIDocumentUiState>(AIDocumentUiState.Idle)
    val uiState: StateFlow<AIDocumentUiState> = _uiState.asStateFlow()

    // 文档类型列表
    private val _documentTypes = MutableStateFlow<List<AIDocumentType>>(emptyList())
    val documentTypes: StateFlow<List<AIDocumentType>> = _documentTypes.asStateFlow()

    // 表单状态
    var selectedDocType by mutableStateOf("")
        private set

    var selectedModel by mutableStateOf("gpt-4o")
        private set

    var customPrompt by mutableStateOf("")
        private set

    var includeSubtasks by mutableStateOf(false)
        private set

    var includeCodeExamples by mutableStateOf(false)
        private set

    // 生成的文档数据
    private var generatedDocument: DocumentData? = null

    init {
        loadDocumentTypes()
    }

    /**
     * 加载文档类型列表
     */
    private fun loadDocumentTypes() {
        viewModelScope.launch {
            repository.getDocumentTypes()
                .onSuccess { data ->
                    _documentTypes.value = data.types
                    // 默认选中第一个类型
                    if (data.types.isNotEmpty()) {
                        selectedDocType = data.types[0].type
                    }
                }
                .onFailure { error ->
                    _uiState.value = AIDocumentUiState.Error(
                        "加载文档类型失败: ${error.message}"
                    )
                }
        }
    }

    /**
     * 更新选中的文档类型
     */
    fun onDocTypeChange(type: String) {
        selectedDocType = type
    }

    /**
     * 更新选中的AI模型
     */
    fun onModelChange(model: String) {
        selectedModel = model
    }

    /**
     * 更新自定义提示词
     */
    fun onPromptChange(prompt: String) {
        customPrompt = prompt
    }

    /**
     * 切换"包含子任务"选项
     */
    fun toggleIncludeSubtasks() {
        includeSubtasks = !includeSubtasks
    }

    /**
     * 切换"包含代码示例"选项
     */
    fun toggleIncludeCodeExamples() {
        includeCodeExamples = !includeCodeExamples
    }

    /**
     * 生成文档
     */
    fun generateDocument() {
        if (selectedDocType.isEmpty()) {
            _uiState.value = AIDocumentUiState.Error("请选择文档类型")
            return
        }

        viewModelScope.launch {
            _uiState.value = AIDocumentUiState.Loading

            val request = AIDocumentGenerateRequest(
                taskId = taskId,
                model = selectedModel,
                documentType = selectedDocType,
                customPrompt = customPrompt.takeIf { it.isNotBlank() },
                options = DocumentGenOptions(
                    includeSubtasks = includeSubtasks,
                    includeCodeExamples = includeCodeExamples,
                    language = "zh"
                )
            )

            repository.generateDocument(request)
                .onSuccess { response ->
                    generatedDocument = response.document
                    _uiState.value = AIDocumentUiState.Success(response.document)
                }
                .onFailure { error ->
                    _uiState.value = AIDocumentUiState.Error(
                        error.message ?: "生成文档失败"
                    )
                }
        }
    }

    /**
     * 保存文档到任务
     */
    fun saveDocument() {
        val document = generatedDocument
        if (document == null) {
            _uiState.value = AIDocumentUiState.Error("没有可保存的文档")
            return
        }

        viewModelScope.launch {
            _uiState.value = AIDocumentUiState.Saving

            val request = SaveDocumentRequest(
                taskId = taskId,
                title = document.title,
                content = document.content
            )

            repository.saveDocument(request)
                .onSuccess { response ->
                    _uiState.value = AIDocumentUiState.Saved(response.documentId)
                }
                .onFailure { error ->
                    _uiState.value = AIDocumentUiState.Error(
                        "保存文档失败: ${error.message}"
                    )
                }
        }
    }

    /**
     * 重新生成文档
     */
    fun regenerate() {
        generateDocument()
    }

    /**
     * 重置状态（返回配置界面）
     */
    fun resetToIdle() {
        _uiState.value = AIDocumentUiState.Idle
    }
}

/**
 * AI文档UI状态
 */
sealed class AIDocumentUiState {
    object Idle : AIDocumentUiState()
    object Loading : AIDocumentUiState()
    object Saving : AIDocumentUiState()
    data class Success(val document: DocumentData) : AIDocumentUiState()
    data class Saved(val documentId: Int) : AIDocumentUiState()
    data class Error(val message: String) : AIDocumentUiState()
}
