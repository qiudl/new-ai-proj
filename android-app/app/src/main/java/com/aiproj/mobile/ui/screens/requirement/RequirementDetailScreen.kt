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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.ui.components.requirement.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * 需求详情屏幕
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequirementDetailScreen(
    requirementId: Int,
    onNavigateBack: () -> Unit,
    onEditClick: (Int) -> Unit,
    viewModel: RequirementDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val requirement by viewModel.requirement.collectAsState()

    LaunchedEffect(requirementId) {
        viewModel.loadRequirement(requirementId)
    }

    // 删除成功后返回
    LaunchedEffect(uiState.isDeleted) {
        if (uiState.isDeleted) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("需求详情") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
                    }
                },
                actions = {
                    if (requirement != null) {
                        IconButton(onClick = { onEditClick(requirementId) }) {
                            Icon(Icons.Default.Edit, "编辑")
                        }
                        IconButton(onClick = { viewModel.showDeleteDialog() }) {
                            Icon(Icons.Default.Delete, "删除")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center).padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(Icons.Default.Error, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.error)
                        Text(uiState.error!!, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                        Button(onClick = { viewModel.loadRequirement(requirementId) }) {
                            Text("重试")
                        }
                    }
                }
                requirement != null -> {
                    RequirementDetailContent(
                        requirement = requirement!!,
                        uiState = uiState,
                        onSubmit = { viewModel.submitRequirement() }
                    )
                }
            }
        }

        // 删除确认对话框
        if (uiState.showDeleteDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.hideDeleteDialog() },
                title = { Text("确认删除") },
                text = { Text("确定要删除这个需求吗？此操作无法撤销。") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.hideDeleteDialog()
                            viewModel.deleteRequirement()
                        },
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Text("删除")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.hideDeleteDialog() }) {
                        Text("取消")
                    }
                }
            )
        }
    }
}

@Composable
private fun RequirementDetailContent(
    requirement: Requirement,
    uiState: RequirementDetailUiState,
    onSubmit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 标题和状态
        Card {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(requirement.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RequirementStatusBadge(requirement.status)
                    RequirementPriorityBadge(requirement.priority)
                }
            }
        }

        // 基本信息
        Card {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("基本信息", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                HorizontalDivider()
                InfoRow("类别", getCategoryText(requirement.category))
                InfoRow("项目ID", "#${requirement.projectId}")
                InfoRow("提交者", requirement.submitterName ?: "未知")
                requirement.reviewerName?.let { InfoRow("评审人", it) }
                requirement.complexityRating?.let { InfoRow("复杂度", getComplexityText(it)) }
                requirement.businessValue?.let { InfoRow("业务价值", "$it/10") }
            }
        }

        // 描述
        if (!requirement.description.isNullOrBlank()) {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("需求描述", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    HorizontalDivider()
                    Text(requirement.description)
                }
            }
        }

        // 验收标准
        if (!requirement.acceptanceCriteria.isNullOrBlank()) {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("验收标准", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    HorizontalDivider()
                    Text(requirement.acceptanceCriteria)
                }
            }
        }

        // 评审意见
        if (!requirement.reviewComment.isNullOrBlank()) {
            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("评审意见", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    HorizontalDivider()
                    Text(requirement.reviewComment)
                }
            }
        }

        // 统计信息
        Card {
            Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                StatItem("关联任务", requirement.relatedTasksCount.toString(), Icons.Default.Link)
                StatItem("评论", requirement.commentsCount.toString(), Icons.Default.Comment)
            }
        }

        // 时间信息
        Card {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("时间信息", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                HorizontalDivider()
                requirement.createdAt?.let { InfoRow("创建时间", formatDate(it)) }
                requirement.submittedAt?.let { InfoRow("提交时间", formatDate(it)) }
                requirement.reviewedAt?.let { InfoRow("评审时间", formatDate(it)) }
                requirement.updatedAt?.let { InfoRow("更新时间", formatDate(it)) }
            }
        }

        // 提交按钮
        if (requirement.status == RequirementStatus.DRAFT) {
            Button(
                onClick = onSubmit,
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isSubmitting
            ) {
                if (uiState.isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("提交评审")
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun StatItem(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(4.dp))
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun getCategoryText(category: RequirementCategory?) = when (category) {
    RequirementCategory.FEATURE -> "功能"
    RequirementCategory.BUG -> "缺陷"
    RequirementCategory.IMPROVEMENT -> "改进"
    RequirementCategory.DOCUMENTATION -> "文档"
    RequirementCategory.OTHER -> "其他"
    null -> "未分类"
}

private fun getComplexityText(complexity: ComplexityRating) = when (complexity) {
    ComplexityRating.SIMPLE -> "简单"
    ComplexityRating.MEDIUM -> "中等"
    ComplexityRating.COMPLEX -> "复杂"
    ComplexityRating.VERY_COMPLEX -> "非常复杂"
}

private fun formatDate(date: Date): String {
    return SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(date)
}
