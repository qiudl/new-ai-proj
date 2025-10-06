package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.TaskTimeEntry

/**
 * 任务时间条目卡片组件
 *
 * 显示单个任务的时间记录：
 * - 任务标题
 * - 项目名称
 * - 时间段（开始-结束）
 * - 工作时长
 * - 完成状态
 */
@Composable
fun TaskTimeEntryCard(
    taskEntry: TaskTimeEntry,
    modifier: Modifier = Modifier,
    onTaskClick: ((Int) -> Unit)? = null  // 任务点击回调，传递taskId
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = onTaskClick != null) {
                onTaskClick?.invoke(taskEntry.taskId)
            },
        colors = CardDefaults.cardColors(
            containerColor = if (taskEntry.isCompleted) {
                MaterialTheme.colorScheme.secondaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 左侧：状态图标
            Icon(
                imageVector = if (taskEntry.isCompleted) {
                    Icons.Default.CheckCircle
                } else {
                    Icons.Default.Schedule
                },
                contentDescription = if (taskEntry.isCompleted) "已完成" else "进行中",
                tint = if (taskEntry.isCompleted) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.tertiary
                },
                modifier = Modifier.size(32.dp)
            )

            Spacer(modifier = Modifier.width(16.dp))

            // 中间：任务信息
            Column(
                modifier = Modifier.weight(1f)
            ) {
                // 任务标题
                Text(
                    text = taskEntry.taskTitle,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2
                )

                Spacer(modifier = Modifier.height(4.dp))

                // 项目名称
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = taskEntry.projectName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // 时间段
                    Text(
                        text = "${taskEntry.startTime} - ${taskEntry.endTime}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // 右侧：工作时长
            Column(
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = String.format("%.1fh", taskEntry.duration),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                // 状态标签
                Text(
                    text = when (taskEntry.status) {
                        "completed" -> "已完成"
                        "in_progress" -> "进行中"
                        "todo" -> "待开始"
                        else -> taskEntry.status
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = if (taskEntry.isCompleted) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.tertiary
                    }
                )
            }
        }
    }
}
