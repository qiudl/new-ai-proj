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
 * 自定义日期范围选择器
 * 分两步选择：先选开始日期，再选结束日期
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomDateRangePicker(
    initialStartDate: LocalDate? = null,
    initialEndDate: LocalDate? = null,
    onDateRangeSelected: (LocalDate, LocalDate) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    // 选择状态：true=选择开始日期，false=选择结束日期
    var selectingStartDate by remember { mutableStateOf(true) }
    var tempStartDate by remember { mutableStateOf(initialStartDate) }
    var tempEndDate by remember { mutableStateOf(initialEndDate) }

    // DatePicker状态
    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = when {
            selectingStartDate && tempStartDate != null -> {
                tempStartDate!!.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
            }
            !selectingStartDate && tempEndDate != null -> {
                tempEndDate!!.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
            }
            else -> null
        }
    )

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    val selectedMillis = datePickerState.selectedDateMillis
                    if (selectedMillis == null) {
                        return@TextButton
                    }

                    val selectedDate = Instant.ofEpochMilli(selectedMillis)
                        .atZone(ZoneId.systemDefault())
                        .toLocalDate()

                    if (selectingStartDate) {
                        // 选择了开始日期，进入选择结束日期步骤
                        tempStartDate = selectedDate
                        selectingStartDate = false
                    } else {
                        // 选择了结束日期，完成选择
                        tempEndDate = selectedDate

                        if (tempStartDate != null && tempEndDate != null) {
                            onDateRangeSelected(tempStartDate!!, tempEndDate!!)
                        }
                    }
                },
                enabled = datePickerState.selectedDateMillis != null
            ) {
                Text(if (selectingStartDate) "下一步" else "确认")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    ) {
        Column(modifier = modifier) {
            // 标题区域 - 显示当前选择步骤
            Text(
                text = if (selectingStartDate) {
                    "选择开始日期"
                } else {
                    "选择结束日期"
                },
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)
            )

            // 已选日期提示
            if (tempStartDate != null && !selectingStartDate) {
                Text(
                    text = "开始日期: $tempStartDate",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
                )
            }

            // 日期选择器
            DatePicker(
                state = datePickerState,
                showModeToggle = false
            )
        }
    }
}
