package com.aiproj.mobile.ui.screens.notes

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.WorkNoteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 笔记编辑器ViewModel
 *
 * 管理笔记编辑状态、自动保存、元信息编辑等功能
 */
@HiltViewModel
class NoteEditorViewModel @Inject constructor(
    private val repository: WorkNoteRepository
) : ViewModel() {

    // UI状态
    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    // 笔记ID（编辑模式下使用）
    private var noteId: Int? = null

    // 原始笔记数据（用于检测更改）
    private var originalNote: WorkNote? = null

    // 笔记内容
    private val _title = mutableStateOf("")
    val title: State<String> = _title

    private val _content = mutableStateOf("")
    val content: State<String> = _content

    // 预览模式
    private val _isPreviewMode = mutableStateOf(false)
    val isPreviewMode: State<Boolean> = _isPreviewMode

    // 元信息
    private val _selectedFolder = mutableStateOf<WorkNoteFolder?>(null)
    val selectedFolder: State<WorkNoteFolder?> = _selectedFolder

    private val _noteType = mutableStateOf(WorkNoteType.MARKDOWN)
    val noteType: State<WorkNoteType> = _noteType

    private val _priority = mutableStateOf(WorkNotePriority.MEDIUM)
    val priority: State<WorkNotePriority> = _priority

    private val _visibility = mutableStateOf(WorkNoteVisibility.PRIVATE)
    val visibility: State<WorkNoteVisibility> = _visibility

    private val _tags = mutableStateOf<List<String>>(emptyList())
    val tags: State<List<String>> = _tags

    private val _isPinned = mutableStateOf(false)
    val isPinned: State<Boolean> = _isPinned

    private val _isBookmarked = mutableStateOf(false)
    val isBookmarked: State<Boolean> = _isBookmarked

    // 文件夹列表
    private val _folders = mutableStateOf<List<WorkNoteFolder>>(emptyList())
    val folders: State<List<WorkNoteFolder>> = _folders

    // 自动保存状态
    private val _isAutoSaving = mutableStateOf(false)
    val isAutoSaving: State<Boolean> = _isAutoSaving

    private var autoSaveJob: Job? = null

    init {
        // 加载文件夹列表
        loadFolders()
        // 启动自动保存监听
        startAutoSave()
    }

    /**
     * UI状态
     */
    sealed class UiState {
        object Idle : UiState()
        object Loading : UiState()
        object Saving : UiState()
        object SaveSuccess : UiState()
        data class Error(val message: String) : UiState()
    }

    /**
     * 加载笔记数据（编辑模式）
     */
    fun loadNote(id: Int) {
        noteId = id
        _uiState.value = UiState.Loading

        viewModelScope.launch {
            repository.getNoteById(id).fold(
                onSuccess = { note ->
                    originalNote = note
                    _title.value = note.title
                    _content.value = note.content ?: ""
                    _noteType.value = note.workNoteType ?: WorkNoteType.MARKDOWN
                    _priority.value = note.priority ?: WorkNotePriority.MEDIUM
                    _visibility.value = note.visibility ?: WorkNoteVisibility.PRIVATE
                    _tags.value = note.tags ?: emptyList()
                    _isPinned.value = note.isPinned ?: false
                    _isBookmarked.value = note.isBookmarked ?: false

                    // 加载文件夹信息
                    note.workNoteFolderId?.let { workNoteFolderId ->
                        findFolderById(workNoteFolderId)?.let { folder ->
                            _selectedFolder.value = folder
                        }
                    }

                    _uiState.value = UiState.Idle
                },
                onFailure = { error ->
                    _uiState.value = UiState.Error(error.message ?: "加载失败")
                }
            )
        }
    }

    /**
     * 加载文件夹列表
     */
    private fun loadFolders() {
        viewModelScope.launch {
            repository.getFolders().fold(
                onSuccess = { folders ->
                    _folders.value = folders
                },
                onFailure = {
                    // 静默失败，不影响编辑功能
                }
            )
        }
    }

    /**
     * 根据ID查找文件夹
     */
    private fun findFolderById(folderId: Int): WorkNoteFolder? {
        fun search(folders: List<WorkNoteFolder>): WorkNoteFolder? {
            for (folder in folders) {
                if (folder.id == folderId) return folder
                folder.children?.let { children ->
                    search(children)?.let { return it }
                }
            }
            return null
        }
        return search(_folders.value)
    }

    /**
     * 保存笔记
     */
    suspend fun saveNote() {
        if (_title.value.isBlank()) {
            _uiState.value = UiState.Error("标题不能为空")
            return
        }

        _uiState.value = UiState.Saving

        val request = if (noteId == null) {
            // 创建新笔记
            CreateWorkNoteRequest(
                title = _title.value,
                content = _content.value,
                workNoteType = _noteType.value,
                priority = _priority.value,
                visibility = _visibility.value,
                workNoteFolderId = _selectedFolder.value?.id,
                tags = _tags.value.takeIf { it.isNotEmpty() },
                isPinned = _isPinned.value,
                isBookmarked = _isBookmarked.value
            )
        } else {
            // 更新现有笔记
            UpdateWorkNoteRequest(
                title = _title.value,
                content = _content.value,
                workNoteType = _noteType.value,
                priority = _priority.value,
                visibility = _visibility.value,
                workNoteFolderId = _selectedFolder.value?.id,
                tags = _tags.value.takeIf { it.isNotEmpty() },
                isPinned = _isPinned.value,
                isBookmarked = _isBookmarked.value
            )
        }

        val result = if (noteId == null) {
            repository.createNote(request as CreateWorkNoteRequest)
        } else {
            repository.updateNote(noteId!!, request as UpdateWorkNoteRequest)
        }

        result.fold(
            onSuccess = { savedNote ->
                // 更新原始数据
                originalNote = savedNote
                if (noteId == null) {
                    noteId = savedNote.id
                }
                _uiState.value = UiState.SaveSuccess
            },
            onFailure = { error ->
                _uiState.value = UiState.Error(error.message ?: "保存失败")
            }
        )
    }

    /**
     * 自动保存（每30秒检查一次）
     */
    private fun startAutoSave() {
        autoSaveJob?.cancel()
        autoSaveJob = viewModelScope.launch {
            while (true) {
                delay(30_000) // 30秒

                // 仅在有更改且有ID时才自动保存
                if (hasUnsavedChanges() && noteId != null && _title.value.isNotBlank()) {
                    _isAutoSaving.value = true
                    saveNote()
                    delay(1000) // 显示保存提示1秒
                    _isAutoSaving.value = false
                }
            }
        }
    }

    /**
     * 检测是否有未保存的更改
     */
    fun hasUnsavedChanges(): Boolean {
        val original = originalNote ?: return _title.value.isNotBlank() || _content.value.isNotBlank()

        val originalTags: List<String> = original.tags ?: emptyList()

        return _title.value != original.title ||
                _content.value != (original.content ?: "") ||
                _noteType.value != original.workNoteType ||
                _priority.value != original.priority ||
                _visibility.value != original.visibility ||
                _tags.value != originalTags ||
                _isPinned.value != original.isPinned ||
                _isBookmarked.value != original.isBookmarked ||
                _selectedFolder.value?.id != original.workNoteFolderId
    }

    /**
     * 更新方法
     */
    fun updateTitle(value: String) {
        _title.value = value
    }

    fun updateContent(value: String) {
        _content.value = value
    }

    fun togglePreviewMode() {
        _isPreviewMode.value = !_isPreviewMode.value
    }

    fun updateFolder(folder: WorkNoteFolder?) {
        _selectedFolder.value = folder
    }

    fun updateType(type: WorkNoteType) {
        _noteType.value = type
    }

    fun updatePriority(priority: WorkNotePriority) {
        _priority.value = priority
    }

    fun updateVisibility(visibility: WorkNoteVisibility) {
        _visibility.value = visibility
    }

    fun updateTags(tags: List<String>) {
        _tags.value = tags
    }

    fun togglePinned() {
        _isPinned.value = !_isPinned.value
    }

    fun toggleBookmarked() {
        _isBookmarked.value = !_isBookmarked.value
    }

    fun resetSaveState() {
        _uiState.value = UiState.Idle
    }

    override fun onCleared() {
        super.onCleared()
        autoSaveJob?.cancel()
    }
}
