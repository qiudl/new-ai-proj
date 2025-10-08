package com.aiproj.mobile.ui.screens.tasks.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.TopTaskItem
import com.aiproj.mobile.ui.screens.tasks.TaskPriorityChip
import com.aiproj.mobile.ui.screens.tasks.TaskStatusChip

/**
 * Top任务排行卡片
 */
@Composable
fun TopTasksCard(
    topTasks: List<TopTaskItem>,
    onTaskClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 标题
            Text(
                text = "🏆 Top 5 耗时子任务",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            if (topTasks.isEmpty()) {
                // 空状态
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "暂无子任务时长数据",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                topTasks.forEachIndexed { index, task ->
                    TopTaskItem(
                        rank = index + 1,
                        task = task,
                        onClick = { onTaskClick(task.taskId) }
                    )
                    if (index < topTasks.size - 1) {
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}

@Composable
private fun TopTaskItem(
    rank: Int,
    task: TopTaskItem,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 排名徽章
        Surface(
            color = when (rank) {
                1 -> MaterialTheme.colorScheme.errorContainer
                2 -> MaterialTheme.colorScheme.tertiaryContainer
                3 -> MaterialTheme.colorScheme.secondaryContainer
                else -> MaterialTheme.colorScheme.surfaceVariant
            },
            shape = MaterialTheme.shapes.small
        ) {
            Text(
                text = "$rank",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                color = when (rank) {
                    1 -> MaterialTheme.colorScheme.onErrorContainer
                    2 -> MaterialTheme.colorScheme.onTertiaryContainer
                    3 -> MaterialTheme.colorScheme.onSecondaryContainer
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                }
            )
        }

        // 任务信息
        Column(modifier = Modifier.weight(1f)) {
            // 标题
            Text(
                text = "#${task.taskId} ${task.title}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(4.dp))

            // 状态和优先级
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TaskStatusChip(status = task.status)
                task.priority?.let { priority ->
                    TaskPriorityChip(priority = priority)
                }
            }
        }

        // 时长和进度
        Column(
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = String.format("%.1fh", task.workHours),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            LinearProgressIndicator(
                progress = { task.percentage },
                modifier = Modifier.width(60.dp),
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "${(task.percentage * 100).toInt()}%",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // 右箭头
        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = "查看详情",
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
