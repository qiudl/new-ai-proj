package com.aiproj.mobile.ui.screens.details.activeprojects

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.ui.screens.details.activeprojects.components.*

/**
 * 活跃项目详情页
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveProjectsDetailScreen(
    onBackClick: () -> Unit,
    onProjectClick: (Int) -> Unit,
    viewModel: ActiveProjectsDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("活跃项目 (${uiState.projectsData?.total ?: 0}个)")
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { paddingValues ->
        SwipeRefresh(
            state = rememberSwipeRefreshState(uiState.isLoading),
            onRefresh = { viewModel.refreshData() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading && uiState.projectsData == null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (uiState.error != null) {
                ErrorStateView(
                    error = uiState.error!!,
                    onRetry = { viewModel.refreshData() }
                )
            } else {
                ActiveProjectsContent(
                    uiState = uiState,
                    onProjectClick = onProjectClick,
                    onSortChange = { sortBy -> viewModel.updateSort(sortBy) },
                    onToggleSortOrder = { viewModel.toggleSortOrder() }
                )
            }
        }
    }
}

/**
 * 活跃项目内容区域
 */
@Composable
fun ActiveProjectsContent(
    uiState: ActiveProjectsDetailUiState,
    onProjectClick: (Int) -> Unit,
    onSortChange: (String) -> Unit,
    onToggleSortOrder: () -> Unit
) {
    val projectsData = uiState.projectsData ?: return

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 统计汇总卡片
        item {
            ProjectsSummaryCard(
                summary = projectsData.summary
            )
        }

        // 排序筛选栏
        item {
            SortFilterBar(
                currentSortBy = uiState.sortBy,
                sortOrder = uiState.sortOrder,
                onSortChange = onSortChange,
                onToggleSortOrder = onToggleSortOrder
            )
        }

        // 项目列表
        if (projectsData.projects.isEmpty()) {
            item {
                EmptyProjectsView()
            }
        } else {
            items(projectsData.projects) { project ->
                ActiveProjectCard(
                    project = project,
                    onClick = { onProjectClick(project.id) }
                )
            }
        }
    }
}

/**
 * 空状态视图
 */
@Composable
fun EmptyProjectsView() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "暂无活跃项目",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "创建项目后将在此显示",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}

/**
 * 错误状态视图
 */
@Composable
fun ErrorStateView(
    error: String,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = error,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("重试")
        }
    }
}
