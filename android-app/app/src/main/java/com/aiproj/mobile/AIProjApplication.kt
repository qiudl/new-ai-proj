package com.aiproj.mobile

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import dagger.hilt.android.HiltAndroidApp

/**
 * AI Project 移动端应用主类
 *
 * @HiltAndroidApp 触发 Hilt 的代码生成，包括应用级别的依赖注入容器
 */
@HiltAndroidApp
class AIProjApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // 创建通知渠道 (Android 8.0+)
        createNotificationChannels()
    }

    /**
     * 创建通知渠道
     * Android 8.0 (API 26) 以上需要通知渠道
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = getString(R.string.default_notification_channel_id)
            val channelName = getString(R.string.default_notification_channel_name)
            val channelDescription = getString(R.string.default_notification_channel_description)

            val channel = NotificationChannel(
                channelId,
                channelName,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = channelDescription
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
}
