package com.aiproj.mobile.ui.screens.notes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.ui.screens.notes.components.*
import kotlinx.coroutines.launch

/**
 * 笔记详情页面
 *
 * 显示笔记完整内容、元数据、关联项目等信息
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteDetailScreen(
    noteId: Int,
    onNavigateBack: () -> Unit,
    onEditClick: (Int) -> Unit,
    onTaskClick: (Int) -> Unit,
    onNoteClick: (Int) -> Unit,
    viewModel: NoteDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var showMetadataSheet by remember { mutableStateOf(false) }
    var showRelatedItemsSheet by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showManageTaskRelationsDialog by remember { mutableStateOf(false) }
    var showManageNoteRelationsDialog by remember { mutableStateOf(false) }
    var showConversionDialog by remember { mutableStateOf(false) }

    // 加载笔记数据
    LaunchedEffect(noteId) {
        viewModel.loadNote(noteId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("笔记详情") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
                    }
                },
                actions = {
                    // 置顶按钮
                    if (uiState is NoteDetailViewModel.UiState.Success) {
                        val note = (uiState as NoteDetailViewModel.UiState.Success).note
                        IconButton(
                            onClick = {
                                scope.launch {
                                    viewModel.togglePinned()
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.PushPin,
                                contentDescription = "置顶",
                                tint = if (note.isPinned) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }

                        // 收藏按钮
                        IconButton(
                            onClick = {
                                scope.launch {
                                    viewModel.toggleBookmarked()
                                }
                            }
                        ) {
                            Icon(
                                imageVector = if (note.isBookmarked) {
                                    Icons.Default.Bookmark
                                } else {
                                    Icons.Default.BookmarkBorder
                                },
                                contentDescription = "收藏",
                                tint = if (note.isBookmarked) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }
                    }

                    // 编辑按钮
                    IconButton(onClick = { onEditClick(noteId) }) {
                        Icon(Icons.Default.Edit, "编辑")
                    }

                    // 更多菜单
                    var showMenu by remember { mutableStateOf(false) }
                    IconButton(onClick = { showMenu = true }) {
                        Icon(Icons.Default.MoreVert, "更多")
                    }
                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("查看元信息") },
                            onClick = {
                                showMenu = false
                                showMetadataSheet = true
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Info, null)
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("查看关联项目") },
                            onClick = {
                                showMenu = false
                                showRelatedItemsSheet = true
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Link, null)
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("管理关联任务") },
                            onClick = {
                                showMenu = false
                                showManageTaskRelationsDialog = true
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Task, null)
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("管理关联笔记") },
                            onClick = {
                                showMenu = false
                                showManageNoteRelationsDialog = true
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Description, null)
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("转换为任务文档") },
                            onClick = {
                                showMenu = false
                                showConversionDialog = true
                            },
                            leadingIcon = {
                                Icon(Icons.Default.SwapHoriz, null)
                            }
                        )
                        HorizontalDivider()
                        DropdownMenuItem(
                            text = { Text("删除笔记") },
                            onClick = {
                                showMenu = false
                                showDeleteDialog = true
                            },
                            leadingIcon = {
                                Icon(Icons.Default.Delete, null)
                            },
                            colors = MenuDefaults.itemColors(
                                textColor = MaterialTheme.colorScheme.error,
                                leadingIconColor = MaterialTheme.colorScheme.error
                            )
                        )
                    }
                }
            )
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState)
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is NoteDetailViewModel.UiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            is NoteDetailViewModel.UiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Text(
                            text = state.message,
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                        Button(onClick = { viewModel.loadNote(noteId) }) {
                            Text("重试")
                        }
                    }
                }
            }

            is NoteDetailViewModel.UiState.Success -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 标题
                    Text(
                        text = state.note.title,
                        style = MaterialTheme.typography.headlineMedium
                    )

                    // 描述
                    state.note.description?.let { description ->
                        Text(
                            text = description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    HorizontalDivider()

                    // Markdown内容预览
                    state.note.content?.let { content ->
                        Card {
                            androidx.compose.ui.viewinterop.AndroidView(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                factory = { context ->
                                    android.widget.TextView(context).apply {
                                        textSize = 16f
                                        setPadding(0, 0, 0, 0)
                                    }
                                },
                                update = { textView ->
                                    val markwon = io.noties.markwon.Markwon.builder(textView.context)
                                        .usePlugin(io.noties.markwon.ext.strikethrough.StrikethroughPlugin.create())
                                        .usePlugin(io.noties.markwon.ext.tables.TablePlugin.create(textView.context))
                                        .usePlugin(io.noties.markwon.ext.tasklist.TaskListPlugin.create(textView.context))
                                        .usePlugin(io.noties.markwon.linkify.LinkifyPlugin.create())
                                        .build()

                                    markwon.setMarkdown(textView, content)
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // 元信息面板
    if (showMetadataSheet && uiState is NoteDetailViewModel.UiState.Success) {
        val state = uiState as NoteDetailViewModel.UiState.Success
        ModalBottomSheet(
            onDismissRequest = { showMetadataSheet = false }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                NoteMetadataCard(
                    note = state.note,
                    folder = state.folder
                )
            }
        }
    }

    // 关联项目面板
    if (showRelatedItemsSheet && uiState is NoteDetailViewModel.UiState.Success) {
        val state = uiState as NoteDetailViewModel.UiState.Success
        ModalBottomSheet(
            onDismissRequest = { showRelatedItemsSheet = false }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                RelatedItemsCard(
                    relatedTaskIds = state.note.relatedTasks,
                    relatedNoteIds = state.note.relatedNotes,
                    onTaskClick = { taskId ->
                        showRelatedItemsSheet = false
                        onTaskClick(taskId)
                    },
                    onNoteClick = { noteId ->
                        showRelatedItemsSheet = false
                        onNoteClick(noteId)
                    }
                )
            }
        }
    }

    // 删除确认对话框
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("删除笔记") },
            text = { Text("确定要删除这条笔记吗？此操作无法撤销。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            viewModel.deleteNote()
                            onNavigateBack()
                        }
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("删除")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("取消")
                }
            }
        )
    }

    // 管理任务关联对话框
    if (showManageTaskRelationsDialog && uiState is NoteDetailViewModel.UiState.Success) {
        val state = uiState as NoteDetailViewModel.UiState.Success
        RelationManagementDialog(
            relationType = RelationType.TASK,
            currentRelations = state.note.relatedTasks ?: emptyList(),
            onDismiss = { showManageTaskRelationsDialog = false },
            onAddRelation = { taskId ->
                scope.launch {
                    viewModel.addTaskRelation(taskId)
                    snackbarHostState.showSnackbar("已添加关联任务 #$taskId")
                }
            },
            onRemoveRelation = { taskId ->
                scope.launch {
                    viewModel.removeTaskRelation(taskId)
                    snackbarHostState.showSnackbar("已移除关联任务 #$taskId")
                }
            }
        )
    }

    // 管理笔记关联对话框
    if (showManageNoteRelationsDialog && uiState is NoteDetailViewModel.UiState.Success) {
        val state = uiState as NoteDetailViewModel.UiState.Success
        RelationManagementDialog(
            relationType = RelationType.NOTE,
            currentRelations = state.note.relatedNotes ?: emptyList(),
            onDismiss = { showManageNoteRelationsDialog = false },
            onAddRelation = { noteId ->
                scope.launch {
                    viewModel.addNoteRelation(noteId)
                    snackbarHostState.showSnackbar("已添加关联笔记 #$noteId")
                }
            },
            onRemoveRelation = { noteId ->
                scope.launch {
                    viewModel.removeNoteRelation(noteId)
                    snackbarHostState.showSnackbar("已移除关联笔记 #$noteId")
                }
            }
        )
    }

    // 文档转换对话框
    if (showConversionDialog) {
        DocumentConversionDialog(
            conversionType = ConversionType.NOTE_TO_TASK_DOC,
            onDismiss = { showConversionDialog = false },
            onConfirm = { options ->
                scope.launch {
                    options.targetId?.let { targetTaskId ->
                        viewModel.convertToTaskDocument(
                            targetTaskId = targetTaskId,
                            preserveOriginal = options.preserveOriginal,
                            copyRelations = options.copyRelations
                        )
                        showConversionDialog = false
                        snackbarHostState.showSnackbar("转换成功")
                        if (!options.preserveOriginal) {
                            onNavigateBack()
                        }
                    }
                }
            }
        )
    }
}
