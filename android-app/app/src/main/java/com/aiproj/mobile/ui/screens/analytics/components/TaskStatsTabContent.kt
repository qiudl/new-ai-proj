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
import com.aiproj.mobile.ui.screens.analytics.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

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
    // 生成模拟数据
    val mockTaskStatsState = generateMockTaskStatsState()

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
                totalTasks = mockTaskStatsState.totalTasks,
                completedTasks = mockTaskStatsState.completedTasks,
                inProgressTasks = mockTaskStatsState.inProgressTasks,
                todoTasks = mockTaskStatsState.todoTasks,
                completionRate = mockTaskStatsState.completionRate
            )
        }

        // Top任务排行
        item {
            TopTasksRankCard(
                topTasks = mockTaskStatsState.topTasks,
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
                dailyCompletion = mockTaskStatsState.dailyCompletionTrend
            )
        }

        // 任务优先级分布
        item {
            TaskPriorityDistributionCard(
                priorityStats = mockTaskStatsState.priorityDistribution
            )
        }

        // 底部空间
        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

/**
 * 生成模拟任务统计数据
 */
private fun generateMockTaskStatsState(): TaskStatsUiState {
    val today = LocalDate.now()

    return TaskStatsUiState(
        isLoading = false,
        error = null,
        totalTasks = 25,
        completedTasks = 18,
        inProgressTasks = 5,
        todoTasks = 2,
        completionRate = 0.72f,
        topTasks = listOf(
            TopTask(
                taskId = 2867,
                title = "Phase 3: 每日详情Tab详细设计与开发",
                hours = 8.5f,
                status = "completed",
                priority = "high"
            ),
            TopTask(
                taskId = 2859,
                title = "前端：优化UI交互和用户引导",
                hours = 6.2f,
                status = "completed",
                priority = "medium"
            ),
            TopTask(
                taskId = 2851,
                title = "方案设计与实际实现对比分析",
                hours = 4.8f,
                status = "in_progress",
                priority = "high"
            ),
            TopTask(
                taskId = 2864,
                title = "Android统计页面重构优化",
                hours = 3.2f,
                status = "in_progress",
                priority = "high"
            ),
            TopTask(
                taskId = 2838,
                title = "修复统计页面Bug",
                hours = 2.5f,
                status = "completed",
                priority = "medium"
            )
        ),
        dailyCompletionTrend = (0..6).map { daysAgo ->
            val date = today.minusDays(daysAgo.toLong())
            val weekday = when (date.dayOfWeek.value) {
                1 -> "周一"
                2 -> "周二"
                3 -> "周三"
                4 -> "周四"
                5 -> "周五"
                6 -> "周六"
                7 -> "周日"
                else -> ""
            }
            DailyCompletion(
                date = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                weekday = weekday,
                completedCount = when (daysAgo) {
                    0 -> 1  // 今天
                    1 -> 2  // 昨天
                    2 -> 3  // 前天
                    3 -> 5  // 3天前（周三最高）
                    4 -> 2  // 4天前
                    5 -> 4  // 5天前
                    6 -> 1  // 6天前
                    else -> 0
                }
            )
        }.reversed(), // 反转使周一在前
        priorityDistribution = PriorityStats(
            highPriority = 10,
            mediumPriority = 9,
            lowPriority = 6
        )
    )
}
