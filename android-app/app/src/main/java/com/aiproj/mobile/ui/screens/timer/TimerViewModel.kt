package com.aiproj.mobile.ui.screens.timer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.StartTimerRequest
import com.aiproj.mobile.data.models.TimerStatus
import com.aiproj.mobile.data.models.TimerStatusEnum
import com.aiproj.mobile.data.repository.TimerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 统一计时器ViewModel
 * 使用新的TimerRepository，支持暂停/恢复、定期同步、离线模式
 */
@HiltViewModel
class TimerViewModel @Inject constructor(
    private val timerRepository: TimerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<TimerUiState>(TimerUiState.Loading)
    val uiState: StateFlow<TimerUiState> = _uiState.asStateFlow()

    private var tickerJob: Job? = null
    private var syncJob: Job? = null

    init {
        observeTimer()
    }

    /**
     * 观察计时器状态变化
     */
    private fun observeTimer() {
        viewModelScope.launch {
            android.util.Log.d(TAG, "🔭 开始观察Timer状态变化")
            timerRepository.observeCurrentTimer()
                .catch { e ->
                    android.util.Log.e(TAG, "❌ observeTimer异常: ${e.message}", e)
                    _uiState.value = TimerUiState.Error(
                        message = e.message ?: "加载计时器失败",
                        canRetry = true
                    )
                }
                .collectLatest { timer ->
                    android.util.Log.d(TAG, "📬 收到Timer更新: timer=$timer")
                    if (timer != null) {
                        android.util.Log.d(TAG, "✅ Timer不为null，调用handleTimerUpdate")
                        handleTimerUpdate(timer)
                    } else {
                        android.util.Log.w(TAG, "📭 Timer为null，设置UI为Idle")
                        _uiState.value = TimerUiState.Idle
                        stopTicker()
                        stopSync()
                    }
                }
        }
    }

    companion object {
        private const val TAG = "TimerViewModel"
    }

    /**
     * 处理计时器更新
     */
    private fun handleTimerUpdate(timer: TimerStatus) {
        android.util.Log.d(TAG, "🔄 handleTimerUpdate: id=${timer.id}, status=${timer.status}")

        // 添加空安全检查 - 防止损坏的缓存数据导致崩溃
        if (timer.status == null) {
            android.util.Log.w(TAG, "⚠️ 检测到损坏的Timer数据,status为null,清除缓存")
            viewModelScope.launch {
                timerRepository.stopTimer()  // 清除损坏的缓存
            }
            _uiState.value = TimerUiState.Idle
            return
        }

        val status = TimerStatusEnum.fromString(timer.status)
        android.util.Log.d(TAG, "📊 Timer状态枚举: $status")

        when (status) {
            TimerStatusEnum.RUNNING -> {
                android.util.Log.d(TAG, "▶️ Timer状态: RUNNING, 设置UI为Active")
                _uiState.value = TimerUiState.Active(
                    timer = timer,
                    elapsedSeconds = timer.elapsedSeconds,
                    isPaused = false,
                    isOffline = timer.isLocal
                )
                startTicker(timer.elapsedSeconds)
                startSync()
            }

            TimerStatusEnum.PAUSED -> {
                android.util.Log.d(TAG, "⏸️ Timer状态: PAUSED, 设置UI为Active(paused)")
                _uiState.value = TimerUiState.Active(
                    timer = timer,
                    elapsedSeconds = timer.elapsedSeconds,
                    isPaused = true,
                    isOffline = timer.isLocal
                )
                stopTicker()
                stopSync()
            }

            TimerStatusEnum.COMPLETED, TimerStatusEnum.CANCELLED -> {
                android.util.Log.d(TAG, "⏹️ Timer状态: $status, 设置UI为Idle")
                _uiState.value = TimerUiState.Idle
                stopTicker()
                stopSync()
            }
        }
    }

    /**
     * 启动计时器
     */
    fun startTimer(
        taskId: Long? = null,
        title: String,
        description: String? = null,
        timerType: String = "project_task",
        autoStopOthers: Boolean = true
    ) {
        viewModelScope.launch {
            android.util.Log.d(TAG, "🚀 用户请求启动Timer: title=$title, taskId=$taskId")
            _uiState.value = TimerUiState.Loading

            val request = StartTimerRequest(
                taskId = taskId,
                title = title,
                timerType = timerType,
                description = description,
                autoStopOthers = autoStopOthers
            )

            val result = timerRepository.startTimer(request)
            result.onSuccess { timer ->
                android.util.Log.d(TAG, "✅ startTimer成功: id=${timer.id}, status=${timer.status}")
                android.util.Log.d(TAG, "⏳ 等待observeTimer自动更新UI...")
            }
            result.onFailure { e ->
                android.util.Log.e(TAG, "❌ startTimer失败: ${e.message}")
                _uiState.value = TimerUiState.Error(
                    message = e.message ?: "启动计时器失败",
                    canRetry = true
                )
            }
            // 成功的情况由observeTimer处理
        }
    }

    /**
     * 暂停计时器
     */
    fun pauseTimer() {
        viewModelScope.launch {
            val result = timerRepository.pauseTimer()
            result.onFailure { e ->
                showError(e.message ?: "暂停计时器失败")
            }
            // 成功的情况由observeTimer处理
        }
    }

    /**
     * 恢复计时器
     */
    fun resumeTimer() {
        viewModelScope.launch {
            val result = timerRepository.resumeTimer()
            result.onFailure { e ->
                showError(e.message ?: "恢复计时器失败")
            }
            // 成功的情况由observeTimer处理
        }
    }

    /**
     * 停止计时器
     */
    fun stopTimer() {
        viewModelScope.launch {
            _uiState.value = TimerUiState.Loading

            val result = timerRepository.stopTimer()
            result.onFailure { e ->
                _uiState.value = TimerUiState.Error(
                    message = e.message ?: "停止计时器失败",
                    canRetry = true
                )
            }
            // 成功的情况由observeTimer处理
        }
    }

    /**
     * 刷新当前计时器
     */
    fun refreshTimer() {
        viewModelScope.launch {
            timerRepository.getCurrentTimer()
        }
    }

    /**
     * 同步离线记录
     */
    fun syncOfflineRecords() {
        viewModelScope.launch {
            timerRepository.syncOfflineRecords()
        }
    }

    /**
     * 启动计时器Ticker（每秒更新）
     */
    private fun startTicker(initialSeconds: Long) {
        stopTicker()
        tickerJob = viewModelScope.launch {
            var elapsed = initialSeconds
            while (true) {
                delay(1000)
                elapsed++
                val currentState = _uiState.value
                if (currentState is TimerUiState.Active && !currentState.isPaused) {
                    _uiState.value = currentState.copy(elapsedSeconds = elapsed)
                }
            }
        }
    }

    /**
     * 停止计时器Ticker
     */
    private fun stopTicker() {
        tickerJob?.cancel()
        tickerJob = null
    }

    /**
     * 启动定期同步（30秒）
     */
    private fun startSync() {
        stopSync()
        syncJob = viewModelScope.launch {
            while (true) {
                delay(30_000) // 30秒
                refreshTimer()
            }
        }
    }

    /**
     * 停止定期同步
     */
    private fun stopSync() {
        syncJob?.cancel()
        syncJob = null
    }

    /**
     * 显示错误
     */
    private fun showError(message: String) {
        val currentState = _uiState.value
        if (currentState is TimerUiState.Active) {
            // 保持当前状态，但标记为离线
            _uiState.value = currentState.copy(isOffline = true)
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopTicker()
        stopSync()
    }
}

/**
 * 计时器UI状态（密封类）
 */
sealed class TimerUiState {
    /**
     * 加载中
     */
    object Loading : TimerUiState()

    /**
     * 空闲状态（无活动计时器）
     */
    object Idle : TimerUiState()

    /**
     * 活动状态（计时器运行中或暂停）
     */
    data class Active(
        val timer: TimerStatus,
        val elapsedSeconds: Long,
        val isPaused: Boolean = false,
        val isOffline: Boolean = false
    ) : TimerUiState()

    /**
     * 错误状态
     */
    data class Error(
        val message: String,
        val canRetry: Boolean = false
    ) : TimerUiState()
}
