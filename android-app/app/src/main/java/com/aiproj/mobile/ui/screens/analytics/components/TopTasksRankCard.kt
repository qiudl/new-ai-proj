package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.TopTask

/**
 * Top任务排行卡片组件
 *
 * 显示按工作时长排序的Top 5任务
 */
@Composable
fun TopTasksRankCard(
    topTasks: List<TopTask>,
    onTaskClick: (Int) -> Unit,
    onViewAllClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 标题栏
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🏆 Top任务（按时长）",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                TextButton(onClick = onViewAllClick) {
                    Text("查看全部")
                }
            }

            // Top 5 任务列表
            if (topTasks.isEmpty()) {
                EmptyTasksPlaceholder()
            } else {
                topTasks.take(5).forEachIndexed { index, task ->
                    TopTaskItem(
                        rank = index + 1,
                        task = task,
                        onClick = { onTaskClick(task.taskId) }
                    )

                    if (index < minOf(4, topTasks.size - 1)) {
                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        )
                    }
                }
            }
        }
    }
}

/**
 * Top任务列表项
 */
@Composable
private fun TopTaskItem(
    rank: Int,
    task: TopTask,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 排名徽章
        Box(
            modifier = Modifier
                .size(32.dp)
                .background(
                    color = when (rank) {
                        1 -> Color(0xFFFFD700) // 金色
                        2 -> Color(0xFFC0C0C0) // 银色
                        3 -> Color(0xFFCD7F32) // 铜色
                        else -> MaterialTheme.colorScheme.secondaryContainer
                    },
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = rank.toString(),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = if (rank <= 3) Color.White else MaterialTheme.colorScheme.onSecondaryContainer
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
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "#${task.taskId}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
                TaskStatusChip(status = task.status)
            }
        }

        // 工作时长
        Text(
            text = String.format("%.1fh", task.hours),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

/**
 * 状态标签
 */
@Composable
private fun TaskStatusChip(status: String) {
    val (label, color) = when (status) {
        "completed" -> "已完成" to Color(0xFF4CAF50)
        "in_progress" -> "进行中" to Color(0xFF2196F3)
        "todo" -> "待办" to Color(0xFFFF9800)
        else -> status to MaterialTheme.colorScheme.onSurfaceVariant
    }

    Surface(
        color = color.copy(alpha = 0.15f),
        shape = RoundedCornerShape(4.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

/**
 * 空任务占位符
 */
@Composable
private fun EmptyTasksPlaceholder() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "📭 暂无任务数据",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
