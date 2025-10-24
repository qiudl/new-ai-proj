package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.clickable
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
import com.aiproj.mobile.ui.screens.analytics.DailyWorkTime

/**
 * 每日概览卡片
 *
 * 当用户选择时间范围（本周/本月）时显示，包含:
 * - 标题
 * - 每日工作时长列表（可点击查看单日详情）
 * - 提示文本
 *
 * 使用场景: 用户在UnifiedTimeSelector中选择了时间范围（非单日）
 */
@Composable
fun DailyOverviewCard(
    dailyStats: List<DailyWorkTime>,
    onDateClick: (String) -> Unit,  // 点击某一天的回调
    modifier: Modifier = Modifier
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
                    text = "📅 每日工作概览",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                // 数据条目数量
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = "${dailyStats.size} 天",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
            }

            if (dailyStats.isEmpty()) {
                // 空状态
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Text(
                        text = "📊 该时间范围内暂无工作记录",
                        modifier = Modifier.padding(24.dp),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                // 每日工作时长列表
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    dailyStats.forEach { dayStat ->
                        DailyStatRow(
                            dayLabel = dayStat.dayLabel,
                            date = dayStat.date,
                            hours = dayStat.hours,
                            taskCount = dayStat.taskCount,
                            onClick = { onDateClick(dayStat.date) }
                        )
                    }
                }

                // 提示文本
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "💡",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "点击任意日期查看当天的详细任务明细",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                    }
                }
            }
        }
    }
}

/**
 * 单日统计行
 */
@Composable
private fun DailyStatRow(
    dayLabel: String,       // "周一" or "10/5"
    date: String,           // "2025-10-05"
    hours: Float,
    taskCount: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 左侧：日期和星期
            Column {
                Text(
                    text = dayLabel,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = date.substring(5), // 显示 "10-05"
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }

            // 中间：工作时长进度条
            Column(
                modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
                horizontalAlignment = Alignment.End
            ) {
                // 时长文本
                Text(
                    text = String.format("%.1fh", hours),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                // 简单的进度条（基于8小时工作制）
                LinearProgressIndicator(
                    progress = { (hours / 8f).coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp)
                        .height(4.dp),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }

            // 右侧：任务数
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "$taskCount 任务",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }
    }
}
