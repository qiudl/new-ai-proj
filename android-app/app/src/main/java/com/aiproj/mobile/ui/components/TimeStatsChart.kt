package com.aiproj.mobile.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.DailyTimeStat
import com.aiproj.mobile.data.models.TimeStatsData

/**
 * 时间统计图表组件
 * 使用 Canvas 手动绘制柱状图
 */
@Composable
fun TimeStatsChart(
    timeStats: TimeStatsData,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 标题
            Text(
                text = "本周工作时间",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            // 统计摘要
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StatItem(
                    label = "总计",
                    value = "${String.format("%.1f", timeStats.totalHours)}小时"
                )
                StatItem(
                    label = "日均",
                    value = "${String.format("%.1f", timeStats.averageHoursPerDay)}小时"
                )
                timeStats.mostProductiveDay?.let { day ->
                    StatItem(
                        label = "最高效",
                        value = day
                    )
                }
            }

            Divider()

            // 简化的柱状图 - 使用 Canvas 手动绘制
            TimeBarChart(
                data = timeStats.dailyStats,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            )
        }
    }
}

/**
 * 统计项组件
 */
@Composable
private fun StatItem(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

/**
 * 简单的柱状图组件
 * 使用 Canvas 手动绘制
 */
@Composable
private fun TimeBarChart(
    data: List<DailyTimeStat>,
    modifier: Modifier = Modifier
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val surfaceVariant = MaterialTheme.colorScheme.surfaceVariant

    Column(modifier = modifier) {
        // 柱状图
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(horizontal = 8.dp)
        ) {
            if (data.isEmpty()) return@Canvas

            val maxHours = data.maxOf { it.hours }.coerceAtLeast(1f)
            val barWidth = size.width / data.size * 0.6f
            val spacing = size.width / data.size

            data.forEachIndexed { index, stat ->
                val barHeight = (stat.hours / maxHours) * size.height * 0.9f
                val left = index * spacing + (spacing - barWidth) / 2

                // 绘制柱子
                drawRoundRect(
                    color = primaryColor,
                    topLeft = Offset(left, size.height - barHeight),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                )
            }
        }

        // X 轴标签
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            data.forEach { stat ->
                Text(
                    text = stat.label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
    }
}
