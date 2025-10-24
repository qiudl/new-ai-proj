package com.aiproj.mobile.ui.screens.ai.subtask

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * AI子任务生成主屏幕
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AISubtaskGenerateScreen(
    @Suppress("UNUSED_PARAMETER") taskId: Int,
    onNavigateBack: () -> Unit,
    onSubtasksCreated: () -> Unit,
    viewModel: AISubtaskViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI子任务生成") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "返回"
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
                is AISubtaskUiState.Idle -> {
                    SubtaskGenerateForm(
                        selectedModel = viewModel.selectedModel,
                        onModelChange = viewModel::onModelChange,
                        subtaskCount = viewModel.subtaskCount,
                        onCountChange = viewModel::onCountChange,
                        customPrompt = viewModel.customPrompt,
                        onPromptChange = viewModel::onPromptChange,
                        includeEstimates = viewModel.includeEstimates,
                        onToggleEstimates = viewModel::toggleIncludeEstimates,
                        onGenerate = viewModel::generateSubtasks
                    )
                }

                is AISubtaskUiState.Loading -> {
                    LoadingView(message = "正在生成子任务...")
                }

                is AISubtaskUiState.Success -> {
                    SubtaskPreviewScreen(
                        subtasks = state.subtasks,
                        metadata = state.metadata,
                        onCreate = viewModel::createSubtasks,
                        onRegenerate = viewModel::regenerate,
                        onBack = viewModel::resetToIdle
                    )
                }

                is AISubtaskUiState.Creating -> {
                    LoadingView(message = "正在创建子任务...")
                }

                is AISubtaskUiState.Created -> {
                    LaunchedEffect(Unit) {
                        onSubtasksCreated()
                    }
                }

                is AISubtaskUiState.Error -> {
                    ErrorView(
                        message = state.message,
                        onRetry = viewModel::generateSubtasks,
                        onBack = viewModel::resetToIdle
                    )
                }
            }
        }
    }
}

/**
 * 加载中视图
 */
@Composable
private fun LoadingView(message: String = "加载中...") {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(
                modifier = Modifier.testTag("loadingIndicator")
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}

/**
 * 错误视图
 */
@Composable
private fun ErrorView(
    message: String,
    onRetry: () -> Unit,
    onBack: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "❌ $message",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.error
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedButton(onClick = onBack) {
                    Text("返回")
                }

                Button(onClick = onRetry) {
                    Text("重试")
                }
            }
        }
    }
}
