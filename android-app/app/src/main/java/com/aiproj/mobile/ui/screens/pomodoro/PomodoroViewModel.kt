package com.aiproj.mobile.ui.screens.pomodoro

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.util.PomodoroManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

/**
 * 番茄钟ViewModel
 * 管理番茄钟UI状态和用户交互
 */
@HiltViewModel
class PomodoroViewModel @Inject constructor(
    private val pomodoroManager: PomodoroManager
) : ViewModel() {

    val currentSession = pomodoroManager.currentSession

    private val _config = MutableStateFlow(PomodoroConfig())
    val config = _config.asStateFlow()

    private val _stats = MutableStateFlow(
        PomodoroStats(
            todayCompletedPomodoros = 0,
            todayWorkMinutes = 0,
            weeklyCompletedPomodoros = 0,
            totalCompletedPomodoros = 0,
            averageFocusScore = 0.0
        )
    )
    val stats = _stats.asStateFlow()

    /**
     * 启动番茄钟
     */
    fun startPomodoro(taskId: Long?, taskTitle: String?) {
        pomodoroManager.startPomodoro(
            taskId = taskId,
            taskTitle = taskTitle,
            config = _config.value,
            scope = viewModelScope
        )
    }

    /**
     * 暂停番茄钟
     */
    fun pause() {
        pomodoroManager.pause()
    }

    /**
     * 继续番茄钟
     */
    fun resume() {
        pomodoroManager.resume(viewModelScope)
    }

    /**
     * 停止番茄钟
     */
    fun stop() {
        pomodoroManager.stop()
    }

    /**
     * 跳过当前阶段
     */
    fun skipPhase() {
        pomodoroManager.skipPhase(viewModelScope)
    }

    /**
     * 更新配置
     */
    fun updateConfig(config: PomodoroConfig) {
        _config.value = config
    }
}
