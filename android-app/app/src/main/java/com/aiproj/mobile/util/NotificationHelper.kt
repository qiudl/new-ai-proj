package com.aiproj.mobile.util

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.aiproj.mobile.MainActivity
import com.aiproj.mobile.R
import com.aiproj.mobile.data.models.TimerStatus
import com.aiproj.mobile.service.TimerForegroundService
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 通知辅助类
 * 管理计时器相关的所有通知
 */
@Singleton
class NotificationHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val notificationManager = NotificationManagerCompat.from(context)

    companion object {
        // Notification IDs
        const val TIMER_RUNNING_ID = 1001
        const val TIMER_PAUSED_ID = 1002
        const val TIMER_COMPLETED_ID = 1003
        const val TIMER_REMINDER_ID = 1004

        // Channel IDs
        private const val CHANNEL_TIMER = "timer_channel"
        private const val CHANNEL_COMPLETION = "completion_channel"
        private const val CHANNEL_REMINDER = "reminder_channel"

        // Channel Names
        private const val CHANNEL_TIMER_NAME = "计时器通知"
        private const val CHANNEL_COMPLETION_NAME = "完成通知"
        private const val CHANNEL_REMINDER_NAME = "提醒通知"

        // Request codes for PendingIntent
        private const val REQUEST_OPEN_APP = 100
        private const val REQUEST_PAUSE = 101
        private const val REQUEST_RESUME = 102
        private const val REQUEST_STOP = 103
    }

    init {
        createNotificationChannels()
    }

    // ========== Channel Management ==========

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_TIMER,
                    CHANNEL_TIMER_NAME,
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "显示计时器运行状态"
                    setShowBadge(false)
                    enableLights(false)
                    enableVibration(false)
                },
                NotificationChannel(
                    CHANNEL_COMPLETION,
                    CHANNEL_COMPLETION_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "任务完成提醒"
                    setShowBadge(true)
                    enableLights(true)
                    enableVibration(true)
                },
                NotificationChannel(
                    CHANNEL_REMINDER,
                    CHANNEL_REMINDER_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "工作时长提醒"
                    setShowBadge(true)
                    enableLights(true)
                    enableVibration(true)
                }
            )

            notificationManager.createNotificationChannels(channels)
        }
    }

    // ========== Permission Check ==========

    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    // ========== Running Timer Notification ==========

    fun createRunningNotification(
        timer: TimerStatus,
        elapsedSeconds: Long
    ): Notification {
        val contentIntent = createOpenAppIntent()
        val pauseAction = createPauseAction()
        val stopAction = createStopAction()

        return NotificationCompat.Builder(context, CHANNEL_TIMER)
            .setContentTitle("计时中: ${timer.taskTitle ?: "任务"}")
            .setContentText(formatElapsedTime(elapsedSeconds))
            .setSubText(timer.description ?: "")
            .setSmallIcon(R.drawable.ic_launcher_foreground) // Using default icon
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(pauseAction)
            .addAction(stopAction)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("${timer.taskTitle}\n${formatElapsedTime(elapsedSeconds)}")
                    .setBigContentTitle("计时中")
            )
            .build()
    }

    fun updateRunningNotification(
        timer: TimerStatus,
        elapsedSeconds: Long
    ) {
        if (!hasNotificationPermission()) return

        val notification = createRunningNotification(timer, elapsedSeconds)
        notificationManager.notify(TIMER_RUNNING_ID, notification)
    }

    // ========== Paused Timer Notification ==========

    fun createPausedNotification(
        timer: TimerStatus,
        elapsedSeconds: Long
    ): Notification {
        val contentIntent = createOpenAppIntent()
        val resumeAction = createResumeAction()
        val stopAction = createStopAction()

        return NotificationCompat.Builder(context, CHANNEL_TIMER)
            .setContentTitle("已暂停: ${timer.taskTitle ?: "任务"}")
            .setContentText("已记录 ${formatElapsedTime(elapsedSeconds)}")
            .setSubText(timer.description ?: "")
            .setSmallIcon(R.drawable.ic_launcher_foreground) // Using default icon
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(resumeAction)
            .addAction(stopAction)
            .build()
    }

    // ========== Completed Notification ==========

    fun showCompletedNotification(
        taskTitle: String,
        totalTime: String,
        taskId: Long
    ) {
        if (!hasNotificationPermission()) return

        val contentIntent = createOpenTaskIntent(taskId)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMPLETION)
            .setContentTitle("任务已完成")
            .setContentText("$taskTitle - 工作时长: $totalTime")
            .setSmallIcon(R.drawable.ic_launcher_foreground) // Using default icon
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            .setLights(0xFF00FF00.toInt(), 1000, 1000)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("恭喜!任务 \"$taskTitle\" 已完成\n工作时长: $totalTime")
            )
            .build()

        notificationManager.notify(TIMER_COMPLETED_ID, notification)
    }

    // ========== Reminder Notification ==========

    fun showWorkTimeReminderNotification(
        message: String,
        totalHoursToday: Double
    ) {
        if (!hasNotificationPermission()) return

        val contentIntent = createOpenAppIntent()

        val notification = NotificationCompat.Builder(context, CHANNEL_REMINDER)
            .setContentTitle("工作时长提醒")
            .setContentText(message)
            .setSmallIcon(R.drawable.ic_launcher_foreground) // Using default icon
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVibrate(longArrayOf(0, 300, 200, 300, 200, 300))
            .setLights(0xFFFF9800.toInt(), 1000, 1000)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$message\n今日累计工作: ${String.format("%.1f", totalHoursToday)}小时")
            )
            .build()

        notificationManager.notify(TIMER_REMINDER_ID, notification)
    }

    /**
     * 每日工作满4小时提醒
     */
    fun show4HourMilestoneNotification() {
        showWorkTimeReminderNotification(
            "你已经工作4小时了!建议休息一下~",
            4.0
        )
    }

    /**
     * 每日工作满8小时提醒
     */
    fun show8HourMilestoneNotification() {
        showWorkTimeReminderNotification(
            "今天已经工作8小时!辛苦了,记得休息哦~",
            8.0
        )
    }

    // ========== Cancel Notifications ==========

    fun cancelTimerNotification() {
        notificationManager.cancel(TIMER_RUNNING_ID)
        notificationManager.cancel(TIMER_PAUSED_ID)
    }

    fun cancelAllNotifications() {
        notificationManager.cancelAll()
    }

    // ========== Intent Creators ==========

    private fun createOpenAppIntent(): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        return PendingIntent.getActivity(
            context,
            REQUEST_OPEN_APP,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun createOpenTaskIntent(taskId: Long): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("OPEN_TASK_ID", taskId)
        }
        return PendingIntent.getActivity(
            context,
            REQUEST_OPEN_APP,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun createPauseAction(): NotificationCompat.Action {
        val intent = Intent(context, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_PAUSE
        }
        val pendingIntent = PendingIntent.getService(
            context,
            REQUEST_PAUSE,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_pause,
            "暂停",
            pendingIntent
        ).build()
    }

    private fun createResumeAction(): NotificationCompat.Action {
        val intent = Intent(context, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_RESUME
        }
        val pendingIntent = PendingIntent.getService(
            context,
            REQUEST_RESUME,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_play,
            "继续",
            pendingIntent
        ).build()
    }

    private fun createStopAction(): NotificationCompat.Action {
        val intent = Intent(context, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_STOP
        }
        val pendingIntent = PendingIntent.getService(
            context,
            REQUEST_STOP,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Action.Builder(
            android.R.drawable.presence_busy,
            "停止",
            pendingIntent
        ).build()
    }

    // ========== Helper Functions ==========

    private fun formatElapsedTime(seconds: Long): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return if (hours > 0) {
            String.format("%d:%02d:%02d", hours, minutes, secs)
        } else {
            String.format("%d:%02d", minutes, secs)
        }
    }
}
