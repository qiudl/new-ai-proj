package com.aiproj.mobile.ui.screens.details.worktime.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.details.worktime.TimeRange

/**
 * 时间范围选择器
 */
@Composable
fun TimeRangeSelector(
    currentRange: TimeRange,
    onRangeChange: (TimeRange) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(
            selected = currentRange == TimeRange.LAST_7_DAYS,
            onClick = { onRangeChange(TimeRange.LAST_7_DAYS) },
            label = { Text("最近7天") }
        )
        FilterChip(
            selected = currentRange == TimeRange.LAST_30_DAYS,
            onClick = { onRangeChange(TimeRange.LAST_30_DAYS) },
            label = { Text("最近30天") }
        )
        FilterChip(
            selected = currentRange == TimeRange.CUSTOM,
            onClick = { onRangeChange(TimeRange.CUSTOM) },
            label = { Text("自定义") },
            enabled = false // TODO: 实现自定义日期选择
        )
    }
}
