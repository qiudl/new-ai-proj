package com.aiproj.mobile.ui.screens.ai.description

import androidx.lifecycle.SavedStateHandle
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.AIDescriptionRepository
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
 * AIDescriptionViewModel单元测试
 *
 * 测试AI描述生成的核心业务逻辑
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AIDescriptionViewModelTest {

    private lateinit var repository: AIDescriptionRepository
    private lateinit var savedStateHandle: SavedStateHandle
    private lateinit var viewModel: AIDescriptionViewModel

    private val testDispatcher = StandardTestDispatcher()
    private val testTaskId = 123

    @Before
    fun setup() {
        repository = mockk()
        savedStateHandle = SavedStateHandle(mapOf("taskId" to testTaskId))
        Dispatchers.setMain(testDispatcher)
        viewModel = AIDescriptionViewModel(repository, savedStateHandle)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        clearAllMocks()
    }

    @Test
    fun `test initial state`() {
        assertEquals(AIDescriptionUiState.Idle, viewModel.uiState.value)
        assertEquals("gpt-4o", viewModel.selectedModel)
        assertEquals("medium", viewModel.selectedLength)
        assertEquals("technical", viewModel.selectedStyle)
        assertEquals("", viewModel.customPrompt)
    }

    @Test
    fun `test update model`() {
        viewModel.onModelChange("claude-3-sonnet")
        assertEquals("claude-3-sonnet", viewModel.selectedModel)
    }

    @Test
    fun `test update length`() {
        viewModel.onLengthChange("long")
        assertEquals("long", viewModel.selectedLength)
    }

    @Test
    fun `test update style`() {
        viewModel.onStyleChange("casual")
        assertEquals("casual", viewModel.selectedStyle)
    }

    @Test
    fun `test update custom prompt`() {
        val prompt = "强调性能优化"
        viewModel.onPromptChange(prompt)
        assertEquals(prompt, viewModel.customPrompt)
    }

    @Test
    fun `test generate description success`() = runTest {
        val response = DescriptionGenerateResponse(
            description = "这是一个用于实现用户认证功能的任务，包括登录、注册、密码重置等核心功能。采用JWT进行会话管理，使用BCrypt进行密码加密。",
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z",
            wordCount = 56
        )

        coEvery {
            repository.generateDescription(testTaskId, any())
        } returns Result.success(response)

        viewModel.generateDescription()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDescriptionUiState.Success)
        val successState = viewModel.uiState.value as AIDescriptionUiState.Success
        assertEquals(56, successState.response.wordCount)
        assertTrue(successState.response.description.contains("用户认证"))
    }

    @Test
    fun `test generate description API failure`() = runTest {
        coEvery {
            repository.generateDescription(testTaskId, any())
        } returns Result.failure(Exception("生成失败"))

        viewModel.generateDescription()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDescriptionUiState.Error)
        val errorState = viewModel.uiState.value as AIDescriptionUiState.Error
        assertEquals("生成描述失败", errorState.message)
    }

    @Test
    fun `test apply description success`() = runTest {
        // First generate
        val generateResponse = DescriptionGenerateResponse(
            description = "生成的任务描述",
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z",
            wordCount = 7
        )

        coEvery {
            repository.generateDescription(testTaskId, any())
        } returns Result.success(generateResponse)

        viewModel.generateDescription()
        advanceUntilIdle()

        // Then apply
        coEvery {
            repository.updateTaskDescription(testTaskId, "生成的任务描述")
        } returns Result.success(mockk())

        viewModel.applyDescription()
        advanceUntilIdle()

        assertEquals(AIDescriptionUiState.Applied, viewModel.uiState.value)
    }

    @Test
    fun `test apply description without generation fails`() = runTest {
        viewModel.applyDescription()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDescriptionUiState.Error)
        val errorState = viewModel.uiState.value as AIDescriptionUiState.Error
        assertEquals("没有可应用的描述", errorState.message)
    }

    @Test
    fun `test apply description API failure`() = runTest {
        // First generate
        val generateResponse = DescriptionGenerateResponse(
            description = "生成的任务描述",
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z",
            wordCount = 7
        )

        coEvery {
            repository.generateDescription(testTaskId, any())
        } returns Result.success(generateResponse)

        viewModel.generateDescription()
        advanceUntilIdle()

        // Apply fails
        coEvery {
            repository.updateTaskDescription(testTaskId, any())
        } returns Result.failure(Exception("更新失败"))

        viewModel.applyDescription()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDescriptionUiState.Error)
        val errorState = viewModel.uiState.value as AIDescriptionUiState.Error
        assertEquals("应用描述失败: 更新失败", errorState.message)
    }

    @Test
    fun `test regenerate`() = runTest {
        val response = DescriptionGenerateResponse(
            description = "描述",
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z",
            wordCount = 2
        )

        coEvery {
            repository.generateDescription(testTaskId, any())
        } returns Result.success(response)

        viewModel.generateDescription()
        advanceUntilIdle()

        viewModel.regenerate()
        advanceUntilIdle()

        coVerify(exactly = 2) {
            repository.generateDescription(testTaskId, any())
        }
    }

    @Test
    fun `test reset to idle`() = runTest {
        val response = DescriptionGenerateResponse(
            description = "描述",
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z",
            wordCount = 2
        )

        coEvery {
            repository.generateDescription(testTaskId, any())
        } returns Result.success(response)

        viewModel.generateDescription()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDescriptionUiState.Success)

        viewModel.resetToIdle()
        assertEquals(AIDescriptionUiState.Idle, viewModel.uiState.value)
    }

    @Test
    fun `test custom prompt is included in request`() = runTest {
        val customPrompt = "请强调安全性"
        val response = DescriptionGenerateResponse(
            description = "描述",
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z",
            wordCount = 2
        )

        val capturedRequest = slot<DescriptionGenerateRequest>()
        coEvery {
            repository.generateDescription(testTaskId, capture(capturedRequest))
        } returns Result.success(response)

        viewModel.onPromptChange(customPrompt)
        viewModel.generateDescription()
        advanceUntilIdle()

        assertEquals(customPrompt, capturedRequest.captured.customPrompt)
    }

    @Test
    fun `test all parameters are passed to repository`() = runTest {
        val response = DescriptionGenerateResponse(
            description = "描述",
            modelUsed = "deepseek-chat",
            generatedAt = "2025-01-01T00:00:00Z",
            wordCount = 2
        )

        val capturedRequest = slot<DescriptionGenerateRequest>()
        coEvery {
            repository.generateDescription(testTaskId, capture(capturedRequest))
        } returns Result.success(response)

        viewModel.onModelChange("deepseek-chat")
        viewModel.onLengthChange("long")
        viewModel.onStyleChange("casual")
        viewModel.onPromptChange("测试提示")
        viewModel.generateDescription()
        advanceUntilIdle()

        assertEquals("deepseek-chat", capturedRequest.captured.model)
        assertEquals("long", capturedRequest.captured.length)
        assertEquals("casual", capturedRequest.captured.style)
        assertEquals("测试提示", capturedRequest.captured.customPrompt)
    }
}
