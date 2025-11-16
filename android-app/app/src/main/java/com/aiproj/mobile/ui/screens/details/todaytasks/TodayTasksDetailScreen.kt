package com.aiproj.mobile.ui.screens.details.todaytasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.FilterList
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
import com.aiproj.mobile.data.models.TodayTasksDetail
import com.aiproj.mobile.ui.screens.details.todaytasks.components.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * 今日任务详情页
 */
@OptIn(ExperimentalMaterial3Api::class, androidx.compose.material.ExperimentalMaterialApi::class)
@Composable
fun TodayTasksDetailScreen(
    onBackClick: () -> Unit,
    onTaskClick: (Int) -> Unit,
    viewModel: TodayTasksDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // 格式化日期显示
    val dateFormatter = DateTimeFormatter.ofPattern("yyyy年MM月dd日")
    val displayDate = try {
        LocalDate.parse(uiState.selectedDate).format(dateFormatter)
    } catch (e: Exception) {
        uiState.selectedDate
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("今日任务 ($displayDate)") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.toggleFilterSheet() }) {
                        Icon(Icons.Default.FilterList, contentDescription = "筛选")
                    }
                }
            )
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
            if (uiState.isLoading && uiState.todayTasksDetail == null) {
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
                TodayTasksContent(
                    uiState = uiState,
                    onTaskClick = onTaskClick,
                    onStartTimer = { taskId -> viewModel.startTaskTimer(taskId) },
                    onFilterChange = { filter -> viewModel.updateFilter(filter) },
                    onTogglePriorityChart = { viewModel.togglePriorityChart() }
                )
            }
        }
    }
}

/**
 * 今日任务内容区域
 */
@Composable
fun TodayTasksContent(
    uiState: TodayTasksDetailUiState,
    onTaskClick: (Int) -> Unit,
    onStartTimer: (Int) -> Unit,
    onFilterChange: (TaskFilter) -> Unit,
    onTogglePriorityChart: () -> Unit
) {
    val todayData = uiState.todayTasksDetail ?: return

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 完成进度卡片
        item {
            TaskCompletionCard(
                total = todayData.total,
                completed = todayData.completed,
                pending = todayData.pending,
                completionRate = todayData.completionRate
            )
        }

        // 优先级分布卡片
        item {
            PriorityDistributionCard(
                distribution = todayData.priorityDistribution,
                isExpanded = uiState.isPriorityChartExpanded,
                onToggleExpand = onTogglePriorityChart
            )
        }

        // 筛选/排序栏
        item {
            TaskFilterChips(
                currentFilter = uiState.currentFilter,
                onFilterChange = onFilterChange
            )
        }

        // 任务列表
        val filteredTasks = when (uiState.currentFilter) {
            TaskFilter.ALL -> todayData.tasks
            TaskFilter.COMPLETED -> todayData.tasks.filter { it.status.name == "COMPLETED" }
            TaskFilter.IN_PROGRESS -> todayData.tasks.filter { it.status.name == "IN_PROGRESS" }
            TaskFilter.TODO -> todayData.tasks.filter { it.status.name == "TODO" }
        }

        if (filteredTasks.isEmpty()) {
            item {
                EmptyTasksView(filter = uiState.currentFilter)
            }
        } else {
            items(filteredTasks) { task ->
                TodayTaskCard(
                    task = task,
                    onClick = { onTaskClick(task.id) },
                    onStartTimer = { onStartTimer(task.id) }
                )
            }
        }
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
