package com.aiproj.mobile.ui.screens.ai.document

import androidx.lifecycle.SavedStateHandle
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.AIDocumentRepository
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
 * AIDocumentViewModel单元测试
 *
 * 测试AI文档生成的核心业务逻辑
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AIDocumentViewModelTest {

    private lateinit var repository: AIDocumentRepository
    private lateinit var savedStateHandle: SavedStateHandle
    private lateinit var viewModel: AIDocumentViewModel

    private val testDispatcher = StandardTestDispatcher()
    private val testTaskId = 123

    @Before
    fun setup() {
        repository = mockk()
        savedStateHandle = SavedStateHandle(mapOf("taskId" to testTaskId))
        Dispatchers.setMain(testDispatcher)

        // Mock document types
        coEvery { repository.getDocumentTypes() } returns Result.success(
            DocumentTypesData(
                types = listOf(
                    AIDocumentType("technical_design", "技术设计文档", "系统架构、技术选型、接口设计"),
                    AIDocumentType("api_doc", "API文档", "接口规范、参数说明、示例代码")
                ),
                total = 2
            )
        )

        viewModel = AIDocumentViewModel(repository, savedStateHandle)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        clearAllMocks()
    }

    @Test
    fun `test initial state`() {
        assertEquals(AIDocumentUiState.Idle, viewModel.uiState.value)
        assertEquals("gpt-4o", viewModel.selectedModel)
    }

    @Test
    fun `test load document types success`() = runTest {
        advanceUntilIdle()

        assertEquals(AIDocumentUiState.Idle, viewModel.uiState.value)
        assertEquals(2, viewModel.documentTypes.value.size)
        assertEquals("technical_design", viewModel.documentTypes.value[0].type)
        assertEquals("technical_design", viewModel.selectedDocType) // First type auto-selected
    }

    @Test
    fun `test load document types failure`() = runTest {
        clearAllMocks()
        coEvery { repository.getDocumentTypes() } returns Result.failure(Exception("Network error"))

        val newViewModel = AIDocumentViewModel(repository, savedStateHandle)
        advanceUntilIdle()

        assertTrue(newViewModel.uiState.value is AIDocumentUiState.Error)
        val errorState = newViewModel.uiState.value as AIDocumentUiState.Error
        assertEquals("加载文档类型失败: Network error", errorState.message)
    }

    @Test
    fun `test update model`() {
        viewModel.onModelChange("deepseek-chat")
        assertEquals("deepseek-chat", viewModel.selectedModel)
    }

    @Test
    fun `test update doc type`() {
        viewModel.onDocTypeChange("technical_design")
        assertEquals("technical_design", viewModel.selectedDocType)
    }

    @Test
    fun `test update custom prompt`() {
        val prompt = "请详细说明数据库设计"
        viewModel.onPromptChange(prompt)
        assertEquals(prompt, viewModel.customPrompt)
    }

    @Test
    fun `test generate document success`() = runTest {
        advanceUntilIdle() // Load types first

        val response = AIDocumentGenerateResponse(
            document = DocumentData(
                title = "任务#123技术设计文档",
                content = "# 技术设计文档\n\n## 系统架构\n...",
                metadata = DocumentMetadata(
                    wordCount = 1500,
                    estimatedReadTime = "5分钟",
                    sections = listOf("系统架构", "技术选型", "接口设计")
                )
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateDocument(any())
        } returns Result.success(response)

        viewModel.onDocTypeChange("technical_design")
        viewModel.generateDocument()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDocumentUiState.Success)
        val successState = viewModel.uiState.value as AIDocumentUiState.Success
        assertEquals("# 技术设计文档\n\n## 系统架构\n...", successState.document.content)
        assertEquals(1500, successState.document.metadata.wordCount)
    }

    @Test
    fun `test generate document without doc type fails`() = runTest {
        advanceUntilIdle() // Load types first

        viewModel.onDocTypeChange("")
        viewModel.generateDocument()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDocumentUiState.Error)
        val errorState = viewModel.uiState.value as AIDocumentUiState.Error
        assertEquals("请选择文档类型", errorState.message)
    }

    @Test
    fun `test generate document API failure`() = runTest {
        advanceUntilIdle() // Load types first

        coEvery {
            repository.generateDocument(any())
        } returns Result.failure(Exception("生成失败"))

        viewModel.onDocTypeChange("technical_design")
        viewModel.generateDocument()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDocumentUiState.Error)
        val errorState = viewModel.uiState.value as AIDocumentUiState.Error
        assertEquals("生成文档失败", errorState.message)
    }

    @Test
    fun `test regenerate calls generate again`() = runTest {
        advanceUntilIdle()

        val response = AIDocumentGenerateResponse(
            document = DocumentData(
                title = "Title",
                content = "Content",
                metadata = DocumentMetadata(
                    wordCount = 100,
                    estimatedReadTime = "1分钟",
                    sections = emptyList()
                )
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateDocument(any())
        } returns Result.success(response)

        viewModel.onDocTypeChange("technical_design")
        viewModel.generateDocument()
        advanceUntilIdle()

        // Regenerate
        viewModel.regenerate()
        advanceUntilIdle()

        coVerify(exactly = 2) {
            repository.generateDocument(any())
        }
    }

    @Test
    fun `test reset to idle`() = runTest {
        advanceUntilIdle()

        val response = AIDocumentGenerateResponse(
            document = DocumentData(
                title = "Title",
                content = "Content",
                metadata = DocumentMetadata(
                    wordCount = 100,
                    estimatedReadTime = "1分钟",
                    sections = emptyList()
                )
            ),
            modelUsed = "gpt-4o",
            generatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            repository.generateDocument(any())
        } returns Result.success(response)

        viewModel.onDocTypeChange("technical_design")
        viewModel.generateDocument()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is AIDocumentUiState.Success)

        viewModel.resetToIdle()
        assertTrue(viewModel.uiState.value is AIDocumentUiState.Idle)
    }
}
