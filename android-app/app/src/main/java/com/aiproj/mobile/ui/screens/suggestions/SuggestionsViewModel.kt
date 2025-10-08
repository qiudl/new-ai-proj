package com.aiproj.mobile.ui.screens.suggestions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.TimerSuggestion
import com.aiproj.mobile.data.repository.SuggestionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 智能建议ViewModel
 * 管理建议列表的加载和应用
 */
@HiltViewModel
class SuggestionsViewModel @Inject constructor(
    private val repository: SuggestionRepository
) : ViewModel() {

    private val _suggestions = MutableStateFlow<List<TimerSuggestion>>(emptyList())
    val suggestions: StateFlow<List<TimerSuggestion>> = _suggestions.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _appliedSuggestion = MutableStateFlow<String?>(null)
    val appliedSuggestion: StateFlow<String?> = _appliedSuggestion.asStateFlow()

    init {
        loadSuggestions()
    }

    /**
     * 加载建议列表
     */
    fun loadSuggestions() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            val result = repository.getTimerSuggestions()
            result.onSuccess { list ->
                // 按置信度降序排序
                _suggestions.value = list.sortedByDescending { it.confidence }
            }.onFailure { error ->
                _error.value = error.message ?: "加载建议失败"
            }

            _isLoading.value = false
        }
    }

    /**
     * 应用建议(启动计时器)
     *
     * @param suggestionId 建议ID
     */
    fun applySuggestion(suggestionId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            val result = repository.applySuggestion(suggestionId)
            result.onSuccess {
                _appliedSuggestion.value = suggestionId
                // 从列表中移除已应用的建议
                _suggestions.value = _suggestions.value.filterNot { it.id == suggestionId }
            }.onFailure { error ->
                _error.value = error.message ?: "应用建议失败"
            }

            _isLoading.value = false
        }
    }

    /**
     * 清除错误消息
     */
    fun dismissError() {
        _error.value = null
    }

    /**
     * 清除已应用的建议状态
     */
    fun clearAppliedSuggestion() {
        _appliedSuggestion.value = null
    }
}
