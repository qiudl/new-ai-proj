package com.aiproj.mobile.ui.screens.efficiency

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.DailyComparisonResponse
import com.aiproj.mobile.data.models.EfficiencyInsight
import com.aiproj.mobile.data.repository.EfficiencyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class EfficiencyComparisonViewModel @Inject constructor(
    private val repository: EfficiencyRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<EfficiencyUiState>(EfficiencyUiState.Loading)
    val uiState: StateFlow<EfficiencyUiState> = _uiState.asStateFlow()

    private val _insights = MutableStateFlow<List<EfficiencyInsight>>(emptyList())
    val insights: StateFlow<List<EfficiencyInsight>> = _insights.asStateFlow()

    init {
        loadComparison()
        loadInsights()
    }

    /**
     * 加载3日对比数据
     *
     * @param endDate 结束日期（可选）
     */
    fun loadComparison(endDate: String? = null) {
        viewModelScope.launch {
            _uiState.value = EfficiencyUiState.Loading

            val result = repository.get3DayComparison(endDate)
            result.onSuccess { data ->
                _uiState.value = EfficiencyUiState.Success(data)
            }.onFailure { error ->
                _uiState.value = EfficiencyUiState.Error(error.message ?: "加载失败")
            }
        }
    }

    /**
     * 加载效率洞察
     */
    fun loadInsights() {
        viewModelScope.launch {
            val result = repository.getEfficiencyInsights(7)
            result.onSuccess { data ->
                _insights.value = data
            }
            // 失败时保持空列表,不影响主界面
        }
    }

    /**
     * 刷新所有数据
     */
    fun refresh() {
        loadComparison()
        loadInsights()
    }
}

/**
 * 效率UI状态
 */
sealed class EfficiencyUiState {
    object Loading : EfficiencyUiState()
    data class Success(val data: DailyComparisonResponse) : EfficiencyUiState()
    data class Error(val message: String) : EfficiencyUiState()
}
