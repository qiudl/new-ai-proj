package com.aiproj.mobile.ui.screens.notes

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.WorkNoteRepository
import com.aiproj.mobile.data.repository.WorkNoteFolderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.format.DateTimeParseException
import javax.inject.Inject

/**
 * 笔记列表ViewModel
 *
 * 管理笔记列表、文件夹、筛选等状态
 */
@HiltViewModel
class NotesViewModel @Inject constructor(
    private val repository: WorkNoteRepository,
    private val folderRepository: WorkNoteFolderRepository
) : ViewModel() {

    companion object {
        private const val TAG = "NotesViewModel"
    }

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _notes = MutableStateFlow<List<WorkNote>>(emptyList())
    val notes: StateFlow<List<WorkNote>> = _notes.asStateFlow()

    private val _folders = MutableStateFlow<List<WorkNoteFolder>>(emptyList())
    val folders: StateFlow<List<WorkNoteFolder>> = _folders.asStateFlow()

    private val _selectedFolderId = MutableStateFlow<Int?>(null)
    val selectedFolderId: StateFlow<Int?> = _selectedFolderId.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedType = MutableStateFlow<WorkNoteType?>(null)
    val selectedType: StateFlow<WorkNoteType?> = _selectedType.asStateFlow()

    private val _selectedPriority = MutableStateFlow<WorkNotePriority?>(null)
    val selectedPriority: StateFlow<WorkNotePriority?> = _selectedPriority.asStateFlow()

    private val _isPinnedOnly = MutableStateFlow(false)
    val isPinnedOnly: StateFlow<Boolean> = _isPinnedOnly.asStateFlow()

    private val _isBookmarkedOnly = MutableStateFlow(false)
    val isBookmarkedOnly: StateFlow<Boolean> = _isBookmarkedOnly.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    // 操作消息状态（用于Snackbar反馈）
    private val _operationMessage = MutableStateFlow<String?>(null)
    val operationMessage: StateFlow<String?> = _operationMessage.asStateFlow()

    // 删除笔记信息（用于撤销）
    data class DeletedNoteInfo(
        val note: WorkNote,
        val index: Int,
        val timestamp: Long
    )

    private val _deletedNoteInfo = MutableStateFlow<DeletedNoteInfo?>(null)
    val deletedNoteInfo: StateFlow<DeletedNoteInfo?> = _deletedNoteInfo.asStateFlow()

    // 加载操作跟踪
    enum class OperationType {
        PIN, BOOKMARK, DELETE
    }

    data class LoadingOperation(
        val noteId: Int,
        val type: OperationType
    )

    private val _loadingOperations = MutableStateFlow<Set<LoadingOperation>>(emptySet())
    val loadingOperations: StateFlow<Set<LoadingOperation>> = _loadingOperations.asStateFlow()

    // 操作错误（带重试功能）
    data class OperationError(
        val message: String,
        val retryAction: (() -> Unit)? = null
    )

    private val _operationError = MutableStateFlow<OperationError?>(null)
    val operationError: StateFlow<OperationError?> = _operationError.asStateFlow()

    fun clearOperationError() {
        _operationError.value = null
    }

    // 文件夹操作状态
    private val _folderLoading = MutableStateFlow(false)
    val folderLoading: StateFlow<Boolean> = _folderLoading.asStateFlow()

    private val _folderError = MutableStateFlow<String?>(null)
    val folderError: StateFlow<String?> = _folderError.asStateFlow()

    fun clearFolderError() {
        _folderError.value = null
    }

    // ========== 性能优化：防抖和缓存机制 ==========

    // 防抖机制：跟踪每个笔记的最后操作时间
    private val lastOperationTime = mutableMapOf<Int, Long>()
    private val operationDebounceMs = 1000L  // 1秒内防抖

    // 缓存机制：避免重复加载
    private var lastLoadParams: LoadParams? = null
    private var lastLoadTime: Long = 0
    private val cacheValidityMs = 30_000L  // 缓存30秒有效

    data class LoadParams(
        val page: Int,
        val limit: Int,
        val folderId: Int?,
        val type: WorkNoteType?,
        val priority: WorkNotePriority?,
        val isPinnedOnly: Boolean,
        val isBookmarkedOnly: Boolean,
        val search: String
    )

    init {
        loadNotes()
        loadFolders()
    }

    // ========== 性能优化：辅助方法 ==========

    /**
     * 显示临时操作消息
     * 消息会在指定时间后自动清除
     *
     * @param message 要显示的消息
     * @param duration 显示持续时间（毫秒），默认2秒
     */
    private suspend fun showTemporaryMessage(message: String, duration: Long = 2000) {
        _operationMessage.value = message
        delay(duration)
        // 只有当消息未被其他操作覆盖时才清除
        if (_operationMessage.value == message) {
            _operationMessage.value = null
        }
    }

    /**
     * 检查操作是否应该防抖
     * @return true 如果应该执行，false 如果应该防抖
     */
    private fun shouldExecuteOperation(noteId: Int): Boolean {
        val now = System.currentTimeMillis()
        val lastTime = lastOperationTime[noteId] ?: 0L

        return if (now - lastTime > operationDebounceMs) {
            lastOperationTime[noteId] = now
            true
        } else {
            false
        }
    }

    /**
     * 智能排序：置顶笔记在前，按更新时间降序
     */
    private fun sortNotes(notes: List<WorkNote>): List<WorkNote> {
        return notes.sortedWith(
            compareByDescending<WorkNote> { it.isPinned }
                .thenByDescending { note ->
                    parseNoteUpdateTime(note)
                }
        )
    }

    /**
     * 安全解析笔记更新时间
     */
    private fun parseNoteUpdateTime(note: WorkNote): Instant {
        return try {
            note.updatedAt?.let { Instant.parse(it) } ?: Instant.MIN
        } catch (e: DateTimeParseException) {
            Instant.MIN
        } catch (e: Exception) {
            Instant.MIN
        }
    }

    /**
     * 智能更新单个笔记并重新排序
     * 避免全量刷新，仅操作单个项
     */
    private fun updateSingleNoteAndSort(updatedNote: WorkNote) {
        val currentNotes = _notes.value.toMutableList()
        val index = currentNotes.indexOfFirst { it.id == updatedNote.id }

        if (index != -1) {
            // 更新该笔记
            currentNotes[index] = updatedNote

            // 智能排序（置顶笔记优先）
            _notes.value = sortNotes(currentNotes)
        }
    }

    /**
     * 更新单个笔记（不排序）
     * 用于不影响排序的操作（如收藏）
     */
    private fun updateSingleNote(updatedNote: WorkNote) {
        _notes.value = _notes.value.map {
            if (it.id == updatedNote.id) updatedNote else it
        }
    }

    /**
     * 清除缓存（在筛选条件改变时调用）
     */
    private fun clearCache() {
        lastLoadParams = null
        lastLoadTime = 0
    }

    /**
     * 加载笔记列表（带缓存优化）
     */
    fun loadNotes(
        page: Int = 1,
        limit: Int = 100,
        isRefresh: Boolean = false
    ) {
        val currentParams = LoadParams(
            page = page,
            limit = limit,
            folderId = _selectedFolderId.value,
            type = _selectedType.value,
            priority = _selectedPriority.value,
            isPinnedOnly = _isPinnedOnly.value,
            isBookmarkedOnly = _isBookmarkedOnly.value,
            search = _searchQuery.value
        )

        // 缓存检查：如果参数相同且缓存未过期，跳过加载
        if (!isRefresh &&
            currentParams == lastLoadParams &&
            System.currentTimeMillis() - lastLoadTime < cacheValidityMs) {
            return
        }

        lastLoadParams = currentParams
        lastLoadTime = System.currentTimeMillis()

        viewModelScope.launch {
            if (isRefresh) {
                _isRefreshing.value = true
            } else {
                _uiState.value = UiState.Loading
            }

            val result = repository.getNotes(
                page = page,
                limit = limit,
                folderId = _selectedFolderId.value,
                type = _selectedType.value,
                priority = _selectedPriority.value,
                isPinned = if (_isPinnedOnly.value) true else null,
                isBookmarked = if (_isBookmarkedOnly.value) true else null,
                search = _searchQuery.value.takeIf { it.isNotBlank() }
            )

            result.fold(
                onSuccess = { response ->
                    // 对加载的笔记进行排序
                    _notes.value = sortNotes(response.data.notes)
                    _uiState.value = UiState.Success
                },
                onFailure = { error ->
                    _uiState.value = UiState.Error(error.message ?: "加载工作笔记失败")
                }
            )

            if (isRefresh) {
                _isRefreshing.value = false
            }
        }
    }

    /**
     * 刷新笔记列表
     */
    fun refresh() {
        loadNotes(isRefresh = true)
    }

    /**
     * 加载文件夹树
     */
    fun loadFolders() {
        viewModelScope.launch {
            folderRepository.getFolderTree().collect { result ->
                result.onSuccess { folders ->
                    _folders.value = folders
                }
            }
        }
    }

    /**
     * 更新搜索查询
     */
    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    /**
     * 执行搜索
     */
    fun search() {
        loadNotes()
    }

    /**
     * 清空搜索
     */
    fun clearSearch() {
        _searchQuery.value = ""
        loadNotes()
    }

    /**
     * 选择文件夹
     */
    fun selectFolder(folderId: Int?) {
        _selectedFolderId.value = folderId
        loadNotes()
    }

    /**
     * 更新筛选条件
     */
    fun updateType(type: WorkNoteType?) {
        _selectedType.value = type
        clearCache()
        loadNotes()
    }

    fun updatePriority(priority: WorkNotePriority?) {
        _selectedPriority.value = priority
        clearCache()
        loadNotes()
    }

    fun updatePinnedOnly(isPinned: Boolean) {
        _isPinnedOnly.value = isPinned
        clearCache()
        loadNotes()
    }

    fun updateBookmarkedOnly(isBookmarked: Boolean) {
        _isBookmarkedOnly.value = isBookmarked
        clearCache()
        loadNotes()
    }

    /**
     * 重置筛选
     */
    fun resetFilters() {
        _selectedType.value = null
        _selectedPriority.value = null
        _isPinnedOnly.value = false
        _isBookmarkedOnly.value = false
        _searchQuery.value = ""
        loadNotes()
    }

    // ========== 文件夹管理 ==========

    /**
     * 创建文件夹
     */
    fun createFolder(
        name: String,
        description: String? = null,
        parentId: Int? = null,
        visibility: WorkNoteVisibility = WorkNoteVisibility.PRIVATE,
        color: String? = null
    ) {
        Log.d(TAG, "createFolder: name='$name', parentId=$parentId")
        viewModelScope.launch {
            _folderLoading.value = true
            _folderError.value = null

            val result = folderRepository.createFolder(
                name = name,
                description = description,
                parentId = parentId,
                visibility = visibility,
                color = color
            )

            result.fold(
                onSuccess = { newFolder ->
                    Log.d(TAG, "createFolder: Success - created folder id=${newFolder.id}")
                    // 刷新文件夹列表
                    loadFolders()
                    showTemporaryMessage("文件夹已创建")
                },
                onFailure = { error ->
                    Log.e(TAG, "createFolder: Failed - ${error.message}", error)
                    _folderError.value = "创建文件夹失败: ${error.message}"
                }
            )

            _folderLoading.value = false
        }
    }

    /**
     * 更新文件夹
     */
    fun updateFolder(
        folderId: Int,
        name: String? = null,
        description: String? = null,
        visibility: WorkNoteVisibility? = null,
        color: String? = null
    ) {
        Log.d(TAG, "updateFolder: folderId=$folderId, name='$name'")
        viewModelScope.launch {
            _folderLoading.value = true
            _folderError.value = null

            val result = folderRepository.updateFolder(
                folderId = folderId,
                name = name,
                description = description,
                visibility = visibility,
                color = color
            )

            result.fold(
                onSuccess = { updatedFolder ->
                    Log.d(TAG, "updateFolder: Success - updated folder id=$folderId")
                    // 刷新文件夹列表
                    loadFolders()
                    showTemporaryMessage("文件夹已更新")
                },
                onFailure = { error ->
                    Log.e(TAG, "updateFolder: Failed - ${error.message}", error)
                    _folderError.value = "更新文件夹失败: ${error.message}"
                }
            )

            _folderLoading.value = false
        }
    }

    /**
     * 删除文件夹
     */
    fun deleteFolder(folderId: Int) {
        Log.d(TAG, "deleteFolder: folderId=$folderId")
        viewModelScope.launch {
            _folderLoading.value = true
            _folderError.value = null

            val result = folderRepository.deleteFolder(folderId)

            result.fold(
                onSuccess = {
                    Log.d(TAG, "deleteFolder: Success - deleted folder id=$folderId")
                    // 如果删除的是当前选中的文件夹，清除选择
                    if (_selectedFolderId.value == folderId) {
                        _selectedFolderId.value = null
                    }

                    // 刷新文件夹列表和笔记列表
                    loadFolders()
                    loadNotes()
                    showTemporaryMessage("文件夹已删除")
                },
                onFailure = { error ->
                    Log.e(TAG, "deleteFolder: Failed - ${error.message}", error)
                    _folderError.value = "删除文件夹失败: ${error.message}"
                }
            )

            _folderLoading.value = false
        }
    }

    /**
     * 移动文件夹
     */
    fun moveFolder(folderId: Int, newParentId: Int?) {
        Log.d(TAG, "moveFolder: folderId=$folderId, newParentId=$newParentId")
        viewModelScope.launch {
            _folderLoading.value = true
            _folderError.value = null

            // 循环检查
            val allFolders = _folders.value
            if (folderRepository.isCircularMove(folderId, newParentId, allFolders)) {
                Log.w(TAG, "moveFolder: Circular reference detected, aborting move")
                _folderError.value = "无法移动文件夹：会形成循环引用"
                _folderLoading.value = false
                return@launch
            }

            val result = folderRepository.moveFolder(folderId, newParentId)

            result.fold(
                onSuccess = { movedFolder ->
                    Log.d(TAG, "moveFolder: Success - moved folder id=$folderId to parent=$newParentId")
                    // 刷新文件夹列表
                    loadFolders()
                    showTemporaryMessage("文件夹已移动")
                },
                onFailure = { error ->
                    Log.e(TAG, "moveFolder: Failed - ${error.message}", error)
                    _folderError.value = "移动文件夹失败: ${error.message}"
                }
            )

            _folderLoading.value = false
        }
    }

    // ========== 笔记操作 ==========

    /**
     * 确认删除笔记（带3秒撤销窗口）
     */
    fun confirmDelete(noteId: Int) {
        viewModelScope.launch {
            val noteIndex = _notes.value.indexOfFirst { it.id == noteId }
            if (noteIndex == -1) return@launch

            val note = _notes.value[noteIndex]

            // 乐观删除 - 立即从列表移除
            val updatedNotes = _notes.value.toMutableList()
            updatedNotes.removeAt(noteIndex)
            _notes.value = updatedNotes

            // 保存删除信息供撤销使用
            _deletedNoteInfo.value = DeletedNoteInfo(
                note = note,
                index = noteIndex,
                timestamp = System.currentTimeMillis()
            )

            // 等待3秒
            delay(3000)

            // 检查是否已撤销
            if (_deletedNoteInfo.value?.note?.id == noteId) {
                // 未撤销 - 执行后台删除
                repository.deleteNote(noteId).fold(
                    onSuccess = {
                        _deletedNoteInfo.value = null
                    },
                    onFailure = { error ->
                        // 删除失败 - 恢复笔记
                        val restoredNotes = _notes.value.toMutableList()
                        restoredNotes.add(noteIndex, note)
                        _notes.value = restoredNotes
                        _uiState.value = UiState.Error("删除失败: ${error.message}")
                        _deletedNoteInfo.value = null
                    }
                )
            }
        }
    }

    /**
     * 撤销删除
     */
    fun undoDelete() {
        _deletedNoteInfo.value?.let { info ->
            val updatedNotes = _notes.value.toMutableList()
            updatedNotes.add(info.index, info.note)
            _notes.value = updatedNotes
            _deletedNoteInfo.value = null
            _operationMessage.value = "已恢复"
        }
    }

    /**
     * 切换置顶状态（乐观更新 + 防抖 + 单项更新 + 智能排序）
     */
    fun togglePinned(noteId: Int) {
        // 防抖检查
        if (!shouldExecuteOperation(noteId)) {
            return
        }

        viewModelScope.launch {
            // 查找当前笔记
            val noteIndex = _notes.value.indexOfFirst { it.id == noteId }
            if (noteIndex == -1) return@launch

            val note = _notes.value[noteIndex]
            val loadingOp = LoadingOperation(noteId, OperationType.PIN)

            try {
                // 标记为加载中
                _loadingOperations.value = _loadingOperations.value + loadingOp

                // 乐观更新 - 立即更新UI并排序
                val updatedNote = note.copy(isPinned = !note.isPinned)
                updateSingleNoteAndSort(updatedNote)

                // 显示操作反馈
                val message = if (!note.isPinned) "已置顶" else "已取消置顶"
                _operationMessage.value = message

                // 后台请求
                val result = repository.updateNote(
                    noteId,
                    UpdateWorkNoteRequest(isPinned = !note.isPinned)
                )

                result.fold(
                    onSuccess = { serverNote ->
                        // 使用服务器返回的数据更新并排序
                        updateSingleNoteAndSort(serverNote)

                        // 2秒后清除消息
                        delay(2000)
                        if (_operationMessage.value == message) {
                            _operationMessage.value = null
                        }
                    },
                    onFailure = { error ->
                        // 回滚到原始状态并排序
                        updateSingleNoteAndSort(note)

                        // 友好的错误信息
                        val friendlyMessage = when {
                            error.message?.contains("network", ignoreCase = true) == true ->
                                "网络连接失败，请检查网络后重试"
                            error.message?.contains("timeout", ignoreCase = true) == true ->
                                "请求超时，请重试"
                            else ->
                                "操作失败: ${error.message}"
                        }

                        _operationError.value = OperationError(
                            message = friendlyMessage,
                            retryAction = { togglePinned(noteId) }
                        )
                        _operationMessage.value = null
                    }
                )
            } finally {
                // 移除加载标记
                _loadingOperations.value = _loadingOperations.value - loadingOp
            }
        }
    }

    /**
     * 切换收藏状态（乐观更新 + 防抖 + 单项更新）
     */
    fun toggleBookmarked(noteId: Int) {
        // 防抖检查
        if (!shouldExecuteOperation(noteId)) {
            return
        }

        viewModelScope.launch {
            // 查找当前笔记
            val noteIndex = _notes.value.indexOfFirst { it.id == noteId }
            if (noteIndex == -1) return@launch

            val note = _notes.value[noteIndex]
            val loadingOp = LoadingOperation(noteId, OperationType.BOOKMARK)

            try {
                // 标记为加载中
                _loadingOperations.value = _loadingOperations.value + loadingOp

                // 乐观更新 - 立即更新UI（收藏不影响排序）
                val updatedNote = note.copy(isBookmarked = !note.isBookmarked)
                updateSingleNote(updatedNote)

                // 显示操作反馈
                val message = if (!note.isBookmarked) "已收藏" else "已取消收藏"
                _operationMessage.value = message

                // 后台请求
                val result = repository.updateNote(
                    noteId,
                    UpdateWorkNoteRequest(isBookmarked = !note.isBookmarked)
                )

                result.fold(
                    onSuccess = { serverNote ->
                        // 使用服务器返回的数据更新
                        updateSingleNote(serverNote)

                        // 2秒后清除消息
                        delay(2000)
                        if (_operationMessage.value == message) {
                            _operationMessage.value = null
                        }
                    },
                    onFailure = { error ->
                        // 回滚到原始状态
                        updateSingleNote(note)

                        // 友好的错误信息
                        val friendlyMessage = when {
                            error.message?.contains("network", ignoreCase = true) == true ->
                                "网络连接失败，请检查网络后重试"
                            error.message?.contains("timeout", ignoreCase = true) == true ->
                                "请求超时，请重试"
                            else ->
                                "操作失败: ${error.message}"
                        }

                        _operationError.value = OperationError(
                            message = friendlyMessage,
                            retryAction = { toggleBookmarked(noteId) }
                        )
                        _operationMessage.value = null
                    }
                )
            } finally {
                // 移除加载标记
                _loadingOperations.value = _loadingOperations.value - loadingOp
            }
        }
    }

    /**
     * UI状态
     */
    sealed class UiState {
        object Loading : UiState()
        object Success : UiState()
        data class Error(val message: String) : UiState()
    }
}
