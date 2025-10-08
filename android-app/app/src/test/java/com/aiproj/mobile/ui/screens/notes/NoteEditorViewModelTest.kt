package com.aiproj.mobile.ui.screens.notes

import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.WorkNoteRepository
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
 * NoteEditorViewModel单元测试
 *
 * 测试笔记编辑器的核心业务逻辑
 */
@OptIn(ExperimentalCoroutinesApi::class)
class NoteEditorViewModelTest {

    private lateinit var repository: WorkNoteRepository

    private lateinit var viewModel: NoteEditorViewModel

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        repository = mockk()
        Dispatchers.setMain(testDispatcher)
        viewModel = NoteEditorViewModel(repository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        clearAllMocks()
    }

    @Test
    fun `test initial state`() {
        // 验证初始状态
        assertEquals("", viewModel.title.value)
        assertEquals("", viewModel.content.value)
        assertEquals(WorkNoteType.MARKDOWN, viewModel.noteType.value)
        assertEquals(WorkNotePriority.MEDIUM, viewModel.priority.value)
        assertEquals(WorkNoteVisibility.PRIVATE, viewModel.visibility.value)
        assertEquals(false, viewModel.isPinned.value)
        assertEquals(false, viewModel.isBookmarked.value)
    }

    @Test
    fun `test update title`() {
        viewModel.updateTitle("Test Title")
        assertEquals("Test Title", viewModel.title.value)
    }

    @Test
    fun `test update content`() {
        viewModel.updateContent("Test Content")
        assertEquals("Test Content", viewModel.content.value)
    }

    @Test
    fun `test toggle preview mode`() {
        assertEquals(false, viewModel.isPreviewMode.value)
        viewModel.togglePreviewMode()
        assertEquals(true, viewModel.isPreviewMode.value)
        viewModel.togglePreviewMode()
        assertEquals(false, viewModel.isPreviewMode.value)
    }

    @Test
    fun `test update metadata`() {
        viewModel.updateType(WorkNoteType.HTML)
        assertEquals(WorkNoteType.HTML, viewModel.noteType.value)

        viewModel.updatePriority(WorkNotePriority.HIGH)
        assertEquals(WorkNotePriority.HIGH, viewModel.priority.value)

        viewModel.updateVisibility(WorkNoteVisibility.PUBLIC)
        assertEquals(WorkNoteVisibility.PUBLIC, viewModel.visibility.value)
    }

    @Test
    fun `test toggle pinned and bookmarked`() {
        assertEquals(false, viewModel.isPinned.value)
        viewModel.togglePinned()
        assertEquals(true, viewModel.isPinned.value)

        assertEquals(false, viewModel.isBookmarked.value)
        viewModel.toggleBookmarked()
        assertEquals(true, viewModel.isBookmarked.value)
    }

    @Test
    fun `test update tags`() {
        val tags = listOf("tag1", "tag2", "tag3")
        viewModel.updateTags(tags)
        assertEquals(tags, viewModel.tags.value)
    }

    @Test
    fun `test has unsaved changes - new note`() {
        // 新笔记，没有输入时不应该有未保存更改
        assertEquals(false, viewModel.hasUnsavedChanges())

        // 输入标题后应该有未保存更改
        viewModel.updateTitle("New Note")
        assertEquals(true, viewModel.hasUnsavedChanges())
    }

    @Test
    fun `test load note success`() = runTest {
        val testNote = WorkNote(
            id = 1,
            title = "Test Note",
            content = "Test Content",
            workNoteType = WorkNoteType.MARKDOWN,
            priority = WorkNotePriority.HIGH,
            visibility = WorkNoteVisibility.TEAM,
            status = WorkNoteStatus.PUBLISHED,
            isPinned = true,
            isBookmarked = false,
            tags = listOf("test", "sample"),
            workNoteFolderId = null,
            ownerId = 1,
            createdAt = "2024-01-01T00:00:00",
            updatedAt = "2024-01-01T00:00:00"
        )

        coEvery { repository.getNoteById(1) } returns Result.success(testNote)
        coEvery { repository.getFolders() } returns Result.success(emptyList())

        viewModel.loadNote(1)
        advanceUntilIdle()

        assertEquals("Test Note", viewModel.title.value)
        assertEquals("Test Content", viewModel.content.value)
        assertEquals(WorkNoteType.MARKDOWN, viewModel.noteType.value)
        assertEquals(WorkNotePriority.HIGH, viewModel.priority.value)
        assertEquals(WorkNoteVisibility.TEAM, viewModel.visibility.value)
        assertEquals(true, viewModel.isPinned.value)
        assertEquals(false, viewModel.isBookmarked.value)
    }

    @Test
    fun `test save new note success`() = runTest {
        val savedNote = WorkNote(
            id = 1,
            title = "New Note",
            content = "New Content",
            workNoteType = WorkNoteType.MARKDOWN,
            priority = WorkNotePriority.MEDIUM,
            visibility = WorkNoteVisibility.PRIVATE,
            status = WorkNoteStatus.DRAFT,
            isPinned = false,
            isBookmarked = false,
            ownerId = 1,
            createdAt = "2024-01-01T00:00:00",
            updatedAt = "2024-01-01T00:00:00"
        )

        coEvery { repository.createNote(any()) } returns Result.success(savedNote)

        viewModel.updateTitle("New Note")
        viewModel.updateContent("New Content")

        viewModel.saveNote()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is NoteEditorViewModel.UiState.SaveSuccess)
    }

    @Test
    fun `test save note with empty title fails`() = runTest {
        viewModel.updateTitle("")
        viewModel.updateContent("Some content")

        viewModel.saveNote()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value is NoteEditorViewModel.UiState.Error)
        val errorState = viewModel.uiState.value as NoteEditorViewModel.UiState.Error
        assertEquals("标题不能为空", errorState.message)
    }
}
