package com.aiproj.mobile.ui.screens.ai.subtask

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.AISubtaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AISubtaskViewModel @Inject constructor(
    private val repository: AISubtaskRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    // 从导航参数获取任务ID
    private val taskId: Int = savedStateHandle.get<Int>("taskId") ?: 0

    // UI状态
    private val _uiState = MutableStateFlow<AISubtaskUiState>(AISubtaskUiState.Idle)
    val uiState: StateFlow<AISubtaskUiState> = _uiState.asStateFlow()

    // 表单状态
    var selectedModel by mutableStateOf("gpt-4o")
        private set

    var subtaskCount by mutableStateOf(5)
        private set

    var customPrompt by mutableStateOf("")
        private set

    var includeEstimates by mutableStateOf(true)
        private set

    // 生成的子任务列表
    private var generatedSubtasks: List<GeneratedSubtask> = emptyList()

    /**
     * 更新选中的AI模型
     */
    fun onModelChange(model: String) {
        selectedModel = model
    }

    /**
     * 更新子任务数量
     */
    fun onCountChange(count: Int) {
        subtaskCount = count.coerceIn(1, 10)
    }

    /**
     * 更新自定义提示词
     */
    fun onPromptChange(prompt: String) {
        customPrompt = prompt
    }

    /**
     * 切换"包含工时估算"选项
     */
    fun toggleIncludeEstimates() {
        includeEstimates = !includeEstimates
    }

    /**
     * 生成子任务
     */
    fun generateSubtasks() {
        viewModelScope.launch {
            _uiState.value = AISubtaskUiState.Loading

            val request = SubtaskGenerateRequest(
                taskId = taskId,
                model = selectedModel,
                count = subtaskCount,
                customPrompt = customPrompt.takeIf { it.isNotBlank() },
                includeEstimates = includeEstimates
            )

            repository.generateSubtasks(taskId, request)
                .onSuccess { response ->
                    generatedSubtasks = response.subtasks
                    _uiState.value = AISubtaskUiState.Success(
                        subtasks = response.subtasks,
                        metadata = response.metadata
                    )
                }
                .onFailure { error ->
                    _uiState.value = AISubtaskUiState.Error(
                        error.message ?: "生成子任务失败"
                    )
                }
        }
    }

    /**
     * 批量创建子任务
     */
    fun createSubtasks() {
        if (generatedSubtasks.isEmpty()) {
            _uiState.value = AISubtaskUiState.Error("没有可创建的子任务")
            return
        }

        viewModelScope.launch {
            _uiState.value = AISubtaskUiState.Creating

            val subtasksData = generatedSubtasks.map { subtask ->
                SubtaskCreateData(
                    title = subtask.title,
                    description = subtask.description,
                    priority = subtask.priority,
                    status = "todo"
                )
            }

            val request = BatchCreateSubtasksRequest(
                parentTaskId = taskId,
                subtasks = subtasksData
            )

            repository.batchCreateSubtasks(request)
                .onSuccess { response ->
                    _uiState.value = AISubtaskUiState.Created(
                        createdCount = response.createdCount,
                        subtaskIds = response.subtasks.map { it.id }
                    )
                }
                .onFailure { error ->
                    _uiState.value = AISubtaskUiState.Error(
                        "创建子任务失败: ${error.message}"
                    )
                }
        }
    }

    /**
     * 重新生成子任务
     */
    fun regenerate() {
        generateSubtasks()
    }

    /**
     * 重置状态（返回配置界面）
     */
    fun resetToIdle() {
        _uiState.value = AISubtaskUiState.Idle
    }
}

/**
 * AI子任务UI状态
 */
sealed class AISubtaskUiState {
    object Idle : AISubtaskUiState()
    object Loading : AISubtaskUiState()
    object Creating : AISubtaskUiState()
    data class Success(
        val subtasks: List<GeneratedSubtask>,
        val metadata: SubtaskMetadata
    ) : AISubtaskUiState()
    data class Created(
        val createdCount: Int,
        val subtaskIds: List<Int>
    ) : AISubtaskUiState()
    data class Error(val message: String) : AISubtaskUiState()
}
