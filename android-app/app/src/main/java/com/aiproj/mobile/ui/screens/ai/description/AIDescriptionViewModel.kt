package com.aiproj.mobile.ui.screens.ai.description

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.AIDescriptionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AIDescriptionViewModel @Inject constructor(
    private val repository: AIDescriptionRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    // 从导航参数获取任务ID
    private val taskId: Int = savedStateHandle.get<Int>("taskId") ?: 0

    // UI状态
    private val _uiState = MutableStateFlow<AIDescriptionUiState>(AIDescriptionUiState.Idle)
    val uiState: StateFlow<AIDescriptionUiState> = _uiState.asStateFlow()

    // 表单状态
    var selectedModel by mutableStateOf("gpt-4o")
        private set

    var selectedLength by mutableStateOf("medium")
        private set

    var selectedStyle by mutableStateOf("technical")
        private set

    var customPrompt by mutableStateOf("")
        private set

    // 生成的描述
    private var generatedDescription: String = ""
    private var generatedMetadata: DescriptionGenerateResponse? = null

    /**
     * 更新选中的AI模型
     */
    fun onModelChange(model: String) {
        selectedModel = model
    }

    /**
     * 更新描述长度
     */
    fun onLengthChange(length: String) {
        selectedLength = length
    }

    /**
     * 更新描述风格
     */
    fun onStyleChange(style: String) {
        selectedStyle = style
    }

    /**
     * 更新自定义提示词
     */
    fun onPromptChange(prompt: String) {
        customPrompt = prompt
    }

    /**
     * 生成任务描述
     */
    fun generateDescription() {
        viewModelScope.launch {
            _uiState.value = AIDescriptionUiState.Loading

            val request = DescriptionGenerateRequest(
                model = selectedModel,
                customPrompt = customPrompt.takeIf { it.isNotBlank() },
                length = selectedLength,
                style = selectedStyle
            )

            repository.generateDescription(taskId, request)
                .onSuccess { response ->
                    generatedDescription = response.description
                    generatedMetadata = response
                    _uiState.value = AIDescriptionUiState.Success(response)
                }
                .onFailure { error ->
                    _uiState.value = AIDescriptionUiState.Error(
                        error.message ?: "生成描述失败"
                    )
                }
        }
    }

    /**
     * 应用描述（更新任务）
     */
    fun applyDescription() {
        if (generatedDescription.isEmpty()) {
            _uiState.value = AIDescriptionUiState.Error("没有可应用的描述")
            return
        }

        viewModelScope.launch {
            _uiState.value = AIDescriptionUiState.Applying

            repository.updateTaskDescription(taskId, generatedDescription)
                .onSuccess {
                    _uiState.value = AIDescriptionUiState.Applied
                }
                .onFailure { error ->
                    _uiState.value = AIDescriptionUiState.Error(
                        "应用描述失败: ${error.message}"
                    )
                }
        }
    }

    /**
     * 重新生成描述
     */
    fun regenerate() {
        generateDescription()
    }

    /**
     * 重置状态（返回配置界面）
     */
    fun resetToIdle() {
        _uiState.value = AIDescriptionUiState.Idle
    }
}

/**
 * AI描述生成UI状态
 */
sealed class AIDescriptionUiState {
    object Idle : AIDescriptionUiState()
    object Loading : AIDescriptionUiState()
    object Applying : AIDescriptionUiState()
    data class Success(val response: DescriptionGenerateResponse) : AIDescriptionUiState()
    object Applied : AIDescriptionUiState()
    data class Error(val message: String) : AIDescriptionUiState()
}
