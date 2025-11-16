package com.aiproj.mobile.ui.screens.tasks

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.zIndex
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
import com.aiproj.mobile.ui.screens.tasks.components.ProjectFilterDrawer
import kotlinx.coroutines.launch

private const val TAG = "TaskListScreen"

/**
 * 任务列表页面 (使用Paging 3)
 */
@OptIn(ExperimentalMaterial3Api::class, androidx.compose.material.ExperimentalMaterialApi::class)
@Composable
fun TaskListScreen(
    onTaskClick: (Int) -> Unit,
    onCreateTask: () -> Unit,
    viewModel: TaskListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val filterState by viewModel.filterState.collectAsState()
    val taskIdSearchState by viewModel.taskIdSearchState.collectAsState()

    // 🆕 项目抽屉状态
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    // 🆕 收集项目相关状态
    val projects by viewModel.projects.collectAsState()
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

    var showFilterDialog by remember { mutableStateOf(false) }
    var showSortMenu by remember { mutableStateOf(false) }

    // 🆕 ModalNavigationDrawer包裹整个Scaffold
    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                ProjectFilterDrawer(
                    projects = projects,
                    selectedProjectId = filterState.selectedProjectId,
                    isLoading = projectsLoading,
                    onProjectSelect = { projectId ->
                        Log.d(TAG, "User selected project from drawer: $projectId")
                        viewModel.filterByProject(projectId)
                    },
                    onCreateProject = {
                        // TODO: 导航到项目创建页面
                        scope.launch {
                            snackbarHostState.showSnackbar("创建项目功能开发中...")
                        }
                    },
                    onClose = {
                        scope.launch {
                            drawerState.close()
                        }
                    }
                )
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("任务") },
                    navigationIcon = {
                        // 🆕 Menu图标打开抽屉
                        IconButton(
                            onClick = {
                                scope.launch {
                                    drawerState.open()
                                }
                            }
                        ) {
                            Icon(Icons.Default.Menu, contentDescription = "项目筛选")
                        }
                    },
                    actions = {
                    // 排序按钮
                    Box {
                        IconButton(onClick = { showSortMenu = true }) {
                            Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = "排序")
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
                SnackbarHost(snackbarHostState)

                // 显示错误信息
                if (uiState.error != null) {
                    LaunchedEffect(uiState.error) {
                        snackbarHostState.showSnackbar(uiState.error!!)
                        viewModel.clearError()
                    }
                }
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // 搜索框
                SearchBar(
                    query = filterState.searchQuery,
                    onQueryChange = { viewModel.searchTasks(it) },
                    modifier = Modifier.padding(16.dp)
                )

                // 任务ID搜索结果
                when (val searchState = taskIdSearchState) {
                    is TaskIdSearchState.Loading -> {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(12.dp))
                                Text("正在查找任务...")
                            }
                        }
                    }
                    is TaskIdSearchState.Success -> {
                        TaskIdSearchResultCard(
                            task = searchState.task,
                            onNavigateToDetail = { taskId ->
                                onTaskClick(taskId)
                                viewModel.clearTaskIdSearch()
                            },
                            onDismiss = { viewModel.clearTaskIdSearch() }
                        )
                    }
                    is TaskIdSearchState.NotFound -> {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Error,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "任务 #${searchState.taskId} 不存在",
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                                IconButton(onClick = { viewModel.clearTaskIdSearch() }) {
                                    Icon(Icons.Default.Close, contentDescription = "关闭")
                                }
                            }
                        }
                    }
                    is TaskIdSearchState.Error -> {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Error,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        searchState.message,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                                IconButton(onClick = { viewModel.clearTaskIdSearch() }) {
                                    Icon(Icons.Default.Close, contentDescription = "关闭")
                                }
                            }
                        }
                    }
                    TaskIdSearchState.Idle -> {
                        // 不显示任何内容
                    }
                }

                // 🆕 项目筛选标签（当选中项目时显示）
                if (filterState.selectedProjectId != null) {
                    val selectedProject = projects.find { it.id == filterState.selectedProjectId }
                    selectedProject?.let { project ->
                        FilterChip(
                            selected = true,
                            onClick = {
                                // 点击标签也可以打开抽屉
                                scope.launch {
                                    drawerState.open()
                                }
                            },
                            label = { Text(project.name) },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Folder,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                            },
                            trailingIcon = {
                                IconButton(
                                    onClick = {
                                        viewModel.filterByProject(null)
                                    },
                                    modifier = Modifier.size(18.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "清除项目筛选",
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            },
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                        )
                    }
                }

            // 任务列表 (使用Paging 3)
            val pullRefreshState = rememberPullRefreshState(
                refreshing = isRefreshing,
                onRefresh = { tasksPagingItems.refresh() }
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pullRefresh(pullRefreshState)
            ) {
                PullRefreshIndicator(
                    refreshing = isRefreshing,
                    state = pullRefreshState,
                    modifier = Modifier.align(Alignment.TopCenter).zIndex(1f)
                )
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
        } // End of Column (Scaffold content)
    } // End of Scaffold content lambda
    } // End of ModalNavigationDrawer

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
                imageVector = Icons.AutoMirrored.Filled.Assignment,
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

/**
 * 任务ID搜索结果卡片
 */
@Composable
fun TaskIdSearchResultCard(
    task: Task,
    onNavigateToDetail: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 标题行
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "找到任务 #${task.id}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "关闭",
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 任务标题
            Text(
                text = task.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )

            // 任务描述（如果有）
            task.description?.let { desc ->
                if (desc.isNotBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = desc,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                        maxLines = 2
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 状态和优先级
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TaskStatusChip(status = task.status)

                task.priority?.let { priority ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = when (priority) {
                            TaskPriority.HIGH -> Color(0xFFFFEBEE)
                            TaskPriority.MEDIUM -> Color(0xFFFFF3E0)
                            TaskPriority.LOW -> Color(0xFFF5F5F5)
                        }
                    ) {
                        Text(
                            text = getPriorityLabel(priority),
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = when (priority) {
                                TaskPriority.HIGH -> Color(0xFFC62828)
                                TaskPriority.MEDIUM -> Color(0xFFE65100)
                                TaskPriority.LOW -> Color(0xFF616161)
                            },
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 跳转按钮
            Button(
                onClick = { onNavigateToDetail(task.id) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("跳转到任务详情")
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

// TODO: SwipeToDismiss功能暂时移除，等待Material 3 API稳定后重新实现
// Material 3的SwipeToDismiss API在1.2.0+版本有重大变更
// 当前使用的是旧版API，需要升级到新版本后重新实现
//
// 计划实现：
// - 左滑删除（红色背景 + 删除图标）
// - 右滑完成（绿色背景 + 完成图标）
// - 删除需要确认对话框
