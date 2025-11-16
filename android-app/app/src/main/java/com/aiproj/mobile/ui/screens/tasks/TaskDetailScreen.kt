package com.aiproj.mobile.ui.screens.tasks

import android.util.Log
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.models.TimeLog
import com.aiproj.mobile.ui.screens.tasks.tabs.TaskInfoTab
import com.aiproj.mobile.ui.screens.tasks.tabs.TaskOverviewTab
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * 任务详情Tab枚举
 */
enum class TaskDetailTab(val title: String, val icon: ImageVector) {
    DETAILS("任务详情", Icons.Default.Info),     // 默认Tab
    OVERVIEW("任务总览", Icons.Default.BarChart)
}

/**
 * 任务详情页面
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun TaskDetailScreen(
    onNavigateBack: () -> Unit,
    onEdit: (Int) -> Unit,
    onNavigateToDocuments: ((Int) -> Unit)? = null,
    onNavigateToTask: ((Int) -> Unit)? = null,
    onNavigateToDocumentViewer: ((Int, Int) -> Unit)? = null,
    viewModel: TaskDetailViewModel = hiltViewModel()
) {
    Log.d("TaskDetailScreen", "TaskDetailScreen Composable 开始渲染")

    val uiState by viewModel.uiState.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }

    // Tab状态 - 默认显示详情Tab (index 0)
    val pagerState = rememberPagerState(
        initialPage = 0,
        pageCount = { TaskDetailTab.values().size }
    )
    val scope = rememberCoroutineScope()

    // TODO: 从TokenManager或UserPreferencesManager获取当前用户ID
    val currentUserId = remember { 1 }

    Log.d("TaskDetailScreen", "UI状态: isLoading=${uiState.isLoading}, task=${uiState.task?.title}, error=${uiState.error}")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("任务详情") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    uiState.task?.let { task ->
                        onNavigateToDocuments?.let { navigateToDocuments ->
                            IconButton(onClick = { navigateToDocuments(task.id) }) {
                                Icon(Icons.Default.Description, contentDescription = "文档")
                            }
                        }
                        IconButton(onClick = { onEdit(task.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = "编辑")
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "删除")
                        }
                    }
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                }
            )
        },
        snackbarHost = {
            if (uiState.error != null) {
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("关闭")
                        }
                    }
                ) {
                    Text(uiState.error!!)
                }
            }
        },
        bottomBar = {
            uiState.task?.let { task ->
                TaskActionBar(
                    task = task,
                    onStart = { viewModel.startTask() },
                    onComplete = { viewModel.completeTask() }
                )
            }
        }
    ) { paddingValues ->
        Log.d("TaskDetailScreen", "渲染主内容区域: isLoading=${uiState.isLoading}")

        if (uiState.isLoading) {
            Log.d("TaskDetailScreen", "显示加载指示器")
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            Log.d("TaskDetailScreen", "加载完成, task是否为null: ${uiState.task == null}")

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // TabRow
                TabRow(
                    selectedTabIndex = pagerState.currentPage,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.primary
                ) {
                    TaskDetailTab.values().forEachIndexed { index, tab ->
                        Tab(
                            selected = pagerState.currentPage == index,
                            onClick = {
                                scope.launch {
                                    pagerState.animateScrollToPage(index)
                                }
                            },
                            text = { Text(tab.title) },
                            icon = {
                                Icon(
                                    imageVector = tab.icon,
                                    contentDescription = tab.title
                                )
                            }
                        )
                    }
                }

                // HorizontalPager for swipeable tabs
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize()
                ) { page ->
                    when (TaskDetailTab.values()[page]) {
                        TaskDetailTab.DETAILS -> {
                            TaskInfoTab(
                                task = uiState.task,
                                subtasks = uiState.subtasks,
                                timeLogs = uiState.timeLogs,
                                attachments = uiState.attachments,
                                comments = uiState.comments,
                                documents = uiState.documents,
                                currentUserId = currentUserId,
                                onSubtaskClick = { subtaskId ->
                                    onNavigateToTask?.invoke(subtaskId)
                                },
                                onDocumentClick = { documentId ->
                                    onNavigateToDocumentViewer?.invoke(uiState.task!!.id, documentId)
                                },
                                onNavigateToDocuments = onNavigateToDocuments,
                                onAttachmentDownload = viewModel::downloadAttachment,
                                onAttachmentDelete = viewModel::deleteAttachment,
                                onCommentDelete = viewModel::deleteComment,
                                onAddComment = viewModel::addComment
                            )
                        }
                        TaskDetailTab.OVERVIEW -> {
                            TaskOverviewTab(
                                task = uiState.task,
                                overviewStats = uiState.overviewStats,
                                selectedTimeRange = uiState.selectedTimeRange,
                                isLoading = uiState.overviewLoading,
                                error = uiState.overviewError,
                                onTimeRangeChange = viewModel::updateTimeRange,
                                onSubtaskClick = { subtaskId ->
                                    onNavigateToTask?.invoke(subtaskId)
                                },
                                onRetry = { viewModel.updateTimeRange(uiState.selectedTimeRange) }
                            )
                        }
                    }
                }
            }
        }
    }

    // 删除确认对话框
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("确认删除") },
            text = { Text("确定要删除这个任务吗？此操作不可撤销。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteTask {
                            onNavigateBack()
                        }
                        showDeleteDialog = false
                    }
                ) {
                    Text("删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}

/**
 * 任务详情内容
 */
@Composable
fun TaskDetailContent(
    task: Task,
    modifier: Modifier = Modifier,
    subtasks: List<Task> = emptyList(),
    timeLogs: List<TimeLog> = emptyList(),
    attachments: List<com.aiproj.mobile.data.models.Attachment> = emptyList(),
    comments: List<com.aiproj.mobile.data.models.Comment> = emptyList(),
    documents: List<com.aiproj.mobile.data.models.Document> = emptyList(),
    currentUserId: Int? = null,
    onSubtaskClick: (Int) -> Unit = {},
    onDocumentClick: (Int) -> Unit = {},
    onNavigateToDocuments: ((Int) -> Unit)? = null,
    onAttachmentDownload: (com.aiproj.mobile.data.models.Attachment) -> Unit = {},
    onAttachmentDelete: (com.aiproj.mobile.data.models.Attachment) -> Unit = {},
    onCommentDelete: (com.aiproj.mobile.data.models.Comment) -> Unit = {},
    onAddComment: (String) -> Unit = {}
) {
    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 标题
        Text(
            text = task.title,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        // 状态和优先级
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TaskStatusChip(status = task.status)
            task.priority?.let { priority ->
                TaskPriorityChip(priority = priority)
            }
        }

        HorizontalDivider()

        // 描述
        task.description?.let { description ->
            DetailSection(
                title = "描述",
                icon = Icons.Default.Description
            ) {
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }

        // 项目信息
        task.projectId?.let { projectId ->
            DetailSection(
                title = "所属项目",
                icon = Icons.Default.Folder
            ) {
                Text(
                    text = if (task.projectName != null) {
                        "项目 #$projectId · ${task.projectName}"
                    } else {
                        "项目 #$projectId"
                    },
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }

        // 时间信息
        DetailSection(
            title = "时间信息",
            icon = Icons.Default.Schedule
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                task.createdAt?.let {
                    InfoRow(
                        label = "创建时间",
                        value = formatDate(it)
                    )
                }
                task.updatedAt?.let {
                    InfoRow(
                        label = "更新时间",
                        value = formatDate(it)
                    )
                }
                task.dueDate?.let {
                    InfoRow(
                        label = "截止日期",
                        value = formatDate(it)
                    )
                }
            }
        }

        // 负责人
        task.assigneeId?.let {
            DetailSection(
                title = "负责人",
                icon = Icons.Default.Person
            ) {
                Text(
                    text = task.assignee?.username ?: "用户 #$it",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }

        // 任务文档（始终显示）
        HorizontalDivider()
        DetailSection(
            title = "任务文档 (${documents.size})",
            icon = Icons.Default.Description
        ) {
            if (documents.isEmpty()) {
                // 没有文档时显示添加按钮
                Button(
                    onClick = { onNavigateToDocuments?.invoke(task.id) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("添加任务文档")
                }
            } else {
                // 有文档时显示文档列表
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    documents.forEach { document ->
                        DocumentCard(
                            document = document,
                            onClick = { onDocumentClick(document.id) }
                        )
                    }
                }
            }
        }

        // 子任务列表
        if (subtasks.isNotEmpty()) {
            HorizontalDivider()
            DetailSection(
                title = "子任务 (${subtasks.size})",
                icon = Icons.Default.Checklist
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    subtasks.forEach { subtask ->
                        SubtaskItem(
                            subtask = subtask,
                            onClick = { onSubtaskClick(subtask.id) }
                        )
                    }
                }
            }
        }

        // 时间日志列表
        if (timeLogs.isNotEmpty()) {
            HorizontalDivider()
            DetailSection(
                title = "时间日志 (${timeLogs.size})",
                icon = Icons.Default.Timer
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    timeLogs.forEach { timeLog ->
                        TimeLogCard(
                            description = timeLog.description ?: "无描述",
                            duration = timeLog.duration?.toLong() ?: 0L,
                            startTime = timeLog.startedAt
                        )
                    }
                }
            }
        }

        // 附件列表
        if (attachments.isNotEmpty()) {
            HorizontalDivider()
            DetailSection(
                title = "附件 (${attachments.size})",
                icon = Icons.Default.AttachFile
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    attachments.forEach { attachment ->
                        com.aiproj.mobile.ui.components.AttachmentItem(
                            attachment = attachment,
                            onDownload = { onAttachmentDownload(attachment) },
                            onDelete = { onAttachmentDelete(attachment) }
                        )
                    }
                }
            }
        }

        // 评论列表
        HorizontalDivider()
        DetailSection(
            title = "评论 (${comments.size})",
            icon = Icons.AutoMirrored.Filled.Comment
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // 评论输入框
                var commentText by remember { mutableStateOf("") }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = commentText,
                        onValueChange = { commentText = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("添加评论...") },
                        maxLines = 3
                    )

                    IconButton(
                        onClick = {
                            if (commentText.isNotBlank()) {
                                onAddComment(commentText)
                                commentText = ""
                            }
                        },
                        enabled = commentText.isNotBlank()
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Send,
                            contentDescription = "发送评论",
                            tint = if (commentText.isNotBlank()) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // 评论列表
                if (comments.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "暂无评论，快来抢沙发吧~",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else {
                    comments.forEach { comment ->
                        com.aiproj.mobile.ui.components.CommentItem(
                            comment = comment,
                            onDelete = { onCommentDelete(comment) },
                            canDelete = currentUserId != null && comment.userId == currentUserId
                        )
                    }
                }
            }
        }
    }
}

/**
 * 详情区块
 */
@Composable
fun DetailSection(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    content: @Composable () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
        content()
    }
}

/**
 * 信息行
 */
@Composable
fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * 优先级标签
 */
@Composable
fun TaskPriorityChip(priority: TaskPriority) {
    val (text, color) = when (priority) {
        TaskPriority.HIGH -> "高优先级" to Color.Red
        TaskPriority.MEDIUM -> "中优先级" to Color(0xFFFF9800)
        TaskPriority.LOW -> "低优先级" to Color.Gray
    }

    Surface(
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * 任务操作栏
 */
@Composable
fun TaskActionBar(
    task: Task,
    onStart: () -> Unit,
    onComplete: () -> Unit
) {
    Surface(
        tonalElevation = 3.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            when (task.status ?: TaskStatus.TODO) {
                TaskStatus.TODO, TaskStatus.PLANNING -> {
                    Button(
                        onClick = onStart,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("开始任务")
                    }
                }
                TaskStatus.IN_PROGRESS -> {
                    Button(
                        onClick = onComplete,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("完成任务")
                    }
                }
                TaskStatus.COMPLETED -> {
                    Surface(
                        modifier = Modifier.weight(1f),
                        color = Color(0xFF4CAF50).copy(alpha = 0.1f),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF4CAF50)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "已完成",
                                color = Color(0xFF4CAF50),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                else -> {
                    // 其他状态暂不显示操作按钮
                }
            }
        }
    }
}

/**
 * 子任务项
 */
@Composable
fun SubtaskItem(
    subtask: Task,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth(),
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = if (subtask.status == TaskStatus.COMPLETED) {
                MaterialTheme.colorScheme.surfaceVariant
            } else {
                MaterialTheme.colorScheme.surface
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = if (subtask.status == TaskStatus.COMPLETED) {
                    Icons.Default.CheckCircle
                } else {
                    Icons.Default.Circle
                },
                contentDescription = null,
                tint = if (subtask.status == TaskStatus.COMPLETED) {
                    Color(0xFF4CAF50)
                } else {
                    MaterialTheme.colorScheme.outline
                },
                modifier = Modifier.size(20.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = subtask.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    textDecoration = if (subtask.status == TaskStatus.COMPLETED) {
                        androidx.compose.ui.text.style.TextDecoration.LineThrough
                    } else {
                        null
                    },
                    color = if (subtask.status == TaskStatus.COMPLETED) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    }
                )
                subtask.description?.let { desc ->
                    if (desc.isNotBlank()) {
                        Text(
                            text = desc,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2
                        )
                    }
                }
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "查看详情",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 文档卡片
 */
@Composable
fun DocumentCard(
    document: com.aiproj.mobile.data.models.Document,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Description,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = document.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                document.updatedAt?.let {
                    Text(
                        text = "更新于 ${formatDate(it)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "查看文档",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 时间日志卡片
 */
@Composable
fun TimeLogCard(
    description: String,
    duration: Long,
    startTime: String
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = formatDate(startTime),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = formatDuration(duration),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

/**
 * 格式化时长 (XXh XXm)
 */
fun formatDuration(minutes: Long): String {
    val hours = minutes / 60
    val mins = minutes % 60
    return if (hours > 0) {
        "${hours}h ${mins}m"
    } else {
        "${mins}m"
    }
}

/**
 * 格式化日期
 */
fun formatDate(date: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
        val parsedDate = inputFormat.parse(date)
        parsedDate?.let { outputFormat.format(it) } ?: date
    } catch (e: Exception) {
        date
    }
}
