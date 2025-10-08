package com.aiproj.mobile.ui.screens.details.activeprojects.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * 排序和筛选栏
 */
@Composable
fun SortFilterBar(
    currentSortBy: String,
    sortOrder: String,
    onSortChange: (String) -> Unit,
    onToggleSortOrder: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "排序:",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        FilterChip(
            selected = currentSortBy == "completion_rate",
            onClick = { onSortChange("completion_rate") },
            label = { Text("完成率") }
        )

        FilterChip(
            selected = currentSortBy == "task_count",
            onClick = { onSortChange("task_count") },
            label = { Text("任务数") }
        )

        FilterChip(
            selected = currentSortBy == "updated_at",
            onClick = { onSortChange("updated_at") },
            label = { Text("更新时间") }
        )

        Spacer(modifier = Modifier.weight(1f))

        // 排序方向按钮
        IconButton(
            onClick = onToggleSortOrder,
            modifier = Modifier.size(40.dp)
        ) {
            Icon(
                imageVector = if (sortOrder == "desc")
                    Icons.Default.ArrowDownward
                else
                    Icons.Default.ArrowUpward,
                contentDescription = if (sortOrder == "desc") "降序" else "升序",
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }
}
