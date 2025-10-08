package com.aiproj.mobile.ui.screens.ai.subtask

import androidx.lifecycle.SavedStateHandle
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.AISubtaskRepository
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * AISubtaskViewModel单元测试
 *
 * 测试AI子任务生成的核心业务逻辑
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AISubtaskViewModelTest {

    private lateinit var repository: AISubtaskRepository
    private lateinit var savedStateHandle: SavedStateHandle
    private lateinit var viewModel: AISubtaskViewModel

    private val testDispatcher = StandardTestDispatcher()
    private val testTaskId = 123

    @Before
    fun setup() {
        repository = mockk()
        savedStateHandle = SavedStateHandle(mapOf("taskId" to testTaskId))
        Dispatchers.setMain(testDispatcher)
        viewModel = AISubtaskViewModel(repository, savedStateHandle)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        clearAllMocks()
    }

    @Test
    fun `test initial state`() {
        assertEquals(AISubtaskUiState.Idle, viewModel.uiState.value)
        assertEquals("gpt-4o", viewModel.selectedModel)
        assertEquals(5, viewModel.subtaskCount)
        assertEquals("", viewModel.customPrompt)
        assertEquals(true, viewModel.includeEstimates)
    }

    @Test
    fun `test update model`() {
        viewModel.onModelChange("deepseek-chat")
        assertEquals("deepseek-chat", viewModel.selectedModel)
    }

    @Test
    fun `test update subtask count`() {
        viewModel.onCountChange(8)
        assertEquals(8, viewModel.subtaskCount)
    }

    @Test
    fun `test update custom prompt`() {
        val prompt = "请按照模块拆分"
        viewModel.onPromptChange(prompt)
        assertEquals(prompt, viewModel.customPrompt)
    }

    @Test
    fun `test toggle include estimates`() {
        assertEquals(true, viewModel.includeEstimates)
        viewModel.toggleIncludeEstimates()
        assertEquals(false, viewModel.includeEstimates)
        viewModel.toggleIncludeEstimates()
        assertEquals(true, viewModel.includeEstimates)
    }

    @Test
    fun `test generate subtasks success`() = runTest {
        val response = SubtaskGenerateResponse(
            subtasks = listOf(
                GeneratedSubtask(
                    title = "设计数据库表结构",
                    description = "创建users、tasks等表",
                    priority = "high",
                    estimatedHours = 2.0f,
                    order = 1
                ),
                GeneratedSubtask(
                    title = "实现API接口",
                    description = "开发RESTful API",
                    priority = "medium",
                    estimatedHours = 4.0f,
                    order = 2
                )
            ),
            metadata = SubtaskMetadata(
                totalSubtasks = 2,
                estimatedTotalHours = 6.0f,
                breakdownLogic = "按照开发流程拆分"
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateSubtasks(testTaskId, any())
        } returns Result.success(response)

        viewModel.generateSubtasks()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AISubtaskUiState.Success)
        val successState = viewModel.uiState.value as AISubtaskUiState.Success
        assertEquals(2, successState.subtasks.size)
        assertEquals("设计数据库表结构", successState.subtasks[0].title)
        assertEquals(6.0f, successState.metadata.estimatedTotalHours)
    }

    @Test
    fun `test generate subtasks API failure`() = runTest {
        coEvery {
            repository.generateSubtasks(testTaskId, any())
        } returns Result.failure(Exception("生成失败"))

        viewModel.generateSubtasks()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AISubtaskUiState.Error)
        val errorState = viewModel.uiState.value as AISubtaskUiState.Error
        assertEquals("生成子任务失败", errorState.message)
    }

    @Test
    fun `test create subtasks success`() = runTest {
        // First generate subtasks
        val generateResponse = SubtaskGenerateResponse(
            subtasks = listOf(
                GeneratedSubtask(
                    title = "子任务1",
                    description = "描述1",
                    priority = "high",
                    estimatedHours = 2.0f,
                    order = 1
                )
            ),
            metadata = SubtaskMetadata(
                totalSubtasks = 1,
                estimatedTotalHours = 2.0f,
                breakdownLogic = "测试"
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateSubtasks(testTaskId, any())
        } returns Result.success(generateResponse)

        viewModel.generateSubtasks()
        advanceUntilIdle()

        // Then create them
        val batchResponse = BatchCreateSubtasksResponse(
            success = true,
            createdCount = 1,
            subtasks = listOf(
                CreatedSubtask(
                    id = 201,
                    title = "子任务1",
                    parentTaskId = testTaskId,
                    createdAt = "2025-01-01T00:00:00Z"
                )
            ),
            message = "创建成功"
        )

        coEvery {
            repository.batchCreateSubtasks(any())
        } returns Result.success(batchResponse)

        viewModel.createSubtasks()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AISubtaskUiState.Created)
        val createdState = viewModel.uiState.value as AISubtaskUiState.Created
        assertEquals(1, createdState.createdCount)
        assertEquals(201, createdState.subtaskIds[0])
    }

    @Test
    fun `test create subtasks without generation fails`() = runTest {
        viewModel.createSubtasks()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AISubtaskUiState.Error)
        val errorState = viewModel.uiState.value as AISubtaskUiState.Error
        assertEquals("没有可创建的子任务", errorState.message)
    }

    @Test
    fun `test create subtasks API failure`() = runTest {
        // First generate
        val generateResponse = SubtaskGenerateResponse(
            subtasks = listOf(
                GeneratedSubtask(
                    title = "子任务1",
                    description = "描述1",
                    priority = "high",
                    estimatedHours = 2.0f,
                    order = 1
                )
            ),
            metadata = SubtaskMetadata(
                totalSubtasks = 1,
                estimatedTotalHours = 2.0f,
                breakdownLogic = "测试"
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateSubtasks(testTaskId, any())
        } returns Result.success(generateResponse)

        viewModel.generateSubtasks()
        advanceUntilIdle()

        // Create fails
        coEvery {
            repository.batchCreateSubtasks(any())
        } returns Result.failure(Exception("创建失败"))

        viewModel.createSubtasks()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AISubtaskUiState.Error)
        val errorState = viewModel.uiState.value as AISubtaskUiState.Error
        assertEquals("创建子任务失败: 创建失败", errorState.message)
    }

    @Test
    fun `test regenerate`() = runTest {
        val response = SubtaskGenerateResponse(
            subtasks = listOf(),
            metadata = SubtaskMetadata(
                totalSubtasks = 0,
                estimatedTotalHours = 0f,
                breakdownLogic = ""
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateSubtasks(testTaskId, any())
        } returns Result.success(response)

        viewModel.generateSubtasks()
        advanceUntilIdle()

        viewModel.regenerate()
        advanceUntilIdle()

        coVerify(exactly = 2) {
            repository.generateSubtasks(testTaskId, any())
        }
    }

    @Test
    fun `test reset to idle`() = runTest {
        val response = SubtaskGenerateResponse(
            subtasks = listOf(),
            metadata = SubtaskMetadata(
                totalSubtasks = 0,
                estimatedTotalHours = 0f,
                breakdownLogic = ""
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateSubtasks(testTaskId, any())
        } returns Result.success(response)

        viewModel.generateSubtasks()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AISubtaskUiState.Success)

        viewModel.resetToIdle()
        assertEquals(AISubtaskUiState.Idle, viewModel.uiState.value)
    }
}
