package com.aiproj.mobile.ui.screens.timer.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import com.aiproj.mobile.ui.screens.timer.history.components.FilterChips
import com.aiproj.mobile.ui.screens.timer.history.components.TimerLogItem
import com.aiproj.mobile.ui.screens.timer.history.components.TimerStatsCard

/**
 * 计时器历史记录页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimerHistoryScreen(
    onBackClick: () -> Unit,
    onTaskClick: (Long) -> Unit,
    viewModel: TimerHistoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val timerLogsFlow by viewModel.timerLogs.collectAsState()
    val timerLogs = timerLogsFlow?.collectAsLazyPagingItems()

    var selectedRange by remember { mutableStateOf<DateRange?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("计时器历史") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // 筛选Chips
            Spacer(modifier = Modifier.height(8.dp))
            FilterChips(
                selectedRange = selectedRange,
                onRangeSelected = { range ->
                    selectedRange = range
                    viewModel.setQuickDateRange(range)
                },
                onClearFilters = {
                    selectedRange = null
                    viewModel.clearFilters()
                },
                hasActiveFilters = uiState.filter.hasActiveFilters()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 主内容区域
            when {
                // 初始加载中
                timerLogs == null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                // 加载完成，显示内容
                else -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 统计卡片
                        if (uiState.isLoadingStats) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator()
                                }
                            }
                        } else {
                            uiState.stats?.let { stats ->
                                item {
                                    TimerStatsCard(stats = stats)
                                }
                            }
                        }

                        // 筛选说明
                        if (uiState.filter.hasActiveFilters()) {
                            item {
                                Text(
                                    text = uiState.filter.getFilterDescription(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                        }

                        // 计时器记录列表
                        items(
                            count = timerLogs.itemCount,
                            key = { index -> timerLogs[index]?.id ?: index }
                        ) { index ->
                            val timerLog = timerLogs[index]
                            if (timerLog != null) {
                                TimerLogItem(
                                    timerLog = timerLog,
                                    onTaskClick = onTaskClick
                                )
                            }
                        }

                        // 加载状态处理
                        when {
                            timerLogs.loadState.refresh is LoadState.Loading -> {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator()
                                    }
                                }
                            }
                            timerLogs.loadState.append is LoadState.Loading -> {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator()
                                    }
                                }
                            }
                            timerLogs.loadState.refresh is LoadState.Error -> {
                                item {
                                    ErrorView(
                                        message = (timerLogs.loadState.refresh as LoadState.Error).error.message
                                            ?: "加载失败",
                                        onRetry = { timerLogs.retry() }
                                    )
                                }
                            }
                            timerLogs.loadState.append is LoadState.Error -> {
                                item {
                                    ErrorView(
                                        message = (timerLogs.loadState.append as LoadState.Error).error.message
                                            ?: "加载失败",
                                        onRetry = { timerLogs.retry() }
                                    )
                                }
                            }
                            timerLogs.itemCount == 0 -> {
                                item {
                                    EmptyView(
                                        message = "暂无计时器记录",
                                        modifier = Modifier.padding(top = 32.dp)
                                    )
                                }
                            }
                        }

                        // 底部间距
                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }
                }
            }
        }
    }
}

/**
 * 错误视图
 */
@Composable
private fun ErrorView(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        androidx.compose.material3.TextButton(onClick = onRetry) {
            Text("重试")
        }
    }
}

/**
 * 空状态视图
 */
@Composable
private fun EmptyView(
    message: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
            textAlign = TextAlign.Center
        )
    }
}
