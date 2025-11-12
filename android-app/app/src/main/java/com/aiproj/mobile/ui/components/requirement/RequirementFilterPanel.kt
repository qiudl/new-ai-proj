package com.aiproj.mobile.ui.components.requirement

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.RequirementCategory
import com.aiproj.mobile.data.models.RequirementPriority
import com.aiproj.mobile.data.models.RequirementStatus

/**
 * 需求筛选条件数据类
 *
 * @param status 状态筛选，null表示不筛选
 * @param priority 优先级筛选，null表示不筛选
 * @param category 类别筛选，null表示不筛选
 */
data class RequirementFilter(
    val status: RequirementStatus? = null,
    val priority: RequirementPriority? = null,
    val category: RequirementCategory? = null
)

/**
 * 需求筛选面板组件
 *
 * 提供需求的筛选功能，包括按状态、优先级、类别筛选
 *
 * @param currentFilter 当前筛选条件
 * @param onFilterChange 筛选条件变化回调
 * @param modifier 修饰符
 */
@Composable
fun RequirementFilterPanel(
    currentFilter: RequirementFilter,
    onFilterChange: (RequirementFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 1.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 筛选标题栏（可折叠）
            Row(
                modifier = Modifier
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.FilterList,
                        contentDescription = "筛选",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "筛选条件",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // 清除筛选按钮
                    if (currentFilter.status != null ||
                        currentFilter.priority != null ||
                        currentFilter.category != null) {
                        TextButton(
                            onClick = {
                                onFilterChange(RequirementFilter())
                            }
                        ) {
                            Text("清除")
                        }
                    }

                    // 展开/收起按钮
                    IconButton(
                        onClick = { expanded = !expanded }
                    ) {
                        Icon(
                            imageVector = if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = if (expanded) "收起" else "展开"
                        )
                    }
                }
            }

            // 筛选选项（可折叠）
            AnimatedVisibility(
                visible = expanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 状态筛选
                    FilterSection(
                        title = "状态",
                        items = RequirementStatus.entries.toList(),
                        selectedItem = currentFilter.status,
                        onItemSelected = { status ->
                            onFilterChange(currentFilter.copy(status = status))
                        },
                        itemLabel = { getStatusLabel(it) }
                    )

                    Divider()

                    // 优先级筛选
                    FilterSection(
                        title = "优先级",
                        items = RequirementPriority.entries.toList(),
                        selectedItem = currentFilter.priority,
                        onItemSelected = { priority ->
                            onFilterChange(currentFilter.copy(priority = priority))
                        },
                        itemLabel = { getPriorityLabel(it) }
                    )

                    Divider()

                    // 类别筛选
                    FilterSection(
                        title = "类别",
                        items = RequirementCategory.entries.toList(),
                        selectedItem = currentFilter.category,
                        onItemSelected = { category ->
                            onFilterChange(currentFilter.copy(category = category))
                        },
                        itemLabel = { getCategoryLabel(it) }
                    )
                }
            }
        }
    }
}

/**
 * 筛选区块组件
 */
@Composable
private fun <T> FilterSection(
    title: String,
    items: List<T>,
    selectedItem: T?,
    onItemSelected: (T?) -> Unit,
    itemLabel: (T) -> String
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // 使用 FlowRow 实现自动换行的筛选按钮
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items.forEach { item ->
                FilterChip(
                    selected = selectedItem == item,
                    onClick = {
                        onItemSelected(if (selectedItem == item) null else item)
                    },
                    label = {
                        Text(
                            text = itemLabel(item),
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                )
            }
        }
    }
}

/**
 * 获取状态标签
 */
private fun getStatusLabel(status: RequirementStatus): String {
    return when (status) {
        RequirementStatus.DRAFT -> "草稿"
        RequirementStatus.PENDING -> "待评审"
        RequirementStatus.REVIEWING -> "评审中"
        RequirementStatus.APPROVED -> "已批准"
        RequirementStatus.REJECTED -> "已拒绝"
        RequirementStatus.ARCHIVED -> "已归档"
    }
}

/**
 * 获取优先级标签
 */
private fun getPriorityLabel(priority: RequirementPriority): String {
    return when (priority) {
        RequirementPriority.LOW -> "低"
        RequirementPriority.MEDIUM -> "中"
        RequirementPriority.HIGH -> "高"
        RequirementPriority.URGENT -> "紧急"
    }
}

/**
 * 获取类别标签
 */
private fun getCategoryLabel(category: RequirementCategory): String {
    return when (category) {
        RequirementCategory.FEATURE -> "功能"
        RequirementCategory.BUG -> "缺陷"
        RequirementCategory.IMPROVEMENT -> "改进"
        RequirementCategory.DOCUMENTATION -> "文档"
        RequirementCategory.OTHER -> "其他"
    }
}
