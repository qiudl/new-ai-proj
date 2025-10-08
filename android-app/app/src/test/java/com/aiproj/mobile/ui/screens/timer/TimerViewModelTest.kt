package com.aiproj.mobile.ui.screens.timer

import app.cash.turbine.test
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.TimerRepository
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * TimerViewModel单元测试
 * 测试计时器ViewModel的状态管理和业务逻辑
 */
@OptIn(ExperimentalCoroutinesApi::class)
class TimerViewModelTest {

    private lateinit var viewModel: TimerViewModel
    private lateinit var repository: TimerRepository
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        repository = mockk()

        // Mock observeCurrentTimer to return null by default (idle state)
        coEvery { repository.observeCurrentTimer() } returns flowOf(null)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state should be Loading then Idle when no timer`() = runTest {
        // Given
        coEvery { repository.observeCurrentTimer() } returns flowOf(null)

        // When
        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // Then
        val currentState = viewModel.uiState.value
        assertTrue(currentState is TimerUiState.Idle)
    }

    @Test
    fun `initial state should be Active when timer exists`() = runTest {
        // Given
        val activeTimer = createMockTimerStatus(status = "running")
        coEvery { repository.observeCurrentTimer() } returns flowOf(activeTimer)

        // When
        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // Then
        val currentState = viewModel.uiState.value
        assertTrue(currentState is TimerUiState.Active)
        assertFalse((currentState as TimerUiState.Active).isPaused)
    }

    @Test
    fun `startTimer success should trigger repository call`() = runTest {
        // Given
        viewModel = TimerViewModel(repository)
        val mockTimer = createMockTimerStatus()
        val request = StartTimerRequest(
            taskId = 100,
            description = "Test"
        )

        coEvery {
            repository.startTimer(any())
        } returns Result.success(mockTimer)

        advanceUntilIdle()

        // When
        viewModel.startTimer(taskId = 100, description = "Test")
        advanceUntilIdle()

        // Then
        coVerify { repository.startTimer(any()) }
    }

    @Test
    fun `startTimer failure should change state to Error`() = runTest {
        // Given
        viewModel = TimerViewModel(repository)
        coEvery {
            repository.startTimer(any())
        } returns Result.failure(Exception("Start failed"))

        advanceUntilIdle()

        // When
        viewModel.startTimer(taskId = 100, description = "Test")
        advanceUntilIdle()

        // Then
        val currentState = viewModel.uiState.value
        assertTrue(currentState is TimerUiState.Error)
        assertEquals("Start failed", (currentState as TimerUiState.Error).message)
    }

    @Test
    fun `pauseTimer should trigger repository call`() = runTest {
        // Given
        val activeTimer = createMockTimerStatus(status = "running")
        val pausedTimer = activeTimer.copy(status = "paused")

        coEvery { repository.observeCurrentTimer() } returns flowOf(activeTimer)
        coEvery { repository.pauseTimer() } returns Result.success(pausedTimer)

        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // When
        viewModel.pauseTimer()
        advanceUntilIdle()

        // Then
        coVerify { repository.pauseTimer() }
    }

    @Test
    fun `resumeTimer should trigger repository call`() = runTest {
        // Given
        val pausedTimer = createMockTimerStatus(status = "paused")
        val runningTimer = pausedTimer.copy(status = "running")

        coEvery { repository.observeCurrentTimer() } returns flowOf(pausedTimer)
        coEvery { repository.resumeTimer() } returns Result.success(runningTimer)

        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // When
        viewModel.resumeTimer()
        advanceUntilIdle()

        // Then
        coVerify { repository.resumeTimer() }
    }

    @Test
    fun `stopTimer should trigger repository call`() = runTest {
        // Given
        val activeTimer = createMockTimerStatus()
        coEvery { repository.observeCurrentTimer() } returns flowOf(activeTimer)
        coEvery { repository.stopTimer() } returns Result.success(Unit)

        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // When
        viewModel.stopTimer()
        advanceUntilIdle()

        // Then
        coVerify { repository.stopTimer() }
    }

    @Test
    fun `stopTimer failure should change state to Error`() = runTest {
        // Given
        val activeTimer = createMockTimerStatus()
        coEvery { repository.observeCurrentTimer() } returns flowOf(activeTimer)
        coEvery { repository.stopTimer() } returns Result.failure(Exception("Stop failed"))

        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // When
        viewModel.stopTimer()
        advanceUntilIdle()

        // Then
        val currentState = viewModel.uiState.value
        assertTrue(currentState is TimerUiState.Error)
    }

    @Test
    fun `paused timer should set isPaused to true`() = runTest {
        // Given
        val pausedTimer = createMockTimerStatus(status = "paused")
        coEvery { repository.observeCurrentTimer() } returns flowOf(pausedTimer)

        // When
        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // Then
        val currentState = viewModel.uiState.value
        assertTrue(currentState is TimerUiState.Active)
        assertTrue((currentState as TimerUiState.Active).isPaused)
    }

    @Test
    fun `completed timer should change state to Idle`() = runTest {
        // Given
        val completedTimer = createMockTimerStatus(status = "completed")
        coEvery { repository.observeCurrentTimer() } returns flowOf(completedTimer)

        // When
        viewModel = TimerViewModel(repository)
        advanceUntilIdle()

        // Then
        val currentState = viewModel.uiState.value
        assertTrue(currentState is TimerUiState.Idle)
    }

    @Test
    fun `refreshTimer should trigger getCurrentTimer`() = runTest {
        // Given
        viewModel = TimerViewModel(repository)
        coEvery { repository.getCurrentTimer() } returns Result.success(null)

        // When
        viewModel.refreshTimer()
        advanceUntilIdle()

        // Then
        coVerify { repository.getCurrentTimer() }
    }

    @Test
    fun `syncOfflineRecords should trigger repository sync`() = runTest {
        // Given
        viewModel = TimerViewModel(repository)
        coEvery { repository.syncOfflineRecords() } returns Result.success(0)

        // When
        viewModel.syncOfflineRecords()
        advanceUntilIdle()

        // Then
        coVerify { repository.syncOfflineRecords() }
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
            elapsedSeconds = 0,
            pausedDuration = 0,
            isLocal = false
        )
    }
}
