package com.aiproj.mobile.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.aiproj.mobile.MainActivity
import com.aiproj.mobile.R
import com.aiproj.mobile.data.models.StartTimerRequest
import com.aiproj.mobile.data.models.TimerStatus
import com.aiproj.mobile.data.repository.TimerRepository
import com.aiproj.mobile.util.NotificationHelper
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

/**
 * 计时器前台服务
 * 保证应用在后台时计时器继续运行
 */
@AndroidEntryPoint
class TimerForegroundService : Service() {

    @Inject
    lateinit var timerRepository: TimerRepository

    @Inject
    lateinit var notificationHelper: NotificationHelper

    private val binder = TimerBinder()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private var tickJob: Job? = null
    private var syncJob: Job? = null

    private val _timerState = MutableStateFlow<TimerServiceState>(TimerServiceState.Idle)
    val timerState: StateFlow<TimerServiceState> = _timerState.asStateFlow()

    private var currentTimer: TimerStatus? = null
    private var elapsedSeconds: Long = 0

    private lateinit var notificationManager: NotificationManager

    companion object {
        private const val NOTIFICATION_ID = 1001

        const val ACTION_START = "com.aiproj.mobile.action.START"
        const val ACTION_PAUSE = "com.aiproj.mobile.action.PAUSE"
        const val ACTION_RESUME = "com.aiproj.mobile.action.RESUME"
        const val ACTION_STOP = "com.aiproj.mobile.action.STOP"

        const val EXTRA_TASK_ID = "task_id"
        const val EXTRA_TITLE = "title"
        const val EXTRA_TIMER_TYPE = "timer_type"
        const val EXTRA_DESCRIPTION = "description"

        // Sync interval: 30 seconds
        private const val SYNC_INTERVAL_MS = 30_000L
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // Notification channels are now created by NotificationHelper
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.action?.let { action ->
            when (action) {
                ACTION_START -> handleStart(intent)
                ACTION_PAUSE -> handlePause()
                ACTION_RESUME -> handleResume()
                ACTION_STOP -> handleStop()
            }
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onDestroy() {
        super.onDestroy()
        tickJob?.cancel()
        syncJob?.cancel()
        serviceScope.cancel()
    }

    // ========== Action Handlers ==========

    private fun handleStart(intent: Intent) {
        val taskId = intent.getLongExtra(EXTRA_TASK_ID, -1)
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "未命名任务"
        val timerType = intent.getStringExtra(EXTRA_TIMER_TYPE) ?: "project_task"
        val description = intent.getStringExtra(EXTRA_DESCRIPTION)

        if (taskId == -1L) {
            stopSelf()
            return
        }

        serviceScope.launch {
            val request = StartTimerRequest(
                taskId = taskId,
                title = title,
                timerType = timerType,
                description = description
            )

            val result = timerRepository.startTimer(request)
            result.onSuccess { timer ->
                currentTimer = timer
                elapsedSeconds = timer.elapsedSeconds
                _timerState.value = TimerServiceState.Running(timer)

                val notification = notificationHelper.createRunningNotification(timer, elapsedSeconds)
                startForeground(NOTIFICATION_ID, notification)
                startLocalTick()
                startPeriodicSync()
            }.onFailure {
                _timerState.value = TimerServiceState.Error(it.message ?: "启动失败")
                stopSelf()
            }
        }
    }

    private fun handlePause() {
        serviceScope.launch {
            val result = timerRepository.pauseTimer()
            result.onSuccess { timer ->
                currentTimer = timer
                elapsedSeconds = timer.elapsedSeconds
                _timerState.value = TimerServiceState.Paused(timer)

                tickJob?.cancel()
                val notification = notificationHelper.createPausedNotification(timer, elapsedSeconds)
                notificationManager.notify(NOTIFICATION_ID, notification)
            }
        }
    }

    private fun handleResume() {
        serviceScope.launch {
            val result = timerRepository.resumeTimer()
            result.onSuccess { timer ->
                currentTimer = timer
                elapsedSeconds = timer.elapsedSeconds
                _timerState.value = TimerServiceState.Running(timer)

                startLocalTick()
                val notification = notificationHelper.createRunningNotification(timer, elapsedSeconds)
                notificationManager.notify(NOTIFICATION_ID, notification)
            }
        }
    }

    private fun handleStop() {
        serviceScope.launch {
            val result = timerRepository.stopTimer()
            result.onSuccess {
                currentTimer = null
                elapsedSeconds = 0
                _timerState.value = TimerServiceState.Idle

                tickJob?.cancel()
                syncJob?.cancel()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
    }

    // ========== Timer Logic ==========

    private fun startLocalTick() {
        tickJob?.cancel()
        tickJob = serviceScope.launch {
            while (isActive) {
                delay(1000)
                elapsedSeconds++

                currentTimer?.let { timer ->
                    val notification = notificationHelper.createRunningNotification(timer, elapsedSeconds)
                    notificationManager.notify(NOTIFICATION_ID, notification)
                }
            }
        }
    }

    private fun startPeriodicSync() {
        syncJob?.cancel()
        syncJob = serviceScope.launch {
            while (isActive) {
                delay(SYNC_INTERVAL_MS)
                syncTimerState()
            }
        }
    }

    private suspend fun syncTimerState() {
        val result = timerRepository.getCurrentTimer()
        result.onSuccess { serverTimer ->
            if (serverTimer != null) {
                currentTimer = serverTimer
                elapsedSeconds = serverTimer.elapsedSeconds
                _timerState.value = when (serverTimer.status) {
                    "running" -> TimerServiceState.Running(serverTimer)
                    "paused" -> TimerServiceState.Paused(serverTimer)
                    else -> TimerServiceState.Idle
                }
            }
        }
    }

    // Notification handling is now delegated to NotificationHelper

    // ========== Binder ==========

    inner class TimerBinder : Binder() {
        fun getService(): TimerForegroundService = this@TimerForegroundService
    }
}

/**
 * 计时器服务状态
 */
sealed class TimerServiceState {
    object Idle : TimerServiceState()
    data class Running(val timer: TimerStatus) : TimerServiceState()
    data class Paused(val timer: TimerStatus) : TimerServiceState()
    data class Error(val message: String) : TimerServiceState()
}
