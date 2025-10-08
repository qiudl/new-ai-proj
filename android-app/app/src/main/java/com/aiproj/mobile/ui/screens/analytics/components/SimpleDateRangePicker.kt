package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * 简化的日期范围选择器
 *
 * 使用Material 3 DateRangePicker组件,一次性选择开始和结束日期
 * 更符合Material Design规范,用户体验更好
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SimpleDateRangePicker(
    initialStartDate: LocalDate? = null,
    initialEndDate: LocalDate? = null,
    onDateRangeSelected: (LocalDate, LocalDate) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    // 转换LocalDate为时间戳
    val initialStartMillis = initialStartDate?.atStartOfDay(ZoneId.systemDefault())?.toInstant()?.toEpochMilli()
    val initialEndMillis = initialEndDate?.atStartOfDay(ZoneId.systemDefault())?.toInstant()?.toEpochMilli()

    // DateRangePicker状态
    val dateRangePickerState = rememberDateRangePickerState(
        initialSelectedStartDateMillis = initialStartMillis,
        initialSelectedEndDateMillis = initialEndMillis
    )

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    val startMillis = dateRangePickerState.selectedStartDateMillis
                    val endMillis = dateRangePickerState.selectedEndDateMillis

                    if (startMillis != null && endMillis != null) {
                        val startDate = Instant.ofEpochMilli(startMillis)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDate()
                        val endDate = Instant.ofEpochMilli(endMillis)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDate()

                        // 确保开始日期 <= 结束日期
                        if (startDate.isAfter(endDate)) {
                            onDateRangeSelected(endDate, startDate)
                        } else {
                            onDateRangeSelected(startDate, endDate)
                        }
                    }
                },
                enabled = dateRangePickerState.selectedStartDateMillis != null &&
                         dateRangePickerState.selectedEndDateMillis != null
            ) {
                Text("确认")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    ) {
        // 日期范围选择器 - 不需要额外的Column和标题,DateRangePicker自带标题
        DateRangePicker(
            state = dateRangePickerState,
            modifier = modifier,
            showModeToggle = false,
            title = {
                Text(
                    text = "选择日期范围",
                    modifier = Modifier.padding(16.dp)
                )
            }
        )
    }
}
