package com.aiproj.mobile.ui.screens.timer

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.service.TimerForegroundService

/**
 * 统一计时器界面
 * 支持启动/暂停/恢复/停止计时器
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimerScreen(
    viewModel: TimerViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showSuggestions by remember { mutableStateOf(false) }

    // 监听状态变化，自动启动/停止前台服务
    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is TimerUiState.Active -> {
                if (!state.isPaused) {
                    // 启动前台服务
                    startTimerService(context, state.timer.taskId, state.timer.description)
                }
            }
            is TimerUiState.Idle -> {
                // 停止前台服务
                stopTimerService(context)
            }
            else -> Unit
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("工作计时") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "返回")
                    }
                },
                actions = {
                    // Suggestions button
                    IconButton(onClick = { showSuggestions = true }) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "智能建议",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (val state = uiState) {
                is TimerUiState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                is TimerUiState.Active -> {
                    ActiveTimerContent(
                        state = state,
                        onPause = viewModel::pauseTimer,
                        onResume = viewModel::resumeTimer,
                        onStop = viewModel::stopTimer
                    )
                }

                is TimerUiState.Idle -> {
                    IdleTimerContent(
                        onStartTimer = { taskId, description ->
                            viewModel.startTimer(
                                taskId = taskId,
                                description = description
                            )
                        }
                    )
                }

                is TimerUiState.Error -> {
                    ErrorContent(
                        message = state.message,
                        canRetry = state.canRetry,
                        onRetry = { viewModel.refreshTimer() }
                    )
                }
            }
        }

        // Suggestions bottom sheet
        if (showSuggestions) {
            com.aiproj.mobile.ui.screens.suggestions.SuggestionsBottomSheet(
                onDismiss = { showSuggestions = false },
                onSuggestionApplied = {
                    showSuggestions = false
                    viewModel.refreshTimer()
                }
            )
        }
    }
}

/**
 * 活跃计时器内容
 */
@Composable
private fun ActiveTimerContent(
    state: TimerUiState.Active,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onStop: () -> Unit
) {
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 离线状态提示
        if (state.isOffline) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.errorContainer,
                shape = MaterialTheme.shapes.small
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.CloudOff,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "离线模式 - 数据将在联网后同步",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        // 任务信息卡片
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = state.timer.taskTitle ?: state.timer.description ?: "快速计时",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                if (state.timer.projectName != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = state.timer.projectName,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                if (state.timer.description != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = state.timer.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // 时间显示卡片
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (state.isPaused) {
                    MaterialTheme.colorScheme.surfaceVariant
                } else {
                    MaterialTheme.colorScheme.primaryContainer
                }
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = formatTime(state.elapsedSeconds),
                    style = MaterialTheme.typography.displayLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (state.isPaused) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.primary
                    }
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = if (state.isPaused) "已暂停" else "计时中...",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 控制按钮
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (state.isPaused) {
                // 恢复按钮
                Button(
                    onClick = {
                        onResume()
                        // 通知服务恢复
                        val intent = Intent(context, TimerForegroundService::class.java).apply {
                            action = TimerForegroundService.ACTION_RESUME
                        }
                        context.startService(intent)
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("恢复")
                }
            } else {
                // 暂停按钮
                OutlinedButton(
                    onClick = {
                        onPause()
                        // 通知服务暂停
                        val intent = Intent(context, TimerForegroundService::class.java).apply {
                            action = TimerForegroundService.ACTION_PAUSE
                        }
                        context.startService(intent)
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Pause, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("暂停")
                }
            }

            // 停止按钮
            Button(
                onClick = onStop,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(Icons.Default.Stop, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("停止")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 统计信息卡片
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "本次计时统计",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatItem(
                        label = "累计时长",
                        value = formatTime(state.elapsedSeconds),
                        icon = Icons.Default.AccessTime
                    )

                    StatItem(
                        label = "开始时间",
                        value = formatStartTime(state.timer.startedAt),
                        icon = Icons.Default.Schedule
                    )
                }
            }
        }
    }
}

/**
 * 空闲状态内容
 */
@Composable
private fun IdleTimerContent(
    onStartTimer: (taskId: Long?, description: String?) -> Unit
) {
    var showStartDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.Timer,
            contentDescription = null,
            modifier = Modifier.size(120.dp),
            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "没有运行的计时器",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "开始新的计时任务",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = { showStartDialog = true },
            modifier = Modifier.fillMaxWidth(0.7f)
        ) {
            Icon(Icons.Default.PlayArrow, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("开始计时")
        }
    }

    if (showStartDialog) {
        StartTimerDialog(
            onDismiss = { showStartDialog = false },
            onConfirm = { description ->
                onStartTimer(null, description)
                showStartDialog = false
            }
        )
    }
}

/**
 * 启动计时器对话框
 */
@Composable
private fun StartTimerDialog(
    onDismiss: () -> Unit,
    onConfirm: (description: String?) -> Unit
) {
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("开始新计时") },
        text = {
            Column {
                Text(
                    text = "输入计时描述（可选）",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("描述") },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("例如：开发新功能") }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onConfirm(description.takeIf { it.isNotBlank() })
                }
            ) {
                Text("开始")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

/**
 * 错误内容
 */
@Composable
private fun ErrorContent(
    message: String,
    canRetry: Boolean,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.Error,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.error
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error
        )

        Spacer(modifier = Modifier.height(24.dp))

        if (canRetry) {
            Button(onClick = onRetry) {
                Text("重试")
            }
        }
    }
}

/**
 * 统计项
 */
@Composable
private fun StatItem(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 格式化开始时间
 */
private fun formatStartTime(startTime: String): String {
    return try {
        // 简化处理,实际应该使用DateTimeFormatter
        // ISO 8601格式: 2025-10-07T08:17:38+08:00
        val parts = startTime.split("T")
        if (parts.size >= 2) {
            val timePart = parts[1].split("+")[0]
            val time = timePart.substring(0, 5) // HH:MM
            time
        } else {
            startTime
        }
    } catch (e: Exception) {
        "N/A"
    }
}

/**
 * 启动计时器前台服务
 */
private fun startTimerService(context: Context, taskId: Long?, description: String?) {
    val intent = Intent(context, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_START
        taskId?.let { putExtra(TimerForegroundService.EXTRA_TASK_ID, it) }
        description?.let { putExtra(TimerForegroundService.EXTRA_DESCRIPTION, it) }
    }
    context.startForegroundService(intent)
}

/**
 * 停止计时器前台服务
 */
private fun stopTimerService(context: Context) {
    val intent = Intent(context, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_STOP
    }
    context.startService(intent)
}
