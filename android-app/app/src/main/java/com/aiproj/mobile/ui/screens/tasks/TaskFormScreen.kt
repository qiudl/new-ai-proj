package com.aiproj.mobile.ui.screens.tasks

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
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
    val projects by viewModel.projects.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // 显示错误消息
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Long,
                actionLabel = "关闭"
            )
            viewModel.clearError()
        }
    }

    // 显示成功消息并返回
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { message ->
            snackbarHostState.showSnackbar(
                message = message,
                duration = SnackbarDuration.Short
            )
            kotlinx.coroutines.delay(500)
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isEditMode) "编辑任务" else "创建任务") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading) {
                // 加载状态
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator()
                        Text(
                            text = "加载中...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                TaskFormContent(
                    uiState = uiState,
                    projects = projects,
                    onTitleChanged = viewModel::onTitleChanged,
                    onDescriptionChanged = viewModel::onDescriptionChanged,
                    onStatusChanged = viewModel::onStatusChanged,
                    onPriorityChanged = viewModel::onPriorityChanged,
                    onProjectIdChanged = viewModel::onProjectIdChanged,
                    onDueDateChanged = viewModel::onDueDateChanged,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // 保存中遮罩层
            if (uiState.isSaving) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            MaterialTheme.colorScheme.surface.copy(alpha = 0.7f)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator()
                        Text(
                            text = if (viewModel.isEditMode) "保存中..." else "创建中...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
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
    projects: List<com.aiproj.mobile.data.models.Project>,
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

        // 项目选择器
        var projectExpanded by remember { mutableStateOf(false) }
        val selectedProject = projects.find { it.id.toString() == uiState.projectId }

        ExposedDropdownMenuBox(
            expanded = projectExpanded,
            onExpandedChange = { projectExpanded = it }
        ) {
            OutlinedTextField(
                value = selectedProject?.name ?: if (uiState.projectId.isBlank()) "请选择项目" else "项目 #${uiState.projectId}",
                onValueChange = {},
                readOnly = true,
                label = { Text("所属项目 *") },
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = projectExpanded)
                },
                isError = uiState.projectIdError != null,
                supportingText = {
                    if (uiState.projectIdError != null) {
                        Text(
                            text = uiState.projectIdError!!,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor()
            )

            ExposedDropdownMenu(
                expanded = projectExpanded,
                onDismissRequest = { projectExpanded = false }
            ) {
                if (projects.isEmpty()) {
                    DropdownMenuItem(
                        text = { Text("暂无项目") },
                        onClick = { },
                        enabled = false
                    )
                } else {
                    projects.forEach { project ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(project.name)
                                    project.description?.let {
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 1
                                        )
                                    }
                                }
                            },
                            onClick = {
                                onProjectIdChanged(project.id.toString())
                                projectExpanded = false
                            },
                            leadingIcon = {
                                Icon(
                                    imageVector = if (project.id.toString() == uiState.projectId) {
                                        Icons.Default.CheckCircle
                                    } else {
                                        Icons.Default.Circle
                                    },
                                    contentDescription = null,
                                    tint = if (project.id.toString() == uiState.projectId) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    }
                                )
                            }
                        )
                    }
                }
            }
        }

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
