package com.aiproj.mobile.ui.document.version

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.ui.document.version.components.DiffDisplay
import com.aiproj.mobile.ui.document.version.components.DiffStatsCard

/**
 * 版本对比屏幕
 *
 * 显示两个版本之间的差异对比
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VersionComparisonScreen(
    projectId: Long,
    taskId: Long,
    documentId: Long,
    version1Number: Int,
    version2Number: Int,
    onNavigateBack: () -> Unit,
    viewModel: VersionComparisonViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showModeMenu by remember { mutableStateOf(false) }

    // 初始化
    LaunchedEffect(projectId, taskId, documentId, version1Number, version2Number) {
        viewModel.initialize(projectId, taskId, documentId, version1Number, version2Number)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "版本对比",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "版本 $version1Number ← → 版本 $version2Number",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    // 显示模式切换
                    Box {
                        IconButton(onClick = { showModeMenu = true }) {
                            Icon(
                                when (uiState.displayMode) {
                                    DiffDisplayMode.SIDE_BY_SIDE -> Icons.Default.ViewColumn
                                    DiffDisplayMode.UNIFIED -> Icons.Default.ViewAgenda
                                    DiffDisplayMode.CHANGES_ONLY -> Icons.Default.FilterList
                                },
                                contentDescription = "显示模式"
                            )
                        }

                        DropdownMenu(
                            expanded = showModeMenu,
                            onDismissRequest = { showModeMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("并排对比") },
                                onClick = {
                                    viewModel.setDisplayMode(DiffDisplayMode.SIDE_BY_SIDE)
                                    showModeMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.ViewColumn, null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("统一视图") },
                                onClick = {
                                    viewModel.setDisplayMode(DiffDisplayMode.UNIFIED)
                                    showModeMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.ViewAgenda, null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("仅显示变更") },
                                onClick = {
                                    viewModel.setDisplayMode(DiffDisplayMode.CHANGES_ONLY)
                                    showModeMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.FilterList, null)
                                }
                            )
                        }
                    }
                }
            )
        },
        snackbarHost = {
            // 错误提示
            uiState.error?.let { error ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("关闭")
                        }
                    }
                ) {
                    Text(error)
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                // 加载中
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                // 错误状态
                uiState.shouldShowError -> {
                    ErrorState(
                        error = uiState.error ?: "加载失败",
                        onRetry = { viewModel.retry(version1Number, version2Number) },
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // 空状态（没有差异）
                uiState.shouldShowEmptyState -> {
                    EmptyState(
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // 内容展示
                uiState.shouldShowContent -> {
                    Column(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        // 版本信息卡片
                        VersionInfoCard(
                            version1 = uiState.version1!!,
                            version2 = uiState.version2!!,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        )

                        // 统计信息卡片
                        DiffStatsCard(
                            additions = uiState.additions,
                            deletions = uiState.deletions,
                            modifications = uiState.modifications,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        )

                        // 差异展示
                        DiffDisplay(
                            changes = uiState.changes,
                            displayMode = uiState.displayMode,
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 版本信息卡片
 */
@Composable
private fun VersionInfoCard(
    version1: com.aiproj.mobile.data.models.DocumentVersionDto,
    version2: com.aiproj.mobile.data.models.DocumentVersionDto,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // 版本1（旧版本）
            VersionInfoColumn(
                label = "版本 ${version1.versionNumber}（旧）",
                title = version1.title ?: "",
                createdAt = version1.createdAt ?: "",
                creatorName = version1.creatorName ?: "用户${version1.createdBy ?: 0}",
                modifier = Modifier.weight(1f)
            )

            // 箭头
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.CenterVertically)
                    .padding(horizontal = 8.dp),
                tint = MaterialTheme.colorScheme.primary
            )

            // 版本2（新版本）
            VersionInfoColumn(
                label = "版本 ${version2.versionNumber}（新）",
                title = version2.title ?: "",
                createdAt = version2.createdAt ?: "",
                creatorName = version2.creatorName ?: "用户${version2.createdBy ?: 0}",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

/**
 * 版本信息列
 */
@Composable
private fun VersionInfoColumn(
    label: String,
    title: String,
    createdAt: String,
    creatorName: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = title,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 2
        )
        Text(
            text = creatorName,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = formatTime(createdAt),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
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
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "没有差异",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "这两个版本的内容完全相同",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
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

/**
 * 格式化时间显示
 */
private fun formatTime(timeString: String): String {
    return try {
        timeString.substring(0, 16).replace("T", " ")
    } catch (e: Exception) {
        timeString
    }
}
