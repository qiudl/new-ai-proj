package com.aiproj.mobile.ui.screens.details.worktime.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * 今日工作时长卡片
 */
@Composable
fun TodayWorkTimeCard(
    todayHours: Float,
    todayTaskCount: Int,
    comparisonYesterday: Float
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "今日工作时长",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )

            // 主要时长显示
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                val hours = todayHours.toInt()
                val minutes = ((todayHours - hours) * 60).toInt()

                Text(
                    text = "${hours}h ${minutes}m",
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // 对比昨日
            if (comparisonYesterday != 0f) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = if (comparisonYesterday > 0)
                            Icons.Default.TrendingUp
                        else
                            Icons.Default.TrendingDown,
                        contentDescription = null,
                        tint = if (comparisonYesterday > 0)
                            Color(0xFF4CAF50)
                        else
                            Color(0xFFF44336),
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "${if (comparisonYesterday > 0) "+" else ""}%.1f%% vs 昨日".format(comparisonYesterday),
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (comparisonYesterday > 0)
                            Color(0xFF4CAF50)
                        else
                            Color(0xFFF44336)
                    )
                }
            }

            // 完成任务数
            Text(
                text = "完成 $todayTaskCount 个任务",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
            )
        }
    }
}
