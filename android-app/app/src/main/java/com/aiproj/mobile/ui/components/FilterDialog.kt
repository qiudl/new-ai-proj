package com.aiproj.mobile.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.projects.SortOrder
import com.aiproj.mobile.ui.screens.projects.SortType

/**
 * 项目过滤对话框
 *
 * @param currentStatus 当前选中的状态
 * @param currentSortType 当前排序类型
 * @param currentSortOrder 当前排序顺序
 * @param onDismiss 关闭回调
 * @param onApply 应用过滤回调
 */
@Composable
fun ProjectFilterDialog(
    currentStatus: String?,
    currentSortType: SortType,
    currentSortOrder: SortOrder,
    onDismiss: () -> Unit,
    onApply: (status: String?, sortType: SortType, sortOrder: SortOrder) -> Unit
) {
    var selectedStatus by remember { mutableStateOf(currentStatus) }
    var selectedSortType by remember { mutableStateOf(currentSortType) }
    var selectedSortOrder by remember { mutableStateOf(currentSortOrder) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("过滤与排序", style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "关闭"
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 状态过滤
                FilterSection(
                    title = "状态",
                    icon = Icons.Default.FilterList
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatusFilterChip(
                            label = "全部",
                            selected = selectedStatus == null,
                            onClick = { selectedStatus = null }
                        )
                        StatusFilterChip(
                            label = "进行中",
                            selected = selectedStatus == "active",
                            onClick = { selectedStatus = "active" }
                        )
                        StatusFilterChip(
                            label = "规划中",
                            selected = selectedStatus == "planning",
                            onClick = { selectedStatus = "planning" }
                        )
                        StatusFilterChip(
                            label = "已完成",
                            selected = selectedStatus == "completed",
                            onClick = { selectedStatus = "completed" }
                        )
                        StatusFilterChip(
                            label = "暂停",
                            selected = selectedStatus == "on_hold",
                            onClick = { selectedStatus = "on_hold" }
                        )
                        StatusFilterChip(
                            label = "已归档",
                            selected = selectedStatus == "archived",
                            onClick = { selectedStatus = "archived" }
                        )
                    }
                }

                HorizontalDivider()

                // 排序类型
                FilterSection(
                    title = "排序方式",
                    icon = Icons.AutoMirrored.Filled.Sort
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SortTypeChip(
                            label = "按名称",
                            selected = selectedSortType == SortType.NAME,
                            onClick = { selectedSortType = SortType.NAME }
                        )
                        SortTypeChip(
                            label = "按更新时间",
                            selected = selectedSortType == SortType.UPDATE_TIME,
                            onClick = { selectedSortType = SortType.UPDATE_TIME }
                        )
                        SortTypeChip(
                            label = "按创建时间",
                            selected = selectedSortType == SortType.CREATE_TIME,
                            onClick = { selectedSortType = SortType.CREATE_TIME }
                        )
                        SortTypeChip(
                            label = "按任务数量",
                            selected = selectedSortType == SortType.TASK_COUNT,
                            onClick = { selectedSortType = SortType.TASK_COUNT }
                        )
                        SortTypeChip(
                            label = "按完成率",
                            selected = selectedSortType == SortType.COMPLETION,
                            onClick = { selectedSortType = SortType.COMPLETION }
                        )
                    }
                }

                HorizontalDivider()

                // 排序顺序
                FilterSection(
                    title = "排序顺序",
                    icon = Icons.Default.SwapVert
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        SortOrderChip(
                            label = "升序",
                            icon = Icons.Default.ArrowUpward,
                            selected = selectedSortOrder == SortOrder.ASC,
                            onClick = { selectedSortOrder = SortOrder.ASC },
                            modifier = Modifier.weight(1f)
                        )
                        SortOrderChip(
                            label = "降序",
                            icon = Icons.Default.ArrowDownward,
                            selected = selectedSortOrder == SortOrder.DESC,
                            onClick = { selectedSortOrder = SortOrder.DESC },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onApply(selectedStatus, selectedSortType, selectedSortOrder)
                    onDismiss()
                }
            ) {
                Text("应用")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

/**
 * 过滤区块组件
 */
@Composable
private fun FilterSection(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    content: @Composable () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        content()
    }
}

/**
 * 状态过滤芯片
 */
@Composable
private fun StatusFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth()
    )
}

/**
 * 排序类型芯片
 */
@Composable
private fun SortTypeChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth()
    )
}

/**
 * 排序顺序芯片
 */
@Composable
private fun SortOrderChip(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(label)
            }
        },
        modifier = modifier
    )
}
