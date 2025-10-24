package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.EfficiencyDay

/**
 * 效率指标卡片组件
 *
 * 显示核心效率指标：平均、最佳、最低、波动性
 */
@Composable
fun EfficiencyMetricsCard(
    averageEfficiency: Float,
    bestEfficiency: EfficiencyDay?,
    worstEfficiency: EfficiencyDay?,
    volatility: String,
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
                text = "📊 核心指标",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            // 平均效率
            EfficiencyMetricItem(
                icon = Icons.Default.BarChart,
                title = "平均效率",
                value = "${(averageEfficiency * 100).toInt()}%",
                subtitle = "本周整体表现",
                color = MaterialTheme.colorScheme.primary
            )

            HorizontalDivider()

            // 最佳效率
            if (bestEfficiency != null) {
                EfficiencyMetricItem(
                    icon = Icons.Default.EmojiEvents,
                    title = "最佳效率",
                    value = "${(bestEfficiency.efficiency * 100).toInt()}% (${bestEfficiency.weekday})",
                    subtitle = "完成${bestEfficiency.tasksCompleted}个任务",
                    color = Color(0xFFFFD700)
                )

                HorizontalDivider()
            }

            // 最低效率
            if (worstEfficiency != null) {
                EfficiencyMetricItem(
                    icon = Icons.AutoMirrored.Filled.TrendingDown,
                    title = "最低效率",
                    value = "${(worstEfficiency.efficiency * 100).toInt()}% (${worstEfficiency.weekday})",
                    subtitle = "仅完成${worstEfficiency.tasksCompleted}个任务",
                    color = Color(0xFFFF9800)
                )

                HorizontalDivider()
            }

            // 效率波动
            EfficiencyMetricItem(
                icon = Icons.AutoMirrored.Filled.ShowChart,
                title = "效率波动",
                value = volatility,
                subtitle = when (volatility) {
                    "低" -> "非常稳定，保持良好"
                    "中等" -> "适度波动，可接受"
                    "高" -> "波动较大，需关注"
                    else -> ""
                },
                color = when (volatility) {
                    "低" -> Color(0xFF4CAF50)
                    "中等" -> Color(0xFFFF9800)
                    "高" -> Color(0xFFE53935)
                    else -> MaterialTheme.colorScheme.onSurface
                }
            )
        }
    }
}

/**
 * 单个效率指标项
 */
@Composable
private fun EfficiencyMetricItem(
    icon: ImageVector,
    title: String,
    value: String,
    subtitle: String,
    color: Color
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(32.dp)
        )

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
            if (subtitle.isNotEmpty()) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
