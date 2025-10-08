package com.aiproj.mobile.service

import com.aiproj.mobile.data.models.TimerStatus
import com.aiproj.mobile.data.repository.TimerRepository
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * TimerForegroundService单元测试
 * 测试前台服务的基本功能
 */
class TimerForegroundServiceTest {

    private lateinit var repository: TimerRepository

    @Before
    fun setup() {
        repository = mockk()
    }

    @Test
    fun `TimerServiceState should have correct sealed class hierarchy`() {
        // Given
        val timer = createMockTimerStatus()

        // When & Then
        val idleState: TimerServiceState = TimerServiceState.Idle
        val runningState: TimerServiceState = TimerServiceState.Running(timer)
        val pausedState: TimerServiceState = TimerServiceState.Paused(timer)
        val errorState: TimerServiceState = TimerServiceState.Error("Test error")

        assertTrue(idleState is TimerServiceState.Idle)
        assertTrue(runningState is TimerServiceState.Running)
        assertTrue(pausedState is TimerServiceState.Paused)
        assertTrue(errorState is TimerServiceState.Error)
    }

    @Test
    fun `formatElapsedTime should format seconds correctly`() {
        // Test helper function logic (would be extracted as utility)
        val seconds1 = 65L // 1 minute 5 seconds
        val seconds2 = 3665L // 1 hour 1 minute 5 seconds
        val seconds3 = 3600L // 1 hour exactly

        val expected1 = "00:01:05"
        val expected2 = "01:01:05"
        val expected3 = "01:00:00"

        assertEquals(expected1, formatTime(seconds1))
        assertEquals(expected2, formatTime(seconds2))
        assertEquals(expected3, formatTime(seconds3))
    }

    @Test
    fun `Running state should contain timer data`() = runTest {
        // Given
        val timer = createMockTimerStatus()

        // When
        val state = TimerServiceState.Running(timer)

        // Then
        assertTrue(state is TimerServiceState.Running)
        assertEquals(timer, (state as TimerServiceState.Running).timer)
    }

    @Test
    fun `Paused state should contain timer data`() = runTest {
        // Given
        val timer = createMockTimerStatus(status = "paused")

        // When
        val state = TimerServiceState.Paused(timer)

        // Then
        assertTrue(state is TimerServiceState.Paused)
        assertEquals(timer, (state as TimerServiceState.Paused).timer)
    }

    @Test
    fun `Error state should contain error message`() {
        // Given
        val errorMessage = "Network error occurred"

        // When
        val state = TimerServiceState.Error(errorMessage)

        // Then
        assertTrue(state is TimerServiceState.Error)
        assertEquals(errorMessage, (state as TimerServiceState.Error).message)
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

    private fun formatTime(seconds: Long): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return String.format("%02d:%02d:%02d", hours, minutes, secs)
    }
}
