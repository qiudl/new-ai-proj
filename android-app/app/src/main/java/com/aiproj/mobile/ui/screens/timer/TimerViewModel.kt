package com.aiproj.mobile.ui.screens.timer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.TimeLog
import com.aiproj.mobile.data.repository.TimeLogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TimerViewModel @Inject constructor(
    private val timeLogRepository: TimeLogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TimerUiState())
    val uiState: StateFlow<TimerUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null

    init {
        loadCurrentTimer()
    }

    private fun loadCurrentTimer() {
        viewModelScope.launch {
            val result = timeLogRepository.getCurrentTimer()
            result.onSuccess { timer ->
                _uiState.update { it.copy(currentTimer = timer) }
                if (timer != null) {
                    startTimerTick()
                }
            }
        }
    }

    fun startTimer(taskId: Int, description: String) {
        viewModelScope.launch {
            val result = timeLogRepository.startTimer(taskId.toLong(), description)
            result.onSuccess { timer ->
                _uiState.update { it.copy(currentTimer = timer) }
                startTimerTick()
            }
        }
    }

    fun stopTimer() {
        viewModelScope.launch {
            timerJob?.cancel()
            val currentTimerId = _uiState.value.currentTimer?.id ?: return@launch
            val result = timeLogRepository.stopTimer(currentTimerId)
            result.onSuccess {
                _uiState.update { it.copy(currentTimer = null, elapsedSeconds = 0) }
            }
        }
    }

    private fun startTimerTick() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.update { it.copy(elapsedSeconds = it.elapsedSeconds + 1) }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}

data class TimerUiState(
    val currentTimer: TimeLog? = null,
    val currentTask: com.aiproj.mobile.data.models.Task? = null,
    val elapsedSeconds: Long = 0,
    val todayTotalMinutes: Long = 0,
    val todayTaskCount: Int = 0,
    val timeLogs: List<TimeLog> = emptyList(),
    val error: String? = null
)
