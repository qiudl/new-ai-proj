package com.aiproj.mobile.ui.screens.notes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.WorkNoteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 笔记列表ViewModel
 *
 * 管理笔记列表、文件夹、筛选等状态
 */
@HiltViewModel
class NotesViewModel @Inject constructor(
    private val repository: WorkNoteRepository
) : ViewModel() {

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

    init {
        loadNotes()
        loadFolders()
    }

    /**
     * 加载笔记列表
     */
    fun loadNotes(
        page: Int = 1,
        limit: Int = 100
    ) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading

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
                    _notes.value = response.data.notes
                    _uiState.value = UiState.Success
                },
                onFailure = { error ->
                    _uiState.value = UiState.Error(error.message ?: "加载工作笔记失败")
                }
            )
        }
    }

    /**
     * 加载文件夹树
     */
    fun loadFolders() {
        viewModelScope.launch {
            val result = repository.getFolderTree()
            result.onSuccess { folders ->
                _folders.value = folders
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
        loadNotes()
    }

    fun updatePriority(priority: WorkNotePriority?) {
        _selectedPriority.value = priority
        loadNotes()
    }

    fun updatePinnedOnly(isPinned: Boolean) {
        _isPinnedOnly.value = isPinned
        loadNotes()
    }

    fun updateBookmarkedOnly(isBookmarked: Boolean) {
        _isBookmarkedOnly.value = isBookmarked
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

    /**
     * 删除笔记
     */
    fun deleteNote(noteId: Int) {
        viewModelScope.launch {
            repository.deleteNote(noteId).onSuccess {
                // 重新加载列表
                loadNotes()
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
