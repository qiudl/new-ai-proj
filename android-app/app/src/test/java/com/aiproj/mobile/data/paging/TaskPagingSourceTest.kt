package com.aiproj.mobile.data.paging

import androidx.paging.PagingSource
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.local.dao.TaskDao
import com.aiproj.mobile.data.models.ApiResponse
import com.aiproj.mobile.data.models.Pagination
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskListData
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.network.ConnectivityObserver
import io.mockk.coEvery
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

/**
 * TaskPagingSource单元测试
 */
class TaskPagingSourceTest {

    private lateinit var taskApi: TaskApi
    private lateinit var taskDao: TaskDao
    private lateinit var connectivityObserver: ConnectivityObserver
    private lateinit var pagingSource: TaskPagingSource

    @Before
    fun setup() {
        taskApi = mockk()
        taskDao = mockk()
        connectivityObserver = mockk()
    }

    @Test
    fun `load returns page when network is available`() = runTest {
        // Given
        val mockTasks = listOf(
            createMockTask(1, "Task 1"),
            createMockTask(2, "Task 2"),
            createMockTask(3, "Task 3")
        )

        val taskListData = TaskListData(
            data = mockTasks,
            pagination = Pagination(
                page = 1,
                limit = 20,
                total = 3,
                totalPages = 1,
                hasNext = false,
                hasPrev = false
            )
        )

        val apiResponse = ApiResponse(
            success = true,
            message = "成功",
            data = taskListData,
            error = null
        )

        every { connectivityObserver.isConnected() } returns true
        coEvery { taskApi.getTasks(any(), any(), any(), any(), any()) } returns Response.success(apiResponse)
        coEvery { taskDao.deleteAllTasks() } returns Unit
        coEvery { taskDao.insertTask(any()) } returns 1L

        pagingSource = TaskPagingSource(
            taskApi = taskApi,
            taskDao = taskDao,
            connectivityObserver = connectivityObserver
        )

        // When
        val result = pagingSource.load(
            PagingSource.LoadParams.Refresh(
                key = null,
                loadSize = 20,
                placeholdersEnabled = false
            )
        )

        // Then
        assertTrue(result is PagingSource.LoadResult.Page)
        val pageResult = result as PagingSource.LoadResult.Page
        assertEquals(3, pageResult.data.size)
        assertEquals("Task 1", pageResult.data[0].title)
        assertEquals(null, pageResult.prevKey)
        assertEquals(null, pageResult.nextKey) // 因为tasks.size < pageSize
    }

    @Test
    fun `load returns page from local when network unavailable`() = runTest {
        // Given
        val mockTaskEntities = listOf(
            createMockTask(1, "Cached Task 1"),
            createMockTask(2, "Cached Task 2")
        )

        every { connectivityObserver.isConnected() } returns false
        coEvery { taskDao.getTasksPaged(any(), any()) } returns mockTaskEntities.map {
            mockk(relaxed = true)
        }

        pagingSource = TaskPagingSource(
            taskApi = taskApi,
            taskDao = taskDao,
            connectivityObserver = connectivityObserver
        )

        // When
        val result = pagingSource.load(
            PagingSource.LoadParams.Refresh(
                key = null,
                loadSize = 20,
                placeholdersEnabled = false
            )
        )

        // Then
        assertTrue(result is PagingSource.LoadResult.Page)
    }

    @Test
    fun `load returns error when network request fails`() = runTest {
        // Given
        every { connectivityObserver.isConnected() } returns true
        coEvery { taskApi.getTasks(any(), any(), any(), any(), any()) } throws Exception("Network error")
        coEvery { taskDao.getTasksPaged(any(), any()) } returns emptyList()

        pagingSource = TaskPagingSource(
            taskApi = taskApi,
            taskDao = taskDao,
            connectivityObserver = connectivityObserver
        )

        // When
        val result = pagingSource.load(
            PagingSource.LoadParams.Refresh(
                key = null,
                loadSize = 20,
                placeholdersEnabled = false
            )
        )

        // Then
        // Should fallback to local data
        assertTrue(result is PagingSource.LoadResult.Page)
    }

    private fun createMockTask(id: Int, title: String) = Task(
        id = id,
        title = title,
        description = "Test description",
        status = TaskStatus.TODO,
        priority = TaskPriority.MEDIUM,
        projectId = 1,
        assigneeId = null,
        createdAt = "2025-01-01T00:00:00Z",
        updatedAt = "2025-01-01T00:00:00Z",
        dueDate = null,
        estimatedMinutes = null,
        actualMinutes = null,
        parentId = null,
        assignee = null,
        childrenCount = 0,
        completedChildrenCount = 0
    )
}
