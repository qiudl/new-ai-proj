package com.aiproj.mobile.ui.screens.projects

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus

/**
 * 项目看板视图（Kanban）
 */
@Composable
fun ProjectKanbanView(
    tasks: List<Task>,
    onTaskClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    // 按状态分组任务
    val tasksByStatus = tasks.groupBy { it.status }

    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // TODO 列
        item {
            KanbanColumn(
                title = "待办",
                status = TaskStatus.TODO,
                tasks = tasksByStatus[TaskStatus.TODO] ?: emptyList(),
                onTaskClick = onTaskClick,
                color = Color(0xFF2196F3)
            )
        }

        // IN_PROGRESS 列
        item {
            KanbanColumn(
                title = "进行中",
                status = TaskStatus.IN_PROGRESS,
                tasks = tasksByStatus[TaskStatus.IN_PROGRESS] ?: emptyList(),
                onTaskClick = onTaskClick,
                color = Color(0xFF4CAF50)
            )
        }

        // TESTING 列
        item {
            KanbanColumn(
                title = "测试中",
                status = TaskStatus.TESTING,
                tasks = tasksByStatus[TaskStatus.TESTING] ?: emptyList(),
                onTaskClick = onTaskClick,
                color = Color(0xFFFF9800)
            )
        }

        // COMPLETED 列
        item {
            KanbanColumn(
                title = "已完成",
                status = TaskStatus.COMPLETED,
                tasks = tasksByStatus[TaskStatus.COMPLETED] ?: emptyList(),
                onTaskClick = onTaskClick,
                color = Color(0xFF9E9E9E)
            )
        }

        // BLOCKED 列
        item {
            KanbanColumn(
                title = "阻塞",
                status = TaskStatus.BLOCKED,
                tasks = tasksByStatus[TaskStatus.BLOCKED] ?: emptyList(),
                onTaskClick = onTaskClick,
                color = Color(0xFFF44336)
            )
        }
    }
}

/**
 * 看板列
 */
@Composable
fun KanbanColumn(
    title: String,
    status: TaskStatus,
    tasks: List<Task>,
    onTaskClick: (Int) -> Unit,
    color: Color
) {
    Surface(
        modifier = Modifier
            .width(280.dp)
            .fillMaxHeight(),
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            // 列标题
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = color.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(4.dp)
                    )
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = color
                ) {
                    Text(
                        text = "${tasks.size}",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 任务列表
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(tasks) { task ->
                    KanbanTaskCard(
                        task = task,
                        onClick = { onTaskClick(task.id) }
                    )
                }

                // 空状态提示
                if (tasks.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "暂无任务",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * 看板任务卡片
 */
@Composable
fun KanbanTaskCard(
    task: Task,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth()
        ) {
            // 优先级标记
            task.priority?.let { priority ->
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = when (priority) {
                        TaskPriority.HIGH -> Color.Red.copy(alpha = 0.1f)
                        TaskPriority.MEDIUM -> Color(0xFFFF9800).copy(alpha = 0.1f)
                        TaskPriority.LOW -> Color.Gray.copy(alpha = 0.1f)
                    }
                ) {
                    Text(
                        text = when (priority) {
                            TaskPriority.HIGH -> "高"
                            TaskPriority.MEDIUM -> "中"
                            TaskPriority.LOW -> "低"
                        },
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = when (priority) {
                            TaskPriority.HIGH -> Color.Red
                            TaskPriority.MEDIUM -> Color(0xFFFF9800)
                            TaskPriority.LOW -> Color.Gray
                        },
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // 任务标题
            Text(
                text = task.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2
            )

            // 任务描述
            task.description?.let { desc ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }

            // 任务ID
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "#${task.id}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
        }
    }
}
