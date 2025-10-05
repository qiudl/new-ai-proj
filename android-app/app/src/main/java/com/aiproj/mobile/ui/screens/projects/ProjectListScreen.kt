package com.aiproj.mobile.ui.screens.projects

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.ui.components.ProjectProgressBar
//import com.aiproj.mobile.ui.components.ProjectProgressBarWithStats
//import com.aiproj.mobile.ui.components.MemberAvatarRow
import com.aiproj.mobile.ui.components.ProjectStatusChip
//import com.aiproj.mobile.ui.components.ProjectSearchBar
//import com.aiproj.mobile.ui.components.ProjectFilterDialog
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

/**
 * 项目列表页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectListScreen(
    onProjectClick: (Int) -> Unit,
    onCreateProject: () -> Unit,
    viewModel: ProjectListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val swipeRefreshState = rememberSwipeRefreshState(isRefreshing = uiState.isLoading)
    var showFilterDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("项目") },
                actions = {
                    // 过滤按钮
                    IconButton(onClick = { showFilterDialog = true }) {
                        Icon(Icons.Default.FilterList, contentDescription = "过滤")
                    }
                    // 刷新按钮
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreateProject) {
                Icon(Icons.Default.Add, contentDescription = "创建项目")
            }
        },
        snackbarHost = {
            if (uiState.error != null) {
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("关闭")
                        }
                    }
                ) {
                    Text(uiState.error!!)
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // TODO: 🆕 搜索栏 - 暂时注释掉缺失组件
            /*
            ProjectSearchBar(
                query = uiState.searchQuery,
                onQueryChange = { viewModel.searchProjects(it) },
                onSearch = { viewModel.searchProjects(it) },
                onClear = { viewModel.clearSearch() }
            )
            */

            // TODO: 🆕 过滤对话框 - 暂时注释掉缺失组件
            /*
            if (showFilterDialog) {
                ProjectFilterDialog(
                    currentStatus = uiState.selectedStatus,
                    currentSortType = uiState.sortBy,
                    currentSortOrder = uiState.sortOrder,
                    onDismiss = { showFilterDialog = false },
                    onApply = { status, sortType, sortOrder ->
                        viewModel.filterByStatus(status)
                        viewModel.sortBy(sortType, sortOrder)
                    }
                )
            }
            */

            SwipeRefresh(
                state = swipeRefreshState,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize()
            ) {
                // 🆕 使用 filteredProjects 而不是 projects
                val displayProjects = uiState.filteredProjects

                if (uiState.isLoading && uiState.projects.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (displayProjects.isEmpty()) {
                    // 🆕 区分无数据和搜索无结果
                    if (uiState.projects.isEmpty()) {
                        EmptyProjectList()
                    } else {
                        EmptySearchResult()
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(displayProjects) { project ->
                            ProjectCard(
                                project = project,
                                onClick = { onProjectClick(project.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * 项目卡片
 */
@Composable
fun ProjectCard(
    project: Project,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            // 项目名称和状态
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = project.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }

                // 🆕 添加状态标签
                ProjectStatusChip(status = project.status)
            }

            // 项目描述
            project.description?.let { desc ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3
                )
            }

            // TODO: 🆕 添加进度条 - 暂时注释ProjectProgressBarWithStats
            Spacer(modifier = Modifier.height(12.dp))

            // 使用taskStats或completionRate
            if (project.completionRate != null) {
                ProjectProgressBar(
                    progress = project.completionRate,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            // TODO: 实现ProjectProgressBarWithStats组件
            /*
            if (project.taskStats != null) {
                ProjectProgressBarWithStats(
                    completed = project.taskStats.completed,
                    total = project.taskStats.total,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            */

            // 项目统计信息
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ProjectStatItem(
                    icon = Icons.Default.Assignment,
                    label = "任务",
                    value = "${project.taskCount ?: 0}"
                )
                ProjectStatItem(
                    icon = Icons.Default.People,
                    label = "成员",
                    value = "${project.memberCount ?: 0}"
                )
            }

            // TODO: 🆕 添加成员头像组 - 暂时注释MemberAvatarRow
            /*
            project.members?.let { members ->
                if (members.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    MemberAvatarRow(
                        members = members,
                        maxVisible = 5,
                        avatarSize = 28
                    )
                }
            }
            */

            // 创建时间
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "创建于 ${formatDate(project.createdAt)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 项目统计项
 */
@Composable
fun ProjectStatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(16.dp)
        )
        Text(
            text = "$value $label",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 空列表提示
 */
@Composable
fun EmptyProjectList() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.FolderOpen,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
            Text(
                text = "暂无项目",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 🆕 搜索无结果提示
 */
@Composable
fun EmptySearchResult() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.SearchOff,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
            Text(
                text = "未找到匹配的项目",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "试试其他搜索条件",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}

/**
 * 格式化日期
 */
fun formatDate(date: String): String {
    return try {
        val inputFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
        val outputFormat = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
        val parsedDate = inputFormat.parse(date)
        parsedDate?.let { outputFormat.format(it) } ?: date
    } catch (e: Exception) {
        date
    }
}
