package com.aiproj.mobile.ui.screens.pomodoro

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
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.ui.screens.pomodoro.components.*

/**
 * 番茄钟界面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PomodoroScreen(
    onNavigateBack: () -> Unit,
    viewModel: PomodoroViewModel = hiltViewModel()
) {
    val currentSession by viewModel.currentSession.collectAsState()
    val config by viewModel.config.collectAsState()
    val stats by viewModel.stats.collectAsState()

    var showConfigDialog by remember { mutableStateOf(false) }
    var showStartDialog by remember { mutableStateOf(false) }

    // TODO: 从TaskRepository获取进行中的任务列表
    val inProgressTasks = remember { emptyList<Task>() }
    val isLoadingTasks = remember { false }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("番茄钟") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "返回")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // 统计卡片
            PomodoroStatsCard(stats = stats)

            // 主内容区域
            when (val session = currentSession) {
                null -> {
                    // 空闲状态
                    IdlePomodoroContent(
                        config = config,
                        onStartClick = { showStartDialog = true },
                        onConfigClick = { showConfigDialog = true }
                    )
                }

                else -> {
                    // 活动状态
                    ActivePomodoroContent(
                        session = session,
                        onPause = { viewModel.pause() },
                        onResume = { viewModel.resume() },
                        onStop = { viewModel.stop() },
                        onSkipPhase = { viewModel.skipPhase() }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // 配置对话框
    if (showConfigDialog) {
        PomodoroConfigDialog(
            config = config,
            onDismiss = { showConfigDialog = false },
            onConfirm = { newConfig ->
                viewModel.updateConfig(newConfig)
                showConfigDialog = false
            }
        )
    }

    // 启动对话框
    if (showStartDialog) {
        StartPomodoroDialog(
            tasks = inProgressTasks,
            isLoadingTasks = isLoadingTasks,
            onDismiss = { showStartDialog = false },
            onStartWithTask = { task ->
                viewModel.startPomodoro(
                    taskId = task.id.toLong(),
                    taskTitle = task.title
                )
                showStartDialog = false
            },
            onStartWithoutTask = {
                viewModel.startPomodoro(
                    taskId = null,
                    taskTitle = null
                )
                showStartDialog = false
            }
        )
    }
}

