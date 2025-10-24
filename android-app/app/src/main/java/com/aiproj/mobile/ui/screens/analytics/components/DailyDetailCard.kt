package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.DayDetail

/**
 * 单日详情卡片
 *
 * 当用户选择单个日期时显示，包含:
 * - 日期和星期显示
 * - 统计摘要（工作时长、完成任务、任务总数）
 * - 任务时间条目列表
 *
 * 使用场景: 用户在UnifiedTimeSelector中选择了具体日期
 */
@Composable
fun DailyDetailCard(
    date: String,           // "2025-10-06"
    dayDetail: DayDetail?,
    modifier: Modifier = Modifier,
    onTaskClick: ((Int) -> Unit)? = null  // 任务点击回调
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 标题
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "📅 ${dayDetail?.date ?: date} ${dayDetail?.weekday ?: ""}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                // 效率徽章
                dayDetail?.let {
                    Surface(
                        color = when {
                            it.efficiency >= 0.8f -> MaterialTheme.colorScheme.primary
                            it.efficiency >= 0.6f -> MaterialTheme.colorScheme.tertiary
                            else -> MaterialTheme.colorScheme.error
                        },
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(
                            text = "${(it.efficiency * 100).toInt()}% 效率",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // 统计摘要
            if (dayDetail != null) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        StatisticItem(
                            icon = "⏱️",
                            value = String.format("%.1fh", dayDetail.hours),
                            label = "工作时长"
                        )

                        HorizontalDivider(
                            modifier = Modifier
                                .width(1.dp)
                                .height(60.dp),
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.2f)
                        )

                        StatisticItem(
                            icon = "✅",
                            value = "${dayDetail.tasksCompleted}",
                            label = "完成任务"
                        )

                        HorizontalDivider(
                            modifier = Modifier
                                .width(1.dp)
                                .height(60.dp),
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.2f)
                        )

                        StatisticItem(
                            icon = "📋",
                            value = "${dayDetail.taskEntries.size}",
                            label = "任务总数"
                        )
                    }
                }

                // 任务明细列表
                if (dayDetail.taskEntries.isNotEmpty()) {
                    Text(
                        text = "📋 任务明细 (${dayDetail.taskEntries.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )

                    Column(
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        dayDetail.taskEntries.forEach { taskEntry ->
                            TaskTimeEntryCard(
                                taskEntry = taskEntry,
                                onTaskClick = onTaskClick
                            )
                        }
                    }
                } else {
                    // 无任务时的空状态
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Text(
                            text = "📝 该日期暂无任务记录",
                            modifier = Modifier.padding(24.dp),
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                // 加载状态或无数据
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
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
