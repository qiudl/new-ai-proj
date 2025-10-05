package com.aiproj.mobile.ui.screens.tasks

import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.repository.TaskRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * TaskListViewModel 单元测试
 * Phase 5: 测试层级任务展开/收起和完成度计算功能
 */
@OptIn(ExperimentalCoroutinesApi::class)
class TaskListViewModelTest {

    private lateinit var viewModel: TaskListViewModel
    private lateinit var taskRepository: TaskRepository
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        taskRepository = mockk(relaxed = true)
        viewModel = TaskListViewModel(taskRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // ==================== 展开/收起功能测试 ====================

    @Test
    fun `toggleTaskExpanded - 首次展开任务时应加载子任务`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(
            createMockTask(id = 2, title = "子任务1", parentId = parentId),
            createMockTask(id = 3, title = "子任务2", parentId = parentId)
        )
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertTrue("任务应该被展开", uiState.expandedTaskIds.contains(parentId))
        assertEquals("应该加载2个子任务", 2, uiState.loadedChildrenMap[parentId]?.size)
        coVerify { taskRepository.getTaskChildren(parentId) }
    }

    @Test
    fun `toggleTaskExpanded - 再次点击应收起任务`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(createMockTask(id = 2, title = "子任务1", parentId = parentId))
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When - 先展开
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 确认已展开
        assertTrue(viewModel.uiState.value.expandedTaskIds.contains(parentId))

        // When - 再收起
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 确认已收起
        assertFalse("任务应该被收起", viewModel.uiState.value.expandedTaskIds.contains(parentId))
    }

    @Test
    fun `toggleTaskExpanded - 展开已加载的任务不应重复加载子任务`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(createMockTask(id = 2, title = "子任务1", parentId = parentId))
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When - 展开、收起、再展开
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 只应调用一次API
        coVerify(exactly = 1) { taskRepository.getTaskChildren(parentId) }
    }

    @Test
    fun `toggleTaskExpanded - 加载子任务失败应显示错误并收起任务`() = runTest {
        // Given
        val parentId = 1
        coEvery { taskRepository.getTaskChildren(parentId) } returns
            Result.failure(Exception("网络错误"))

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertFalse("任务应该保持收起", uiState.expandedTaskIds.contains(parentId))
        assertNotNull("应该显示错误信息", uiState.error)
        assertTrue("错误信息应包含失败提示", uiState.error?.contains("加载子任务失败") == true)
    }

    // ==================== 完成度计算测试 ====================

    @Test
    fun `getCompletedSubtasksCount - 应正确统计已完成子任务数量`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(
            createMockTask(id = 2, status = TaskStatus.COMPLETED),
            createMockTask(id = 3, status = TaskStatus.TODO),
            createMockTask(id = 4, status = TaskStatus.COMPLETED),
            createMockTask(id = 5, status = TaskStatus.IN_PROGRESS)
        )
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val completedCount = viewModel.getCompletedSubtasksCount(parentId)
        assertEquals("应该有2个已完成的子任务", 2, completedCount)
    }

    @Test
    fun `getCompletedSubtasksCount - 未加载子任务应返回0`() {
        // Given - 未加载任何子任务
        val parentId = 1

        // When
        val completedCount = viewModel.getCompletedSubtasksCount(parentId)

        // Then
        assertEquals("未加载子任务应返回0", 0, completedCount)
    }

    @Test
    fun `getTaskCompletionProgress - 应正确计算完成进度`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(
            createMockTask(id = 2, status = TaskStatus.COMPLETED),
            createMockTask(id = 3, status = TaskStatus.COMPLETED),
            createMockTask(id = 4, status = TaskStatus.TODO),
            createMockTask(id = 5, status = TaskStatus.TODO)
        )
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val progress = viewModel.getTaskCompletionProgress(parentId)
        assertEquals("完成进度应该是50%", 0.5f, progress, 0.01f)
    }

    @Test
    fun `getTaskCompletionProgress - 全部完成应返回1`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(
            createMockTask(id = 2, status = TaskStatus.COMPLETED),
            createMockTask(id = 3, status = TaskStatus.COMPLETED),
            createMockTask(id = 4, status = TaskStatus.COMPLETED)
        )
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val progress = viewModel.getTaskCompletionProgress(parentId)
        assertEquals("全部完成应返回100%", 1.0f, progress, 0.01f)
    }

    @Test
    fun `getTaskCompletionProgress - 全部未完成应返回0`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(
            createMockTask(id = 2, status = TaskStatus.TODO),
            createMockTask(id = 3, status = TaskStatus.IN_PROGRESS)
        )
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val progress = viewModel.getTaskCompletionProgress(parentId)
        assertEquals("全部未完成应返回0%", 0.0f, progress, 0.01f)
    }

    @Test
    fun `getTaskCompletionProgress - 空子任务列表应返回0`() = runTest {
        // Given
        val parentId = 1
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(emptyList())

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val progress = viewModel.getTaskCompletionProgress(parentId)
        assertEquals("空子任务列表应返回0", 0.0f, progress, 0.01f)
    }

    // ==================== 父任务刷新测试 ====================

    @Test
    fun `refreshParentTask - 已展开的父任务应重新加载子任务`() = runTest {
        // Given
        val parentId = 1
        val initialChildren = listOf(
            createMockTask(id = 2, status = TaskStatus.TODO)
        )
        val updatedChildren = listOf(
            createMockTask(id = 2, status = TaskStatus.COMPLETED)
        )

        coEvery { taskRepository.getTaskChildren(parentId) } returnsMany listOf(
            Result.success(initialChildren),
            Result.success(updatedChildren)
        )

        // When - 先展开
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 初始加载
        assertEquals(0, viewModel.getCompletedSubtasksCount(parentId))

        // When - 刷新父任务
        viewModel.refreshParentTask(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 应该加载更新后的数据
        coVerify(exactly = 2) { taskRepository.getTaskChildren(parentId) }
        assertEquals("刷新后应该有1个完成的子任务", 1, viewModel.getCompletedSubtasksCount(parentId))
    }

    @Test
    fun `refreshParentTask - 未展开的父任务不应加载`() = runTest {
        // Given
        val parentId = 1

        // When - 直接刷新（未展开）
        viewModel.refreshParentTask(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 不应调用API
        coVerify(exactly = 0) { taskRepository.getTaskChildren(parentId) }
    }

    @Test
    fun `refreshParentTask - 已展开但未加载的父任务不应加载`() = runTest {
        // Given
        val parentId = 1
        // 手动设置为展开状态，但不加载子任务

        // When - 刷新
        viewModel.refreshParentTask(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 不应调用API（因为loadedChildrenMap中不存在）
        coVerify(exactly = 0) { taskRepository.getTaskChildren(parentId) }
    }

    // ==================== 任务操作测试 ====================

    @Test
    fun `completeTask - 成功完成任务`() = runTest {
        // Given
        val taskId = 1
        val completedTask = createMockTask(id = taskId, status = TaskStatus.COMPLETED)
        coEvery { taskRepository.completeTask(taskId) } returns Result.success(completedTask)

        // When
        viewModel.completeTask(taskId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertNull("不应有错误", uiState.error)
        coVerify { taskRepository.completeTask(taskId) }
    }

    @Test
    fun `completeTask - 失败时应显示错误`() = runTest {
        // Given
        val taskId = 1
        coEvery { taskRepository.completeTask(taskId) } returns
            Result.failure(Exception("操作失败"))

        // When
        viewModel.completeTask(taskId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertNotNull("应该显示错误", uiState.error)
    }

    @Test
    fun `deleteTask - 成功删除任务`() = runTest {
        // Given
        val taskId = 1
        coEvery { taskRepository.deleteTask(taskId) } returns Result.success(Unit)

        // When
        viewModel.deleteTask(taskId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertNull("不应有错误", uiState.error)
        coVerify { taskRepository.deleteTask(taskId) }
    }

    // ==================== 辅助方法测试 ====================

    @Test
    fun `isTaskExpanded - 应正确返回展开状态`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(createMockTask(id = 2))
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When - 展开
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        assertTrue("应该返回已展开", viewModel.isTaskExpanded(parentId))
        assertFalse("未展开的任务应返回false", viewModel.isTaskExpanded(999))
    }

    @Test
    fun `getChildTasks - 应返回已加载的子任务`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(
            createMockTask(id = 2, title = "子任务1"),
            createMockTask(id = 3, title = "子任务2")
        )
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then
        val loadedChildren = viewModel.getChildTasks(parentId)
        assertEquals("应返回2个子任务", 2, loadedChildren.size)
        assertEquals("子任务1", loadedChildren[0].title)
        assertEquals("子任务2", loadedChildren[1].title)
    }

    @Test
    fun `isLoadingChildren - 加载完成后应返回false`() = runTest {
        // Given
        val parentId = 1
        val children = listOf(createMockTask(id = 2))
        coEvery { taskRepository.getTaskChildren(parentId) } returns Result.success(children)

        // When - 展开并等待完成
        viewModel.toggleTaskExpanded(parentId)
        testDispatcher.scheduler.advanceUntilIdle()

        // Then - 加载完成应返回false
        assertFalse("加载完成应返回false", viewModel.isLoadingChildren(parentId))

        // 未加载的任务也应返回false
        assertFalse("未加载的任务应返回false", viewModel.isLoadingChildren(999))
    }

    // ==================== 辅助方法 ====================

    private fun createMockTask(
        id: Int,
        title: String = "Test Task $id",
        status: TaskStatus = TaskStatus.TODO,
        parentId: Int? = null,
        hasChildren: Boolean? = false,
        childrenCount: Int? = 0
    ) = Task(
        id = id,
        title = title,
        description = "Test description",
        status = status,
        priority = TaskPriority.MEDIUM,
        projectId = 1,
        assigneeId = null,
        createdAt = "2025-01-01T00:00:00Z",
        updatedAt = "2025-01-01T00:00:00Z",
        dueDate = null,
        estimatedMinutes = null,
        actualMinutes = null,
        parentId = parentId,
        assignee = null,
        childrenCount = childrenCount,
        taskLevel = if (parentId != null) 1 else 0,
        depth = if (parentId != null) 1 else 0,
        hasChildren = hasChildren
    )
}
