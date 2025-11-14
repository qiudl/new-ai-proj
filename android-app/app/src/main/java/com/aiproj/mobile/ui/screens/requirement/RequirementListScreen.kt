package com.aiproj.mobile.ui.screens.requirement

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.ui.components.requirement.RequirementListItem
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

/**
 * 需求列表屏幕
 *
 * 功能:
 * - 显示需求列表
 * - 支持下拉刷新
 * - 支持筛选(状态、优先级、类别)
 * - 支持搜索
 * - 支持创建新需求
 * - 点击需求进入详情
 *
 * @param onRequirementClick 点击需求回调
 * @param onCreateRequirement 创建需求回调
 * @param viewModel ViewModel
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequirementListScreen(
    onRequirementClick: (Int) -> Unit,
    onCreateRequirement: () -> Unit,
    viewModel: RequirementListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val filterState by viewModel.filterState.collectAsState()
    val requirements by viewModel.requirements.collectAsState()

    var showFilterDialog by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var showSearchBar by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (showSearchBar) {
                        TextField(
                            value = searchQuery,
                            onValueChange = { query ->
                                searchQuery = query
                                viewModel.searchRequirements(query)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("搜索需求...") },
                            singleLine = true,
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surface
                            )
                        )
                    } else {
                        Text("需求列表")
                    }
                },
                actions = {
                    if (showSearchBar) {
                        IconButton(onClick = {
                            showSearchBar = false
                            searchQuery = ""
                            viewModel.searchRequirements("")
                        }) {
                            Icon(Icons.Default.Close, contentDescription = "关闭搜索")
                        }
                    } else {
                        IconButton(onClick = { showSearchBar = true }) {
                            Icon(Icons.Default.Search, contentDescription = "搜索")
                        }
                        IconButton(onClick = { showFilterDialog = true }) {
                            Badge(
                                containerColor = if (hasActiveFilters(filterState)) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.surfaceVariant
                                }
                            ) {
                                Icon(Icons.Default.FilterList, contentDescription = "筛选")
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateRequirement,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "创建需求")
            }
        }
    ) { paddingValues ->
        SwipeRefresh(
            state = rememberSwipeRefreshState(uiState.isLoading),
            onRefresh = { viewModel.refreshRequirements() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.error != null -> {
                    ErrorState(
                        message = uiState.error!!,
                        onRetry = { viewModel.loadRequirements(forceRefresh = true) }
                    )
                }
                uiState.isEmpty && !uiState.isLoading -> {
                    EmptyState(
                        hasFilters = hasActiveFilters(filterState),
                        onClearFilters = { viewModel.clearFilters() },
                        onCreateRequirement = onCreateRequirement
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 活动筛选器显示
                        if (hasActiveFilters(filterState)) {
                            item {
                                ActiveFiltersChip(
                                    filterState = filterState,
                                    onClearFilters = { viewModel.clearFilters() }
                                )
                            }
                        }

                        // 需求列表
                        items(
                            items = requirements,
                            key = { it.id }
                        ) { requirement ->
                            RequirementListItem(
                                requirement = requirement,
                                onClick = { onRequirementClick(requirement.id) },
                                onLongClick = {
                                    // TODO: 显示操作菜单
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // 筛选对话框
    if (showFilterDialog) {
        RequirementFilterDialog(
            filterState = filterState,
            onDismiss = { showFilterDialog = false },
            onApplyFilters = { status, priority, category ->
                viewModel.filterByStatus(status)
                viewModel.filterByPriority(priority)
                viewModel.filterByCategory(category)
                showFilterDialog = false
            }
        )
    }
}

/**
 * 错误状态组件
 */
@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Error,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.error
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.error,
                textAlign = TextAlign.Center
            )
            Button(onClick = onRetry) {
                Text("重试")
            }
        }
    }
}

/**
 * 空状态组件
 */
@Composable
private fun EmptyState(
    hasFilters: Boolean,
    onClearFilters: () -> Unit,
    onCreateRequirement: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(32.dp)
        ) {
            Icon(
                imageVector = if (hasFilters) Icons.Default.FilterAltOff else Icons.Default.Inbox,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = if (hasFilters) "没有符合条件的需求" else "暂无需求",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = if (hasFilters) "尝试调整筛选条件" else "点击 + 按钮创建第一个需求",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            if (hasFilters) {
                OutlinedButton(onClick = onClearFilters) {
                    Icon(Icons.Default.FilterAltOff, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("清除筛选")
                }
            } else {
                Button(onClick = onCreateRequirement) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("创建需求")
                }
            }
        }
    }
}

/**
 * 活动筛选器芯片
 */
@Composable
private fun ActiveFiltersChip(
    filterState: RequirementFilterState,
    onClearFilters: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.secondaryContainer,
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "已应用筛选",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = buildFilterDescription(filterState),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
            TextButton(onClick = onClearFilters) {
                Text("清除")
            }
        }
    }
}

/**
 * 筛选对话框
 */
@Composable
private fun RequirementFilterDialog(
    filterState: RequirementFilterState,
    onDismiss: () -> Unit,
    onApplyFilters: (RequirementStatus?, RequirementPriority?, RequirementCategory?) -> Unit
) {
    var selectedStatus by remember { mutableStateOf(filterState.selectedStatus) }
    var selectedPriority by remember { mutableStateOf(filterState.selectedPriority) }
    var selectedCategory by remember { mutableStateOf(filterState.selectedCategory) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("筛选需求") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 状态筛选
                Text(
                    text = "状态",
                    style = MaterialTheme.typography.labelLarge
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedStatus == null,
                        onClick = { selectedStatus = null },
                        label = { Text("全部") }
                    )
                    RequirementStatus.entries.take(3).forEach { status ->
                        FilterChip(
                            selected = selectedStatus == status,
                            onClick = { selectedStatus = status },
                            label = { Text(getStatusText(status)) }
                        )
                    }
                }

                HorizontalDivider()

                // 优先级筛选
                Text(
                    text = "优先级",
                    style = MaterialTheme.typography.labelLarge
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedPriority == null,
                        onClick = { selectedPriority = null },
                        label = { Text("全部") }
                    )
                    RequirementPriority.entries.forEach { priority ->
                        FilterChip(
                            selected = selectedPriority == priority,
                            onClick = { selectedPriority = priority },
                            label = { Text(getPriorityText(priority)) }
                        )
                    }
                }

                HorizontalDivider()

                // 类别筛选
                Text(
                    text = "类别",
                    style = MaterialTheme.typography.labelLarge
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedCategory == null,
                        onClick = { selectedCategory = null },
                        label = { Text("全部") }
                    )
                    RequirementCategory.entries.take(3).forEach { category ->
                        FilterChip(
                            selected = selectedCategory == category,
                            onClick = { selectedCategory = category },
                            label = { Text(getCategoryText(category)) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onApplyFilters(selectedStatus, selectedPriority, selectedCategory)
                }
            ) {
                Text("应用")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

// Helper functions

private fun hasActiveFilters(filterState: RequirementFilterState): Boolean {
    return filterState.selectedStatus != null ||
            filterState.selectedPriority != null ||
            filterState.selectedCategory != null ||
            filterState.searchQuery.isNotEmpty()
}

private fun buildFilterDescription(filterState: RequirementFilterState): String {
    val parts = mutableListOf<String>()
    filterState.selectedStatus?.let { parts.add("状态: ${getStatusText(it)}") }
    filterState.selectedPriority?.let { parts.add("优先级: ${getPriorityText(it)}") }
    filterState.selectedCategory?.let { parts.add("类别: ${getCategoryText(it)}") }
    if (filterState.searchQuery.isNotEmpty()) {
        parts.add("搜索: ${filterState.searchQuery}")
    }
    return parts.joinToString(" · ")
}

private fun getStatusText(status: RequirementStatus): String = when (status) {
    RequirementStatus.DRAFT -> "草稿"
    RequirementStatus.PENDING -> "待评审"
    RequirementStatus.REVIEWING -> "评审中"
    RequirementStatus.APPROVED -> "已批准"
    RequirementStatus.REJECTED -> "已拒绝"
    RequirementStatus.ARCHIVED -> "已归档"
}

private fun getPriorityText(priority: RequirementPriority): String = when (priority) {
    RequirementPriority.LOW -> "低"
    RequirementPriority.MEDIUM -> "中"
    RequirementPriority.HIGH -> "高"
    RequirementPriority.URGENT -> "紧急"
}

private fun getCategoryText(category: RequirementCategory): String = when (category) {
    RequirementCategory.FEATURE -> "功能"
    RequirementCategory.BUG -> "缺陷"
    RequirementCategory.IMPROVEMENT -> "改进"
    RequirementCategory.DOCUMENTATION -> "文档"
    RequirementCategory.OTHER -> "其他"
}
