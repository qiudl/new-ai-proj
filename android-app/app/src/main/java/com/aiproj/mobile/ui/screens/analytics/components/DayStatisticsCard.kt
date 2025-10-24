package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.DayDetail

/**
 * 日统计卡片组件
 *
 * 显示选中日期的核心统计指标：
 * - 工作时长
 * - 完成任务数
 * - 工作效率
 */
@Composable
fun DayStatisticsCard(
    dayDetail: DayDetail,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            // 标题：日期 + 星期
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${dayDetail.date} ${dayDetail.weekday}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )

                // 效率徽章
                Surface(
                    color = when {
                        dayDetail.efficiency >= 0.8f -> MaterialTheme.colorScheme.primary
                        dayDetail.efficiency >= 0.6f -> MaterialTheme.colorScheme.tertiary
                        else -> MaterialTheme.colorScheme.error
                    },
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = "${(dayDetail.efficiency * 100).toInt()}% 效率",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 统计指标网格
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                // 工作时长
                StatisticItem(
                    icon = "⏱️",
                    value = String.format("%.1fh", dayDetail.hours),
                    label = "工作时长",
                    modifier = Modifier.weight(1f)
                )

                HorizontalDivider(
                    modifier = Modifier
                        .width(1.dp)
                        .height(60.dp),
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.2f)
                )

                // 完成任务
                StatisticItem(
                    icon = "✅",
                    value = "${dayDetail.tasksCompleted}",
                    label = "完成任务",
                    modifier = Modifier.weight(1f)
                )

                HorizontalDivider(
                    modifier = Modifier
                        .width(1.dp)
                        .height(60.dp),
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.2f)
                )

                // 任务总数
                StatisticItem(
                    icon = "📋",
                    value = "${dayDetail.taskEntries.size}",
                    label = "任务总数",
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

/**
 * 单个统计项
 */
@Composable
private fun StatisticItem(
    icon: String,
    value: String,
    label: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = icon,
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )

        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
