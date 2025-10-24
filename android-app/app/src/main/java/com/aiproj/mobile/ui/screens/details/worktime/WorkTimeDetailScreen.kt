package com.aiproj.mobile.ui.screens.details.worktime

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.DetailedWorkTimeStats
import com.aiproj.mobile.ui.screens.details.worktime.components.*

/**
 * 工作时长详情页
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkTimeDetailScreen(
    onBackClick: () -> Unit,
    onTaskClick: (Int) -> Unit,
    viewModel: WorkTimeDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("工作时长统计") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        SwipeRefresh(
            state = rememberSwipeRefreshState(uiState.isLoading),
            onRefresh = { viewModel.refreshData() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading && uiState.workTimeStats == null) {
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
                WorkTimeContent(
                    uiState = uiState,
                    onTaskClick = onTaskClick,
                    onTimeRangeChange = { range -> viewModel.updateTimeRange(range) }
                )
            }
        }
    }
}

/**
 * 工作时长内容区域
 */
@Composable
fun WorkTimeContent(
    uiState: WorkTimeDetailUiState,
    onTaskClick: (Int) -> Unit,
    onTimeRangeChange: (TimeRange) -> Unit
) {
    val workTimeStats = uiState.workTimeStats ?: return

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 今日工作时长卡片
        item {
            TodayWorkTimeCard(
                todayHours = calculateTodayHours(workTimeStats),
                todayTaskCount = calculateTodayTaskCount(workTimeStats),
                comparisonYesterday = calculateComparison(workTimeStats)
            )
        }

        // 时间范围选择
        item {
            TimeRangeSelector(
                currentRange = uiState.selectedTimeRange,
                onRangeChange = onTimeRangeChange
            )
        }

        // 工作时长趋势图
        item {
            WorkTimeTrendChart(
                dailyStats = workTimeStats.dailyStats,
                timeRange = uiState.selectedTimeRange
            )
        }

        // 任务时间分布
        item {
            TaskTimeDistributionCard(
                taskTimeDistribution = workTimeStats.taskTimeDistribution.take(5),
                onTaskClick = onTaskClick
            )
        }

        // 效率分析
        item {
            EfficiencyAnalysisCard(
                metrics = workTimeStats.efficiencyMetrics
            )
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

/**
 * 计算今日工作时长
 */
private fun calculateTodayHours(stats: DetailedWorkTimeStats): Float =
    stats.dailyStats.lastOrNull()?.hours ?: 0f

/**
 * 计算今日任务数
 */
private fun calculateTodayTaskCount(stats: DetailedWorkTimeStats): Int =
    stats.dailyStats.lastOrNull()?.completedTasks ?: 0

/**
 * 计算对比昨日的百分比
 */
private fun calculateComparison(stats: DetailedWorkTimeStats): Float {
    if (stats.dailyStats.size < 2) return 0f
    val today = stats.dailyStats.last().hours
    val yesterday = stats.dailyStats[stats.dailyStats.size - 2].hours
    return if (yesterday > 0) ((today - yesterday) / yesterday) * 100 else 0f
}
