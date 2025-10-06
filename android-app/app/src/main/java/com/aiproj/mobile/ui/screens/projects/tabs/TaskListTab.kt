package com.aiproj.mobile.ui.screens.projects.tabs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.ui.components.ProjectSearchBar
import com.aiproj.mobile.ui.screens.tasks.TaskListItem

/**
 * 任务列表Tab
 */
@Composable
fun TaskListTab(
    project: Project,
    tasks: List<Task>,
    isLoading: Boolean,
    searchQuery: String,
    selectedStatus: TaskStatus?,
    onTaskClick: (Int) -> Unit,
    onSearch: (String) -> Unit,
    onFilterStatus: (TaskStatus?) -> Unit,
    onClearSearch: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // 搜索栏
        ProjectSearchBar(
            query = searchQuery,
            onQueryChange = onSearch,
            onSearch = onSearch,
            onClear = onClearSearch,
            placeholder = "搜索任务..."
        )

        // 状态过滤芯片
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TaskStatusFilterChip(
                label = "全部",
                selected = selectedStatus == null,
                onClick = { onFilterStatus(null) }
            )
            TaskStatusFilterChip(
                label = "进行中",
                selected = selectedStatus == TaskStatus.IN_PROGRESS,
                onClick = { onFilterStatus(TaskStatus.IN_PROGRESS) }
            )
            TaskStatusFilterChip(
                label = "待办",
                selected = selectedStatus == TaskStatus.TODO,
                onClick = { onFilterStatus(TaskStatus.TODO) }
            )
            TaskStatusFilterChip(
                label = "已完成",
                selected = selectedStatus == TaskStatus.COMPLETED,
                onClick = { onFilterStatus(TaskStatus.COMPLETED) }
            )
        }

        // 任务列表
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (tasks.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Text(
                        text = if (searchQuery.isBlank() && selectedStatus == null) {
                            "暂无任务"
                        } else {
                            "未找到匹配的任务"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(tasks) { task ->
                    TaskListItem(
                        task = task,
                        onClick = { onTaskClick(task.id) },
                        onComplete = { /* TODO: 实现完成任务 */ }
                    )
                }
            }
        }
    }
}

/**
 * 任务状态过滤芯片
 */
@Composable
private fun TaskStatusFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) }
    )
}
