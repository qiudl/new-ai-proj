package com.aiproj.mobile.ui.screens.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus

/**
 * 任务编辑/创建页面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskEditScreen(
    taskId: Int? = null,
    initialProjectId: Int? = null,
    onNavigateBack: () -> Unit,
    viewModel: TaskEditViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val projects by viewModel.projects.collectAsState()
    val projectsLoading by viewModel.projectsLoading.collectAsState()

    LaunchedEffect(taskId, initialProjectId) {
        if (taskId != null) {
            // 编辑模式：加载现有任务
            viewModel.loadTask(taskId)
        } else if (initialProjectId != null) {
            // 创建模式：设置初始项目ID
            viewModel.setInitialProjectId(initialProjectId)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (taskId == null) "创建任务" else "编辑任务") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            viewModel.saveTask {
                                onNavigateBack()
                            }
                        },
                        enabled = !uiState.isSaving
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(Icons.Default.Check, contentDescription = "保存")
                        }
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
            // 标题
            OutlinedTextField(
                value = uiState.title,
                onValueChange = { viewModel.updateTitle(it) },
                label = { Text("任务标题 *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = uiState.titleError != null,
                supportingText = uiState.titleError?.let { { Text(it) } }
            )

            // 描述
            OutlinedTextField(
                value = uiState.description,
                onValueChange = { viewModel.updateDescription(it) },
                label = { Text("任务描述") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp),
                maxLines = 6
            )

            // 状态选择
            ExposedDropdownMenuBox(
                expanded = uiState.showStatusDropdown,
                onExpandedChange = { viewModel.toggleStatusDropdown() }
            ) {
                OutlinedTextField(
                    value = uiState.status.toString(),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("状态") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = uiState.showStatusDropdown) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = uiState.showStatusDropdown,
                    onDismissRequest = { viewModel.toggleStatusDropdown() }
                ) {
                    TaskStatus.entries.forEach { status ->
                        DropdownMenuItem(
                            text = { Text(status.toString()) },
                            onClick = {
                                viewModel.updateStatus(status)
                                viewModel.toggleStatusDropdown()
                            }
                        )
                    }
                }
            }

            // 优先级选择
            ExposedDropdownMenuBox(
                expanded = uiState.showPriorityDropdown,
                onExpandedChange = { viewModel.togglePriorityDropdown() }
            ) {
                OutlinedTextField(
                    value = uiState.priority?.toString() ?: "未设置",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("优先级") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = uiState.showPriorityDropdown) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = uiState.showPriorityDropdown,
                    onDismissRequest = { viewModel.togglePriorityDropdown() }
                ) {
                    listOf(null, *TaskPriority.entries.toTypedArray()).forEach { priority ->
                        DropdownMenuItem(
                            text = { Text(priority?.toString() ?: "未设置") },
                            onClick = {
                                viewModel.updatePriority(priority)
                                viewModel.togglePriorityDropdown()
                            }
                        )
                    }
                }
            }

            // 项目选择
            ExposedDropdownMenuBox(
                expanded = uiState.showProjectDropdown,
                onExpandedChange = { viewModel.toggleProjectDropdown() }
            ) {
                OutlinedTextField(
                    value = if (projectsLoading) {
                        "加载中..."
                    } else {
                        projects.find { it.id == uiState.projectId }?.name ?: "选择项目 *"
                    },
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("项目 *") },
                    trailingIcon = {
                        if (projectsLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = uiState.showProjectDropdown)
                        }
                    },
                    isError = uiState.projectId == null,
                    supportingText = if (uiState.projectId == null) {
                        { Text("请选择项目") }
                    } else null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = uiState.showProjectDropdown,
                    onDismissRequest = { viewModel.toggleProjectDropdown() }
                ) {
                    if (projects.isEmpty() && !projectsLoading) {
                        DropdownMenuItem(
                            text = { Text("暂无可用项目") },
                            onClick = {}
                        )
                    } else {
                        projects.forEach { project ->
                            DropdownMenuItem(
                                text = { Text(project.name) },
                                onClick = {
                                    viewModel.updateProjectId(project.id)
                                    viewModel.toggleProjectDropdown()
                                }
                            )
                        }
                    }
                }
            }

            // 截止日期
            OutlinedTextField(
                value = uiState.dueDate ?: "",
                onValueChange = { viewModel.updateDueDate(it) },
                label = { Text("截止日期") },
                placeholder = { Text("YYYY-MM-DD") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // 保存按钮
            Button(
                onClick = {
                    viewModel.saveTask {
                        onNavigateBack()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isSaving
            ) {
                if (uiState.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(if (taskId == null) "创建任务" else "保存修改")
            }
        }
    }
}
