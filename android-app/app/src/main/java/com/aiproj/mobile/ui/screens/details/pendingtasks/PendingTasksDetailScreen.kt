package com.aiproj.mobile.ui.screens.details.pendingtasks

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.zIndex
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.ui.screens.details.pendingtasks.components.*

/**
 * 待办任务详情页
 */
@OptIn(ExperimentalMaterial3Api::class, androidx.compose.material.ExperimentalMaterialApi::class)
@Composable
fun PendingTasksDetailScreen(
    onBackClick: () -> Unit,
    onTaskClick: (Int) -> Unit,
    viewModel: PendingTasksDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("待办任务 (${uiState.pendingTasksData?.total ?: 0}个)")
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    TextButton(onClick = { viewModel.toggleMultiSelectMode() }) {
                        Text(if (uiState.isMultiSelectMode) "取消" else "多选")
                    }
                }
            )
        },
        bottomBar = {
            if (uiState.isMultiSelectMode && uiState.selectedTaskIds.isNotEmpty()) {
                BatchOperationBar(
                    selectedCount = uiState.selectedTaskIds.size,
                    onComplete = { viewModel.batchComplete() },
                    onUpdatePriority = { viewModel.batchUpdatePriority("high") },
                    onAddToFocus = { viewModel.batchAddToFocus() }
                )
            }
        }
    ) { paddingValues ->
        val pullRefreshState = rememberPullRefreshState(
            refreshing = uiState.isLoading,
            onRefresh = { viewModel.refreshData() }
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .pullRefresh(pullRefreshState)
        ) {
            PullRefreshIndicator(
                refreshing = uiState.isLoading,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter).zIndex(1f)
            )
            if (uiState.isLoading && uiState.pendingTasksData == null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (uiState.error != null) {
                ErrorStateView(
                    error = uiState.error!!,
                    onRetry = { viewModel.refreshData() }
                )
            } else {
                PendingTasksContent(
                    uiState = uiState,
                    onTaskClick = onTaskClick,
                    onTaskSelect = { taskId -> viewModel.toggleTaskSelection(taskId) },
                    onGroupToggle = { priority -> viewModel.toggleGroupExpansion(priority) }
                )
            }
        }
    }
}

/**
 * 待办任务内容区域
 */
@Composable
fun PendingTasksContent(
    uiState: PendingTasksDetailUiState,
    onTaskClick: (Int) -> Unit,
    onTaskSelect: (Int) -> Unit,
    onGroupToggle: (String) -> Unit
) {
    val pendingTasksData = uiState.pendingTasksData ?: return

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 统计汇总卡片
        item {
            PendingTasksSummaryCard(
                summary = pendingTasksData.summary
            )
        }

        // 按优先级分组展示
        item {
            GroupedPendingTaskList(
                groupedTasks = pendingTasksData.groupedByPriority,
                expandedGroups = uiState.expandedGroups,
                isMultiSelectMode = uiState.isMultiSelectMode,
                selectedTaskIds = uiState.selectedTaskIds,
                onGroupToggle = onGroupToggle,
                onTaskClick = onTaskClick,
                onTaskSelect = onTaskSelect
            )
        }
    }
}

/**
 * 分组任务列表
 */
@Composable
fun GroupedPendingTaskList(
    groupedTasks: Map<String, List<Task>>,
    expandedGroups: Set<String>,
    isMultiSelectMode: Boolean,
    selectedTaskIds: Set<Int>,
    onGroupToggle: (String) -> Unit,
    onTaskClick: (Int) -> Unit,
    onTaskSelect: (Int) -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        listOf("high", "medium", "low").forEach { priority ->
            val tasks = groupedTasks[priority] ?: emptyList()
            val isExpanded = priority in expandedGroups

            PriorityGroupCard(
                priority = priority,
                taskCount = tasks.size,
                isExpanded = isExpanded,
                onToggle = { onGroupToggle(priority) }
            )

            AnimatedVisibility(visible = isExpanded) {
                Column(
                    modifier = Modifier.padding(top = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (tasks.isEmpty()) {
                        EmptyGroupView(priority = priority)
                    } else {
                        tasks.forEach { task ->
                            PendingTaskCard(
                                task = task,
                                isMultiSelectMode = isMultiSelectMode,
                                isSelected = task.id in selectedTaskIds,
                                onClick = { onTaskClick(task.id) },
                                onSelect = { onTaskSelect(task.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * 空分组视图
 */
@Composable
fun EmptyGroupView(@Suppress("UNUSED_PARAMETER") priority: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "该优先级暂无任务",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 错误状态视图
 */
@Composable
fun ErrorStateView(
    error: String,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = error,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("重试")
        }
    }
}
