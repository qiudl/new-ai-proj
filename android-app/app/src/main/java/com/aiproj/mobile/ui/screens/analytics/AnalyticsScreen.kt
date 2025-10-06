package com.aiproj.mobile.ui.screens.analytics

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.ui.screens.analytics.components.*

/**
 * 独立的统计分析页面
 *
 * 采用Tab结构:
 * - 概览: 工作时长趋势、任务完成分析、项目分布、成就展示
 * - 每日: 每日工作记录、任务时间条目
 * - 任务: 任务统计、Top任务、完成趋势
 * - 效率: 效率趋势、智能分析建议
 */
@Composable
fun AnalyticsScreen(
    viewModel: AnalyticsViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {},
    onNavigateToTaskStatusDetail: (status: String, startDate: String, endDate: String, projectId: Int?) -> Unit = { _, _, _, _ -> }
) {
    val uiState by viewModel.uiState.collectAsState()
    var showOtherStatusDetail by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            AnalyticsTopBar(
                dateRangeText = viewModel.getDateRangeText(),
                onNavigateBack = onNavigateBack
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tab导航栏
            AnalyticsTabRow(
                selectedTab = uiState.selectedTab,
                onTabSelected = { viewModel.selectTab(it) }
            )

            // 时间范围选择器 V2
            TimeRangeSelectorV2(
                selectedRange = uiState.selectedTimeRange,
                onRangeSelected = { viewModel.selectTimeRange(it) },
                modifier = Modifier.padding(vertical = 8.dp)
            )

            // Tab内容区域
            when (uiState.selectedTab) {
                AnalyticsTab.OVERVIEW -> {
                    OverviewTabContent(
                        uiState = uiState,
                        viewModel = viewModel,
                        onNavigateToTaskStatusDetail = onNavigateToTaskStatusDetail,
                        onShowOtherStatusDetail = { showOtherStatusDetail = true }
                    )
                }
                AnalyticsTab.DAILY_DETAIL -> {
                    DailyDetailTabContent(
                        uiState = uiState,
                        viewModel = viewModel
                    )
                }
                AnalyticsTab.TASK_STATS -> {
                    TaskStatsTabContent(
                        uiState = uiState,
                        viewModel = viewModel
                    )
                }
                AnalyticsTab.EFFICIENCY -> {
                    EfficiencyTabContent(
                        uiState = uiState,
                        viewModel = viewModel
                    )
                }
            }
        }

        // 简化的日期范围选择器
        if (uiState.showDatePicker) {
            SimpleDateRangePicker(
                initialStartDate = uiState.customStartDate,
                initialEndDate = uiState.customEndDate,
                onDateRangeSelected = { start, end ->
                    viewModel.setCustomDateRange(start, end)
                },
                onDismiss = { viewModel.dismissDatePicker() }
            )
        }

        // 其他状态详情弹窗
        if (showOtherStatusDetail) {
            // 构建其他状态的详细分类
            val othersBreakdown = buildOtherStatusBreakdown(uiState.taskStatusDistribution.othersBreakdown)

            OtherStatusDetailSheet(
                statusBreakdown = othersBreakdown,
                onDismiss = { showOtherStatusDetail = false },
                onStatusClick = { status ->
                    showOtherStatusDetail = false
                    val (startDate, endDate) = viewModel.calculateDateRange(
                        uiState.selectedTimeRange,
                        uiState.customStartDate,
                        uiState.customEndDate
                    )
                    onNavigateToTaskStatusDetail(status, startDate, endDate, null)
                }
            )
        }

        // 错误提示
        uiState.error?.let { error ->
            Snackbar(
                modifier = Modifier
                    .padding(16.dp)
                    .padding(paddingValues),
                action = {
                    TextButton(onClick = { viewModel.refresh() }) {
                        Text("重试")
                    }
                }
            ) {
                Text(error)
            }
        }
    }
}

/**
 * 构建其他状态的详细分类Map
 */
private fun buildOtherStatusBreakdown(breakdown: OtherStatusBreakdown): Map<String, OtherStatusItem> {
    return mapOf(
        "draft" to OtherStatusItem(
            emoji = "📝",
            displayName = "草稿",
            count = breakdown.draft,
            color = Color(0xFFBDBDBD)
        ),
        "planning" to OtherStatusItem(
            emoji = "📋",
            displayName = "计划中",
            count = breakdown.planning,
            color = Color(0xFF90CAF9)
        ),
        "testing" to OtherStatusItem(
            emoji = "🧪",
            displayName = "测试中",
            count = breakdown.testing,
            color = Color(0xFFFFB74D)
        ),
        "cancelled" to OtherStatusItem(
            emoji = "❌",
            displayName = "已取消",
            count = breakdown.cancelled,
            color = Color(0xFFEF5350)
        ),
        "on_hold" to OtherStatusItem(
            emoji = "⏸️",
            displayName = "暂停",
            count = breakdown.onHold,
            color = Color(0xFFFFCA28)
        ),
        "blocked" to OtherStatusItem(
            emoji = "🚫",
            displayName = "阻塞",
            count = breakdown.blocked,
            color = Color(0xFFE53935)
        ),
        "archived" to OtherStatusItem(
            emoji = "📦",
            displayName = "已归档",
            count = breakdown.archived,
            color = Color(0xFF9E9E9E)
        )
    )
}

/**
 * 概览Tab内容（原有的全部内容）
 */
@Composable
private fun OverviewTabContent(
    uiState: AnalyticsUiState,
    viewModel: AnalyticsViewModel,
    onNavigateToTaskStatusDetail: (status: String, startDate: String, endDate: String, projectId: Int?) -> Unit,
    onShowOtherStatusDetail: () -> Unit
) {
    if (uiState.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // 工作时长趋势
            item {
                WorkTimeTrendCard(
                    data = uiState.workTimeTrend,
                    timeRange = uiState.selectedTimeRange,
                    granularity = uiState.timeGranularity
                )
            }

            // 任务完成分析
            item {
                val (startDate, endDate) = viewModel.calculateDateRange(
                    uiState.selectedTimeRange,
                    uiState.customStartDate,
                    uiState.customEndDate
                )

                val dateText = when (uiState.selectedTimeRange) {
                    TimeRange.TODAY, TimeRange.YESTERDAY, TimeRange.DAY_BEFORE_YESTERDAY -> {
                        startDate
                    }
                    else -> {
                        "$startDate ~ $endDate"
                    }
                }

                TaskCompletionAnalysisCard(
                    completedCount = uiState.completedTasksCount,
                    totalCount = uiState.totalTasksCount,
                    completionRate = uiState.taskCompletionRate,
                    statusDistribution = uiState.taskStatusDistribution,
                    dateRangeText = dateText,
                    onStatusClick = { status ->
                        if (status == "others") {
                            onShowOtherStatusDetail()
                        } else {
                            onNavigateToTaskStatusDetail(status, startDate, endDate, null)
                        }
                    }
                )
            }

            // 项目时间分布
            item {
                ProjectDistributionCard(
                    projects = uiState.projectTimeDistribution
                )
            }

            // 成就
            item {
                val (startDate, endDate) = viewModel.calculateDateRange(
                    uiState.selectedTimeRange,
                    uiState.customStartDate,
                    uiState.customEndDate
                )

                val achievementDateText = when (uiState.selectedTimeRange) {
                    TimeRange.TODAY, TimeRange.YESTERDAY, TimeRange.DAY_BEFORE_YESTERDAY -> {
                        startDate
                    }
                    else -> {
                        "$startDate ~ $endDate"
                    }
                }

                WeeklyAchievementsCard(
                    consecutiveDays = uiState.consecutiveWorkDays,
                    totalFocusHours = uiState.totalFocusHours,
                    completedTasks = uiState.completedTasksCount,
                    dateRangeText = achievementDateText
                )
            }

            // 底部空间
            item {
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

/**
 * 每日详情Tab内容（占位符）
 */
@Composable
private fun DailyDetailTabContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "每日详情Tab - 待开发",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 任务统计Tab内容（占位符）
 */
@Composable
private fun TaskStatsTabContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "任务统计Tab - 待开发",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 效率分析Tab内容（占位符）
 */
@Composable
private fun EfficiencyTabContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "效率分析Tab - 待开发",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * Analytics顶部栏
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AnalyticsTopBar(
    dateRangeText: String,
    onNavigateBack: () -> Unit
) {
    TopAppBar(
        title = {
            Column {
                Text("数据统计")
                Text(
                    text = dateRangeText,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        navigationIcon = {
            IconButton(onClick = onNavigateBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
            }
        }
    )
}
