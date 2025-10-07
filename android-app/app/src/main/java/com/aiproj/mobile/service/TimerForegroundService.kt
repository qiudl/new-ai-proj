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
        private const val CHANNEL_ID = "timer_channel"
        private const val CHANNEL_NAME = "计时器通知"

        const val ACTION_START = "com.aiproj.mobile.action.START"
        const val ACTION_PAUSE = "com.aiproj.mobile.action.PAUSE"
        const val ACTION_RESUME = "com.aiproj.mobile.action.RESUME"
        const val ACTION_STOP = "com.aiproj.mobile.action.STOP"

        const val EXTRA_TASK_ID = "task_id"
        const val EXTRA_TIMER_TYPE = "timer_type"
        const val EXTRA_DESCRIPTION = "description"

        // Sync interval: 30 seconds
        private const val SYNC_INTERVAL_MS = 30_000L
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
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
        val timerType = intent.getStringExtra(EXTRA_TIMER_TYPE) ?: "project_task"
        val description = intent.getStringExtra(EXTRA_DESCRIPTION)

        if (taskId == -1L) {
            stopSelf()
            return
        }

        serviceScope.launch {
            val request = StartTimerRequest(
                taskId = taskId,
                timerType = timerType,
                description = description
            )

            val result = timerRepository.startTimer(request)
            result.onSuccess { timer ->
                currentTimer = timer
                elapsedSeconds = timer.elapsedSeconds
                _timerState.value = TimerServiceState.Running(timer)

                startForeground(NOTIFICATION_ID, createNotification(timer, false))
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
                updateNotification(timer, true)
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
                updateNotification(timer, false)
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
                    updateNotification(timer, false)
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

    // ========== Notification ==========

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "显示计时器运行状态"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(timer: TimerStatus, isPaused: Boolean): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(
                if (isPaused) "已暂停: ${timer.taskTitle ?: "任务"}"
                else "计时中: ${timer.taskTitle ?: "任务"}"
            )
            .setContentText(formatElapsedTime(elapsedSeconds))
            .setSmallIcon(R.drawable.ic_launcher_foreground) // 使用默认图标
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)

        // 添加操作按钮
        if (isPaused) {
            builder.addAction(createResumeAction())
        } else {
            builder.addAction(createPauseAction())
        }
        builder.addAction(createStopAction())

        return builder.build()
    }

    private fun updateNotification(timer: TimerStatus, isPaused: Boolean) {
        val notification = createNotification(timer, isPaused)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun createPauseAction(): NotificationCompat.Action {
        val intent = Intent(this, TimerForegroundService::class.java).apply {
            action = ACTION_PAUSE
        }
        val pendingIntent = PendingIntent.getService(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Action(
            android.R.drawable.ic_media_pause,
            "暂停",
            pendingIntent
        )
    }

    private fun createResumeAction(): NotificationCompat.Action {
        val intent = Intent(this, TimerForegroundService::class.java).apply {
            action = ACTION_RESUME
        }
        val pendingIntent = PendingIntent.getService(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Action(
            android.R.drawable.ic_media_play,
            "恢复",
            pendingIntent
        )
    }

    private fun createStopAction(): NotificationCompat.Action {
        val intent = Intent(this, TimerForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val pendingIntent = PendingIntent.getService(
            this,
            1,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Action(
            android.R.drawable.presence_busy,
            "停止",
            pendingIntent
        )
    }

    private fun formatElapsedTime(seconds: Long): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return String.format("%02d:%02d:%02d", hours, minutes, secs)
    }

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
