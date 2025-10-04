package com.aiproj.mobile.ui.screens.tasks

import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Attachment
import com.aiproj.mobile.data.models.Comment
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TimeLog
import com.aiproj.mobile.data.repository.AttachmentRepository
import com.aiproj.mobile.data.repository.CommentRepository
import com.aiproj.mobile.data.repository.TaskRepository
import com.aiproj.mobile.data.repository.TimeLogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 任务详情 ViewModel
 */
@HiltViewModel
class TaskDetailViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    private val timeLogRepository: TimeLogRepository,
    private val attachmentRepository: AttachmentRepository,
    private val commentRepository: CommentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val taskId: Int = checkNotNull(savedStateHandle["taskId"])

    private val _uiState = MutableStateFlow(TaskDetailUiState())
    val uiState: StateFlow<TaskDetailUiState> = _uiState.asStateFlow()

    init {
        loadTaskDetail()
    }

    /**
     * 加载任务详情（并行加载子任务和时间日志）
     */
    fun loadTaskDetail() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // 并行加载任务详情、子任务、时间日志、附件和评论
                val taskDeferred = async { taskRepository.getTaskById(taskId) }
                val subtasksDeferred = async { taskRepository.getSubtasks(taskId).first() }
                val timeLogsDeferred = async { timeLogRepository.getTaskTimeLogs(taskId) }
                val attachmentsDeferred = async { attachmentRepository.getAttachments(taskId) }
                val commentsDeferred = async { commentRepository.getComments(taskId) }

                val taskResult = taskDeferred.await()
                val subtasksResult = subtasksDeferred.await()
                val timeLogsResult = timeLogsDeferred.await()
                val attachmentsResult = attachmentsDeferred.await()
                val commentsResult = commentsDeferred.await()

                if (taskResult.isSuccess) {
                    val task = taskResult.getOrNull()
                    val subtasks = subtasksResult.getOrNull()?.tasks ?: emptyList()
                    val timeLogs = timeLogsResult.getOrNull() ?: emptyList()
                    val attachments = attachmentsResult.getOrNull() ?: emptyList()
                    val comments = commentsResult.getOrNull() ?: emptyList()

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            task = task,
                            subtasks = subtasks,
                            timeLogs = timeLogs,
                            attachments = attachments,
                            comments = comments,
                            error = null
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = taskResult.exceptionOrNull()?.message ?: "加载失败，请重试"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "加载失败，请重试"
                    )
                }
            }
        }
    }

    /**
     * 开始任务
     */
    fun startTask() {
        viewModelScope.launch {
            val result = taskRepository.startTask(taskId)
            result.onSuccess {
                loadTaskDetail()
            }
            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = error.message ?: "操作失败")
                }
            }
        }
    }

    /**
     * 完成任务
     */
    fun completeTask() {
        viewModelScope.launch {
            val result = taskRepository.completeTask(taskId)
            result.onSuccess {
                loadTaskDetail()
            }
            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = error.message ?: "操作失败")
                }
            }
        }
    }

    /**
     * 删除任务
     */
    fun deleteTask(onSuccess: () -> Unit) {
        viewModelScope.launch {
            val result = taskRepository.deleteTask(taskId)
            result.onSuccess {
                onSuccess()
            }
            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = error.message ?: "删除失败")
                }
            }
        }
    }

    /**
     * 刷新
     */
    fun refresh() {
        loadTaskDetail()
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 清除成功消息
     */
    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    /**
     * 上传附件
     */
    fun uploadAttachment(fileUri: Uri, description: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploading = true, error = null) }

            val result = attachmentRepository.uploadAttachment(
                taskId = taskId,
                fileUri = fileUri,
                description = description
            )

            result.onSuccess {
                _uiState.update { it.copy(isUploading = false) }
                // 上传成功，刷新附件列表
                loadTaskDetail()
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(isUploading = false, error = "上传失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 下载附件
     */
    fun downloadAttachment(attachment: Attachment) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            val result = attachmentRepository.downloadAttachment(
                taskId = taskId,
                attachment = attachment
            )

            result.onSuccess { file ->
                _uiState.update {
                    it.copy(successMessage = "文件已保存到: ${file.name}")
                }
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = "下载失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 删除附件
     */
    fun deleteAttachment(attachment: Attachment) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            val result = attachmentRepository.deleteAttachment(
                taskId = taskId,
                attachmentId = attachment.id
            )

            result.onSuccess {
                // 删除成功，刷新附件列表
                loadTaskDetail()
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = "删除失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 添加评论
     */
    fun addComment(content: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            val result = commentRepository.addComment(
                taskId = taskId,
                content = content
            )

            result.onSuccess {
                // 添加成功，刷新评论列表
                loadTaskDetail()
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = "发送评论失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 删除评论
     */
    fun deleteComment(comment: Comment) {
        viewModelScope.launch {
            _uiState.update { it.copy(error = null) }

            val result = commentRepository.deleteComment(
                taskId = taskId,
                commentId = comment.id
            )

            result.onSuccess {
                // 删除成功，刷新评论列表
                loadTaskDetail()
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = "删除评论失败: ${error.message}")
                }
            }
        }
    }
}

/**
 * 任务详情 UI 状态
 */
data class TaskDetailUiState(
    val isLoading: Boolean = false,
    val isUploading: Boolean = false,
    val task: Task? = null,
    val subtasks: List<Task> = emptyList(),
    val timeLogs: List<TimeLog> = emptyList(),
    val attachments: List<Attachment> = emptyList(),
    val comments: List<Comment> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null
)
