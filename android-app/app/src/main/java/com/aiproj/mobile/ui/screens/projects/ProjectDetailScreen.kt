package com.aiproj.mobile.ui.screens.projects

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.ui.screens.tasks.TaskListItem

/**
 * 项目详情页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    onNavigateBack: () -> Unit,
    onTaskClick: (Int) -> Unit,
    onEdit: (Int) -> Unit,
    viewModel: ProjectDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val viewMode by viewModel.viewMode.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("项目详情") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    // 视图切换
                    IconButton(
                        onClick = {
                            val newMode = if (viewMode == ViewMode.DETAIL) {
                                ViewMode.KANBAN
                            } else {
                                ViewMode.DETAIL
                            }
                            viewModel.switchViewMode(newMode)
                        }
                    ) {
                        Icon(
                            imageVector = if (viewMode == ViewMode.DETAIL) {
                                Icons.Default.ViewKanban
                            } else {
                                Icons.Default.ViewList
                            },
                            contentDescription = "切换视图"
                        )
                    }

                    uiState.project?.let { project ->
                        IconButton(onClick = { onEdit(project.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = "编辑")
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "删除")
                        }
                    }
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                }
            )
        },
        snackbarHost = {
            if (uiState.error != null) {
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("关闭")
                        }
                    }
                ) {
                    Text(uiState.error!!)
                }
            }
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            uiState.project?.let { project ->
                when (viewMode) {
                    ViewMode.DETAIL -> {
                        ProjectDetailContent(
                            project = project,
                            tasks = uiState.tasks,
                            onTaskClick = onTaskClick,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(paddingValues)
                        )
                    }
                    ViewMode.KANBAN -> {
                        ProjectKanbanView(
                            tasks = uiState.tasks,
                            onTaskClick = onTaskClick,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(paddingValues)
                        )
                    }
                }
            }
        }
    }

    // 删除确认对话框
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("确认删除") },
            text = { Text("确定要删除这个项目吗？此操作不可撤销。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteProject {
                            onNavigateBack()
                        }
                        showDeleteDialog = false
                    }
                ) {
                    Text("删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}

/**
 * 项目详情内容
 */
@Composable
fun ProjectDetailContent(
    project: Project,
    tasks: List<Task>,
    onTaskClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 项目标题
        Text(
            text = project.name,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        // 项目描述
        project.description?.let { description ->
            Card {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Description,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "项目描述",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        }

        // 项目统计
        Card {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.BarChart,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "项目统计",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatItem(
                        label = "总任务",
                        value = "${project.taskCount ?: tasks.size}"
                    )
                    StatItem(
                        label = "成员",
                        value = "${project.memberCount ?: 0}"
                    )
                    StatItem(
                        label = "完成率",
                        value = calculateCompletionRate(tasks)
                    )
                }
            }
        }

        // 任务列表
        if (tasks.isNotEmpty()) {
            Text(
                text = "项目任务 (${tasks.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            tasks.forEach { task ->
                TaskListItem(
                    task = task,
                    onClick = { onTaskClick(task.id) },
                    onComplete = { /* TODO */ }
                )
            }
        }
    }
}

/**
 * 统计项
 */
@Composable
fun StatItem(label: String, value: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 计算完成率
 */
fun calculateCompletionRate(tasks: List<Task>): String {
    if (tasks.isEmpty()) return "0%"
    val completed = tasks.count { it.status == com.aiproj.mobile.data.models.TaskStatus.COMPLETED }
    val rate = (completed.toFloat() / tasks.size * 100).toInt()
    return "$rate%"
}
