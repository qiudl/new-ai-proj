package com.aiproj.mobile.ui.screens.details.pendingtasks.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority

/**
 * 待办任务卡片
 */
@Composable
fun PendingTaskCard(
    task: Task,
    isMultiSelectMode: Boolean,
    isSelected: Boolean,
    onClick: () -> Unit,
    onSelect: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = if (isMultiSelectMode) onSelect else onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 多选模式下的复选框
            if (isMultiSelectMode) {
                Checkbox(
                    checked = isSelected,
                    onCheckedChange = { onSelect() }
                )
            } else {
                // 优先级指示器
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(
                            color = when (task.priority) {
                                TaskPriority.HIGH -> Color(0xFFF44336)
                                TaskPriority.MEDIUM -> Color(0xFFFF9800)
                                TaskPriority.LOW -> Color(0xFF9E9E9E)
                                null -> Color.Gray
                            },
                            shape = CircleShape
                        )
                )
            }

            // 任务信息
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    task.projectName?.let { projectName ->
                        Text(
                            text = projectName,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    task.dueDate?.let { dueDate ->
                        Text(
                            text = "截止: ${dueDate.substring(5, 10)}", // MM-DD
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isOverdue(dueDate))
                                Color(0xFFF44336)
                            else
                                MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // 优先级标签
            if (!isMultiSelectMode) {
                PriorityChip(priority = task.priority)
            }
        }
    }
}

/**
 * 优先级标签
 */
@Composable
fun PriorityChip(priority: TaskPriority?) {
    val (label, color) = when (priority) {
        TaskPriority.HIGH -> "高" to Color(0xFFF44336)
        TaskPriority.MEDIUM -> "中" to Color(0xFFFF9800)
        TaskPriority.LOW -> "低" to Color(0xFF9E9E9E)
        null -> "" to Color.Gray
    }

    if (label.isNotEmpty()) {
        Surface(
            color = color.copy(alpha = 0.1f),
            shape = MaterialTheme.shapes.small
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = color,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

/**
 * 检查是否逾期
 */
private fun isOverdue(dueDate: String): Boolean {
    return try {
        // 简化判断，实际应该用正确的日期比较
        false // TODO: Implement proper date comparison
    } catch (e: Exception) {
        false
    }
}
