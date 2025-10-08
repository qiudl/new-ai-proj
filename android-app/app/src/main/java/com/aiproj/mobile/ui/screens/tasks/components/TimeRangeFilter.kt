package com.aiproj.mobile.ui.screens.tasks.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.TimeRange
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * 时间范围筛选器
 */
@Composable
fun TimeRangeFilter(
    selectedRange: TimeRange,
    onRangeSelected: (TimeRange) -> Unit,
    modifier: Modifier = Modifier,
    customStartDate: LocalDate? = null,
    customEndDate: LocalDate? = null,
    onCustomDateSelected: ((LocalDate, LocalDate) -> Unit)? = null
) {
    var showCustomDialog by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.DateRange,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = "时间筛选",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 筛选按钮行
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TimeRange.values().forEach { range ->
                if (range != TimeRange.CUSTOM) {
                    FilterChip(
                        selected = selectedRange == range,
                        onClick = { onRangeSelected(range) },
                        label = { Text(range.label) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 自定义范围按钮
        FilterChip(
            selected = selectedRange == TimeRange.CUSTOM,
            onClick = { showCustomDialog = true },
            label = {
                if (selectedRange == TimeRange.CUSTOM && customStartDate != null && customEndDate != null) {
                    Text("${customStartDate.format(DateTimeFormatter.ofPattern("MM/dd"))} - ${customEndDate.format(DateTimeFormatter.ofPattern("MM/dd"))}")
                } else {
                    Text(TimeRange.CUSTOM.label)
                }
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.DateRange,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            },
            modifier = Modifier.fillMaxWidth()
        )
    }

    // 自定义日期选择对话框
    if (showCustomDialog) {
        CustomDateRangeDialog(
            onDismiss = { showCustomDialog = false },
            onConfirm = { start, end ->
                onCustomDateSelected?.invoke(start, end)
                onRangeSelected(TimeRange.CUSTOM)
                showCustomDialog = false
            }
        )
    }
}

/**
 * 自定义日期范围对话框
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomDateRangeDialog(
    onDismiss: () -> Unit,
    onConfirm: (LocalDate, LocalDate) -> Unit
) {
    var startDate by remember { mutableStateOf(LocalDate.now().minusDays(7)) }
    var endDate by remember { mutableStateOf(LocalDate.now()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("选择时间范围") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // 简化版：使用TextField显示日期（实际项目可集成DatePicker）
                OutlinedTextField(
                    value = startDate.toString(),
                    onValueChange = {},
                    label = { Text("开始日期") },
                    readOnly = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = endDate.toString(),
                    onValueChange = {},
                    label = { Text("结束日期") },
                    readOnly = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    text = "提示：完整日期选择器将在后续版本实现",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(startDate, endDate) }) {
                Text("确定")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}
