package com.aiproj.mobile.ui.screens.details.todaytasks.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.details.todaytasks.TaskFilter

/**
 * 任务筛选Chips
 */
@Composable
fun TaskFilterChips(
    currentFilter: TaskFilter,
    onFilterChange: (TaskFilter) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(
            selected = currentFilter == TaskFilter.ALL,
            onClick = { onFilterChange(TaskFilter.ALL) },
            label = { Text("全部") }
        )
        FilterChip(
            selected = currentFilter == TaskFilter.COMPLETED,
            onClick = { onFilterChange(TaskFilter.COMPLETED) },
            label = { Text("已完成") }
        )
        FilterChip(
            selected = currentFilter == TaskFilter.IN_PROGRESS,
            onClick = { onFilterChange(TaskFilter.IN_PROGRESS) },
            label = { Text("进行中") }
        )
        FilterChip(
            selected = currentFilter == TaskFilter.TODO,
            onClick = { onFilterChange(TaskFilter.TODO) },
            label = { Text("待办") }
        )
    }
}
