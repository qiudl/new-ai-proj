package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.*

/**
 * 效率分析Tab内容组件
 *
 * 显示：
 * - 效率总分卡片（整体得分、趋势、最佳/最差日期）
 * - 效率趋势图表
 * - 智能建议卡片列表
 * - 效率洞察信息
 */
@Composable
fun EfficiencyTabContent(
    uiState: AnalyticsUiState,
    viewModel: AnalyticsViewModel,
    modifier: Modifier = Modifier
) {
    // 加载效率数据
    LaunchedEffect(Unit) {
        viewModel.loadEfficiencyData()
    }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            // 加载中状态
            uiState.isLoadingEfficiency -> {
                LoadingState()
            }

            // 错误状态
            uiState.efficiencyError != null -> {
                ErrorState(
                    error = uiState.efficiencyError,
                    onRetry = { viewModel.loadEfficiencyData() }
                )
            }

            // 正常数据显示
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 效率总分卡片
                    item {
                        EfficiencyScoreCard(
                            efficiencyTrend = uiState.efficiencyTrend
                        )
                    }

                    // 效率趋势图表（如果有每日数据）
                    if (uiState.efficiencyTrend != null && uiState.efficiencyTrend.dailyData.isNotEmpty()) {
                        item {
                            // 将 DailyEfficiencyMetrics 转换为 DailyWorkTime
                            val workTimeData = uiState.efficiencyTrend.dailyData.map { metrics ->
                                DailyWorkTime(
                                    date = metrics.getDisplayDate(),
                                    dayLabel = metrics.getDisplayDate().substring(5), // MM-DD
                                    hours = metrics.getWorkHours().toFloat(),
                                    taskCount = metrics.tasksCompleted,
                                    detailInfo = "效率得分: ${metrics.efficiencyScore.toInt()}"
                                )
                            }

                            WorkTimeTrendCard(
                                data = workTimeData,
                                timeRange = uiState.selectedTimeRange,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    // 智能建议标题
                    if (uiState.smartSuggestions.isNotEmpty()) {
                        item {
                            Text(
                                text = "智能建议",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }

                        // 智能建议卡片列表
                        items(
                            items = uiState.smartSuggestions,
                            key = { it.id }
                        ) { suggestion ->
                            SmartSuggestionCard(
                                suggestion = suggestion,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    // 效率洞察
                    if (uiState.efficiencyInsights.isNotEmpty()) {
                        item {
                            Text(
                                text = "效率洞察",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }

                        item {
                            InsightsCard(insights = uiState.efficiencyInsights)
                        }
                    }

                    // 总结
                    if (uiState.efficiencySummary.isNotEmpty()) {
                        item {
                            SummaryCard(summary = uiState.efficiencySummary)
                        }
                    }

                    // 底部空间
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            }
        }
    }
}

/**
 * 加载状态组件
 */
@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator()
            Text(
                text = "正在加载效率分析数据...",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 错误状态组件
 */
@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "加载失败",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
            Text(
                text = error,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "重试"
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("重试")
            }
        }
    }
}

/**
 * 洞察信息卡片
 */
@Composable
private fun InsightsCard(insights: List<String>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            insights.forEach { insight ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "•",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = insight,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

/**
 * 总结卡片
 */
@Composable
private fun SummaryCard(summary: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "总结",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = summary,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

