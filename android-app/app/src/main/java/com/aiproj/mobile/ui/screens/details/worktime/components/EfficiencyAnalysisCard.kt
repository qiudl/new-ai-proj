package com.aiproj.mobile.ui.screens.details.worktime.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.EfficiencyMetrics

/**
 * 效率分析卡片
 */
@Composable
fun EfficiencyAnalysisCard(
    metrics: EfficiencyMetrics
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "效率分析",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            // 最高工作日
            metrics.mostProductiveDay?.let { day ->
                EfficiencyMetricItem(
                    icon = Icons.Default.TrendingUp,
                    iconTint = Color(0xFF4CAF50),
                    label = "最高工作日",
                    value = formatDate(day.date),
                    detail = "%.1fh · %d个任务".format(day.hours, day.completedTasks)
                )
            }

            // 最低工作日
            metrics.leastProductiveDay?.let { day ->
                EfficiencyMetricItem(
                    icon = Icons.Default.TrendingDown,
                    iconTint = Color(0xFFF44336),
                    label = "最低工作日",
                    value = formatDate(day.date),
                    detail = "%.1fh · %d个任务".format(day.hours, day.completedTasks)
                )
            }

            // 平均时长
            EfficiencyMetricItem(
                icon = Icons.Default.Assessment,
                iconTint = MaterialTheme.colorScheme.primary,
                label = "平均时长",
                value = "%.1fh/天".format(metrics.avgTaskDuration),
                detail = "共 ${metrics.totalSessions} 个时间段"
            )
        }
    }
}

/**
 * 效率指标项
 */
@Composable
fun EfficiencyMetricItem(
    icon: ImageVector,
    iconTint: Color,
    label: String,
    value: String,
    detail: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(24.dp)
        )

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = detail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 格式化日期显示
 */
private fun formatDate(dateString: String): String {
    return try {
        // 格式化为 MM/DD
        val parts = dateString.split("-")
        if (parts.size >= 3) {
            "${parts[1]}/${parts[2]}"
        } else {
            dateString
        }
    } catch (e: Exception) {
        dateString
    }
}
