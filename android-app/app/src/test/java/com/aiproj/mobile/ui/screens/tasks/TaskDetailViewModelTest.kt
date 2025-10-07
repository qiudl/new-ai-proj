package com.aiproj.mobile.ui.screens.tasks

import androidx.lifecycle.SavedStateHandle
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.*
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
 * TaskDetailViewModel 单元测试
 * Phase 4: 性能优化与测试
 *
 * 测试覆盖范围：
 * - 统计数据计算的正确性
 * - 缓存机制的有效性
 * - 时间范围筛选功能
 * - 错误处理
 */
@OptIn(ExperimentalCoroutinesApi::class)
class TaskDetailViewModelTest {

    private lateinit var viewModel: TaskDetailViewModel
    private lateinit var taskRepository: TaskRepository
    private lateinit var timeLogRepository: TimeLogRepository
    private lateinit var attachmentRepository: AttachmentRepository
    private lateinit var commentRepository: CommentRepository
    private lateinit var documentRepository: com.aiproj.mobile.data.repository.DocumentRepository
    private lateinit var savedStateHandle: SavedStateHandle
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)

        // Mock repositories
        taskRepository = mockk(relaxed = true)
        timeLogRepository = mockk(relaxed = true)
        attachmentRepository = mockk(relaxed = true)
        commentRepository = mockk(relaxed = true)
        documentRepository = mockk(relaxed = true)

        // Setup savedStateHandle with taskId
        savedStateHandle = SavedStateHandle().apply {
            set("taskId", 1)
        }
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // ==================== 初始化和数据加载测试 ====================

    @Test
    fun `loadTaskDetail - successfully loads task and related data`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(
            createMockTask(id = 2, title = "Subtask 1", parentId = 1),
            createMockTask(id = 3, title = "Subtask 2", parentId = 1)
        )
        val mockTimeLogs = listOf(
            createMockTimeLog(id = 1, taskId = 2, duration = 3600)
        )

        coEvery { taskRepository.getTaskById(1) } returns Result.success(mockTask)
        coEvery { taskRepository.getSubtasks(1) } returns flowOf(
            Result.success(com.aiproj.mobile.data.models.PaginatedResponse(
                data = com.aiproj.mobile.data.models.TaskList(tasks = mockSubtasks),
                total = 2,
                page = 1,
                limit = 20
            ))
        )
        coEvery { timeLogRepository.getTaskTimeLogs(1) } returns Result.success(mockTimeLogs)
        coEvery { attachmentRepository.getAttachments(1) } returns Result.success(emptyList())
        coEvery { commentRepository.getComments(1) } returns Result.success(emptyList())
        coEvery { documentRepository.getDocuments(1) } returns Result.success(emptyList())

        // When
        viewModel = TaskDetailViewModel(
            taskRepository,
            timeLogRepository,
            attachmentRepository,
            commentRepository,
            documentRepository,
            savedStateHandle
        )
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertFalse("Loading should be false", uiState.isLoading)
        assertEquals("Task should be loaded", mockTask, uiState.task)
        assertEquals("Subtasks should be loaded", 2, uiState.subtasks.size)
        assertEquals("TimeLogs should be loaded", 1, uiState.timeLogs.size)
        assertNull("Error should be null", uiState.error)
    }

    @Test
    fun `loadTaskDetail - handles error correctly`() = runTest {
        // Given
        val errorMessage = "Network error"
        coEvery { taskRepository.getTaskById(1) } returns Result.failure(Exception(errorMessage))

        // When
        viewModel = TaskDetailViewModel(
            taskRepository,
            timeLogRepository,
            attachmentRepository,
            commentRepository,
            documentRepository,
            savedStateHandle
        )
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertFalse("Loading should be false", uiState.isLoading)
        assertNull("Task should be null", uiState.task)
        assertNotNull("Error should not be null", uiState.error)
        assertTrue("Error message should contain error", uiState.error?.contains(errorMessage) == true)
    }

    // ==================== 统计数据计算测试 ====================

    @Test
    fun `updateTimeRange - triggers stats recalculation`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(
            createMockTask(id = 2, status = TaskStatus.COMPLETED),
            createMockTask(id = 3, status = TaskStatus.IN_PROGRESS),
            createMockTask(id = 4, status = TaskStatus.TODO)
        )

        setupViewModel(mockTask, mockSubtasks, emptyList())

        // When - Change time range
        viewModel.updateTimeRange(TimeRange.LAST_30_DAYS)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertEquals("Time range should be updated", TimeRange.LAST_30_DAYS, uiState.selectedTimeRange)
        assertNotNull("Stats should be calculated", uiState.overviewStats)
        assertNull("Overview error should be null", uiState.overviewError)
    }

    @Test
    fun `computeStats - calculates subtask stats correctly`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(
            createMockTask(id = 2, status = TaskStatus.COMPLETED),
            createMockTask(id = 3, status = TaskStatus.COMPLETED),
            createMockTask(id = 4, status = TaskStatus.IN_PROGRESS),
            createMockTask(id = 5, status = TaskStatus.TODO)
        )

        setupViewModel(mockTask, mockSubtasks, emptyList())

        // When
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val stats = viewModel.uiState.value.overviewStats?.subtaskStats
        assertNotNull("Subtask stats should not be null", stats)
        assertEquals("Total should be 4", 4, stats?.total)
        assertEquals("Completed should be 2", 2, stats?.completed)
        assertEquals("In progress should be 1", 1, stats?.inProgress)
        assertEquals("Todo should be 1", 1, stats?.todo)
        assertEquals("Completion rate should be 0.5", 0.5f, stats?.completionRate ?: 0f, 0.01f)
    }

    @Test
    fun `computeStats - calculates work time stats correctly`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(
            createMockTask(id = 2, title = "Task 1"),
            createMockTask(id = 3, title = "Task 2"),
            createMockTask(id = 4, title = "Task 3")
        )
        val mockTimeLogs = listOf(
            createMockTimeLog(taskId = 2, duration = 7200),  // 2 hours
            createMockTimeLog(taskId = 3, duration = 3600),  // 1 hour
            createMockTimeLog(taskId = 4, duration = 10800)  // 3 hours
        )

        setupViewModel(mockTask, mockSubtasks, mockTimeLogs)

        // When
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val stats = viewModel.uiState.value.overviewStats?.workTimeStats
        assertNotNull("Work time stats should not be null", stats)
        assertEquals("Total hours should be 6", 6f, stats?.totalHours ?: 0f, 0.1f)
        assertEquals("Average hours should be 2", 2f, stats?.averageHours ?: 0f, 0.1f)
        assertEquals("Max hours should be 3", 3f, stats?.maxHours ?: 0f, 0.1f)
        assertEquals("Min hours should be 1", 1f, stats?.minHours ?: 0f, 0.1f)
        assertEquals("Task count should be 3", 3, stats?.taskCount)
    }

    @Test
    fun `computeStats - calculates top tasks correctly`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(
            createMockTask(id = 2, title = "Task A"),
            createMockTask(id = 3, title = "Task B"),
            createMockTask(id = 4, title = "Task C"),
            createMockTask(id = 5, title = "Task D"),
            createMockTask(id = 6, title = "Task E"),
            createMockTask(id = 7, title = "Task F")
        )
        val mockTimeLogs = listOf(
            createMockTimeLog(taskId = 2, duration = 18000), // 5 hours
            createMockTimeLog(taskId = 3, duration = 14400), // 4 hours
            createMockTimeLog(taskId = 4, duration = 10800), // 3 hours
            createMockTimeLog(taskId = 5, duration = 7200),  // 2 hours
            createMockTimeLog(taskId = 6, duration = 3600),  // 1 hour
            createMockTimeLog(taskId = 7, duration = 1800)   // 0.5 hour
        )

        setupViewModel(mockTask, mockSubtasks, mockTimeLogs)

        // When
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val topTasks = viewModel.uiState.value.overviewStats?.topTasks
        assertNotNull("Top tasks should not be null", topTasks)
        assertEquals("Should return top 5 tasks", 5, topTasks?.size)
        assertEquals("First task should be Task A", 2, topTasks?.get(0)?.taskId)
        assertEquals("First task hours should be 5", 5f, topTasks?.get(0)?.workHours ?: 0f, 0.1f)
    }

    @Test
    fun `computeStats - calculates priority distribution correctly`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(
            createMockTask(id = 2, priority = TaskPriority.HIGH),
            createMockTask(id = 3, priority = TaskPriority.HIGH),
            createMockTask(id = 4, priority = TaskPriority.MEDIUM),
            createMockTask(id = 5, priority = TaskPriority.MEDIUM),
            createMockTask(id = 6, priority = TaskPriority.MEDIUM),
            createMockTask(id = 7, priority = TaskPriority.LOW)
        )

        setupViewModel(mockTask, mockSubtasks, emptyList())

        // When
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val distribution = viewModel.uiState.value.overviewStats?.priorityDistribution
        assertNotNull("Priority distribution should not be null", distribution)
        assertEquals("High priority count should be 2", 2, distribution?.high)
        assertEquals("Medium priority count should be 3", 3, distribution?.medium)
        assertEquals("Low priority count should be 1", 1, distribution?.low)
    }

    // ==================== 缓存机制测试 ====================

    @Test
    fun `updateTimeRange - uses cached stats for same time range`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(createMockTask(id = 2))
        setupViewModel(mockTask, mockSubtasks, emptyList())
        testDispatcher.scheduler.advanceUntilIdle()

        val firstStats = viewModel.uiState.value.overviewStats

        // When - Change to different range
        viewModel.updateTimeRange(TimeRange.LAST_30_DAYS)
        testDispatcher.scheduler.advanceUntilIdle()

        // When - Change back to original range (should use cache)
        viewModel.updateTimeRange(TimeRange.LAST_7_DAYS)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val cachedStats = viewModel.uiState.value.overviewStats
        assertSame("Should return cached stats object", firstStats, cachedStats)
    }

    @Test
    fun `refresh - clears cache and reloads data`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        setupViewModel(mockTask, emptyList(), emptyList())
        testDispatcher.scheduler.advanceUntilIdle()

        val firstStats = viewModel.uiState.value.overviewStats

        // When - Refresh
        viewModel.refresh()
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val newStats = viewModel.uiState.value.overviewStats
        assertNotSame("Should create new stats object after refresh", firstStats, newStats)
        coVerify(atLeast = 2) { taskRepository.getTaskById(1) }
    }

    // ==================== 边界情况测试 ====================

    @Test
    fun `computeStats - handles empty subtasks correctly`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        setupViewModel(mockTask, emptyList(), emptyList())

        // When
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val stats = viewModel.uiState.value.overviewStats
        assertNotNull("Stats should not be null", stats)
        assertEquals("Total subtasks should be 0", 0, stats?.subtaskStats?.total)
        assertEquals("Total hours should be 0", 0f, stats?.workTimeStats?.totalHours ?: 0f, 0.01f)
        assertTrue("Top tasks should be empty", stats?.topTasks?.isEmpty() == true)
    }

    @Test
    fun `computeStats - handles null task correctly`() = runTest {
        // Given
        coEvery { taskRepository.getTaskById(1) } returns Result.success(null)
        coEvery { taskRepository.getSubtasks(1) } returns flowOf(Result.success(
            PaginatedResponse(data = TaskList(tasks = emptyList()), total = 0, page = 1, limit = 20)
        ))
        coEvery { timeLogRepository.getTaskTimeLogs(1) } returns Result.success(emptyList())
        coEvery { attachmentRepository.getAttachments(1) } returns Result.success(emptyList())
        coEvery { commentRepository.getComments(1) } returns Result.success(emptyList())
        coEvery { documentRepository.getDocuments(1) } returns Result.success(emptyList())

        // When
        viewModel = TaskDetailViewModel(
            taskRepository,
            timeLogRepository,
            attachmentRepository,
            commentRepository,
            documentRepository,
            savedStateHandle
        )
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        assertNull("Stats should be null when task is null", viewModel.uiState.value.overviewStats)
    }

    @Test
    fun `computeStats - handles tasks with no time logs`() = runTest {
        // Given
        val mockTask = createMockTask(id = 1, title = "Main Task")
        val mockSubtasks = listOf(
            createMockTask(id = 2),
            createMockTask(id = 3)
        )
        setupViewModel(mockTask, mockSubtasks, emptyList())

        // When
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val stats = viewModel.uiState.value.overviewStats
        assertNotNull("Stats should not be null", stats)
        assertEquals("Total hours should be 0", 0f, stats?.workTimeStats?.totalHours ?: 0f, 0.01f)
        assertTrue("Top tasks should be empty", stats?.topTasks?.isEmpty() == true)
    }

    // ==================== 辅助方法 ====================

    private fun setupViewModel(
        task: Task,
        subtasks: List<Task>,
        timeLogs: List<TimeLog>
    ) {
        coEvery { taskRepository.getTaskById(1) } returns Result.success(task)
        coEvery { taskRepository.getSubtasks(1) } returns flowOf(
            Result.success(PaginatedResponse(
                data = TaskList(tasks = subtasks),
                total = subtasks.size,
                page = 1,
                limit = 20
            ))
        )
        coEvery { timeLogRepository.getTaskTimeLogs(1) } returns Result.success(timeLogs)
        coEvery { attachmentRepository.getAttachments(1) } returns Result.success(emptyList())
        coEvery { commentRepository.getComments(1) } returns Result.success(emptyList())
        coEvery { documentRepository.getDocuments(1) } returns Result.success(emptyList())

        viewModel = TaskDetailViewModel(
            taskRepository,
            timeLogRepository,
            attachmentRepository,
            commentRepository,
            documentRepository,
            savedStateHandle
        )
    }

    private fun createMockTask(
        id: Int,
        title: String = "Test Task $id",
        status: TaskStatus = TaskStatus.TODO,
        priority: TaskPriority = TaskPriority.MEDIUM,
        parentId: Int? = null
    ) = Task(
        id = id,
        title = title,
        description = null,
        status = status,
        priority = priority,
        projectId = 1,
        parentId = parentId,
        assigneeId = null,
        createdAt = "2025-10-01T00:00:00Z",
        updatedAt = "2025-10-07T00:00:00Z",
        dueDate = null,
        tags = emptyList(),
        customFields = emptyMap(),
        childrenCount = 0,
        completedChildrenCount = 0
    )

    private fun createMockTimeLog(
        id: Int = 1,
        taskId: Int,
        duration: Int = 3600
    ) = TimeLog(
        id = id,
        taskId = taskId,
        userId = 1,
        startedAt = "2025-10-07T08:00:00Z",
        stoppedAt = "2025-10-07T09:00:00Z",
        duration = duration,
        description = null
    )
}
