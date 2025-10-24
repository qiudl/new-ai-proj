package com.aiproj.mobile.ui.screens.ai.document

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIDocumentGenerateScreen(
    @Suppress("UNUSED_PARAMETER") taskId: Int,
    onNavigateBack: () -> Unit,
    onDocumentSaved: () -> Unit,
    viewModel: AIDocumentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val documentTypes by viewModel.documentTypes.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI生成任务文档") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
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
                is AIDocumentUiState.Idle -> {
                    DocumentGenerateForm(
                        documentTypes = documentTypes,
                        selectedDocType = viewModel.selectedDocType,
                        onDocTypeChange = viewModel::onDocTypeChange,
                        selectedModel = viewModel.selectedModel,
                        onModelChange = viewModel::onModelChange,
                        customPrompt = viewModel.customPrompt,
                        onPromptChange = viewModel::onPromptChange,
                        includeSubtasks = viewModel.includeSubtasks,
                        onToggleSubtasks = viewModel::toggleIncludeSubtasks,
                        includeCodeExamples = viewModel.includeCodeExamples,
                        onToggleCodeExamples = viewModel::toggleIncludeCodeExamples,
                        onGenerate = viewModel::generateDocument
                    )
                }

                is AIDocumentUiState.Loading -> {
                    LoadingView()
                }

                is AIDocumentUiState.Success -> {
                    DocumentPreviewScreen(
                        document = state.document,
                        onSave = viewModel::saveDocument,
                        onRegenerate = viewModel::regenerate,
                        onBack = viewModel::resetToIdle
                    )
                }

                is AIDocumentUiState.Saving -> {
                    LoadingView(message = "正在保存文档...")
                }

                is AIDocumentUiState.Saved -> {
                    LaunchedEffect(Unit) {
                        onDocumentSaved()
                    }
                }

                is AIDocumentUiState.Error -> {
                    ErrorView(
                        message = state.message,
                        onRetry = viewModel::generateDocument,
                        onBack = viewModel::resetToIdle
                    )
                }
            }
        }
    }
}

/**
 * 加载视图
 */
@Composable
private fun LoadingView(message: String = "正在生成文档...") {
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
            Text(
                text = "预计需要5-15秒",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
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
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(32.dp)
        ) {
            Text(
                text = "❌ 生成失败",
                style = MaterialTheme.typography.headlineSmall
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
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
