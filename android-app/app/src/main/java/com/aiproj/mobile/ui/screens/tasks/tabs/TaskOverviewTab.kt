package com.aiproj.mobile.ui.screens.tasks.tabs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.ui.screens.tasks.components.*

/**
 * 任务总览Tab - 数据驱动的统计分析视图
 * Phase 4: 增强加载状态和错误处理
 */
@Composable
fun TaskOverviewTab(
    task: Task?,
    overviewStats: TaskOverviewStats?,
    selectedTimeRange: TimeRange,
    isLoading: Boolean = false,
    error: String? = null,
    onTimeRangeChange: (TimeRange) -> Unit,
    onSubtaskClick: (Int) -> Unit,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 时间筛选器（始终显示）
        TimeRangeFilter(
            selectedRange = selectedTimeRange,
            onRangeSelected = onTimeRangeChange
        )

        when {
            // 错误状态
            error != null -> {
                ErrorStateCard(
                    message = error,
                    onRetry = onRetry
                )
            }

            // 加载状态
            isLoading -> {
                LoadingStateCard()
            }

            // 有数据
            overviewStats != null -> {
                // 概览卡片区域
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    SubtaskStatsCard(
                        stats = overviewStats.subtaskStats,
                        modifier = Modifier.weight(1f)
                    )
                    WorkTimeStatsCard(
                        stats = overviewStats.workTimeStats,
                        modifier = Modifier.weight(1f)
                    )
                }

                // Top任务
                TopTasksCard(
                    topTasks = overviewStats.topTasks,
                    onTaskClick = onSubtaskClick
                )

                // 完成趋势图
                CompletionTrendChart(
                    trendData = overviewStats.completionTrend
                )

                // 优先级分布图
                PriorityPieChart(
                    distribution = overviewStats.priorityDistribution
                )
            }

            // 初始状态（无数据）
            else -> {
                EmptyStateCard()
            }
        }
    }
}

/**
 * 加载状态卡片
 */
@Composable
private fun LoadingStateCard() {
    repeat(3) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}

/**
 * 错误状态卡片
 */
@Composable
private fun ErrorStateCard(
    message: String,
    onRetry: (() -> Unit)?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Error,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.error
            )
            Text(
                text = "加载失败",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onErrorContainer
            )
            if (onRetry != null) {
                Button(onClick = onRetry) {
                    Text("重试")
                }
            }
        }
    }
}

/**
 * 空状态卡片
 */
@Composable
private fun EmptyStateCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "暂无数据",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "请选择时间范围查看统计数据",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}
