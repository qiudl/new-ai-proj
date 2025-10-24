package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.EfficiencyTrend
import kotlin.math.min

/**
 * 效率得分卡片
 */
@Composable
fun EfficiencyScoreCard(
    efficiencyTrend: EfficiencyTrend?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 标题
            Text(
                text = "效率总览",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            if (efficiencyTrend == null) {
                // 空状态
                EmptyEfficiencyState()
            } else {
                // 主要得分显示
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // 圆形进度条和得分
                    Box(
                        modifier = Modifier.size(140.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularScoreIndicator(
                            score = efficiencyTrend.averageScore.toFloat(),
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    // 趋势和统计
                    Column(
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        TrendIndicator(trend = efficiencyTrend.trend)
                        TimeRangeInfo(timeRange = efficiencyTrend.timeRange)
                        DataPointsInfo(dataPoints = efficiencyTrend.dailyData.size)
                    }
                }

                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 8.dp),
                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                )

                // 最佳和最差日期
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    // 最佳日期
                    efficiencyTrend.bestDay?.let { bestDay ->
                        DayPerformanceChip(
                            label = "最佳",
                            date = bestDay.getDisplayDate(),
                            score = bestDay.efficiencyScore.toFloat(),
                            icon = Icons.AutoMirrored.Filled.TrendingUp,
                            color = MaterialTheme.colorScheme.tertiary
                        )
                    }

                    // 最差日期
                    efficiencyTrend.worstDay?.let { worstDay ->
                        DayPerformanceChip(
                            label = "待提升",
                            date = worstDay.getDisplayDate(),
                            score = worstDay.efficiencyScore.toFloat(),
                            icon = Icons.AutoMirrored.Filled.TrendingDown,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }
    }
}

/**
 * 圆形得分指示器
 */
@Composable
private fun CircularScoreIndicator(
    score: Float,
    modifier: Modifier = Modifier
) {
    val animatedScore = remember { Animatable(0f) }

    LaunchedEffect(score) {
        animatedScore.animateTo(
            targetValue = score,
            animationSpec = tween(durationMillis = 1000)
        )
    }

    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        // 绘制圆形进度
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeWidth = 12.dp.toPx()
            val diameter = min(size.width, size.height)
            val radius = (diameter - strokeWidth) / 2

            // 背景圆
            drawArc(
                color = Color.LightGray.copy(alpha = 0.2f),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = Offset(
                    (size.width - diameter) / 2 + strokeWidth / 2,
                    (size.height - diameter) / 2 + strokeWidth / 2
                ),
                size = Size(diameter - strokeWidth, diameter - strokeWidth),
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )

            // 进度圆弧
            val sweepAngle = (animatedScore.value / 100f) * 360f
            val progressColor = when {
                animatedScore.value >= 80 -> Color(0xFF4CAF50) // 绿色
                animatedScore.value >= 60 -> Color(0xFFFFC107) // 黄色
                else -> Color(0xFFF44336) // 红色
            }

            drawArc(
                color = progressColor,
                startAngle = -90f,
                sweepAngle = sweepAngle,
                useCenter = false,
                topLeft = Offset(
                    (size.width - diameter) / 2 + strokeWidth / 2,
                    (size.height - diameter) / 2 + strokeWidth / 2
                ),
                size = Size(diameter - strokeWidth, diameter - strokeWidth),
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        }

        // 中心文字
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = String.format("%.0f", animatedScore.value),
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "分",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 趋势指示器
 */
@Composable
private fun TrendIndicator(trend: String) {
    val (icon, text, color) = when (trend) {
        "improving" -> Triple(Icons.AutoMirrored.Filled.TrendingUp, "上升趋势", Color(0xFF4CAF50))
        "declining" -> Triple(Icons.AutoMirrored.Filled.TrendingDown, "下降趋势", Color(0xFFF44336))
        else -> Triple(Icons.AutoMirrored.Filled.TrendingFlat, "保持稳定", Color(0xFFFFC107))
    }

    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = text,
            tint = color,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = color
        )
    }
}

/**
 * 时间范围信息
 */
@Composable
private fun TimeRangeInfo(timeRange: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.DateRange,
            contentDescription = "时间范围",
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(16.dp)
        )
        Text(
            text = timeRange,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 数据点数信息
 */
@Composable
private fun DataPointsInfo(dataPoints: Int) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.DataUsage,
            contentDescription = "数据点",
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(16.dp)
        )
        Text(
            text = "$dataPoints 天数据",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 日期表现标签
 */
@Composable
private fun RowScope.DayPerformanceChip(
    label: String,
    date: String,
    score: Float,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color
) {
    Surface(
        modifier = Modifier.weight(1f),
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = color,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = date,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${score.toInt()}分",
                style = MaterialTheme.typography.labelMedium,
                color = color,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * 空状态
 */
@Composable
private fun EmptyEfficiencyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Assessment,
            contentDescription = "暂无数据",
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
            modifier = Modifier.size(48.dp)
        )
        Text(
            text = "暂无效率数据",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = "完成任务后将显示效率分析",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun EfficiencyScoreCardPreview() {
    MaterialTheme {
        EfficiencyScoreCard(
            efficiencyTrend = null,
            modifier = Modifier.padding(16.dp)
        )
    }
}
