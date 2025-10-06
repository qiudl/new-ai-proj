package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * 成就展示卡片
 */
@Composable
fun WeeklyAchievementsCard(
    consecutiveDays: Int,
    totalFocusHours: Float,
    completedTasks: Int,
    modifier: Modifier = Modifier,
    dateRangeText: String = ""  // 新增：日期范围文本
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // 标题 - 添加日期范围
            Text(
                text = if (dateRangeText.isNotEmpty()) {
                    "🏆 成就 ($dateRangeText)"
                } else {
                    "🏆 成就"
                },
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 成就列表
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AchievementItem(
                    icon = "🔥",
                    text = "连续工作 $consecutiveDays 天"
                )

                AchievementItem(
                    icon = "⏱️",
                    text = "累计专注 ${String.format("%.0f", totalFocusHours)} 小时"
                )

                AchievementItem(
                    icon = "✅",
                    text = "完成 $completedTasks 个任务"
                )
            }
        }
    }
}

@Composable
private fun AchievementItem(
    icon: String,
    text: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = icon,
            style = MaterialTheme.typography.headlineMedium
        )

        Text(
            text = text,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
