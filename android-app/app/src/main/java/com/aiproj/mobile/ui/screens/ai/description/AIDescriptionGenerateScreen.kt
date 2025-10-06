package com.aiproj.mobile.ui.screens.ai.description

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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * AI描述生成主屏幕
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIDescriptionGenerateScreen(
    taskId: Int,
    onNavigateBack: () -> Unit,
    onDescriptionApplied: () -> Unit,
    viewModel: AIDescriptionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI描述生成") },
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
                is AIDescriptionUiState.Idle -> {
                    DescriptionGenerateForm(
                        selectedModel = viewModel.selectedModel,
                        onModelChange = viewModel::onModelChange,
                        selectedLength = viewModel.selectedLength,
                        onLengthChange = viewModel::onLengthChange,
                        selectedStyle = viewModel.selectedStyle,
                        onStyleChange = viewModel::onStyleChange,
                        customPrompt = viewModel.customPrompt,
                        onPromptChange = viewModel::onPromptChange,
                        onGenerate = viewModel::generateDescription
                    )
                }

                is AIDescriptionUiState.Loading -> {
                    LoadingView(message = "正在生成描述...")
                }

                is AIDescriptionUiState.Success -> {
                    DescriptionPreviewScreen(
                        response = state.response,
                        onApply = viewModel::applyDescription,
                        onRegenerate = viewModel::regenerate,
                        onBack = viewModel::resetToIdle
                    )
                }

                is AIDescriptionUiState.Applying -> {
                    LoadingView(message = "正在应用描述...")
                }

                is AIDescriptionUiState.Applied -> {
                    LaunchedEffect(Unit) {
                        onDescriptionApplied()
                    }
                }

                is AIDescriptionUiState.Error -> {
                    ErrorView(
                        message = state.message,
                        onRetry = viewModel::generateDescription,
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
            CircularProgressIndicator()
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
