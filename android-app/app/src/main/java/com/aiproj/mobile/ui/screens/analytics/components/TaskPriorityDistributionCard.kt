package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.PriorityStats

/**
 * 任务优先级分布卡片组件
 *
 * 显示高、中、低优先级任务的分布情况
 */
@Composable
fun TaskPriorityDistributionCard(
    priorityStats: PriorityStats,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "🎯 任务优先级分布",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            // 高优先级
            PriorityProgressBar(
                label = "高优先级",
                count = priorityStats.highPriority,
                total = priorityStats.total,
                color = Color(0xFFE53935)
            )

            // 中优先级
            PriorityProgressBar(
                label = "中优先级",
                count = priorityStats.mediumPriority,
                total = priorityStats.total,
                color = Color(0xFFFF9800)
            )

            // 低优先级
            PriorityProgressBar(
                label = "低优先级",
                count = priorityStats.lowPriority,
                total = priorityStats.total,
                color = Color(0xFF4CAF50)
            )
        }
    }
}

/**
 * 单个优先级进度条
 */
@Composable
private fun PriorityProgressBar(
    label: String,
    count: Int,
    total: Int,
    color: Color
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = if (total > 0) {
                    "${((count.toFloat() / total) * 100).toInt()}% ($count)"
                } else "0% (0)",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }

        LinearProgressIndicator(
            progress = { if (total > 0) count.toFloat() / total else 0f },
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(5.dp)),
            color = color,
            trackColor = color.copy(alpha = 0.2f)
        )
    }
}
