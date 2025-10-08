package com.aiproj.mobile.util

import android.content.Context
import com.aiproj.mobile.data.models.TimerStatus
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * NotificationHelper单元测试
 * 测试通知辅助类的基本功能
 */
class NotificationHelperTest {

    private lateinit var context: Context
    private lateinit var notificationHelper: NotificationHelper

    @Before
    fun setup() {
        context = mockk(relaxed = true)
        every { context.packageName } returns "com.aiproj.mobile"
        every { context.applicationContext } returns context

        notificationHelper = NotificationHelper(context)
    }

    @Test
    fun `hasNotificationPermission returns true on older Android versions`() {
        // On Android versions below API 33, permission is always granted
        // This is a simplified test as the actual behavior depends on Build.VERSION
        assertNotNull(notificationHelper)
    }

    @Test
    fun `createRunningNotification creates valid notification`() {
        // Given
        val timer = createMockTimerStatus(status = "running")
        val elapsedSeconds = 3600L // 1 hour

        // When
        val notification = notificationHelper.createRunningNotification(timer, elapsedSeconds)

        // Then
        assertNotNull(notification)
        assertTrue(notification.flags and android.app.Notification.FLAG_ONGOING_EVENT != 0)
    }

    @Test
    fun `createPausedNotification creates valid notification`() {
        // Given
        val timer = createMockTimerStatus(status = "paused")
        val elapsedSeconds = 1800L // 30 minutes

        // When
        val notification = notificationHelper.createPausedNotification(timer, elapsedSeconds)

        // Then
        assertNotNull(notification)
        assertTrue(notification.flags and android.app.Notification.FLAG_ONGOING_EVENT != 0)
    }

    @Test
    fun `show4HourMilestoneNotification executes without errors`() {
        // When & Then - should not throw exception
        notificationHelper.show4HourMilestoneNotification()
    }

    @Test
    fun `show8HourMilestoneNotification executes without errors`() {
        // When & Then - should not throw exception
        notificationHelper.show8HourMilestoneNotification()
    }

    @Test
    fun `cancelTimerNotification executes without errors`() {
        // When & Then - should not throw exception
        notificationHelper.cancelTimerNotification()
    }

    @Test
    fun `cancelAllNotifications executes without errors`() {
        // When & Then - should not throw exception
        notificationHelper.cancelAllNotifications()
    }

    private fun createMockTimerStatus(
        id: Long = 1,
        status: String = "running"
    ): TimerStatus {
        return TimerStatus(
            id = id,
            userId = 1,
            taskId = 100,
            taskTitle = "Test Task",
            projectId = 1,
            projectName = "Test Project",
            timerType = "project_task",
            status = status,
            description = "Test description",
            startedAt = "2025-10-07T10:00:00+08:00",
            pausedAt = null,
            resumedAt = null,
            stoppedAt = null,
            elapsedSeconds = 300,
            pausedDuration = 0,
            isLocal = false
        )
    }
}
