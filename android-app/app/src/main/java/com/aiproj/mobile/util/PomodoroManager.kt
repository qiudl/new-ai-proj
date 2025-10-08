package com.aiproj.mobile.util

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.aiproj.mobile.data.models.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 番茄钟管理器
 * 负责番茄钟会话的创建、控制和状态管理
 */
@Singleton
class PomodoroManager @Inject constructor() {

    private val _currentSession = MutableStateFlow<PomodoroSession?>(null)
    val currentSession: StateFlow<PomodoroSession?> = _currentSession.asStateFlow()

    private var tickJob: Job? = null

    /**
     * 启动番茄钟
     */
    fun startPomodoro(
        taskId: Long?,
        taskTitle: String?,
        config: PomodoroConfig = PomodoroConfig(),
        scope: CoroutineScope
    ) {
        val session = PomodoroSession(
            id = java.util.UUID.randomUUID().toString(),
            taskId = taskId,
            taskTitle = taskTitle,
            config = config,
            currentPhase = PomodoroPhase.WORK,
            currentCycle = 1,
            startTime = System.currentTimeMillis(),
            remainingSeconds = config.workMinutes * 60,
            isPaused = false
        )

        _currentSession.value = session
        startTicking(scope)
    }

    /**
     * 暂停番茄钟
     */
    fun pause() {
        _currentSession.value = _currentSession.value?.copy(isPaused = true)
        tickJob?.cancel()
    }

    /**
     * 继续番茄钟
     */
    fun resume(scope: CoroutineScope) {
        _currentSession.value = _currentSession.value?.copy(isPaused = false)
        startTicking(scope)
    }

    /**
     * 停止番茄钟
     */
    fun stop() {
        tickJob?.cancel()
        _currentSession.value = null
    }

    /**
     * 跳过当前阶段
     */
    fun skipPhase(scope: CoroutineScope) {
        _currentSession.value?.let { session ->
            moveToNextPhase(session, scope)
        }
    }

    /**
     * 开始计时
     */
    private fun startTicking(scope: CoroutineScope) {
        tickJob?.cancel()
        tickJob = scope.launch {
            while (true) {
                delay(1000)

                _currentSession.value?.let { session ->
                    if (session.isPaused) return@let

                    val newRemaining = session.remainingSeconds - 1

                    if (newRemaining <= 0) {
                        // Phase completed
                        onPhaseCompleted(session, scope)
                    } else {
                        _currentSession.value = session.copy(
                            remainingSeconds = newRemaining
                        )
                    }
                }
            }
        }
    }

    /**
     * 阶段完成回调
     */
    private fun onPhaseCompleted(session: PomodoroSession, scope: CoroutineScope) {
        when (session.currentPhase) {
            PomodoroPhase.WORK -> {
                // Work phase completed
                // TODO: Add notification
                moveToNextPhase(session, scope)
            }
            PomodoroPhase.SHORT_BREAK, PomodoroPhase.LONG_BREAK -> {
                // Break completed
                // TODO: Add notification
                moveToNextPhase(session, scope)
            }
            else -> {}
        }
    }

    /**
     * 切换到下一阶段
     */
    private fun moveToNextPhase(session: PomodoroSession, scope: CoroutineScope) {
        val nextPhase: PomodoroPhase
        val nextCycle: Int
        val remainingSeconds: Int

        when (session.currentPhase) {
            PomodoroPhase.WORK -> {
                // Decide break type
                if (session.currentCycle % session.config.pomodorosUntilLongBreak == 0) {
                    nextPhase = PomodoroPhase.LONG_BREAK
                    remainingSeconds = session.config.longBreakMinutes * 60
                } else {
                    nextPhase = PomodoroPhase.SHORT_BREAK
                    remainingSeconds = session.config.shortBreakMinutes * 60
                }
                nextCycle = session.currentCycle
            }
            PomodoroPhase.SHORT_BREAK, PomodoroPhase.LONG_BREAK -> {
                nextPhase = PomodoroPhase.WORK
                remainingSeconds = session.config.workMinutes * 60
                nextCycle = session.currentCycle + 1
            }
            else -> return
        }

        _currentSession.value = session.copy(
            currentPhase = nextPhase,
            currentCycle = nextCycle,
            remainingSeconds = remainingSeconds,
            startTime = System.currentTimeMillis(),
            isPaused = false
        )

        startTicking(scope)
    }
}
