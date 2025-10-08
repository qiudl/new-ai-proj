package com.aiproj.mobile.ui.screens.details.todayworktime

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.ui.screens.details.todayworktime.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayWorkTimeDetailScreen(
    onBackClick: () -> Unit,
    onTaskClick: (Int) -> Unit,
    viewModel: TodayWorkTimeDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("今日工作时长详情") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "返回"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                uiState.error != null -> {
                    ErrorView(
                        message = uiState.error!!,
                        onRetry = { viewModel.refresh() },
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                uiState.todayWorkTimeDetail == null -> {
                    EmptyView(
                        message = "今天还没有工作记录",
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                else -> {
                    val detail = uiState.todayWorkTimeDetail!!

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // 1. 今日总览卡片
                        TodaySummaryCard(
                            totalMinutes = detail.totalMinutes,
                            completedTasks = detail.completedTasks,
                            totalTasks = detail.totalTasks
                        )

                        // 2. 时间分布图表
                        detail.timeDistribution?.let { distribution ->
                            TimeDistributionChart(timeDistribution = distribution)
                        }

                        // 3. 任务时长排行
                        TaskTimeRankingList(
                            tasks = detail.taskTimeDetails,
                            onTaskClick = onTaskClick
                        )

                        // 4. 昨日对比（如果有数据）
                        detail.comparisonYesterday?.let { comparison ->
                            ComparisonCard(comparison = comparison)
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorView(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("重试")
        }
    }
}

@Composable
private fun EmptyView(
    message: String,
    modifier: Modifier = Modifier
) {
    Text(
        text = message,
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier.padding(32.dp)
    )
}
