package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.TaskStatusDistribution

/**
 * 任务完成分析卡片
 */
@Composable
fun TaskCompletionAnalysisCard(
    completedCount: Int,
    totalCount: Int,
    completionRate: Float,
    statusDistribution: TaskStatusDistribution,
    modifier: Modifier = Modifier,
    dateRangeText: String = "",  // 新增：日期范围文本
    onStatusClick: (String) -> Unit = {}
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // 标题
            Text(
                text = "🎯 任务完成分析",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 完成率摘要 - 动态显示日期范围
            Text(
                text = if (dateRangeText.isNotEmpty()) {
                    "$dateRangeText 完成: $completedCount / $totalCount (${(completionRate * 100).toInt()}%)"
                } else {
                    "完成: $completedCount / $totalCount (${(completionRate * 100).toInt()}%)"
                },
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 完成率进度条
            LinearProgressIndicator(
                progress = { completionRate },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(12.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 状态分布 - 只显示数量大于0的状态
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // 已完成
                if (statusDistribution.completed > 0) {
                    StatusDistributionItem(
                        label = "✅ 已完成",
                        count = statusDistribution.completed,
                        percentage = statusDistribution.completedPercentage,
                        color = MaterialTheme.colorScheme.primary,
                        onClick = { onStatusClick("completed") }
                    )
                }

                // 进行中
                if (statusDistribution.inProgress > 0) {
                    StatusDistributionItem(
                        label = "🔄 进行中",
                        count = statusDistribution.inProgress,
                        percentage = statusDistribution.inProgressPercentage,
                        color = MaterialTheme.colorScheme.secondary,
                        onClick = { onStatusClick("in_progress") }
                    )
                }

                // 待办
                if (statusDistribution.todo > 0) {
                    StatusDistributionItem(
                        label = "📋 待办",
                        count = statusDistribution.todo,
                        percentage = statusDistribution.todoPercentage,
                        color = MaterialTheme.colorScheme.tertiary,
                        onClick = { onStatusClick("todo") }
                    )
                }

                // 其他状态(删除、取消、阻塞等)
                if (statusDistribution.others > 0) {
                    StatusDistributionItem(
                        label = "🗑️ 其他",
                        count = statusDistribution.others,
                        percentage = statusDistribution.othersPercentage,
                        color = MaterialTheme.colorScheme.outline,
                        onClick = { onStatusClick("others") }
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusDistributionItem(
    label: String,
    count: Int,
    percentage: Float,
    color: Color,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                modifier = Modifier.size(12.dp),
                shape = MaterialTheme.shapes.extraSmall,
                color = color
            ) {}

            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Text(
            text = "$count 个 (${(percentage * 100).toInt()}%)",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
