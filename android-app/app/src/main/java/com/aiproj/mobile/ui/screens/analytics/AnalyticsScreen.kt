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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.ui.screens.analytics.components.*

/**
 * 独立的统计分析页面
 *
 * 功能:
 * - 工作时长趋势图表
 * - 任务完成分析
 * - 项目时间分布
 * - 本周成就展示
 * - 时间范围筛选
 */
@Composable
fun AnalyticsScreen(
    viewModel: AnalyticsViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {},
    onNavigateToTaskStatusDetail: (status: String, startDate: String, endDate: String, projectId: Int?) -> Unit = { _, _, _, _ -> }
) {
    val uiState by viewModel.uiState.collectAsState()

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
            // 时间范围选择器 V2
            TimeRangeSelectorV2(
                selectedRange = uiState.selectedTimeRange,
                onRangeSelected = { viewModel.selectTimeRange(it) },
                modifier = Modifier.padding(vertical = 8.dp)
            )

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

                        TaskCompletionAnalysisCard(
                            completedCount = uiState.completedTasksCount,
                            totalCount = uiState.totalTasksCount,
                            completionRate = uiState.taskCompletionRate,
                            statusDistribution = uiState.taskStatusDistribution,
                            dateRangeText = when (uiState.selectedTimeRange) {
                                TimeRange.TODAY, TimeRange.YESTERDAY, TimeRange.DAY_BEFORE_YESTERDAY -> {
                                    startDate  // 单日显示：2025-10-06
                                }
                                else -> {
                                    // 本周/本月/上月/自定义日期：始终显示范围格式
                                    "$startDate ~ $endDate"  // 日期范围：2025-10-01 ~ 2025-10-06（即使起止相同）
                                }
                            },
                            onStatusClick = { status ->
                                onNavigateToTaskStatusDetail(status, startDate, endDate, null)
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

                        WeeklyAchievementsCard(
                            consecutiveDays = uiState.consecutiveWorkDays,
                            totalFocusHours = uiState.totalFocusHours,
                            completedTasks = uiState.completedTasksCount,
                            dateRangeText = when (uiState.selectedTimeRange) {
                                TimeRange.TODAY, TimeRange.YESTERDAY, TimeRange.DAY_BEFORE_YESTERDAY -> {
                                    startDate  // 单日显示：2025-10-06
                                }
                                else -> {
                                    // 本周/本月/上月/自定义日期：始终显示范围格式
                                    "$startDate ~ $endDate"  // 日期范围：2025-10-01 ~ 2025-10-06（即使起止相同）
                                }
                            }
                        )
                    }

                    // 底部空间
                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            }
        }

        // 自定义日期选择器对话框
        if (uiState.showDatePicker) {
            CustomDateRangePicker(
                initialStartDate = uiState.customStartDate,
                initialEndDate = uiState.customEndDate,
                onDateRangeSelected = { start, end ->
                    viewModel.setCustomDateRange(start, end)
                },
                onDismiss = { viewModel.dismissDatePicker() }
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
