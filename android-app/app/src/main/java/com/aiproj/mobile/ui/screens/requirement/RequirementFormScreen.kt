package com.aiproj.mobile.ui.screens.requirement

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.*

/**
 * 需求创建/编辑表单屏幕
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequirementFormScreen(
    requirementId: Int?,
    onNavigateBack: () -> Unit,
    onSaveSuccess: () -> Unit,
    viewModel: RequirementFormViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val formState by viewModel.formState.collectAsState()

    // 编辑模式：加载需求数据
    LaunchedEffect(requirementId) {
        requirementId?.let {
            viewModel.loadRequirement(it)
        }
    }

    // 保存成功后返回
    LaunchedEffect(uiState.isSaved) {
        if (uiState.isSaved) {
            onSaveSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (requirementId == null) "创建需求" else "编辑需求") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            if (requirementId == null) {
                                viewModel.createRequirement()
                            } else {
                                viewModel.updateRequirement(requirementId)
                            }
                        },
                        enabled = !uiState.isSaving
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.Save, "保存")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 错误提示
            uiState.error?.let { error ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text(
                        text = error,
                        modifier = Modifier.padding(12.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }

            // 标题输入
            OutlinedTextField(
                value = formState.title,
                onValueChange = { viewModel.updateTitle(it) },
                label = { Text("需求标题 *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                supportingText = { Text("至少5个字符") }
            )

            // 描述输入
            OutlinedTextField(
                value = formState.description,
                onValueChange = { viewModel.updateDescription(it) },
                label = { Text("需求描述") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 4,
                maxLines = 8
            )

            // 优先级选择
            Text("优先级 *", style = MaterialTheme.typography.labelLarge)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                RequirementPriority.entries.forEach { priority ->
                    FilterChip(
                        selected = formState.priority == priority,
                        onClick = { viewModel.updatePriority(priority) },
                        label = { Text(getPriorityText(priority)) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // 类别选择
            Text("类别 *", style = MaterialTheme.typography.labelLarge)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                RequirementCategory.entries.take(3).forEach { category ->
                    FilterChip(
                        selected = formState.category == category,
                        onClick = { viewModel.updateCategory(category) },
                        label = { Text(getCategoryText(category)) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // 验收标准
            OutlinedTextField(
                value = formState.acceptanceCriteria,
                onValueChange = { viewModel.updateAcceptanceCriteria(it) },
                label = { Text("验收标准") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 6,
                supportingText = { Text("可选，描述需求完成的标准") }
            )

            // 保存按钮
            Button(
                onClick = {
                    if (requirementId == null) {
                        viewModel.createRequirement()
                    } else {
                        viewModel.updateRequirement(requirementId)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isSaving
            ) {
                if (uiState.isSaving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(if (requirementId == null) "创建需求" else "保存修改")
            }

            // 说明文本
            Text(
                text = "* 为必填项",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun getPriorityText(priority: RequirementPriority) = when (priority) {
    RequirementPriority.LOW -> "低"
    RequirementPriority.MEDIUM -> "中"
    RequirementPriority.HIGH -> "高"
    RequirementPriority.URGENT -> "紧急"
}

private fun getCategoryText(category: RequirementCategory) = when (category) {
    RequirementCategory.FEATURE -> "功能"
    RequirementCategory.BUG -> "缺陷"
    RequirementCategory.IMPROVEMENT -> "改进"
    RequirementCategory.DOCUMENTATION -> "文档"
    RequirementCategory.OTHER -> "其他"
}
