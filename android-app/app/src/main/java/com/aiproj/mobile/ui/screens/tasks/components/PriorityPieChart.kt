package com.aiproj.mobile.ui.screens.tasks.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.PriorityHigh
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.PriorityDistribution

/**
 * 优先级分布饼图
 */
@Composable
fun PriorityPieChart(
    distribution: PriorityDistribution,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 标题
            Text(
                text = "🎯 优先级分布",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            if (distribution.total == 0) {
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
                            .height(200.dp)
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "暂无优先级数据",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // 饼图
                    PieChartCanvas(
                        distribution = distribution,
                        modifier = Modifier.size(180.dp)
                    )

                    // 图例和统计
                    Column(
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        PriorityLegendItem(
                            icon = Icons.Default.PriorityHigh,
                            label = "高优先级",
                            count = distribution.high,
                            percentage = distribution.highPercentage,
                            color = Color(0xFFF44336)
                        )
                        PriorityLegendItem(
                            icon = Icons.Default.Remove,
                            label = "中优先级",
                            count = distribution.medium,
                            percentage = distribution.mediumPercentage,
                            color = Color(0xFFFF9800)
                        )
                        PriorityLegendItem(
                            icon = Icons.Default.KeyboardArrowDown,
                            label = "低优先级",
                            count = distribution.low,
                            percentage = distribution.lowPercentage,
                            color = Color(0xFF9E9E9E)
                        )
                    }
                }

                // 总数提示
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "共 ${distribution.total} 个子任务",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun PieChartCanvas(
    distribution: PriorityDistribution,
    modifier: Modifier = Modifier
) {
    val highColor = Color(0xFFF44336)
    val mediumColor = Color(0xFFFF9800)
    val lowColor = Color(0xFF9E9E9E)

    Canvas(modifier = modifier) {
        val canvasSize = size.minDimension
        val radius = canvasSize / 2 * 0.8f
        val centerOffset = Offset(size.width / 2, size.height / 2)

        var currentAngle = -90f // 从顶部开始

        // 高优先级扇形
        if (distribution.high > 0) {
            val sweepAngle = 360f * distribution.highPercentage
            drawArc(
                color = highColor,
                startAngle = currentAngle,
                sweepAngle = sweepAngle,
                useCenter = true,
                topLeft = centerOffset - Offset(radius, radius),
                size = Size(radius * 2, radius * 2)
            )
            drawArc(
                color = Color.White,
                startAngle = currentAngle,
                sweepAngle = sweepAngle,
                useCenter = false,
                topLeft = centerOffset - Offset(radius, radius),
                size = Size(radius * 2, radius * 2),
                style = Stroke(width = 2f)
            )
            currentAngle += sweepAngle
        }

        // 中优先级扇形
        if (distribution.medium > 0) {
            val sweepAngle = 360f * distribution.mediumPercentage
            drawArc(
                color = mediumColor,
                startAngle = currentAngle,
                sweepAngle = sweepAngle,
                useCenter = true,
                topLeft = centerOffset - Offset(radius, radius),
                size = Size(radius * 2, radius * 2)
            )
            drawArc(
                color = Color.White,
                startAngle = currentAngle,
                sweepAngle = sweepAngle,
                useCenter = false,
                topLeft = centerOffset - Offset(radius, radius),
                size = Size(radius * 2, radius * 2),
                style = Stroke(width = 2f)
            )
            currentAngle += sweepAngle
        }

        // 低优先级扇形
        if (distribution.low > 0) {
            val sweepAngle = 360f * distribution.lowPercentage
            drawArc(
                color = lowColor,
                startAngle = currentAngle,
                sweepAngle = sweepAngle,
                useCenter = true,
                topLeft = centerOffset - Offset(radius, radius),
                size = Size(radius * 2, radius * 2)
            )
            drawArc(
                color = Color.White,
                startAngle = currentAngle,
                sweepAngle = sweepAngle,
                useCenter = false,
                topLeft = centerOffset - Offset(radius, radius),
                size = Size(radius * 2, radius * 2),
                style = Stroke(width = 2f)
            )
        }
    }
}

@Composable
private fun PriorityLegendItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    count: Int,
    percentage: Float,
    color: Color
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier.size(12.dp),
            color = color,
            shape = MaterialTheme.shapes.small
        ) {}

        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(16.dp)
        )

        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "$count (${(percentage * 100).toInt()}%)",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
