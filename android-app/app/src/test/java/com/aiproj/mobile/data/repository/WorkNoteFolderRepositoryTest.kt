package com.aiproj.mobile.data.repository

import android.content.Context
import com.aiproj.mobile.data.api.WorkNoteApi
import com.aiproj.mobile.data.models.*
import io.mockk.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.Response
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * WorkNoteFolderRepository单元测试
 *
 * 测试覆盖:
 * - 文件夹树获取（成功/失败）
 * - 缓存机制验证
 * - CRUD操作（创建/更新/删除/移动）
 * - 循环引用检测
 */
class WorkNoteFolderRepositoryTest {

    private lateinit var api: WorkNoteApi
    private lateinit var context: Context
    private lateinit var repository: WorkNoteFolderRepository

    @Before
    fun setup() {
        api = mockk()
        context = mockk(relaxed = true)
        repository = WorkNoteFolderRepository(api, context)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    // ========== 获取文件夹树测试 ==========

    @Test
    fun `getFolderTree should return success when API call succeeds`() = runTest {
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
        val mockResponse = FolderTreeResponse(
            code = 200,
            message = "成功",
            data = FolderTreeData(
                folders = mockFolders,
                total = 1
            )
        )

        coEvery { api.getFolderTree(any(), any()) } returns Response.success(mockResponse)

        // When
        val result = repository.getFolderTree().first()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(mockFolders, result.getOrNull())
        coVerify { api.getFolderTree(null, 2) }
    }

    @Test
    fun `getFolderTree should return failure when API call fails`() = runTest {
        // Given
        coEvery { api.getFolderTree(any(), any()) } returns Response.error(
            404,
            mockk(relaxed = true)
        )

        // When
        val result = repository.getFolderTree().first()

        // Then
        assertTrue(result.isFailure)
        assertNotNull(result.exceptionOrNull())
    }

    @Test
    fun `getFolderTree should handle network exception`() = runTest {
        // Given
        coEvery { api.getFolderTree(any(), any()) } throws Exception("Network error")

        // When
        val result = repository.getFolderTree().first()

        // Then
        assertTrue(result.isFailure)
        assertEquals("Network error", result.exceptionOrNull()?.message)
    }

    // ========== 创建文件夹测试 ==========

    @Test
    fun `createFolder should return success with created folder`() = runTest {
        // Given
        val newFolder = WorkNoteFolder(
            id = 2,
            name = "新文件夹",
            ownerId = 1,
            visibility = WorkNoteVisibility.PRIVATE,
            createdAt = "2025-01-01T00:00:00Z",
            updatedAt = "2025-01-01T00:00:00Z"
        )

        coEvery { api.createFolder(any()) } returns Response.success(newFolder)

        // When
        val result = repository.createFolder(
            name = "新文件夹",
            visibility = WorkNoteVisibility.PRIVATE
        )

        // Then
        assertTrue(result.isSuccess)
        assertEquals(newFolder, result.getOrNull())
        assertEquals("新文件夹", result.getOrNull()?.name)
    }

    @Test
    fun `createFolder should return failure when API call fails`() = runTest {
        // Given
        coEvery { api.createFolder(any()) } returns Response.error(
            400,
            mockk(relaxed = true)
        )

        // When
        val result = repository.createFolder(name = "测试")

        // Then
        assertTrue(result.isFailure)
    }

    // ========== 更新文件夹测试 ==========

    @Test
    fun `updateFolder should return success with updated folder`() = runTest {
        // Given
        val updatedFolder = WorkNoteFolder(
            id = 1,
            name = "更新后的名称",
            ownerId = 1,
            visibility = WorkNoteVisibility.TEAM,
            createdAt = "2025-01-01T00:00:00Z",
            updatedAt = "2025-01-02T00:00:00Z"
        )

        coEvery { api.updateFolder(any(), any()) } returns Response.success(updatedFolder)

        // When
        val result = repository.updateFolder(
            folderId = 1,
            name = "更新后的名称",
            visibility = WorkNoteVisibility.TEAM
        )

        // Then
        assertTrue(result.isSuccess)
        assertEquals("更新后的名称", result.getOrNull()?.name)
        assertEquals(WorkNoteVisibility.TEAM, result.getOrNull()?.visibility)
    }

    // ========== 删除文件夹测试 ==========

    @Test
    fun `deleteFolder should return success when deletion succeeds`() = runTest {
        // Given
        coEvery { api.deleteFolder(any()) } returns Response.success(Unit)

        // When
        val result = repository.deleteFolder(folderId = 1)

        // Then
        assertTrue(result.isSuccess)
        coVerify { api.deleteFolder(1) }
    }

    @Test
    fun `deleteFolder should return failure when API call fails`() = runTest {
        // Given
        coEvery { api.deleteFolder(any()) } returns Response.error(
            403,
            mockk(relaxed = true)
        )

        // When
        val result = repository.deleteFolder(folderId = 1)

        // Then
        assertTrue(result.isFailure)
    }

    // ========== 移动文件夹测试 ==========

    @Test
    fun `moveFolder should return success with moved folder`() = runTest {
        // Given
        val movedFolder = WorkNoteFolder(
            id = 2,
            name = "子文件夹",
            parentId = 1,
            ownerId = 1,
            visibility = WorkNoteVisibility.PRIVATE,
            createdAt = "2025-01-01T00:00:00Z",
            updatedAt = "2025-01-02T00:00:00Z"
        )

        coEvery { api.moveFolder(any(), any()) } returns Response.success(movedFolder)

        // When
        val result = repository.moveFolder(folderId = 2, newParentId = 1)

        // Then
        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrNull()?.parentId)
    }

    // ========== 循环引用检测测试 ==========

    @Test
    fun `isCircularMove should detect circular reference - direct parent-child`() {
        // Given - 尝试将父文件夹移动到自己的子文件夹下
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

        // When
        val isCircular = repository.isCircularMove(
            folderId = 1,
            targetParentId = 2,
            allFolders = folders
        )

        // Then
        assertTrue(isCircular, "应该检测到循环引用：父文件夹不能移动到自己的子文件夹下")
    }

    @Test
    fun `isCircularMove should detect circular reference - deep hierarchy`() {
        // Given - 三层文件夹：祖 -> 父 -> 子，尝试将祖移动到孙下
        val folders = listOf(
            WorkNoteFolder(
                id = 1,
                name = "祖",
                parentId = null,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            ),
            WorkNoteFolder(
                id = 2,
                name = "父",
                parentId = 1,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            ),
            WorkNoteFolder(
                id = 3,
                name = "子",
                parentId = 2,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            )
        )

        // When
        val isCircular = repository.isCircularMove(
            folderId = 1,
            targetParentId = 3,
            allFolders = folders
        )

        // Then
        assertTrue(isCircular, "应该检测到深层循环引用")
    }

    @Test
    fun `isCircularMove should allow valid move to sibling`() {
        // Given - 两个同级文件夹
        val folders = listOf(
            WorkNoteFolder(
                id = 1,
                name = "文件夹1",
                parentId = null,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            ),
            WorkNoteFolder(
                id = 2,
                name = "文件夹2",
                parentId = null,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            )
        )

        // When
        val isCircular = repository.isCircularMove(
            folderId = 1,
            targetParentId = 2,
            allFolders = folders
        )

        // Then
        assertFalse(isCircular, "同级文件夹之间移动应该允许")
    }

    @Test
    fun `isCircularMove should allow move to root`() {
        // Given
        val folders = listOf(
            WorkNoteFolder(
                id = 1,
                name = "文件夹",
                parentId = 2,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            )
        )

        // When - 移动到根目录（targetParentId = null）
        val isCircular = repository.isCircularMove(
            folderId = 1,
            targetParentId = null,
            allFolders = folders
        )

        // Then
        assertFalse(isCircular, "移动到根目录应该允许")
    }

    @Test
    fun `isCircularMove should detect move to self`() {
        // Given
        val folders = listOf(
            WorkNoteFolder(
                id = 1,
                name = "文件夹",
                parentId = null,
                ownerId = 1,
                visibility = WorkNoteVisibility.PRIVATE,
                createdAt = "",
                updatedAt = ""
            )
        )

        // When - 尝试移动到自己下面
        val isCircular = repository.isCircularMove(
            folderId = 1,
            targetParentId = 1,
            allFolders = folders
        )

        // Then
        assertTrue(isCircular, "不能将文件夹移动到自己下面")
    }
}
