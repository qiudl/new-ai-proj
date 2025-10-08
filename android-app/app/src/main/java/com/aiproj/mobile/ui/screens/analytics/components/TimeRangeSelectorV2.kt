package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.TimeRange

/**
 * 时间范围选择器 V2
 *
 * 设计: SegmentedButton + Dropdown
 * - 常用选项: 今日、本周、本月 (SegmentedButton)
 * - 更多选项: 昨日、前日、上月、自定义日期 (DropdownMenu)
 *
 * 优势:
 * - 80% 使用场景只需一次点击
 * - Material 3 设计规范
 * - 节省屏幕空间
 * - 视觉清晰,易于操作
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimeRangeSelectorV2(
    selectedRange: TimeRange,
    onRangeSelected: (TimeRange) -> Unit,
    modifier: Modifier = Modifier
) {
    // 常用时间范围
    val commonRanges = listOf(
        TimeRange.TODAY,
        TimeRange.THIS_WEEK,
        TimeRange.THIS_MONTH
    )

    // 更多时间范围
    val moreRanges = listOf(
        TimeRange.YESTERDAY,
        TimeRange.DAY_BEFORE_YESTERDAY,
        TimeRange.LAST_MONTH,
        TimeRange.CUSTOM_DATE
    )

    // 下拉菜单展开状态
    var showMoreMenu by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // SegmentedButton 容器
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            commonRanges.forEach { range ->
                val isSelected = selectedRange == range
                FilterChip(
                    selected = isSelected,
                    onClick = { onRangeSelected(range) },
                    label = {
                        Text(
                            text = range.displayName,
                            style = MaterialTheme.typography.labelLarge
                        )
                    },
                    modifier = Modifier.weight(1f),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                )
            }
        }

        // "更多" 下拉按钮
        Box {
            val isMoreSelected = selectedRange in moreRanges

            FilterChip(
                selected = isMoreSelected,
                onClick = { showMoreMenu = true },
                label = {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isMoreSelected) selectedRange.displayName else "更多",
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
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    labelColor = MaterialTheme.colorScheme.onSurfaceVariant
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
                                color = if (selectedRange == range) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                }
                            )
                        },
                        onClick = {
                            onRangeSelected(range)
                            showMoreMenu = false
                        },
                        leadingIcon = if (selectedRange == range) {
                            {
                                Icon(
                                    imageVector = Icons.Default.KeyboardArrowDown,
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
