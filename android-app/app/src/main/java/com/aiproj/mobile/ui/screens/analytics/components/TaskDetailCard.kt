package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.Task
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * 任务详情卡片
 * 显示任务的关键信息
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailCard(
    task: Task,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 第一行：任务ID + 任务名称
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                // 任务ID
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = "#${task.id}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // 任务名称
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 第二行：项目名称
            task.projectName?.let { projectName ->
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = projectName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // 第三行：时间信息
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // 开始时间
                TimeInfoChip(
                    icon = Icons.Default.PlayArrow,
                    label = "开始",
                    time = task.startDatetime ?: task.createdAt,
                    modifier = Modifier.weight(1f)
                )

                Spacer(modifier = Modifier.width(8.dp))

                // 完成/更新时间
                TimeInfoChip(
                    icon = if (task.status == com.aiproj.mobile.data.models.TaskStatus.COMPLETED) Icons.Default.Check else Icons.Default.Update,
                    label = if (task.status == com.aiproj.mobile.data.models.TaskStatus.COMPLETED) "完成" else "更新",
                    time = task.updatedAt,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 第四行：状态 + 优先级
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 状态标签
                StatusChip(status = task.status.name.lowercase())

                // 优先级
                task.priority?.let { priority ->
                    PriorityChip(priority = priority.name.lowercase())
                }
            }
        }
    }
}

/**
 * 时间信息芯片
 */
@Composable
fun TimeInfoChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    time: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.width(4.dp))
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = formatDateTime(time),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

/**
 * 状态芯片
 */
@Composable
fun StatusChip(status: String) {
    val (text, color) = when (status) {
        "completed" -> "已完成" to MaterialTheme.colorScheme.primary
        "in_progress" -> "进行中" to MaterialTheme.colorScheme.tertiary
        "todo" -> "待办" to MaterialTheme.colorScheme.secondary
        else -> status to MaterialTheme.colorScheme.onSurface
    }

    Surface(
        color = color.copy(alpha = 0.15f),
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = color,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

/**
 * 优先级芯片
 */
@Composable
fun PriorityChip(priority: String) {
    val (icon, text, color) = when (priority.lowercase()) {
        "high" -> Triple(Icons.Default.PriorityHigh, "高", MaterialTheme.colorScheme.error)
        "medium" -> Triple(Icons.Default.Remove, "中", MaterialTheme.colorScheme.tertiary)
        "low" -> Triple(Icons.Default.KeyboardArrowDown, "低", MaterialTheme.colorScheme.outline)
        else -> Triple(Icons.Default.Remove, priority, MaterialTheme.colorScheme.onSurface)
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = color
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = color
        )
    }
}

/**
 * 格式化日期时间
 */
private fun formatDateTime(isoDateTime: String): String {
    return try {
        val instant = Instant.parse(isoDateTime)
        val dateTime = instant.atZone(ZoneId.systemDefault())
        val formatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
        dateTime.format(formatter)
    } catch (e: Exception) {
        isoDateTime.take(16).replace('T', ' ')
    }
}
