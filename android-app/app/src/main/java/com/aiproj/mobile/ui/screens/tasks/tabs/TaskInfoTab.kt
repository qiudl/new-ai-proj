package com.aiproj.mobile.ui.screens.tasks.tabs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.ui.screens.tasks.*

/**
 * 任务详情Tab - 显示任务的详细信息
 */
@Composable
fun TaskInfoTab(
    task: Task?,
    subtasks: List<Task> = emptyList(),
    timeLogs: List<com.aiproj.mobile.data.models.TimeLog> = emptyList(),
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
    onAddComment: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    if (task == null) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text("任务不存在")
        }
        return
    }

    Column(
        modifier = modifier
            .fillMaxSize()
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

        // 任务文档
        HorizontalDivider()
        DetailSection(
            title = "任务文档 (${documents.size})",
            icon = Icons.Default.Description
        ) {
            if (documents.isEmpty()) {
                Button(
                    onClick = { onNavigateToDocuments?.invoke(task.id) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("添加任务文档")
                }
            } else {
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
            icon = Icons.Default.Comment
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
                            imageVector = Icons.Default.Send,
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
