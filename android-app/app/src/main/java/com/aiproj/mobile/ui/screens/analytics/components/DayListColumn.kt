package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.DayListItem
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * 日期列表组件（左侧栏）
 *
 * 显示最近7天的日期列表，每个日期项显示：
 * - 日期 + 星期
 * - 工作时长
 * - 完成任务数
 */
@Composable
fun DayListColumn(
    // dailyList: List<DayListItem>,
    // selectedDate: String?,
    // onDateSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    // 生成最近7天的模拟数据
    val today = LocalDate.now()
    val mockDailyList = (0..6).map { daysAgo ->
        val date = today.minusDays(daysAgo.toLong())
        val dateStr = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
        val weekday = when (date.dayOfWeek.value) {
            1 -> "周一"
            2 -> "周二"
            3 -> "周三"
            4 -> "周四"
            5 -> "周五"
            6 -> "周六"
            7 -> "周日"
            else -> ""
        }

        DayListItem(
            date = dateStr,
            weekday = weekday,
            hours = if (daysAgo == 0) 6.5f else (4f + (daysAgo % 3) * 1.5f),
            tasksCompleted = if (daysAgo == 0) 3 else (2 + daysAgo % 3)
        )
    }

    val selectedDate = mockDailyList.firstOrNull()?.date

    Column(
        modifier = modifier
    ) {
        Text(
            text = "📅 日期选择",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(mockDailyList) { dayItem ->
                DayListItemCard(
                    dayItem = dayItem,
                    isSelected = dayItem.date == selectedDate,
                    onClick = { /* onDateSelected(dayItem.date) */ }
                )
            }
        }
    }
}

/**
 * 单个日期列表项卡片
 */
@Composable
private fun DayListItemCard(
    dayItem: DayListItem,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surfaceVariant
    }

    val contentColor = if (isSelected) {
        MaterialTheme.colorScheme.onPrimaryContainer
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = backgroundColor,
            contentColor = contentColor
        )
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            // 日期 + 星期
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = dayItem.weekday,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                )

                // 今日标签
                if (dayItem.date == LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "今日",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Text(
                text = dayItem.date.substring(5), // 只显示 MM-dd
                style = MaterialTheme.typography.bodySmall,
                color = contentColor.copy(alpha = 0.7f),
                modifier = Modifier.padding(top = 2.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // 工作时长
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "⏱️",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = String.format("%.1fh", dayItem.hours),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
            }

            // 完成任务数
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 4.dp)
            ) {
                Text(
                    text = "✅",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "${dayItem.tasksCompleted}个任务",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}
