package com.aiproj.mobile.ui.screens.timer.history.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.timer.history.DateRange

/**
 * 快速筛选Chips
 */
@Composable
fun FilterChips(
    selectedRange: DateRange?,
    onRangeSelected: (DateRange) -> Unit,
    onClearFilters: () -> Unit,
    hasActiveFilters: Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 清除筛选按钮（只在有活跃筛选时显示）
        if (hasActiveFilters) {
            IconButton(onClick = onClearFilters) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "清除筛选",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }

        // 日期范围快捷选择
        DateRange.values().forEach { range ->
            FilterChip(
                selected = selectedRange == range,
                onClick = { onRangeSelected(range) },
                label = {
                    Text(text = range.getDisplayName())
                }
            )
        }
    }
}

/**
 * 获取DateRange的显示名称
 */
private fun DateRange.getDisplayName(): String {
    return when (this) {
        DateRange.TODAY -> "今天"
        DateRange.THIS_WEEK -> "本周"
        DateRange.THIS_MONTH -> "本月"
        DateRange.LAST_7_DAYS -> "最近7天"
        DateRange.LAST_30_DAYS -> "最近30天"
        DateRange.ALL -> "全部"
    }
}
