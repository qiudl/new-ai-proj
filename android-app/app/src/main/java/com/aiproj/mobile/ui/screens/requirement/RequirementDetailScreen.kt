package com.aiproj.mobile.ui.screens.requirement

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.RequirementStatus
import com.aiproj.mobile.ui.components.requirement.RequirementPriorityBadge
import com.aiproj.mobile.ui.components.requirement.RequirementStatusBadge
import java.text.SimpleDateFormat
import java.util.*

/**
 * 需求详情页面
 *
 * 显示需求的完整信息，包括基本信息、描述、评审信息等
 *
 * @param requirementId 需求 ID
 * @param onNavigateBack 返回回调
 * @param onEdit 编辑回调
 * @param viewModel ViewModel
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequirementDetailScreen(
    requirementId: Int,
    onNavigateBack: () -> Unit,
    onEdit: (Int) -> Unit,
    viewModel: RequirementDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDeleteDialog by remember { mutableStateOf(false) }

    // 显示错误提示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Short
            )
            viewModel.clearError()
        }
    }

    // 显示成功提示
    LaunchedEffect(uiState.showSuccessMessage) {
        uiState.showSuccessMessage?.let { message ->
            snackbarHostState.showSnackbar(
                message = message,
                duration = SnackbarDuration.Short
            )
            viewModel.clearSuccessMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("需求详情") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    // 只有草稿状态才能编辑和删除
                    if (uiState.requirement?.status == RequirementStatus.DRAFT) {
                        IconButton(onClick = { onEdit(requirementId) }) {
                            Icon(Icons.Default.Edit, contentDescription = "编辑")
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "删除")
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.requirement != null -> {
                RequirementDetailContent(
                    requirement = uiState.requirement!!,
                    onSubmit = { viewModel.submitRequirement() },
                    isSubmitting = uiState.isSubmitting,
                    modifier = Modifier.padding(paddingValues)
                )
            }
            else -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Text("需求不存在")
                }
            }
        }
    }

    // 删除确认对话框
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("确认删除") },
            text = { Text("确定要删除这个需求吗？此操作无法撤销。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deleteRequirement(onSuccess = onNavigateBack)
                    }
                ) {
                    Text("删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}

/**
 * 需求详情内容
 */
@Composable
private fun RequirementDetailContent(
    requirement: com.aiproj.mobile.data.models.Requirement,
    onSubmit: () -> Unit,
    isSubmitting: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 标题
        Text(
            text = requirement.title,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )

        // 状态和优先级
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            RequirementStatusBadge(status = requirement.status)
            RequirementPriorityBadge(priority = requirement.priority)
        }

        Divider()

        // 描述
        if (!requirement.description.isNullOrBlank()) {
            DetailSection(title = "需求描述") {
                Text(
                    text = requirement.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // 验收标准
        if (!requirement.acceptanceCriteria.isNullOrBlank()) {
            DetailSection(title = "验收标准") {
                Text(
                    text = requirement.acceptanceCriteria,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // 业务价值和技术风险
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            requirement.businessValue?.let { value ->
                DetailSection(
                    title = "业务价值",
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = value.toString(),
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            requirement.complexityRating?.let { rating ->
                DetailSection(
                    title = "复杂度",
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = when (rating) {
                            com.aiproj.mobile.data.models.ComplexityRating.SIMPLE -> "简单"
                            com.aiproj.mobile.data.models.ComplexityRating.MEDIUM -> "中等"
                            com.aiproj.mobile.data.models.ComplexityRating.COMPLEX -> "复杂"
                            com.aiproj.mobile.data.models.ComplexityRating.VERY_COMPLEX -> "非常复杂"
                        },
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
        }

        // 技术风险
        if (!requirement.technicalRisk.isNullOrBlank()) {
            DetailSection(title = "技术风险") {
                Text(
                    text = requirement.technicalRisk,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Divider()

        // 提交人信息
        DetailSection(title = "提交信息") {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                requirement.submitterName?.let { name ->
                    Text(
                        text = "提交人：$name",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                requirement.createdAt?.let { date ->
                    Text(
                        text = "创建时间：${formatDateTime(date)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                requirement.submittedAt?.let { date ->
                    Text(
                        text = "提交时间：${formatDateTime(date)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // 评审信息（如果有）
        if (requirement.reviewerName != null || requirement.reviewComment != null) {
            DetailSection(title = "评审信息") {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    requirement.reviewerName?.let { name ->
                        Text(
                            text = "评审人：$name",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    requirement.reviewedAt?.let { date ->
                        Text(
                            text = "评审时间：${formatDateTime(date)}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    requirement.reviewComment?.let { comment ->
                        Text(
                            text = "评审意见：$comment",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }

        // 统计信息
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            StatItem(
                label = "关联任务",
                value = requirement.relatedTasksCount.toString(),
                modifier = Modifier.weight(1f)
            )
            StatItem(
                label = "评论",
                value = requirement.commentsCount.toString(),
                modifier = Modifier.weight(1f)
            )
        }

        // 提交评审按钮（仅草稿状态）
        if (requirement.status == RequirementStatus.DRAFT) {
            Button(
                onClick = onSubmit,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("提交评审")
                }
            }
        }
    }
}

/**
 * 详情区块组件
 */
@Composable
private fun DetailSection(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary
        )
        content()
    }
}

/**
 * 统计项组件
 */
@Composable
private fun StatItem(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 格式化日期时间
 */
private fun formatDateTime(date: Date): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.CHINA)
    return sdf.format(date)
}
