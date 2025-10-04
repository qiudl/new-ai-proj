package com.aiproj.mobile.ui.screens.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus

/**
 * 任务表单页面（创建/编辑）
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskFormScreen(
    onNavigateBack: () -> Unit,
    viewModel: TaskFormViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isEditMode) "编辑任务" else "创建任务") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                }
            )
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
        },
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("取消")
                    }

                    Button(
                        onClick = {
                            viewModel.saveTask {
                                onNavigateBack()
                            }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = !uiState.isSaving
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(if (viewModel.isEditMode) "保存" else "创建")
                    }
                }
            }
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            TaskFormContent(
                uiState = uiState,
                onTitleChanged = viewModel::onTitleChanged,
                onDescriptionChanged = viewModel::onDescriptionChanged,
                onStatusChanged = viewModel::onStatusChanged,
                onPriorityChanged = viewModel::onPriorityChanged,
                onProjectIdChanged = viewModel::onProjectIdChanged,
                onDueDateChanged = viewModel::onDueDateChanged,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            )
        }
    }
}

/**
 * 任务表单内容
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskFormContent(
    uiState: TaskFormUiState,
    onTitleChanged: (String) -> Unit,
    onDescriptionChanged: (String) -> Unit,
    onStatusChanged: (TaskStatus) -> Unit,
    onPriorityChanged: (TaskPriority?) -> Unit,
    onProjectIdChanged: (String) -> Unit,
    onDueDateChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 标题
        OutlinedTextField(
            value = uiState.title,
            onValueChange = onTitleChanged,
            label = { Text("任务标题 *") },
            placeholder = { Text("输入任务标题...") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            isError = uiState.title.isBlank() && uiState.error != null
        )

        // 描述
        OutlinedTextField(
            value = uiState.description,
            onValueChange = onDescriptionChanged,
            label = { Text("任务描述") },
            placeholder = { Text("输入任务描述...") },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            maxLines = 5
        )

        // 状态选择
        var statusExpanded by remember { mutableStateOf(false) }
        ExposedDropdownMenuBox(
            expanded = statusExpanded,
            onExpandedChange = { statusExpanded = it }
        ) {
            OutlinedTextField(
                value = getStatusLabel(uiState.status),
                onValueChange = {},
                readOnly = true,
                label = { Text("状态") },
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = statusExpanded)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor()
            )

            ExposedDropdownMenu(
                expanded = statusExpanded,
                onDismissRequest = { statusExpanded = false }
            ) {
                TaskStatus.values().forEach { status ->
                    DropdownMenuItem(
                        text = { Text(getStatusLabel(status)) },
                        onClick = {
                            onStatusChanged(status)
                            statusExpanded = false
                        }
                    )
                }
            }
        }

        // 优先级选择
        var priorityExpanded by remember { mutableStateOf(false) }
        ExposedDropdownMenuBox(
            expanded = priorityExpanded,
            onExpandedChange = { priorityExpanded = it }
        ) {
            OutlinedTextField(
                value = uiState.priority?.let { getPriorityLabel(it) } ?: "无",
                onValueChange = {},
                readOnly = true,
                label = { Text("优先级") },
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = priorityExpanded)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor()
            )

            ExposedDropdownMenu(
                expanded = priorityExpanded,
                onDismissRequest = { priorityExpanded = false }
            ) {
                DropdownMenuItem(
                    text = { Text("无") },
                    onClick = {
                        onPriorityChanged(null)
                        priorityExpanded = false
                    }
                )
                TaskPriority.values().forEach { priority ->
                    DropdownMenuItem(
                        text = { Text(getPriorityLabel(priority)) },
                        onClick = {
                            onPriorityChanged(priority)
                            priorityExpanded = false
                        }
                    )
                }
            }
        }

        // 项目ID
        OutlinedTextField(
            value = uiState.projectId,
            onValueChange = onProjectIdChanged,
            label = { Text("项目ID（可选）") },
            placeholder = { Text("输入项目ID...") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        // 截止日期
        OutlinedTextField(
            value = uiState.dueDate,
            onValueChange = onDueDateChanged,
            label = { Text("截止日期（可选）") },
            placeholder = { Text("YYYY-MM-DD") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            leadingIcon = {
                Icon(Icons.Default.CalendarToday, contentDescription = null)
            }
        )

        // 提示信息
        Text(
            text = "* 必填项",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
