package com.aiproj.mobile.ui.screens.requirement

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.aiproj.mobile.ui.components.requirement.RequirementFilterPanel
import com.aiproj.mobile.ui.components.requirement.RequirementListItem
import com.aiproj.mobile.ui.components.requirement.RequirementStatsCard

/**
 * 需求列表页面
 *
 * 显示需求列表、统计信息和筛选功能
 *
 * @param onNavigateBack 返回回调
 * @param onRequirementClick 点击需求回调
 * @param onCreateRequirement 创建需求回调
 * @param viewModel ViewModel
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequirementListScreen(
    onNavigateBack: () -> Unit,
    onRequirementClick: (Int) -> Unit,
    onCreateRequirement: () -> Unit,
    viewModel: RequirementListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currentFilter by viewModel.currentFilter.collectAsState()
    val pagingItems = viewModel.pagingDataFlow.collectAsLazyPagingItems()

    var showSearchBar by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            if (showSearchBar) {
                // 搜索栏
                SearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = { viewModel.updateSearchQuery(it) },
                    onSearch = { viewModel.performSearch() },
                    onClose = {
                        showSearchBar = false
                        viewModel.clearSearch()
                    }
                )
            } else {
                // 正常标题栏
                TopAppBar(
                    title = { Text("需求管理") },
                    actions = {
                        IconButton(onClick = { showSearchBar = true }) {
                            Icon(Icons.Default.Search, contentDescription = "搜索")
                        }
                    }
                )
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateRequirement
            ) {
                Icon(Icons.Default.Add, contentDescription = "创建需求")
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 统计卡片
            item {
                RequirementStatsCard(
                    stats = uiState.stats,
                    onStatItemClick = { status ->
                        viewModel.quickFilterByStatus(status)
                    }
                )
            }

            // 筛选面板
            item {
                RequirementFilterPanel(
                    currentFilter = currentFilter,
                    onFilterChange = { filter ->
                        viewModel.updateFilter(filter)
                    }
                )
            }

            // 需求列表
            when (pagingItems.loadState.refresh) {
                is LoadState.Loading -> {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                }
                is LoadState.Error -> {
                    val error = (pagingItems.loadState.refresh as LoadState.Error).error
                    item {
                        ErrorMessage(
                            message = error.message ?: "加载失败",
                            onRetry = { pagingItems.retry() }
                        )
                    }
                }
                else -> {
                    if (pagingItems.itemCount == 0) {
                        item {
                            EmptyState()
                        }
                    } else {
                        items(
                            count = pagingItems.itemCount,
                            key = pagingItems.itemKey { it.id }
                        ) { index ->
                            val requirement = pagingItems[index]
                            requirement?.let {
                                RequirementListItem(
                                    requirement = it,
                                    onClick = { onRequirementClick(it.id) }
                                )
                            }
                        }

                        // 加载更多指示器
                        if (pagingItems.loadState.append is LoadState.Loading) {
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
                    }
                }
            }
        }
    }
}

/**
 * 搜索栏组件
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onClose: () -> Unit
) {
    TopAppBar(
        title = {
            TextField(
                value = query,
                onValueChange = onQueryChange,
                placeholder = { Text("搜索需求...") },
                singleLine = true,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                    unfocusedIndicatorColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                ),
                modifier = Modifier.fillMaxWidth()
            )
        },
        navigationIcon = {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.Search, contentDescription = "关闭搜索")
            }
        }
    )

    // 当查询改变时自动搜索
    LaunchedEffect(query) {
        if (query.isNotBlank()) {
            onSearch()
        }
    }
}

/**
 * 空状态组件
 */
@Composable
private fun EmptyState() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "暂无需求",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "点击右下角按钮创建新需求",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 错误消息组件
 */
@Composable
private fun ErrorMessage(
    message: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error
            )
            Button(onClick = onRetry) {
                Text("重试")
            }
        }
    }
}
