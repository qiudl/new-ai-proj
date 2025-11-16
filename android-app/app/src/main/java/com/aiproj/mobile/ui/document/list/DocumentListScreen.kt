package com.aiproj.mobile.ui.document.list

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.zIndex
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.Document
import kotlinx.coroutines.launch

/**
 * 文档列表界面
 */
@OptIn(ExperimentalMaterial3Api::class, androidx.compose.material.ExperimentalMaterialApi::class)
@Composable
fun DocumentListScreen(
    @Suppress("UNUSED_PARAMETER") taskId: Int,
    onNavigateBack: () -> Unit,
    onDocumentClick: (Int) -> Unit,
    onCreateDocument: () -> Unit,
    onNavigateToSearch: () -> Unit = {},
    viewModel: DocumentListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showFilterSheet by remember { mutableStateOf(false) }
    var showSortMenu by remember { mutableStateOf(false) }

    // 显示错误提示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Short
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("任务文档") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
                    }
                },
                actions = {
                    // 搜索按钮
                    IconButton(onClick = onNavigateToSearch) {
                        Icon(Icons.Default.Search, "搜索")
                    }

                    // 过滤按钮
                    IconButton(onClick = { showFilterSheet = true }) {
                        Icon(Icons.Default.FilterList, "过滤")
                    }

                    // 排序菜单
                    Box {
                        IconButton(onClick = { showSortMenu = true }) {
                            Icon(Icons.AutoMirrored.Filled.Sort, "排序")
                        }

                        DropdownMenu(
                            expanded = showSortMenu,
                            onDismissRequest = { showSortMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("最近更新") },
                                onClick = {
                                    viewModel.updateSortBy(SortBy.UPDATED_DESC)
                                    showSortMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("最早更新") },
                                onClick = {
                                    viewModel.updateSortBy(SortBy.UPDATED_ASC)
                                    showSortMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("标题 A-Z") },
                                onClick = {
                                    viewModel.updateSortBy(SortBy.TITLE_ASC)
                                    showSortMenu = false
                                }
                            )
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateDocument,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, "创建文档")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        val pullRefreshState = rememberPullRefreshState(
            refreshing = uiState.isLoading,
            onRefresh = { viewModel.refreshDocuments() }
        )
        Box(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
                .pullRefresh(pullRefreshState)
        ) {
            PullRefreshIndicator(
                refreshing = uiState.isLoading,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter).zIndex(1f)
            )
            when {
                uiState.isLoading && uiState.documents.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }

                uiState.filteredDocuments.isEmpty() && uiState.documents.isNotEmpty() -> {
                    EmptyDocumentList(
                        message = "没有符合条件的文档",
                        showAction = false
                    )
                }

                uiState.filteredDocuments.isEmpty() -> {
                    EmptyDocumentList(
                        message = "还没有文档，点击右下角按钮创建",
                        onCreateClick = onCreateDocument
                    )
                }

                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 搜索栏
                        item {
                            DocumentSearchBar(
                                query = uiState.searchQuery,
                                onQueryChange = { viewModel.updateSearchQuery(it) }
                            )
                        }

                        // 文档列表
                        items(
                            items = uiState.filteredDocuments,
                            key = { it.id }
                        ) { document ->
                            DocumentListItem(
                                document = document,
                                onClick = { onDocumentClick(document.id) }
                            )
                        }
                    }
                }
            }
        }
    }

    // 过滤器底部表单
    if (showFilterSheet) {
        ModalBottomSheet(
            onDismissRequest = { showFilterSheet = false }
        ) {
            DocumentFilterSheet(
                currentStatus = uiState.statusFilter,
                currentType = uiState.typeFilter,
                onStatusChange = { viewModel.updateStatusFilter(it) },
                onTypeChange = { viewModel.updateTypeFilter(it) },
                onReset = {
                    viewModel.updateStatusFilter(null)
                    viewModel.updateTypeFilter(null)
                },
                onClose = { showFilterSheet = false }
            )
        }
    }
}

/**
 * 文档搜索栏
 */
@Composable
private fun DocumentSearchBar(
    query: String,
    onQueryChange: (String) -> Unit
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("搜索文档标题或内容...") },
        leadingIcon = {
            Icon(Icons.Default.Search, "搜索")
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Clear, "清除")
                }
            }
        },
        singleLine = true
    )
}

/**
 * 文档列表项
 */
@Composable
private fun DocumentListItem(
    document: Document,
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
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 标题
            Text(
                text = document.title,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            // 内容预览
            Text(
                text = document.content,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 元信息
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // 状态标签
                    AssistChip(
                        onClick = {},
                        label = {
                            Text(
                                text = when (document.status ?: "draft") {
                                    "draft" -> "草稿"
                                    "published" -> "已发布"
                                    "archived" -> "已归档"
                                    else -> document.status ?: "草稿"
                                },
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    )

                    // 类型标签
                    AssistChip(
                        onClick = {},
                        label = {
                            Text(
                                text = (document.type ?: "markdown").uppercase(),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    )
                }

                // 更新时间
                Text(
                    text = formatTime(document.updatedAt ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 过滤器表单
 */
@Composable
private fun DocumentFilterSheet(
    currentStatus: String?,
    currentType: String?,
    onStatusChange: (String?) -> Unit,
    onTypeChange: (String?) -> Unit,
    onReset: () -> Unit,
    onClose: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "筛选条件",
            style = MaterialTheme.typography.titleLarge
        )

        // 状态过滤
        Text("文档状态", style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = currentStatus == "draft",
                onClick = {
                    onStatusChange(if (currentStatus == "draft") null else "draft")
                },
                label = { Text("草稿") }
            )
            FilterChip(
                selected = currentStatus == "published",
                onClick = {
                    onStatusChange(if (currentStatus == "published") null else "published")
                },
                label = { Text("已发布") }
            )
            FilterChip(
                selected = currentStatus == "archived",
                onClick = {
                    onStatusChange(if (currentStatus == "archived") null else "archived")
                },
                label = { Text("已归档") }
            )
        }

        // 类型过滤
        Text("文档类型", style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = currentType == "markdown",
                onClick = {
                    onTypeChange(if (currentType == "markdown") null else "markdown")
                },
                label = { Text("Markdown") }
            )
            FilterChip(
                selected = currentType == "txt",
                onClick = {
                    onTypeChange(if (currentType == "txt") null else "txt")
                },
                label = { Text("文本") }
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 操作按钮
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = {
                    onReset()
                    onClose()
                },
                modifier = Modifier.weight(1f)
            ) {
                Text("重置")
            }

            Button(
                onClick = onClose,
                modifier = Modifier.weight(1f)
            ) {
                Text("确定")
            }
        }
    }
}

/**
 * 空文档列表占位
 */
@Composable
private fun EmptyDocumentList(
    message: String,
    showAction: Boolean = true,
    onCreateClick: () -> Unit = {}
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
                imageVector = Icons.Default.Description,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (showAction) {
                Button(onClick = onCreateClick) {
                    Icon(Icons.Default.Add, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("创建文档")
                }
            }
        }
    }
}

/**
 * 格式化时间显示
 */
private fun formatTime(timeString: String): String {
    // 简化版本，实际应该使用日期格式化库
    return try {
        timeString.substring(0, 10)
    } catch (e: Exception) {
        timeString
    }
}
