package com.aiproj.mobile.ui.screens.notes

import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.WorkNoteFolderRepository
import com.aiproj.mobile.data.repository.WorkNoteRepository
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * NotesViewModel文件夹功能单元测试
 *
 * 测试覆盖:
 * - 加载文件夹列表
 * - 创建文件夹（成功/失败）
 * - 更新文件夹
 * - 删除文件夹
 * - 移动文件夹（含循环检测）
 * - 错误处理和状态管理
 */
@ExperimentalCoroutinesApi
class NotesViewModelFolderTest {

    private lateinit var noteRepository: WorkNoteRepository
    private lateinit var folderRepository: WorkNoteFolderRepository
    private lateinit var viewModel: NotesViewModel

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        noteRepository = mockk(relaxed = true)
        folderRepository = mockk()
        viewModel = NotesViewModel(noteRepository, folderRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    // ========== 加载文件夹测试 ==========

    @Test
    fun `loadFolders should update folders state on success`() = runTest {
        // Given
        val mockFolders = listOf(
            WorkNoteFolder(
                id = 1,
                name = "测试文件夹",
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "2025-01-01T00:00:00Z",
                updatedAt = "2025-01-01T00:00:00Z"
            )
        )

        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(mockFolders))
        }

        // When
        viewModel.loadFolders()
        advanceUntilIdle()

        // Then
        assertEquals(mockFolders, viewModel.folders.value)
        coVerify { folderRepository.getFolderTree() }
    }

    @Test
    fun `loadFolders should handle empty folder list`() = runTest {
        // Given
        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(emptyList()))
        }

        // When
        viewModel.loadFolders()
        advanceUntilIdle()

        // Then
        assertTrue(viewModel.folders.value.isEmpty())
    }

    // ========== 创建文件夹测试 ==========

    @Test
    fun `createFolder should reload folders on success`() = runTest {
        // Given
        val newFolder = WorkNoteFolder(
            id = 2,
            name = "新文件夹",
            ownerId = 1,
            visibility = WorkNoteVisibility.PRIVATE,
            createdAt = "2025-01-01T00:00:00Z",
            updatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery {
            folderRepository.createFolder(
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
            )
        } returns Result.success(newFolder)

        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(listOf(newFolder)))
        }

        // When
        viewModel.createFolder(
            name = "新文件夹",
            visibility = WorkNoteVisibility.PRIVATE
        )
        advanceUntilIdle()

        // Then
        coVerify {
            folderRepository.createFolder(
                name = "新文件夹",
                description = null,
                parentId = null,
                visibility = WorkNoteVisibility.PRIVATE,
                color = null
            )
        }
        coVerify(atLeast = 1) { folderRepository.getFolderTree() }
        assertEquals("文件夹已创建", viewModel.operationMessage.value)
    }

    @Test
    fun `createFolder should set error state on failure`() = runTest {
        // Given
        coEvery {
            folderRepository.createFolder(
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
            )
        } returns Result.failure(Exception("创建失败"))

        // When
        viewModel.createFolder(name = "测试")
        advanceUntilIdle()

        // Then
        assertEquals("创建文件夹失败: 创建失败", viewModel.folderError.value)
        assertEquals(false, viewModel.folderLoading.value)
    }

    // ========== 更新文件夹测试 ==========

    @Test
    fun `updateFolder should reload folders on success`() = runTest {
        // Given
        val updatedFolder = WorkNoteFolder(
            id = 1,
            name = "更新后",
            ownerId = 1,
            visibility = WorkNoteVisibility.TEAM,
            createdAt = "2025-01-01T00:00:00Z",
            updatedAt = "2025-01-02T00:00:00Z"
        )

        coEvery {
            folderRepository.updateFolder(
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
            )
        } returns Result.success(updatedFolder)

        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(listOf(updatedFolder)))
        }

        // When
        viewModel.updateFolder(
            folderId = 1,
            name = "更新后",
            visibility = WorkNoteVisibility.TEAM
        )
        advanceUntilIdle()

        // Then
        coVerify {
            folderRepository.updateFolder(
                folderId = 1,
                name = "更新后",
                visibility = WorkNoteVisibility.TEAM
            )
        }
        assertEquals("文件夹已更新", viewModel.operationMessage.value)
    }

    // ========== 删除文件夹测试 ==========

    @Test
    fun `deleteFolder should reload folders and clear selection on success`() = runTest {
        // Given
        coEvery { folderRepository.deleteFolder(any()) } returns Result.success(Unit)
        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(emptyList()))
        }

        // 先选中一个文件夹
        viewModel.selectFolder(5)
        advanceUntilIdle()

        // When
        viewModel.deleteFolder(5)
        advanceUntilIdle()

        // Then
        coVerify { folderRepository.deleteFolder(5) }
        assertNull(viewModel.selectedFolderId.value)
        assertEquals("文件夹已删除", viewModel.operationMessage.value)
    }

    @Test
    fun `deleteFolder should not clear selection if different folder deleted`() = runTest {
        // Given
        coEvery { folderRepository.deleteFolder(any()) } returns Result.success(Unit)
        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(emptyList()))
        }

        // 选中文件夹3
        viewModel.selectFolder(3)
        advanceUntilIdle()

        // When - 删除文件夹5
        viewModel.deleteFolder(5)
        advanceUntilIdle()

        // Then
        assertEquals(3, viewModel.selectedFolderId.value)
    }

    // ========== 移动文件夹测试 ==========

    @Test
    fun `moveFolder should reject circular move`() = runTest {
        // Given - 父子关系的文件夹
        val folders = listOf(
            WorkNoteFolder(
                id = 1,
                name = "父",
                parentId = null,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            ),
            WorkNoteFolder(
                id = 2,
                name = "子",
                parentId = 1,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            )
        )

        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(folders))
        }
        every {
            folderRepository.isCircularMove(
                any(),
                any(),
                any()
            )
        } returns true

        viewModel.loadFolders()
        advanceUntilIdle()

        // When - 尝试将父移动到子下
        viewModel.moveFolder(folderId = 1, newParentId = 2)
        advanceUntilIdle()

        // Then
        assertEquals("无法移动文件夹：会形成循环引用", viewModel.folderError.value)
        coVerify(exactly = 0) { folderRepository.moveFolder(any(), any()) }
    }

    @Test
    fun `moveFolder should succeed for valid move`() = runTest {
        // Given
        val movedFolder = WorkNoteFolder(
            id = 2,
            name = "文件夹2",
            parentId = 1,
            ownerId = 1,
            visibility = WorkNoteVisibility.PRIVATE,
            createdAt = "",
            updatedAt = ""
        )

        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(emptyList()))
        }
        every { folderRepository.isCircularMove(any(), any(), any()) } returns false
        coEvery { folderRepository.moveFolder(any(), any()) } returns Result.success(movedFolder)

        viewModel.loadFolders()
        advanceUntilIdle()

        // When
        viewModel.moveFolder(folderId = 2, newParentId = 1)
        advanceUntilIdle()

        // Then
        coVerify { folderRepository.moveFolder(2, 1) }
        assertEquals("文件夹已移动", viewModel.operationMessage.value)
    }

    // ========== 错误清除测试 ==========

    @Test
    fun `clearFolderError should clear error state`() = runTest {
        // Given - 先设置一个错误
        coEvery {
            folderRepository.createFolder(
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
            )
        } returns Result.failure(Exception("测试错误"))

        viewModel.createFolder(name = "测试")
        advanceUntilIdle()

        assertEquals("创建文件夹失败: 测试错误", viewModel.folderError.value)

        // When
        viewModel.clearFolderError()

        // Then
        assertNull(viewModel.folderError.value)
    }

    // ========== 加载状态测试 ==========

    @Test
    fun `folder operations should set loading state correctly`() = runTest {
        // Given
        coEvery {
            folderRepository.createFolder(
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
            )
        } coAnswers {
            kotlinx.coroutines.delay(100)
            Result.success(
                WorkNoteFolder(
                    id = 1,
                    name = "测试",
                    ownerId = 1,
                    visibility = WorkNoteVisibility.PRIVATE,
                    createdAt = "",
                    updatedAt = ""
                )
            )
        }

        coEvery { folderRepository.getFolderTree(any(), any(), any()) } returns flow {
            emit(Result.success(emptyList()))
        }

        // When
        viewModel.createFolder(name = "测试")

        // 检查加载状态
        testScheduler.advanceTimeBy(50)
        assertEquals(true, viewModel.folderLoading.value)

        // 等待完成
        advanceUntilIdle()
        assertEquals(false, viewModel.folderLoading.value)
    }
}
