package com.aiproj.mobile.ui.screens.tasks

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.ui.components.ExpandableHierarchicalTaskItem
import com.aiproj.mobile.ui.components.HierarchicalTaskItem
import com.aiproj.mobile.ui.components.SwipeableTaskItem
import com.aiproj.mobile.ui.screens.tasks.components.ProjectFilterPanel
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

private const val TAG = "TaskListScreen"

/**
 * 任务列表页面 (使用Paging 3)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskListScreen(
    onTaskClick: (Int) -> Unit,
    onCreateTask: () -> Unit,
    viewModel: TaskListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val filterState by viewModel.filterState.collectAsState()

    // 🆕 收集项目相关状态
    val projects by viewModel.projects.collectAsState()
    val isProjectPanelExpanded by viewModel.isProjectPanelExpanded.collectAsState()
    val projectsLoading by viewModel.projectsLoading.collectAsState()

    // 🆕 首次加载项目列表
    LaunchedEffect(Unit) {
        Log.d(TAG, "TaskListScreen composed, loading projects...")
        viewModel.loadProjects()
    }

    // 🆕 监听项目过滤变化
    LaunchedEffect(filterState.selectedProjectId) {
        Log.d(TAG, "Project filter changed: ${filterState.selectedProjectId}")
    }

    // 收集Paging数据
    val tasksPagingItems = viewModel.tasksPagingData.collectAsLazyPagingItems()

    // 刷新状态基于Paging LoadState
    val isRefreshing = tasksPagingItems.loadState.refresh is LoadState.Loading
    val swipeRefreshState = rememberSwipeRefreshState(isRefreshing = isRefreshing)

    var showFilterDialog by remember { mutableStateOf(false) }
    var showSortMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("任务") },
                actions = {
                    // 排序按钮
                    Box {
                        IconButton(onClick = { showSortMenu = true }) {
                            Icon(Icons.Default.Sort, contentDescription = "排序")
                        }

                        // 排序菜单
                        DropdownMenu(
                            expanded = showSortMenu,
                            onDismissRequest = { showSortMenu = false }
                        ) {
                            SortOption.values().forEach { option ->
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(option.label)
                                            if (filterState.sortBy == option) {
                                                Icon(
                                                    imageVector = if (filterState.sortAscending)
                                                        Icons.Default.ArrowUpward
                                                    else
                                                        Icons.Default.ArrowDownward,
                                                    contentDescription = null,
                                                    modifier = Modifier.size(16.dp),
                                                    tint = MaterialTheme.colorScheme.primary
                                                )
                                            }
                                        }
                                    },
                                    onClick = {
                                        viewModel.sortBy(option, toggleDirection = filterState.sortBy == option)
                                        showSortMenu = false
                                    }
                                )
                            }
                        }
                    }

                    // 筛选按钮
                    IconButton(onClick = { showFilterDialog = true }) {
                        BadgedBox(
                            badge = {
                                val filterCount = filterState.selectedStatuses.size +
                                    filterState.selectedPriorities.size +
                                    if (filterState.selectedProjectId != null) 1 else 0
                                if (filterCount > 0) {
                                    Badge {
                                        Text("$filterCount")
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.FilterList, contentDescription = "筛选")
                        }
                    }

                    // 刷新按钮
                    IconButton(onClick = { tasksPagingItems.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreateTask) {
                Icon(Icons.Default.Add, contentDescription = "创建任务")
            }
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // 🆕 项目过滤面板
            ProjectFilterPanel(
                projects = projects,
                selectedProjectId = filterState.selectedProjectId,
                isExpanded = isProjectPanelExpanded,
                isLoading = projectsLoading,
                onProjectSelect = { projectId ->
                    Log.d(TAG, "User selected project: $projectId")
                    viewModel.filterByProject(projectId)
                },
                onToggleExpand = {
                    Log.d(TAG, "Toggling project panel")
                    viewModel.toggleProjectPanel()
                },
                modifier = Modifier.fillMaxWidth()
            )

            // 搜索框
            SearchBar(
                query = filterState.searchQuery,
                onQueryChange = { viewModel.searchTasks(it) },
                modifier = Modifier.padding(16.dp)
            )

            // 任务列表 (使用Paging 3)
            SwipeRefresh(
                state = swipeRefreshState,
                onRefresh = { tasksPagingItems.refresh() }
            ) {
                when {
                    // 初始加载中
                    tasksPagingItems.loadState.refresh is LoadState.Loading && tasksPagingItems.itemCount == 0 -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    // 初始加载失败
                    tasksPagingItems.loadState.refresh is LoadState.Error && tasksPagingItems.itemCount == 0 -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("加载失败")
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(onClick = { tasksPagingItems.retry() }) {
                                    Text("重试")
                                }
                            }
                        }
                    }
                    // 空列表
                    tasksPagingItems.itemCount == 0 -> {
                        EmptyTaskList()
                    }
                    // 显示列表
                    else -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(
                                count = tasksPagingItems.itemCount,
                                key = tasksPagingItems.itemKey { it.id }
                            ) { index ->
                                val task = tasksPagingItems[index]
                                if (task != null) {
                                    // 使用可展开的层级任务组件
                                    val isExpanded = viewModel.isTaskExpanded(task.id)
                                    val isLoading = viewModel.isLoadingChildren(task.id)
                                    val children = viewModel.getChildTasks(task.id)

                                    // 动态计算完成度
                                    val completedSubtasks = viewModel.getCompletedSubtasksCount(task.id)
                                    val completionProgress = viewModel.getTaskCompletionProgress(task.id)

                                    ExpandableHierarchicalTaskItem(
                                        task = task,
                                        children = children,
                                        isExpanded = isExpanded,
                                        isLoading = isLoading,
                                        expandedTaskIds = uiState.expandedTaskIds,
                                        completedSubtasks = completedSubtasks,
                                        completionProgress = completionProgress,
                                        onExpandClick = { taskId ->
                                            viewModel.toggleTaskExpanded(taskId)
                                        },
                                        onTaskClick = { taskId ->
                                            onTaskClick(taskId)
                                        },
                                        onStatusChange = { taskId, isCompleted ->
                                            if (isCompleted) {
                                                viewModel.completeTask(taskId)
                                                // 如果是子任务，刷新父任务的进度
                                                task.parentId?.let { parentId ->
                                                    viewModel.refreshParentTask(parentId)
                                                }
                                            }
                                        },
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                }
                            }

                            // 加载更多指示器
                            when (tasksPagingItems.loadState.append) {
                                is LoadState.Loading -> {
                                    item {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(24.dp)
                                            )
                                        }
                                    }
                                }
                                is LoadState.Error -> {
                                    item {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            TextButton(onClick = { tasksPagingItems.retry() }) {
                                                Text("加载失败，点击重试")
                                            }
                                        }
                                    }
                                }
                                is LoadState.NotLoading -> {
                                    if (tasksPagingItems.loadState.append.endOfPaginationReached) {
                                        item {
                                            Text(
                                                text = "已加载全部任务",
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(16.dp),
                                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 筛选对话框
    if (showFilterDialog) {
        TaskFilterDialog(
            filterState = filterState,
            onDismiss = { showFilterDialog = false },
            onApply = { statuses, priorities, projectId ->
                viewModel.filterByStatus(statuses)
                viewModel.filterByPriority(priorities)
                viewModel.filterByProject(projectId)
                showFilterDialog = false
            },
            onClear = {
                viewModel.clearFilters()
                showFilterDialog = false
            }
        )
    }
}

/**
 * 搜索框
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier.fillMaxWidth(),
        placeholder = { Text("搜索任务...") },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null)
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Clear, contentDescription = "清除")
                }
            }
        },
        singleLine = true
    )
}

/**
 * 任务列表项
 */
@Composable
fun TaskListItem(
    task: Task,
    onClick: () -> Unit,
    onComplete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 优先级标记
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(
                        color = when (task.priority) {
                            TaskPriority.HIGH -> Color.Red
                            TaskPriority.MEDIUM -> Color(0xFFFF9800)
                            TaskPriority.LOW -> Color.Gray
                            null -> Color.Gray
                        },
                        shape = RoundedCornerShape(4.dp)
                    )
            )

            Spacer(modifier = Modifier.width(12.dp))

            // 任务内容
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )

                task.description?.let { desc ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = desc,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 状态标签
                    TaskStatusChip(status = task.status)

                    // 项目标签（如果有）
                    task.projectId?.let {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer
                        ) {
                            Text(
                                text = "项目 #$it",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                }
            }

            // 完成按钮（仅显示未完成任务）
            if (task.status != TaskStatus.COMPLETED) {
                IconButton(onClick = onComplete) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = "完成任务",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

/**
 * 任务状态标签
 */
@Composable
fun TaskStatusChip(status: TaskStatus) {
    val (text, color) = when (status) {
        TaskStatus.TODO -> "待办" to Color(0xFF2196F3)
        TaskStatus.IN_PROGRESS -> "进行中" to Color(0xFF4CAF50)
        TaskStatus.COMPLETED -> "已完成" to Color(0xFF9E9E9E)
        TaskStatus.BLOCKED -> "阻塞" to Color(0xFFF44336)
        TaskStatus.PLANNING -> "计划中" to Color(0xFF9C27B0)
        TaskStatus.TESTING -> "测试中" to Color(0xFFFF9800)
        else -> status.name to Color.Gray
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * 空列表提示
 */
@Composable
fun EmptyTaskList() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Assignment,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
            Text(
                text = "暂无任务",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 筛选对话框
 */
@Composable
fun TaskFilterDialog(
    filterState: TaskFilterState,
    onDismiss: () -> Unit,
    onApply: (Set<TaskStatus>, Set<TaskPriority>, Int?) -> Unit,
    onClear: () -> Unit
) {
    var selectedStatuses by remember { mutableStateOf(filterState.selectedStatuses) }
    var selectedPriorities by remember { mutableStateOf(filterState.selectedPriorities) }
    var projectIdText by remember { mutableStateOf(filterState.selectedProjectId?.toString() ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("筛选任务") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 项目筛选
                Text(
                    text = "项目",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                OutlinedTextField(
                    value = projectIdText,
                    onValueChange = { projectIdText = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("项目 ID") },
                    placeholder = { Text("输入项目ID，留空表示全部") },
                    singleLine = true
                )

                // 状态筛选
                Text(
                    text = "状态",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    TaskStatus.values().forEach { status ->
                        FilterChip(
                            selected = selectedStatuses.contains(status),
                            onClick = {
                                selectedStatuses = if (selectedStatuses.contains(status)) {
                                    selectedStatuses - status
                                } else {
                                    selectedStatuses + status
                                }
                            },
                            label = { Text(getStatusLabel(status)) }
                        )
                    }
                }

                // 优先级筛选
                Text(
                    text = "优先级",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    TaskPriority.values().forEach { priority ->
                        FilterChip(
                            selected = selectedPriorities.contains(priority),
                            onClick = {
                                selectedPriorities = if (selectedPriorities.contains(priority)) {
                                    selectedPriorities - priority
                                } else {
                                    selectedPriorities + priority
                                }
                            },
                            label = { Text(getPriorityLabel(priority)) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val projectId = projectIdText.toIntOrNull()
                onApply(selectedStatuses, selectedPriorities, projectId)
            }) {
                Text("应用")
            }
        },
        dismissButton = {
            Row {
                TextButton(onClick = onClear) {
                    Text("清除")
                }
                TextButton(onClick = onDismiss) {
                    Text("取消")
                }
            }
        }
    )
}

/**
 * FlowRow 简易实现（Compose 1.4+有官方实现）
 */
@Composable
fun FlowRow(
    modifier: Modifier = Modifier,
    horizontalArrangement: Arrangement.Horizontal = Arrangement.Start,
    content: @Composable () -> Unit
) {
    Row(
        modifier = modifier,
        horizontalArrangement = horizontalArrangement
    ) {
        content()
    }
}

fun getStatusLabel(status: TaskStatus): String = when (status) {
    TaskStatus.TODO -> "待办"
    TaskStatus.IN_PROGRESS -> "进行中"
    TaskStatus.COMPLETED -> "已完成"
    TaskStatus.BLOCKED -> "阻塞"
    TaskStatus.PLANNING -> "计划中"
    TaskStatus.TESTING -> "测试中"
    else -> status.name
}

fun getPriorityLabel(priority: TaskPriority): String = when (priority) {
    TaskPriority.HIGH -> "高"
    TaskPriority.MEDIUM -> "中"
    TaskPriority.LOW -> "低"
}

// TODO: SwipeToDismiss功能暂时移除，等待Material 3 API稳定后重新实现
// Material 3的SwipeToDismiss API在1.2.0+版本有重大变更
// 当前使用的是旧版API，需要升级到新版本后重新实现
//
// 计划实现：
// - 左滑删除（红色背景 + 删除图标）
// - 右滑完成（绿色背景 + 完成图标）
// - 删除需要确认对话框
