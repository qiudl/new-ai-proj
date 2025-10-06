package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.models.*
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response

class TaskRepositoryTest {

    private lateinit var taskApi: TaskApi
    private lateinit var repository: TaskRepository

    @Before
    fun setup() {
        taskApi = mockk()
        repository = TaskRepository(taskApi)
    }

    @Test
    fun `getTasks returns success result`() = runTest {
        val mockTasks = listOf(
            Task(id = 1, title = "Test Task", status = TaskStatus.TODO, priority = TaskPriority.HIGH)
        )
        val mockResponse = TaskListResponse(items = mockTasks, total = 1, page = 1, limit = 10)

        coEvery { taskApi.getTasks(any(), any(), any(), any(), any()) } returns Response.success(mockResponse)

        val result = repository.getTasks(page = 1, limit = 10)

        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrNull()?.items?.size)
    }
}
