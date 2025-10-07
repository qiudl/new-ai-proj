package com.aiproj.mobile.ui.screens.tasks

import android.net.Uri
import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Attachment
import com.aiproj.mobile.data.models.Comment
import com.aiproj.mobile.data.models.PriorityDistribution
import com.aiproj.mobile.data.models.SubtaskStats
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskOverviewStats
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.models.TimeLog
import com.aiproj.mobile.data.models.TimeRange
import com.aiproj.mobile.data.models.TopTaskItem
import com.aiproj.mobile.data.models.TrendDataPoint
import com.aiproj.mobile.data.models.WorkTimeStats
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
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
 * 任务详情ViewModel
 *
 * 负责管理任务详情页的业务逻辑和状态，包括：
 * - 任务基本信息加载
 * - 子任务、时间日志、附件、评论等关联数据加载
 * - 任务总览统计数据计算
 * - 时间范围筛选
 * - 任务状态变更操作
 *
 * @property taskRepository 任务数据仓库
 * @property timeLogRepository 时间日志数据仓库
 * @property attachmentRepository 附件数据仓库
 * @property commentRepository 评论数据仓库
 * @property documentRepository 文档数据仓库
 * @property savedStateHandle 用于获取导航参数
 *
 * @see TaskOverviewStats
 * @see TimeRange
 */
@HiltViewModel
class TaskDetailViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    private val timeLogRepository: TimeLogRepository,
    private val attachmentRepository: AttachmentRepository,
    private val commentRepository: CommentRepository,
    private val documentRepository: com.aiproj.mobile.data.repository.DocumentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val taskId: Int = checkNotNull(savedStateHandle["taskId"])

    private val _uiState = MutableStateFlow(TaskDetailUiState())
    val uiState: StateFlow<TaskDetailUiState> = _uiState.asStateFlow()

    // 缓存统计数据，避免重复计算
    private var cachedStats: Pair<TimeRange, TaskOverviewStats>? = null

    init {
        Log.d(TAG, "TaskDetailViewModel 初始化 - taskId: $taskId")
        loadTaskDetail()
    }

    companion object {
        private const val TAG = "TaskDetailViewModel"
    }

    /**
     * 加载任务详情（并行加载子任务和时间日志）
     */
    fun loadTaskDetail() {
        Log.d(TAG, "开始加载任务详情 - taskId: $taskId")
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                Log.d(TAG, "发起并行API调用...")
                // 并行加载任务详情、子任务、时间日志、附件、评论和文档
                val taskDeferred = async { taskRepository.getTaskById(taskId) }
                val subtasksDeferred = async { taskRepository.getSubtasks(taskId).first() }
                val timeLogsDeferred = async { timeLogRepository.getTaskTimeLogs(taskId) }
                val attachmentsDeferred = async { attachmentRepository.getAttachments(taskId) }
                val commentsDeferred = async { commentRepository.getComments(taskId) }
                val documentsDeferred = async { documentRepository.getDocuments(taskId) }

                Log.d(TAG, "等待API响应...")
                val taskResult = taskDeferred.await()
                Log.d(TAG, "任务详情API返回: success=${taskResult.isSuccess}, data=${taskResult.getOrNull()?.title}")

                val subtasksResult = subtasksDeferred.await()
                Log.d(TAG, "子任务API返回: success=${subtasksResult.isSuccess}, count=${subtasksResult.getOrNull()?.data?.tasks?.size ?: 0}")

                val timeLogsResult = timeLogsDeferred.await()
                Log.d(TAG, "时间日志API返回: success=${timeLogsResult.isSuccess}, count=${timeLogsResult.getOrNull()?.size ?: 0}")

                val attachmentsResult = attachmentsDeferred.await()
                Log.d(TAG, "附件API返回: success=${attachmentsResult.isSuccess}, count=${attachmentsResult.getOrNull()?.size ?: 0}")

                val commentsResult = commentsDeferred.await()
                Log.d(TAG, "评论API返回: success=${commentsResult.isSuccess}, count=${commentsResult.getOrNull()?.size ?: 0}")

                val documentsResult = documentsDeferred.await()
                Log.d(TAG, "文档API返回: success=${documentsResult.isSuccess}, count=${documentsResult.getOrNull()?.size ?: 0}")

                if (taskResult.isSuccess) {
                    val task = taskResult.getOrNull()
                    val subtasks = subtasksResult.getOrNull()?.data?.tasks ?: emptyList()
                    val timeLogs = timeLogsResult.getOrNull() ?: emptyList()
                    val attachments = attachmentsResult.getOrNull() ?: emptyList()
                    val comments = commentsResult.getOrNull() ?: emptyList()
                    val documents = documentsResult.getOrNull() ?: emptyList()

                    Log.d(TAG, "更新UI状态 - task: ${task?.title}, subtasks: ${subtasks.size}, timeLogs: ${timeLogs.size}, documents: ${documents.size}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            task = task,
                            subtasks = subtasks,
                            timeLogs = timeLogs,
                            attachments = attachments,
                            comments = comments,
                            documents = documents,
                            error = null
                        )
                    }
                    Log.d(TAG, "UI状态更新完成")
                } else {
                    val errorMsg = taskResult.exceptionOrNull()?.message ?: "加载失败，请重试"
                    Log.e(TAG, "任务加载失败: $errorMsg", taskResult.exceptionOrNull())
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = errorMsg
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "加载任务详情异常", e)
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
     * 刷新数据并清除缓存
     */
    fun refresh() {
        cachedStats = null // 清除缓存
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

    /**
     * 更新时间范围筛选
     * Phase 1: 基础实现，Phase 2 完善统计计算
     */
    fun updateTimeRange(timeRange: TimeRange) {
        Log.d(TAG, "更新时间范围: ${timeRange.label}")
        _uiState.update { it.copy(selectedTimeRange = timeRange) }

        // Phase 2 将在此触发重新计算统计数据
        calculateOverviewStats()
    }

    /**
     * 计算任务总览统计数据（带缓存）
     *
     * 根据当前选择的时间范围计算统计数据。
     * 如果相同时间范围的统计已缓存，则直接使用缓存结果，避免重复计算。
     */
    private fun calculateOverviewStats() {
        Log.d(TAG, "计算总览统计数据")

        viewModelScope.launch {
            // 检查缓存
            val currentRange = _uiState.value.selectedTimeRange
            if (cachedStats?.first == currentRange) {
                Log.d(TAG, "使用缓存的统计数据 - ${currentRange.label}")
                _uiState.update {
                    it.copy(
                        overviewStats = cachedStats?.second,
                        overviewLoading = false,
                        overviewError = null
                    )
                }
                return@launch
            }

            // 设置加载状态
            _uiState.update { it.copy(overviewLoading = true, overviewError = null) }

            try {
                // 计算新的统计数据
                val stats = computeStats(
                    task = _uiState.value.task,
                    subtasks = _uiState.value.subtasks,
                    timeLogs = _uiState.value.timeLogs,
                    timeRange = currentRange
                )

                // 更新缓存
                if (stats != null) {
                    cachedStats = currentRange to stats
                    Log.d(TAG, "统计数据已缓存 - ${currentRange.label}")
                }

                _uiState.update {
                    it.copy(
                        overviewStats = stats,
                        overviewLoading = false,
                        overviewError = null
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "计算统计数据失败", e)
                _uiState.update {
                    it.copy(
                        overviewStats = null,
                        overviewLoading = false,
                        overviewError = "统计数据加载失败: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * 计算任务总览统计数据
     *
     * 根据给定的时间范围，计算子任务的各项统计指标，包括：
     * - 子任务状态分布（已完成/进行中/待办）
     * - 工作时长统计（总时长/平均/最大/最小）
     * - Top耗时任务排行
     * - 完成趋势曲线
     * - 优先级分布
     *
     * @param task 主任务对象
     * @param subtasks 所有子任务列表
     * @param timeLogs 所有时间日志列表
     * @param timeRange 时间筛选范围
     * @return 统计数据对象，如果主任务为null则返回null
     */
    private fun computeStats(
        task: Task?,
        subtasks: List<Task>,
        timeLogs: List<TimeLog>,
        timeRange: TimeRange
    ): TaskOverviewStats? {
        if (task == null) return null

        // 1. 获取时间范围
        val (startDate, endDate) = getDateRange(timeRange)

        // 2. 筛选时间范围内的子任务
        val filteredSubtasks = subtasks.filter { subtask ->
            subtask.createdAt?.let { isInRange(it, startDate, endDate) } ?: true
        }

        // 3. 筛选时间范围内的时间日志
        val filteredTimeLogs = timeLogs.filter { log ->
            log.startedAt?.let { isInRange(it, startDate, endDate) } ?: true
        }

        // 4. 计算子任务统计
        val subtaskStats = SubtaskStats(
            total = filteredSubtasks.size,
            completed = filteredSubtasks.count { it.status == TaskStatus.COMPLETED },
            inProgress = filteredSubtasks.count { it.status == TaskStatus.IN_PROGRESS },
            todo = filteredSubtasks.count { it.status == TaskStatus.TODO }
        )

        // 5. 计算每个任务的工作时长
        val taskWorkHours = filteredSubtasks.associateWith { subtask ->
            filteredTimeLogs
                .filter { it.taskId == subtask.id }
                .sumOf { (it.duration ?: 0).toLong() } / 60.0f
        }.filter { it.value > 0 }

        // 6. 计算工作时长统计
        val workTimeStats = if (taskWorkHours.isNotEmpty()) {
            WorkTimeStats(
                totalHours = taskWorkHours.values.sum(),
                averageHours = taskWorkHours.values.average().toFloat(),
                maxHours = taskWorkHours.values.maxOrNull() ?: 0f,
                minHours = taskWorkHours.values.minOrNull() ?: 0f,
                taskCount = taskWorkHours.size
            )
        } else {
            WorkTimeStats(0f, 0f, 0f, 0f, 0)
        }

        // 7. 计算Top 5任务
        val topTasks = taskWorkHours
            .entries
            .sortedByDescending { it.value }
            .take(5)
            .map { (subtask, hours) ->
                TopTaskItem(
                    taskId = subtask.id,
                    title = subtask.title,
                    status = subtask.status ?: TaskStatus.TODO,
                    priority = subtask.priority,
                    workHours = hours,
                    percentage = if (workTimeStats.totalHours > 0)
                        hours / workTimeStats.totalHours else 0f
                )
            }

        // 8. 计算完成趋势
        val completionTrend = calculateCompletionTrend(
            subtasks = filteredSubtasks,
            startDate = startDate,
            endDate = endDate
        )

        // 9. 计算优先级分布
        val priorityDistribution = PriorityDistribution(
            high = filteredSubtasks.count { it.priority == TaskPriority.HIGH },
            medium = filteredSubtasks.count { it.priority == TaskPriority.MEDIUM },
            low = filteredSubtasks.count { it.priority == TaskPriority.LOW }
        )

        return TaskOverviewStats(
            subtaskStats = subtaskStats,
            workTimeStats = workTimeStats,
            topTasks = topTasks,
            completionTrend = completionTrend,
            priorityDistribution = priorityDistribution
        )
    }

    /**
     * 辅助方法：获取日期范围
     */
    private fun getDateRange(timeRange: TimeRange): Pair<LocalDate, LocalDate> {
        val today = LocalDate.now()
        return when (timeRange) {
            TimeRange.TODAY -> today to today
            TimeRange.LAST_7_DAYS -> today.minusDays(7) to today
            TimeRange.LAST_30_DAYS -> today.minusDays(30) to today
            TimeRange.THIS_MONTH -> today.withDayOfMonth(1) to today
            TimeRange.CUSTOM -> {
                // 使用自定义日期（需要在UiState中添加字段）
                today.minusDays(7) to today
            }
        }
    }

    /**
     * 辅助方法：判断日期是否在范围内
     */
    private fun isInRange(isoDateTime: String, startDate: LocalDate, endDate: LocalDate): Boolean {
        return try {
            val instant = Instant.parse(isoDateTime)
            val date = instant.atZone(ZoneId.systemDefault()).toLocalDate()
            !date.isBefore(startDate) && !date.isAfter(endDate)
        } catch (e: Exception) {
            Log.w(TAG, "日期解析失败: $isoDateTime", e)
            false
        }
    }

    /**
     * 计算完成趋势数据
     */
    private fun calculateCompletionTrend(
        subtasks: List<Task>,
        startDate: LocalDate,
        endDate: LocalDate
    ): List<TrendDataPoint> {
        val trendPoints = mutableListOf<TrendDataPoint>()
        var currentDate = startDate

        while (!currentDate.isAfter(endDate)) {
            // 计划完成数（基于截止日期）
            val planned = subtasks.count { task ->
                task.dueDate?.let { dueDate ->
                    try {
                        val taskDueDate = LocalDate.parse(dueDate.substring(0, 10))
                        !taskDueDate.isAfter(currentDate)
                    } catch (e: Exception) {
                        false
                    }
                } ?: false
            }

            // 实际完成数（基于完成时间）
            val actual = subtasks.count { task ->
                if (task.status == TaskStatus.COMPLETED) {
                    task.updatedAt?.let { updatedAt ->
                        try {
                            val completedDate = Instant.parse(updatedAt)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDate()
                            !completedDate.isAfter(currentDate)
                        } catch (e: Exception) {
                            false
                        }
                    } ?: false
                } else {
                    false
                }
            }

            trendPoints.add(
                TrendDataPoint(
                    date = currentDate.toString(),
                    planned = planned,
                    actual = actual
                )
            )

            currentDate = currentDate.plusDays(1)
        }

        return trendPoints
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
    val documents: List<com.aiproj.mobile.data.models.Document> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null,

    // 任务总览统计相关
    val overviewStats: TaskOverviewStats? = null,
    val overviewLoading: Boolean = false,
    val overviewError: String? = null,
    val selectedTimeRange: TimeRange = TimeRange.LAST_7_DAYS
)
