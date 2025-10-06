package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TipsAndUpdates
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.DailyCompletion

/**
 * 任务完成趋势卡片组件
 *
 * 显示每日任务完成数量的横向条形图
 */
@Composable
fun TaskCompletionTrendCard(
    dailyCompletion: List<DailyCompletion>,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "📈 任务完成趋势",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            // 每日完成数横向条形图
            val maxCount = dailyCompletion.maxOfOrNull { it.completedCount } ?: 1
            dailyCompletion.forEach { day ->
                DailyCompletionBar(
                    weekday = day.weekday,
                    count = day.completedCount,
                    maxCount = maxCount
                )
            }

            // 趋势分析提示
            if (dailyCompletion.isNotEmpty()) {
                val bestDay = dailyCompletion.maxByOrNull { it.completedCount }
                if (bestDay != null && bestDay.completedCount > 0) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.TipsAndUpdates,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "趋势分析: ${bestDay.weekday}效率最高，完成了${bestDay.completedCount}个任务",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * 每日完成数条形图
 */
@Composable
private fun DailyCompletionBar(
    weekday: String,
    count: Int,
    maxCount: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 星期标签
        Text(
            text = weekday,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.width(40.dp)
        )

        // 进度条
        Box(
            modifier = Modifier
                .weight(1f)
                .height(28.dp)
        ) {
            val progress = if (maxCount > 0) count.toFloat() / maxCount else 0f

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(28.dp)
                    .clip(RoundedCornerShape(6.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            // 显示数量
            if (count > 0) {
                Text(
                    text = "${count}个",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                    color = if (progress > 0.5f) Color.White else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(start = 12.dp)
                )
            }
        }
    }
}
