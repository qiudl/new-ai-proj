package com.aiproj.mobile.ui.screens.details.todayworktime

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.TodayWorkTimeDetail
import com.aiproj.mobile.data.repository.DetailRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * 今日工作时长详情ViewModel
 */
@HiltViewModel
class TodayWorkTimeDetailViewModel @Inject constructor(
    private val detailRepository: DetailRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TodayWorkTimeUiState())
    val uiState: StateFlow<TodayWorkTimeUiState> = _uiState.asStateFlow()

    init {
        // 初始加载今天的数据
        loadTodayWorkTime()
    }

    /**
     * 加载今日工作时长数据
     *
     * @param date 日期，格式: YYYY-MM-DD，默认为今天
     */
    fun loadTodayWorkTime(date: String = LocalDate.now().toString()) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = detailRepository.getTodayWorkTimeDetail(date)

            result.onSuccess { data ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        todayWorkTimeDetail = data,
                        selectedDate = date,
                        error = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "加载失败"
                    )
                }
            }
        }
    }

    /**
     * 刷新数据
     */
    fun refresh() {
        loadTodayWorkTime(_uiState.value.selectedDate)
    }
}

/**
 * 今日工作时长详情UI状态
 */
data class TodayWorkTimeUiState(
    val isLoading: Boolean = false,
    val todayWorkTimeDetail: TodayWorkTimeDetail? = null,
    val selectedDate: String = LocalDate.now().toString(),
    val error: String? = null
)
