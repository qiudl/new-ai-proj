package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.AnalyticsViewModel
import com.aiproj.mobile.ui.screens.analytics.AnalyticsUiState

/**
 * 任务统计Tab内容组件
 *
 * 显示：
 * - 任务总览卡片
 * - Top任务排行
 * - 任务完成趋势
 * - 任务优先级分布
 */
@Composable
fun TaskStatsTabContent(
    uiState: AnalyticsUiState,
    viewModel: AnalyticsViewModel,
    modifier: Modifier = Modifier
) {
    // 使用ViewModel的真实数据
    if (uiState.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else {
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // 任务总览卡片
            item {
                TaskOverviewCard(
                    totalTasks = uiState.totalTasksCount,
                    completedTasks = uiState.completedTasksCount,
                    inProgressTasks = uiState.inProgressTasksCount,
                    todoTasks = uiState.todoTasksCount,
                    completionRate = uiState.taskCompletionRate
                )
            }

            // Top任务排行
            item {
                TopTasksRankCard(
                    topTasks = uiState.topTasks,
                    onTaskClick = { taskId ->
                        // TODO: 导航到任务详情
                    },
                    onViewAllClick = {
                        // TODO: 查看全部任务
                    }
                )
            }

            // 任务完成趋势
            item {
                TaskCompletionTrendCard(
                    dailyCompletion = uiState.dailyCompletionTrend
                )
            }

            // 任务优先级分布
            item {
                TaskPriorityDistributionCard(
                    priorityStats = uiState.priorityDistribution
                )
            }

            // 底部空间
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

