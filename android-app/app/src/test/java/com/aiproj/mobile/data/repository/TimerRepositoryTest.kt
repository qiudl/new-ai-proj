package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.TimerApi
import com.aiproj.mobile.data.local.TimerCache
import com.aiproj.mobile.data.models.*
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response

/**
 * TimerRepository单元测试
 * 测试计时器数据仓库的核心功能
 */
class TimerRepositoryTest {

    private lateinit var repository: TimerRepository
    private lateinit var api: TimerApi
    private lateinit var cache: TimerCache

    @Before
    fun setup() {
        api = mockk()
        cache = mockk(relaxed = true)
        repository = TimerRepository(api, cache)
    }

    @Test
    fun `startTimer success should return timer and save to cache`() = runTest {
        // Given
        val request = StartTimerRequest(
            taskId = 100,
            timerType = "project_task",
            description = "Test timer",
            autoStopOthers = true
        )
        val expectedTimer = createMockTimerStatus()
        val response = Response.success(
            ApiResponse(success = true, data = expectedTimer, message = null, error = null)
        )

        coEvery { api.startTimer(request) } returns response
        coEvery { cache.saveCurrentTimer(expectedTimer) } just Runs

        // When
        val result = repository.startTimer(request)

        // Then
        assertTrue(result.isSuccess)
        assertEquals(expectedTimer, result.getOrNull())
        coVerify { cache.saveCurrentTimer(expectedTimer) }
    }

    @Test
    fun `startTimer API failure should return error`() = runTest {
        // Given
        val request = StartTimerRequest(
            taskId = 100,
            description = "Test timer"
        )
        val errorResponse = Response.success(
            ApiResponse<TimerStatus>(success = false, data = null, message = null, error = "API Error")
        )

        coEvery { api.startTimer(request) } returns errorResponse

        // When
        val result = repository.startTimer(request)

        // Then
        assertTrue(result.isFailure)
        assertEquals("API Error", result.exceptionOrNull()?.message)
    }

    @Test
    fun `startTimer network exception should save offline record`() = runTest {
        // Given
        val request = StartTimerRequest(
            taskId = 100,
            description = "Test timer"
        )

        coEvery { api.startTimer(request) } throws Exception("Network error")
        coEvery { cache.saveOfflineRecord(any()) } just Runs

        // When
        val result = repository.startTimer(request)

        // Then
        assertTrue(result.isFailure)
        coVerify { cache.saveOfflineRecord(any()) }
    }

    @Test
    fun `pauseTimer success should update cache`() = runTest {
        // Given
        val expectedTimer = createMockTimerStatus(status = "paused")
        val response = Response.success(
            ApiResponse(success = true, data = expectedTimer, message = null, error = null)
        )

        coEvery { api.pauseTimer() } returns response

        // When
        val result = repository.pauseTimer()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(expectedTimer, result.getOrNull())
        coVerify { cache.saveCurrentTimer(expectedTimer) }
    }

    @Test
    fun `resumeTimer success should update cache`() = runTest {
        // Given
        val expectedTimer = createMockTimerStatus(status = "running")
        val response = Response.success(
            ApiResponse(success = true, data = expectedTimer, message = null, error = null)
        )

        coEvery { api.resumeTimer() } returns response

        // When
        val result = repository.resumeTimer()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(expectedTimer, result.getOrNull())
        coVerify { cache.saveCurrentTimer(expectedTimer) }
    }

    @Test
    fun `stopTimer success should clear cache`() = runTest {
        // Given
        val response = Response.success(
            ApiResponse(success = true, data = Unit, message = null, error = null)
        )

        coEvery { api.stopTimer() } returns response
        coEvery { cache.clearCurrentTimer() } just Runs

        // When
        val result = repository.stopTimer()

        // Then
        assertTrue(result.isSuccess)
        coVerify { cache.clearCurrentTimer() }
    }

    @Test
    fun `stopTimer failure should return error`() = runTest {
        // Given
        val response = Response.success(
            ApiResponse<Unit>(success = false, data = null, message = null, error = "Stop failed")
        )

        coEvery { api.stopTimer() } returns response

        // When
        val result = repository.stopTimer()

        // Then
        assertTrue(result.isFailure)
    }

    @Test
    fun `getCurrentTimer success should save to cache`() = runTest {
        // Given
        val expectedTimer = createMockTimerStatus()
        val response = Response.success(
            ApiResponse(success = true, data = expectedTimer, message = null, error = null)
        )

        coEvery { api.getCurrentTimer() } returns response

        // When
        val result = repository.getCurrentTimer()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(expectedTimer, result.getOrNull())
        coVerify { cache.saveCurrentTimer(expectedTimer) }
    }

    @Test
    fun `getCurrentTimer from cache when API fails`() = runTest {
        // Given
        val cachedTimer = createMockTimerStatus()
        coEvery { api.getCurrentTimer() } throws Exception("Network error")
        coEvery { cache.getCurrentTimer() } returns cachedTimer

        // When
        val result = repository.getCurrentTimer()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(cachedTimer, result.getOrNull())
    }

    @Test
    fun `getCurrentTimer returns null when no timer and API fails`() = runTest {
        // Given
        val response: Response<ApiResponse<TimerStatus?>> = Response.success(
            ApiResponse(success = true, data = null, message = null, error = null)
        )

        coEvery { api.getCurrentTimer() } returns response

        // When
        val result = repository.getCurrentTimer()

        // Then
        assertTrue(result.isSuccess)
        assertNull(result.getOrNull())
    }

    @Test
    fun `getActiveTimers success should return list`() = runTest {
        // Given
        val expectedTimers = listOf(
            createMockTimerStatus(id = 1),
            createMockTimerStatus(id = 2)
        )
        val response = Response.success(
            ApiResponse(success = true, data = expectedTimers, message = null, error = null)
        )

        coEvery { api.getActiveTimers() } returns response

        // When
        val result = repository.getActiveTimers()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
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
