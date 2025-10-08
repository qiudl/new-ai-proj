package com.aiproj.mobile.ui.screens.details.worktime.components

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
import com.aiproj.mobile.data.models.DailyWorkStat
import com.aiproj.mobile.ui.screens.details.worktime.TimeRange

/**
 * 工作时长趋势图
 *
 * 注意：这是简化版实现，生产环境建议使用Vico或MPAndroidChart
 */
@Composable
fun WorkTimeTrendChart(
    dailyStats: List<DailyWorkStat>,
    timeRange: TimeRange
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "工作时长趋势",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (dailyStats.isEmpty()) {
                // 空状态
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "暂无数据",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                // 柱状图
                SimpleBarChart(
                    data = dailyStats.map { it.hours },
                    labels = dailyStats.map {
                        // 格式化日期显示 MM-DD
                        try {
                            it.date.substring(5)
                        } catch (e: Exception) {
                            it.date
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                )
            }
        }
    }
}

/**
 * 简单柱状图
 */
@Composable
fun SimpleBarChart(
    data: List<Float>,
    labels: List<String>,
    modifier: Modifier = Modifier
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val surfaceColor = MaterialTheme.colorScheme.surfaceVariant

    Column(modifier = modifier) {
        // 图表区域
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            if (data.isEmpty()) return@Canvas

            val maxValue = data.maxOrNull() ?: 1f
            val barWidth = size.width / (data.size * 2f)
            val barSpacing = barWidth * 0.5f

            data.forEachIndexed { index, value ->
                val barHeight = if (maxValue > 0) (value / maxValue) * size.height * 0.85f else 0f
                val x = index * (barWidth + barSpacing) + barSpacing
                val y = size.height - barHeight

                // 绘制柱子
                drawRoundRect(
                    color = primaryColor,
                    topLeft = Offset(x, y),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 标签行
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            labels.forEach { label ->
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
