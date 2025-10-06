package com.aiproj.mobile.ui.screens.notes

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.ui.screens.notes.components.MarkdownEditor
import com.aiproj.mobile.ui.screens.notes.components.NoteMetadataEditor
import kotlinx.coroutines.launch

/**
 * 笔记编辑器主页面
 *
 * 支持Markdown编辑、元信息编辑、自动保存等功能
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteEditorScreen(
    noteId: Int? = null,
    onNavigateBack: () -> Unit,
    viewModel: NoteEditorViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var showMetadataSheet by remember { mutableStateOf(false) }
    var showDiscardDialog by remember { mutableStateOf(false) }

    // 加载笔记数据（如果是编辑模式）
    LaunchedEffect(noteId) {
        noteId?.let {
            viewModel.loadNote(it)
        }
    }

    // 监听保存状态
    LaunchedEffect(uiState) {
        when (uiState) {
            is NoteEditorViewModel.UiState.SaveSuccess -> {
                snackbarHostState.showSnackbar("保存成功")
                viewModel.resetSaveState()
            }
            is NoteEditorViewModel.UiState.Error -> {
                snackbarHostState.showSnackbar(
                    (uiState as NoteEditorViewModel.UiState.Error).message
                )
            }
            else -> {}
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (noteId == null) "新建笔记" else "编辑笔记",
                        style = MaterialTheme.typography.titleMedium
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (viewModel.hasUnsavedChanges()) {
                            showDiscardDialog = true
                        } else {
                            onNavigateBack()
                        }
                    }) {
                        Icon(Icons.Default.ArrowBack, "返回")
                    }
                },
                actions = {
                    // 元信息按钮
                    IconButton(onClick = { showMetadataSheet = true }) {
                        Icon(Icons.Default.Settings, "设置")
                    }

                    // 置顶按钮
                    IconButton(
                        onClick = { viewModel.togglePinned() }
                    ) {
                        Icon(
                            imageVector = if (viewModel.isPinned.value) {
                                Icons.Default.PushPin
                            } else {
                                Icons.Default.PushPin
                            },
                            contentDescription = "置顶",
                            tint = if (viewModel.isPinned.value) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                    }

                    // 书签按钮
                    IconButton(
                        onClick = { viewModel.toggleBookmarked() }
                    ) {
                        Icon(
                            imageVector = if (viewModel.isBookmarked.value) {
                                Icons.Default.Bookmark
                            } else {
                                Icons.Default.BookmarkBorder
                            },
                            contentDescription = "书签",
                            tint = if (viewModel.isBookmarked.value) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                    }

                    // 保存按钮
                    IconButton(
                        onClick = {
                            scope.launch {
                                viewModel.saveNote()
                            }
                        },
                        enabled = uiState !is NoteEditorViewModel.UiState.Saving
                    ) {
                        when (uiState) {
                            is NoteEditorViewModel.UiState.Saving -> {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    strokeWidth = 2.dp
                                )
                            }
                            else -> {
                                Icon(Icons.Default.Save, "保存")
                            }
                        }
                    }
                }
            )
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // 标题输入
            OutlinedTextField(
                value = viewModel.title.value,
                onValueChange = { viewModel.updateTitle(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("笔记标题") },
                singleLine = true,
                textStyle = MaterialTheme.typography.titleLarge
            )

            HorizontalDivider()

            // Markdown编辑器
            MarkdownEditor(
                content = viewModel.content.value,
                onContentChange = { viewModel.updateContent(it) },
                isPreviewMode = viewModel.isPreviewMode.value,
                onTogglePreview = { viewModel.togglePreviewMode() },
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            )

            // 自动保存提示
            if (viewModel.isAutoSaving.value) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }

    // 元信息编辑面板
    if (showMetadataSheet) {
        ModalBottomSheet(
            onDismissRequest = { showMetadataSheet = false }
        ) {
            NoteMetadataEditor(
                selectedFolder = viewModel.selectedFolder.value,
                noteType = viewModel.noteType.value,
                priority = viewModel.priority.value,
                visibility = viewModel.visibility.value,
                tags = viewModel.tags.value,
                folders = viewModel.folders.value,
                onFolderChange = { viewModel.updateFolder(it) },
                onTypeChange = { viewModel.updateType(it) },
                onPriorityChange = { viewModel.updatePriority(it) },
                onVisibilityChange = { viewModel.updateVisibility(it) },
                onTagsChange = { viewModel.updateTags(it) },
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
    }

    // 放弃更改确认对话框
    if (showDiscardDialog) {
        AlertDialog(
            onDismissRequest = { showDiscardDialog = false },
            title = { Text("放弃更改") },
            text = { Text("您有未保存的更改，确定要放弃吗?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDiscardDialog = false
                        onNavigateBack()
                    }
                ) {
                    Text("放弃", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDiscardDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}
