package com.aiproj.mobile.ui.screens.requirement

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.RequirementCategory
import com.aiproj.mobile.data.models.RequirementPriority

/**
 * 需求表单页面
 *
 * 用于创建或编辑需求
 *
 * @param requirementId 需求 ID（编辑模式），null 表示创建模式
 * @param projectId 项目 ID（创建模式必需）
 * @param onNavigateBack 返回回调
 * @param viewModel ViewModel
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequirementFormScreen(
    requirementId: Int? = null,
    projectId: Int = 0,
    onNavigateBack: () -> Unit,
    viewModel: RequirementFormViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isEditMode) "编辑需求" else "创建需求") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            RequirementFormContent(
                title = uiState.title,
                description = uiState.description,
                priority = uiState.priority,
                category = uiState.category,
                acceptanceCriteria = uiState.acceptanceCriteria,
                onTitleChange = viewModel::updateTitle,
                onDescriptionChange = viewModel::updateDescription,
                onPriorityChange = viewModel::updatePriority,
                onCategoryChange = viewModel::updateCategory,
                onAcceptanceCriteriaChange = viewModel::updateAcceptanceCriteria,
                onSave = {
                    viewModel.saveRequirement(onSuccess = onNavigateBack)
                },
                isSaving = uiState.isSaving,
                modifier = Modifier.padding(paddingValues)
            )
        }
    }
}

/**
 * 需求表单内容
 */
@Composable
private fun RequirementFormContent(
    title: String,
    description: String,
    priority: RequirementPriority,
    category: RequirementCategory,
    acceptanceCriteria: String,
    onTitleChange: (String) -> Unit,
    onDescriptionChange: (String) -> Unit,
    onPriorityChange: (RequirementPriority) -> Unit,
    onCategoryChange: (RequirementCategory) -> Unit,
    onAcceptanceCriteriaChange: (String) -> Unit,
    onSave: () -> Unit,
    isSaving: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 标题（必填）
        OutlinedTextField(
            value = title,
            onValueChange = onTitleChange,
            label = { Text("需求标题 *") },
            placeholder = { Text("请输入需求标题") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            isError = title.isBlank()
        )

        // 描述
        OutlinedTextField(
            value = description,
            onValueChange = onDescriptionChange,
            label = { Text("需求描述") },
            placeholder = { Text("请输入需求的详细描述") },
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp),
            maxLines = 6
        )

        // 优先级选择
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = "优先级",
                style = MaterialTheme.typography.labelLarge
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                RequirementPriority.entries.forEach { priorityOption ->
                    FilterChip(
                        selected = priority == priorityOption,
                        onClick = { onPriorityChange(priorityOption) },
                        label = {
                            Text(getPriorityLabel(priorityOption))
                        }
                    )
                }
            }
        }

        // 类别选择
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = "需求类别",
                style = MaterialTheme.typography.labelLarge
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                RequirementCategory.entries.forEach { categoryOption ->
                    FilterChip(
                        selected = category == categoryOption,
                        onClick = { onCategoryChange(categoryOption) },
                        label = {
                            Text(getCategoryLabel(categoryOption))
                        }
                    )
                }
            }
        }

        // 验收标准
        OutlinedTextField(
            value = acceptanceCriteria,
            onValueChange = onAcceptanceCriteriaChange,
            label = { Text("验收标准") },
            placeholder = { Text("请输入验收标准（可选）") },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            maxLines = 5
        )

        Spacer(modifier = Modifier.height(8.dp))

        // 保存按钮
        Button(
            onClick = onSave,
            modifier = Modifier.fillMaxWidth(),
            enabled = !isSaving && title.isNotBlank()
        ) {
            if (isSaving) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(if (isSaving) "保存中..." else "保存")
        }
    }
}

/**
 * 获取优先级标签
 */
private fun getPriorityLabel(priority: RequirementPriority): String {
    return when (priority) {
        RequirementPriority.LOW -> "低"
        RequirementPriority.MEDIUM -> "中"
        RequirementPriority.HIGH -> "高"
        RequirementPriority.URGENT -> "紧急"
    }
}

/**
 * 获取类别标签
 */
private fun getCategoryLabel(category: RequirementCategory): String {
    return when (category) {
        RequirementCategory.FEATURE -> "功能"
        RequirementCategory.BUG -> "缺陷"
        RequirementCategory.IMPROVEMENT -> "改进"
        RequirementCategory.DOCUMENTATION -> "文档"
        RequirementCategory.OTHER -> "其他"
    }
}
