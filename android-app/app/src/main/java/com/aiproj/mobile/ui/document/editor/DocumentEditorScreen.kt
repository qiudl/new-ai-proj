package com.aiproj.mobile.ui.document.editor

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.ui.document.template.TemplateSelectionDialog
import io.noties.markwon.Markwon
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentEditorScreen(
    @Suppress("UNUSED_PARAMETER") taskId: Int,
    documentId: Int? = null,
    onNavigateBack: () -> Unit,
    viewModel: DocumentEditorViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showStatusDialog by remember { mutableStateOf(false) }
    var showTemplateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (documentId == null) "新建文档" else "编辑文档") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
                    }
                },
                actions = {
                    // 仅在新建文档时显示模板按钮
                    if (documentId == null) {
                        IconButton(onClick = { showTemplateDialog = true }) {
                            Icon(Icons.Default.Description, "使用模板")
                        }
                    }
                    IconButton(onClick = { viewModel.togglePreview() }) {
                        Icon(
                            if (uiState.isPreviewMode) Icons.Default.Edit else Icons.Default.Visibility,
                            "预览"
                        )
                    }
                    IconButton(onClick = { showStatusDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.Label, "状态")
                    }
                    IconButton(
                        onClick = {
                            viewModel.saveDocument {
                                scope.launch {
                                    snackbarHostState.showSnackbar("保存成功")
                                    onNavigateBack()
                                }
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
                            Icon(Icons.Default.Save, "保存")
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            OutlinedTextField(
                value = uiState.title,
                onValueChange = { viewModel.updateTitle(it) },
                label = { Text("标题") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                singleLine = true
            )

            if (!uiState.isPreviewMode) {
                MarkdownToolbar(
                    onInsert = { prefix, suffix ->
                        viewModel.insertMarkdown(prefix, suffix)
                    }
                )
                HorizontalDivider()
            }

            if (uiState.isPreviewMode) {
                MarkdownPreview(
                    content = uiState.content,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                )
            } else {
                OutlinedTextField(
                    value = uiState.content,
                    onValueChange = { viewModel.updateContent(it) },
                    label = { Text("内容 (Markdown)") },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    minLines = 10
                )
            }
        }
    }

    if (showStatusDialog) {
        StatusDialog(
            currentStatus = uiState.status,
            onStatusSelected = {
                viewModel.updateStatus(it)
                showStatusDialog = false
            },
            onDismiss = { showStatusDialog = false }
        )
    }

    if (showTemplateDialog) {
        TemplateSelectionDialog(
            onTemplateSelected = { template ->
                viewModel.updateTitle(template.name)
                viewModel.updateContent(template.content)
                showTemplateDialog = false
            },
            onDismiss = { showTemplateDialog = false }
        )
    }
}

@Composable
private fun MarkdownToolbar(
    onInsert: (String, String) -> Unit
) {
    val scrollState = rememberScrollState()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .padding(8.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        IconButton(onClick = { onInsert("**", "**") }) {
            Icon(Icons.Default.FormatBold, "粗体")
        }
        IconButton(onClick = { onInsert("*", "*") }) {
            Icon(Icons.Default.FormatItalic, "斜体")
        }
        IconButton(onClick = { onInsert("# ", "") }) {
            Icon(Icons.Default.Title, "标题")
        }
        IconButton(onClick = { onInsert("- ", "") }) {
            Icon(Icons.AutoMirrored.Filled.FormatListBulleted, "列表")
        }
        IconButton(onClick = { onInsert("1. ", "") }) {
            Icon(Icons.Default.FormatListNumbered, "编号")
        }
        IconButton(onClick = { onInsert("- [ ] ", "") }) {
            Icon(Icons.Default.CheckBox, "任务")
        }
        IconButton(onClick = { onInsert("[](url)", "") }) {
            Icon(Icons.Default.Link, "链接")
        }
        IconButton(onClick = { onInsert("`", "`") }) {
            Icon(Icons.Default.Code, "代码")
        }
    }
}

@Composable
private fun MarkdownPreview(
    content: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val markwon = remember { Markwon.create(context) }

    Box(modifier = modifier.verticalScroll(scrollState)) {
        if (content.isNotEmpty()) {
            AndroidView(
                factory = { ctx ->
                    android.widget.TextView(ctx).apply {
                        markwon.setMarkdown(this, content)
                        textSize = 16f
                    }
                }
            )
        } else {
            Text(
                text = "预览内容为空",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun StatusDialog(
    currentStatus: String,
    onStatusSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("选择文档状态") },
        text = {
            Column {
                listOf("draft", "published", "archived").forEach { status ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        RadioButton(
                            selected = status == currentStatus,
                            onClick = { onStatusSelected(status) }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            when (status) {
                                "draft" -> "草稿"
                                "published" -> "已发布"
                                else -> "已归档"
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("关闭")
            }
        }
    )
}
