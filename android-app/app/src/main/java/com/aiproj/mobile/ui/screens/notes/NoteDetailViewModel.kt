package com.aiproj.mobile.ui.screens.notes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.WorkNote
import com.aiproj.mobile.data.models.WorkNoteFolder
import com.aiproj.mobile.data.models.UpdateWorkNoteRequest
import com.aiproj.mobile.data.repository.WorkNoteRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 笔记详情页ViewModel
 *
 * 管理笔记详情显示、元数据加载、关联项目等功能
 */
@HiltViewModel
class NoteDetailViewModel @Inject constructor(
    private val repository: WorkNoteRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private var currentNote: WorkNote? = null
    private var currentFolder: WorkNoteFolder? = null

    /**
     * UI状态
     */
    sealed class UiState {
        object Loading : UiState()
        data class Success(
            val note: WorkNote,
            val folder: WorkNoteFolder?
        ) : UiState()
        data class Error(val message: String) : UiState()
    }

    /**
     * 加载笔记数据
     */
    fun loadNote(noteId: Int) {
        _uiState.value = UiState.Loading

        viewModelScope.launch {
            repository.getNoteById(noteId).fold(
                onSuccess = { note ->
                    currentNote = note

                    // 加载文件夹信息
                    note.workNoteFolderId?.let { folderId ->
                        loadFolder(folderId)
                    } ?: run {
                        _uiState.value = UiState.Success(note, null)
                    }

                    // 增加浏览次数（异步，不阻塞UI）
                    incrementViewCount(noteId)
                },
                onFailure = { error ->
                    _uiState.value = UiState.Error(error.message ?: "加载失败")
                }
            )
        }
    }

    /**
     * 加载文件夹信息
     */
    private suspend fun loadFolder(folderId: Int) {
        repository.getFolders().fold(
            onSuccess = { folders ->
                currentFolder = findFolderById(folderId, folders)
                currentNote?.let { note ->
                    _uiState.value = UiState.Success(note, currentFolder)
                }
            },
            onFailure = {
                // 文件夹加载失败不影响笔记显示
                currentNote?.let { note ->
                    _uiState.value = UiState.Success(note, null)
                }
            }
        )
    }

    /**
     * 在文件夹树中查找指定ID的文件夹
     */
    private fun findFolderById(folderId: Int, folders: List<WorkNoteFolder>): WorkNoteFolder? {
        fun search(folders: List<WorkNoteFolder>): WorkNoteFolder? {
            for (folder in folders) {
                if (folder.id == folderId) return folder
                folder.children?.let { children ->
                    search(children)?.let { return it }
                }
            }
            return null
        }
        return search(folders)
    }

    /**
     * 增加浏览次数
     */
    private fun incrementViewCount(noteId: Int) {
        viewModelScope.launch {
            try {
                // TODO: 实现增加浏览次数的API调用
                // repository.incrementViewCount(noteId)
            } catch (e: Exception) {
                // 静默失败，不影响用户体验
            }
        }
    }

    /**
     * 切换置顶状态
     */
    suspend fun togglePinned() {
        val note = currentNote ?: return

        val request = UpdateWorkNoteRequest(
            isPinned = !note.isPinned
        )

        repository.updateNote(note.id, request).fold(
            onSuccess = { updatedNote ->
                currentNote = updatedNote
                _uiState.value = UiState.Success(updatedNote, currentFolder)
            },
            onFailure = {
                // 静默失败
            }
        )
    }

    /**
     * 切换收藏状态
     */
    suspend fun toggleBookmarked() {
        val note = currentNote ?: return

        val request = UpdateWorkNoteRequest(
            isBookmarked = !note.isBookmarked
        )

        repository.updateNote(note.id, request).fold(
            onSuccess = { updatedNote ->
                currentNote = updatedNote
                _uiState.value = UiState.Success(updatedNote, currentFolder)
            },
            onFailure = {
                // 静默失败
            }
        )
    }

    /**
     * 删除笔记
     */
    suspend fun deleteNote() {
        val note = currentNote ?: return

        repository.deleteNote(note.id).fold(
            onSuccess = {
                // 删除成功，UI会由Screen处理返回逻辑
            },
            onFailure = {
                // 静默失败
            }
        )
    }

    /**
     * 添加任务关联
     */
    suspend fun addTaskRelation(taskId: Int) {
        val note = currentNote ?: return
        val currentTasks = note.relatedTasks ?: emptyList()

        if (currentTasks.contains(taskId)) return

        val request = UpdateWorkNoteRequest(
            relatedTasks = currentTasks + taskId
        )

        repository.updateNote(note.id, request).fold(
            onSuccess = { updatedNote ->
                currentNote = updatedNote
                _uiState.value = UiState.Success(updatedNote, currentFolder)
            },
            onFailure = {
                // 静默失败
            }
        )
    }

    /**
     * 移除任务关联
     */
    suspend fun removeTaskRelation(taskId: Int) {
        val note = currentNote ?: return
        val currentTasks = note.relatedTasks ?: emptyList()

        val request = UpdateWorkNoteRequest(
            relatedTasks = currentTasks - taskId
        )

        repository.updateNote(note.id, request).fold(
            onSuccess = { updatedNote ->
                currentNote = updatedNote
                _uiState.value = UiState.Success(updatedNote, currentFolder)
            },
            onFailure = {
                // 静默失败
            }
        )
    }

    /**
     * 添加笔记关联
     */
    suspend fun addNoteRelation(noteId: Int) {
        val note = currentNote ?: return
        val currentNotes = note.relatedNotes ?: emptyList()

        if (currentNotes.contains(noteId)) return

        val request = UpdateWorkNoteRequest(
            relatedNotes = currentNotes + noteId
        )

        repository.updateNote(note.id, request).fold(
            onSuccess = { updatedNote ->
                currentNote = updatedNote
                _uiState.value = UiState.Success(updatedNote, currentFolder)
            },
            onFailure = {
                // 静默失败
            }
        )
    }

    /**
     * 移除笔记关联
     */
    suspend fun removeNoteRelation(noteId: Int) {
        val note = currentNote ?: return
        val currentNotes = note.relatedNotes ?: emptyList()

        val request = UpdateWorkNoteRequest(
            relatedNotes = currentNotes - noteId
        )

        repository.updateNote(note.id, request).fold(
            onSuccess = { updatedNote ->
                currentNote = updatedNote
                _uiState.value = UiState.Success(updatedNote, currentFolder)
            },
            onFailure = {
                // 静默失败
            }
        )
    }

    /**
     * 转换为任务文档
     */
    suspend fun convertToTaskDocument(
        targetTaskId: Int,
        preserveOriginal: Boolean,
        copyRelations: Boolean
    ) {
        val note = currentNote ?: return

        repository.convertNoteToTaskDocument(
            noteId = note.id,
            targetTaskId = targetTaskId,
            preserveOriginal = preserveOriginal,
            copyRelations = copyRelations
        ).fold(
            onSuccess = {
                // 转换成功
                if (!preserveOriginal) {
                    // 如果不保留原始文档，重新加载可能已删除
                }
            },
            onFailure = {
                // 静默失败
            }
        )
    }
}
