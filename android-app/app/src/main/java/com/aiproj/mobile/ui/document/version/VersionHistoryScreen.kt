package com.aiproj.mobile.ui.document.version

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import kotlinx.coroutines.launch

/**
 * 版本历史屏幕
 *
 * 显示文档的版本历史列表
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VersionHistoryScreen(
    projectId: Long,
    taskId: Long,
    documentId: Long,
    onNavigateBack: () -> Unit,
    onVersionClick: (Int) -> Unit,
    onCompareVersions: ((Int, Int, Int, Int, Int) -> Unit)? = null, // projectId, taskId, documentId, version1, version2
    viewModel: VersionHistoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // 初始化
    LaunchedEffect(projectId, taskId, documentId) {
        viewModel.initialize(projectId, taskId, documentId)
    }

    // 处理成功消息
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { message ->
            snackbarHostState.showSnackbar(
                message = message,
                duration = SnackbarDuration.Short
            )
            viewModel.clearSuccessMessage()
        }
    }

    // 处理错误消息
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Long,
                actionLabel = "关闭"
            )
            viewModel.clearError()
        }
    }

    // 监听滚动到底部，加载更多
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }
            .collect { lastVisibleIndex ->
                if (lastVisibleIndex != null &&
                    lastVisibleIndex >= uiState.versions.size - 3 &&
                    uiState.hasMore &&
                    !uiState.isLoading
                ) {
                    viewModel.loadMore()
                }
            }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("版本历史") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    // 对比模式切换按钮（仅在有onCompareVersions回调时显示）
                    if (onCompareVersions != null) {
                        IconButton(onClick = { viewModel.toggleComparisonMode() }) {
                            Icon(
                                imageVector = if (uiState.isComparisonMode) {
                                    Icons.Default.Delete
                                } else {
                                    Icons.Default.Edit
                                },
                                contentDescription = if (uiState.isComparisonMode) "取消对比" else "对比版本"
                            )
                        }
                    }
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                }
            )
        },
        bottomBar = {
            // 对比按钮（仅在对比模式下且选择了两个版本时显示）
            if (uiState.canCompare && onCompareVersions != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shadowElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "已选择 2 个版本",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Button(
                            onClick = {
                                val v1 = uiState.selectedVersion1!!
                                val v2 = uiState.selectedVersion2!!
                                onCompareVersions(
                                    projectId.toInt(),
                                    taskId.toInt(),
                                    documentId.toInt(),
                                    v1,
                                    v2
                                )
                            }
                        ) {
                            Icon(Icons.Default.Done, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("开始对比")
                        }
                    }
                }
            }
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        }
    ) { paddingValues ->
        SwipeRefresh(
            state = rememberSwipeRefreshState(uiState.isRefreshing),
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                // 空状态
                uiState.shouldShowEmptyState -> {
                    EmptyState(
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // 内容列表
                uiState.shouldShowContent -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 版本总数提示
                        item {
                            Text(
                                text = "共 ${uiState.totalVersions} 个版本",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        // 版本列表
                        items(
                            items = uiState.versions,
                            key = { it.id }
                        ) { version ->
                            VersionListItem(
                                version = version,
                                onClick = {
                                    if (uiState.isComparisonMode) {
                                        // 对比模式：选择版本
                                        viewModel.selectVersionForComparison(version.versionNumber)
                                    } else {
                                        // 正常模式：查看版本详情
                                        onVersionClick(version.versionNumber)
                                    }
                                },
                                onRestore = { viewModel.restoreVersion(version.versionNumber) },
                                isComparisonMode = uiState.isComparisonMode,
                                isSelected = uiState.selectedVersion1 == version.versionNumber ||
                                            uiState.selectedVersion2 == version.versionNumber,
                                selectionLabel = when (version.versionNumber) {
                                    uiState.selectedVersion1 -> "版本1"
                                    uiState.selectedVersion2 -> "版本2"
                                    else -> null
                                },
                                onCopySuccess = {
                                    scope.launch {
                                        snackbarHostState.showSnackbar(
                                            message = "已复制版本信息",
                                            duration = SnackbarDuration.Short
                                        )
                                    }
                                }
                            )
                        }

                        // 加载更多指示器
                        if (uiState.isLoading && uiState.versions.isNotEmpty()) {
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

                        // 没有更多数据提示
                        if (!uiState.hasMore && uiState.versions.isNotEmpty()) {
                            item {
                                Text(
                                    text = "没有更多版本了",
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    textAlign = TextAlign.Center,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                // 错误状态
                uiState.shouldShowError && uiState.versions.isEmpty() -> {
                    ErrorState(
                        error = uiState.error ?: "加载失败",
                        onRetry = { viewModel.retry() },
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // 初始加载中
                uiState.isLoading && uiState.versions.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
            }
        }
    }
}

/**
 * 空状态组件
 */
@Composable
private fun EmptyState(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "暂无版本历史",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "文档的修改记录将显示在这里",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 错误状态组件
 */
@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = error,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("重试")
        }
    }
}
