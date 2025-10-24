package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * 任务总览卡片组件
 *
 * 显示任务总体统计：
 * - 总任务数（大号显示）
 * - 完成率圆环
 * - 三种状态分布（已完成、进行中、待办）
 */
@Composable
fun TaskOverviewCard(
    totalTasks: Int,
    completedTasks: Int,
    inProgressTasks: Int,
    todoTasks: Int,
    completionRate: Float,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 标题
            Text(
                text = "📊 任务总览",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            // 总任务数（大号显示）+ 完成率
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "总任务数",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = totalTasks.toString(),
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                // 完成率圆环
                Box(
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        progress = { completionRate },
                        modifier = Modifier.size(72.dp),
                        strokeWidth = 8.dp,
                        color = Color(0xFF4CAF50),
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                    Text(
                        text = "${(completionRate * 100).toInt()}%",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF4CAF50)
                    )
                }
            }

            // 分隔线
            HorizontalDivider()

            // 状态分布（3列网格）
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                TaskStatusItem(
                    icon = Icons.Default.CheckCircle,
                    label = "已完成",
                    count = completedTasks,
                    percentage = if (totalTasks > 0) completedTasks.toFloat() / totalTasks else 0f,
                    color = Color(0xFF4CAF50)
                )

                TaskStatusItem(
                    icon = Icons.Default.Refresh,
                    label = "进行中",
                    count = inProgressTasks,
                    percentage = if (totalTasks > 0) inProgressTasks.toFloat() / totalTasks else 0f,
                    color = Color(0xFF2196F3)
                )

                TaskStatusItem(
                    icon = Icons.AutoMirrored.Filled.Assignment,
                    label = "待办",
                    count = todoTasks,
                    percentage = if (totalTasks > 0) todoTasks.toFloat() / totalTasks else 0f,
                    color = Color(0xFFFF9800)
                )
            }
        }
    }
}

/**
 * 单个任务状态项
 */
@Composable
private fun TaskStatusItem(
    icon: ImageVector,
    label: String,
    count: Int,
    percentage: Float,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(28.dp)
        )
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = "${(percentage * 100).toInt()}%",
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}
