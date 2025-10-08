package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.TimeRange
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * 统一时间选择器组件
 *
 * 设计思路:
 * - 第一行: 快速日期选择（今日、昨日、最近7天）- LazyRow横向滚动
 * - 第二行: 时间范围选择（本周、本月、更多）- FilterChips
 *
 * 特性:
 * - selectedDate 和 selectedTimeRange 互斥
 * - 点击单日清空范围，点击范围清空单日
 * - 支持显示更多日期（横向滚动）
 */
@Composable
fun UnifiedTimeSelector(
    selectedTimeRange: TimeRange?,
    selectedDate: String?,  // "2025-10-06" or null
    onTimeRangeSelected: (TimeRange) -> Unit,
    onDateSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 第一行：快速日期选择（横向滚动）
        QuickDateSelector(
            selectedDate = selectedDate,
            onDateSelected = onDateSelected
        )

        // 第二行：范围选择
        TimeRangeSelector(
            selectedTimeRange = selectedTimeRange,
            selectedDate = selectedDate,
            onTimeRangeSelected = onTimeRangeSelected
        )
    }
}

/**
 * 快速日期选择器（横向滚动）
 */
@Composable
private fun QuickDateSelector(
    selectedDate: String?,
    onDateSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 图标标识
        Text(
            text = "📅",
            style = MaterialTheme.typography.titleMedium
        )

        // 横向滚动的日期列表
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            // 今日
            item {
                val today = LocalDate.now()
                DateChip(
                    label = "今日",
                    date = today.toString(),
                    isSelected = selectedDate == today.toString(),
                    onClick = { onDateSelected(today.toString()) }
                )
            }

            // 昨日
            item {
                val yesterday = LocalDate.now().minusDays(1)
                DateChip(
                    label = "昨日",
                    date = yesterday.toString(),
                    isSelected = selectedDate == yesterday.toString(),
                    onClick = { onDateSelected(yesterday.toString()) }
                )
            }

            // 最近7天（显示日期）
            items(7) { index ->
                val date = LocalDate.now().minusDays(index.toLong() + 2)
                val label = "${date.monthValue}/${date.dayOfMonth}"
                DateChip(
                    label = label,
                    date = date.toString(),
                    isSelected = selectedDate == date.toString(),
                    onClick = { onDateSelected(date.toString()) }
                )
            }
        }
    }
}

/**
 * 时间范围选择器
 */
@Composable
private fun TimeRangeSelector(
    selectedTimeRange: TimeRange?,
    selectedDate: String?,
    onTimeRangeSelected: (TimeRange) -> Unit,
    modifier: Modifier = Modifier
) {
    // 更多选项菜单状态
    var showMoreMenu by remember { mutableStateOf(false) }

    // 更多时间范围选项
    val moreRanges = listOf(
        TimeRange.LAST_MONTH,
        TimeRange.CUSTOM_DATE
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 图标标识
        Text(
            text = "📊",
            style = MaterialTheme.typography.titleMedium
        )

        // 本周
        FilterChip(
            selected = selectedTimeRange == TimeRange.THIS_WEEK && selectedDate == null,
            onClick = { onTimeRangeSelected(TimeRange.THIS_WEEK) },
            label = {
                Text(
                    text = "本周",
                    style = MaterialTheme.typography.labelLarge
                )
            },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
            )
        )

        // 本月
        FilterChip(
            selected = selectedTimeRange == TimeRange.THIS_MONTH && selectedDate == null,
            onClick = { onTimeRangeSelected(TimeRange.THIS_MONTH) },
            label = {
                Text(
                    text = "本月",
                    style = MaterialTheme.typography.labelLarge
                )
            },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
            )
        )

        // "更多" 下拉按钮
        Box {
            val isMoreSelected = selectedTimeRange in moreRanges && selectedDate == null

            FilterChip(
                selected = isMoreSelected,
                onClick = { showMoreMenu = true },
                label = {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isMoreSelected) selectedTimeRange!!.displayName else "更多",
                            style = MaterialTheme.typography.labelLarge
                        )
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowDown,
                            contentDescription = "展开更多选项",
                            modifier = Modifier.size(18.dp)
                        )
                    }
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )

            // 下拉菜单
            DropdownMenu(
                expanded = showMoreMenu,
                onDismissRequest = { showMoreMenu = false }
            ) {
                moreRanges.forEach { range ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = range.displayName,
                                color = if (selectedTimeRange == range) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                }
                            )
                        },
                        onClick = {
                            onTimeRangeSelected(range)
                            showMoreMenu = false
                        },
                        leadingIcon = if (selectedTimeRange == range) {
                            {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        } else null
                    )
                }
            }
        }
    }
}

/**
 * 日期芯片组件
 */
@Composable
private fun DateChip(
    label: String,      // "今日" or "10/6"
    date: String,       // "2025-10-06"
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    FilterChip(
        selected = isSelected,
        onClick = onClick,
        label = {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium
            )
        },
        leadingIcon = if (isSelected) {
            {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
            }
        } else null,
        modifier = modifier,
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
            selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
        )
    )
}
