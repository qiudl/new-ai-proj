package com.aiproj.mobile.ui.screens.details.todaytasks.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.details.todaytasks.TaskFilter

/**
 * 空状态视图
 */
@Composable
fun EmptyTasksView(filter: TaskFilter) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Default.EventNote,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
        )

        val message = when (filter) {
            TaskFilter.ALL -> "今日暂无任务"
            TaskFilter.COMPLETED -> "今日暂无已完成任务"
            TaskFilter.IN_PROGRESS -> "今日暂无进行中任务"
            TaskFilter.TODO -> "今日暂无待办任务"
        }

        Text(
            text = message,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
