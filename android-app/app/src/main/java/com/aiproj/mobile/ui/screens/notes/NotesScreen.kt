package com.aiproj.mobile.ui.screens.notes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.WorkNote
import com.aiproj.mobile.data.models.WorkNoteFolder
import com.aiproj.mobile.data.models.WorkNoteType
import com.aiproj.mobile.data.models.WorkNotePriority
import com.aiproj.mobile.ui.screens.notes.components.*
import kotlinx.coroutines.launch

/**
 * 工作笔记列表主页面
 *
 * 支持列表/网格视图切换、搜索、筛选、文件夹导航等
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterialApi::class)
@Composable
fun NotesScreen(
    onNoteClick: (Int) -> Unit,
    onCreateNote: () -> Unit,
    viewModel: NotesViewModel = hiltViewModel()
) {
    // 从ViewModel收集状态
    val uiState by viewModel.uiState.collectAsState()
    val notes by viewModel.notes.collectAsState()
    val folders by viewModel.folders.collectAsState()
    val selectedFolderId by viewModel.selectedFolderId.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedType by viewModel.selectedType.collectAsState()
    val selectedPriority by viewModel.selectedPriority.collectAsState()
    val isPinnedOnly by viewModel.isPinnedOnly.collectAsState()
    val isBookmarkedOnly by viewModel.isBookmarkedOnly.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val folderLoading by viewModel.folderLoading.collectAsState()
    val folderError by viewModel.folderError.collectAsState()

    // 本地UI状态
    var expandedFolderIds by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var isGridView by remember { mutableStateOf(false) }

    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var showFilterSheet by remember { mutableStateOf(false) }
    var selectedNote by remember { mutableStateOf<WorkNote?>(null) }

    // 文件夹对话框状态
    var showCreateFolderDialog by remember { mutableStateOf(false) }
    var showEditFolderDialog by remember { mutableStateOf(false) }
    var showDeleteFolderDialog by remember { mutableStateOf(false) }
    var showMoveFolderDialog by remember { mutableStateOf(false) }
    var showFolderActionMenu by remember { mutableStateOf(false) }
    var selectedFolder by remember { mutableStateOf<WorkNoteFolder?>(null) }
    var parentFolder by remember { mutableStateOf<WorkNoteFolder?>(null) }

    // Pull-to-refresh state
    val pullRefreshState = rememberPullRefreshState(
        refreshing = isRefreshing,
        onRefresh = { viewModel.refresh() }
    )

    // 监听文件夹错误并显示Snackbar
    LaunchedEffect(folderError) {
        folderError?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Long
            )
            viewModel.clearFolderError()
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                FolderTree(
                    folders = folders,
                    selectedFolderId = selectedFolderId,
                    expandedFolderIds = expandedFolderIds,
                    onFolderClick = { folder ->
                        viewModel.selectFolder(folder.id)
                        scope.launch { drawerState.close() }
                    },
                    onFolderLongPress = { folder ->
                        selectedFolder = folder
                        showFolderActionMenu = true
                        scope.launch { drawerState.close() }
                    },
                    onExpandFolder = { folderId ->
                        expandedFolderIds = if (expandedFolderIds.contains(folderId)) {
                            expandedFolderIds - folderId
                        } else {
                            expandedFolderIds + folderId
                        }
                    },
                    onCreateFolder = {
                        parentFolder = null
                        showCreateFolderDialog = true
                        scope.launch { drawerState.close() }
                    }
                )
            }
        }
    ) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("工作笔记") },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, "菜单")
                        }
                    },
                    actions = {
                        // 视图切换
                        IconButton(onClick = { isGridView = !isGridView }) {
                            Icon(
                                imageVector = if (isGridView) {
                                    Icons.Default.ViewList
                                } else {
                                    Icons.Default.GridView
                                },
                                contentDescription = "切换视图"
                            )
                        }

                        // 筛选
                        IconButton(onClick = { showFilterSheet = true }) {
                            Icon(Icons.Default.FilterList, "筛选")
                        }
                    }
                )
            },
            floatingActionButton = {
                FloatingActionButton(onClick = onCreateNote) {
                    Icon(Icons.Default.Add, "新建工作笔记")
                }
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // 搜索栏
                NoteSearchBar(
                    query = searchQuery,
                    onQueryChange = { viewModel.updateSearchQuery(it) },
                    onSearch = { viewModel.search() },
                    onClear = { viewModel.clearSearch() },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )

                // 工作笔记列表 with pull-to-refresh
                Box(modifier = Modifier.fillMaxSize()) {
                    when (uiState) {
                        is NotesViewModel.UiState.Loading -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator()
                            }
                        }

                        is NotesViewModel.UiState.Error -> {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = (uiState as NotesViewModel.UiState.Error).message,
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }

                        is NotesViewModel.UiState.Success -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .pullRefresh(pullRefreshState)
                            ) {
                                if (notes.isEmpty()) {
                                    EmptyNotesView(onCreateNote = onCreateNote)
                                } else {
                                    ShowNotesList(
                                        notes = notes,
                                        folders = folders,
                                        isGridView = isGridView,
                                        onNoteClick = onNoteClick,
                                        onNoteLongClick = { selectedNote = it }
                                    )
                                }

                                PullRefreshIndicator(
                                    refreshing = isRefreshing,
                                    state = pullRefreshState,
                                    modifier = Modifier.align(Alignment.TopCenter)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // 筛选面板
    if (showFilterSheet) {
        ModalBottomSheet(
            onDismissRequest = { showFilterSheet = false }
        ) {
            NoteFilterPanel(
                selectedType = selectedType,
                selectedPriority = selectedPriority,
                isPinnedOnly = isPinnedOnly,
                isBookmarkedOnly = isBookmarkedOnly,
                onTypeChange = { viewModel.updateType(it) },
                onPriorityChange = { viewModel.updatePriority(it) },
                onPinnedOnlyChange = { viewModel.updatePinnedOnly(it) },
                onBookmarkedOnlyChange = { viewModel.updateBookmarkedOnly(it) },
                onReset = {
                    viewModel.resetFilters()
                    showFilterSheet = false
                },
                modifier = Modifier.padding(16.dp)
            )
        }
    }

    // 笔记操作菜单
    selectedNote?.let { note ->
        ModalBottomSheet(
            onDismissRequest = { selectedNote = null }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = note.title ?: "无标题",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                HorizontalDivider()

                // 置顶/取消置顶
                Surface(
                    onClick = {
                        scope.launch {
                            viewModel.togglePinned(note.id)
                            selectedNote = null
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = {
                            Text(if (note.isPinned) "取消置顶" else "置顶")
                        },
                        leadingContent = {
                            Icon(Icons.Default.PushPin, null)
                        }
                    )
                }

                // 收藏/取消收藏
                Surface(
                    onClick = {
                        scope.launch {
                            viewModel.toggleBookmarked(note.id)
                            selectedNote = null
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = {
                            Text(if (note.isBookmarked) "取消收藏" else "收藏")
                        },
                        leadingContent = {
                            Icon(
                                if (note.isBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                null
                            )
                        }
                    )
                }

                // 编辑
                Surface(
                    onClick = {
                        onNoteClick(note.id)
                        selectedNote = null
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = { Text("编辑") },
                        leadingContent = {
                            Icon(Icons.Default.Edit, null)
                        }
                    )
                }

                HorizontalDivider()

                // 删除
                Surface(
                    onClick = {
                        selectedNote?.let { note ->
                            viewModel.confirmDelete(note.id)
                            selectedNote = null
                            scope.launch {
                                val result = snackbarHostState.showSnackbar(
                                    message = "笔记已删除",
                                    actionLabel = "撤销",
                                    duration = SnackbarDuration.Short // 4秒，留出足够时间撤销
                                )
                                if (result == SnackbarResult.ActionPerformed) {
                                    viewModel.undoDelete()
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = {
                            Text(
                                "删除",
                                color = MaterialTheme.colorScheme.error
                            )
                        },
                        leadingContent = {
                            Icon(
                                Icons.Default.Delete,
                                null,
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }

        // 删除确认对话框已移除 - 改用Snackbar撤销模式（Material Design推荐）
    }

    // ========== 文件夹对话框 ==========

    // 创建文件夹对话框
    if (showCreateFolderDialog) {
        FolderDialog(
            folder = null,
            parentFolder = parentFolder,
            onDismiss = { showCreateFolderDialog = false },
            onConfirm = { name, description, color, visibility ->
                viewModel.createFolder(
                    name = name,
                    description = description,
                    parentId = parentFolder?.id,
                    visibility = visibility,
                    color = color
                )
                showCreateFolderDialog = false
            }
        )
    }

    // 编辑文件夹对话框
    if (showEditFolderDialog && selectedFolder != null) {
        FolderDialog(
            folder = selectedFolder,
            parentFolder = null,
            onDismiss = { showEditFolderDialog = false },
            onConfirm = { name, description, color, visibility ->
                viewModel.updateFolder(
                    folderId = selectedFolder!!.id,
                    name = name,
                    description = description,
                    visibility = visibility,
                    color = color
                )
                showEditFolderDialog = false
            }
        )
    }

    // 删除文件夹对话框
    if (showDeleteFolderDialog && selectedFolder != null) {
        DeleteFolderDialog(
            folder = selectedFolder!!,
            onDismiss = { showDeleteFolderDialog = false },
            onConfirm = {
                viewModel.deleteFolder(selectedFolder!!.id)
                showDeleteFolderDialog = false
                selectedFolder = null
            }
        )
    }

    // 移动文件夹对话框
    if (showMoveFolderDialog && selectedFolder != null) {
        MoveFolderDialog(
            folderToMove = selectedFolder!!,
            availableFolders = folders,
            onDismiss = { showMoveFolderDialog = false },
            onConfirm = { targetParentId ->
                viewModel.moveFolder(
                    folderId = selectedFolder!!.id,
                    newParentId = targetParentId
                )
                showMoveFolderDialog = false
            }
        )
    }

    // 文件夹操作菜单
    if (showFolderActionMenu && selectedFolder != null) {
        ModalBottomSheet(
            onDismissRequest = {
                showFolderActionMenu = false
                selectedFolder = null
            }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = selectedFolder!!.name,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                HorizontalDivider()

                // 编辑
                Surface(
                    onClick = {
                        showFolderActionMenu = false
                        showEditFolderDialog = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = { Text("编辑") },
                        leadingContent = { Icon(Icons.Default.Edit, null) }
                    )
                }

                // 移动
                Surface(
                    onClick = {
                        showFolderActionMenu = false
                        showMoveFolderDialog = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = { Text("移动") },
                        leadingContent = { Icon(Icons.Default.DriveFileMove, null) }
                    )
                }

                // 创建子文件夹
                Surface(
                    onClick = {
                        parentFolder = selectedFolder
                        showFolderActionMenu = false
                        showCreateFolderDialog = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = { Text("创建子文件夹") },
                        leadingContent = { Icon(Icons.Default.CreateNewFolder, null) }
                    )
                }

                HorizontalDivider()

                // 删除
                Surface(
                    onClick = {
                        showFolderActionMenu = false
                        showDeleteFolderDialog = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListItem(
                        headlineContent = {
                            Text(
                                "删除",
                                color = MaterialTheme.colorScheme.error
                            )
                        },
                        leadingContent = {
                            Icon(
                                Icons.Default.Delete,
                                null,
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

/**
 * 显示工作笔记列表（列表或网格视图）
 */
@Composable
private fun ShowNotesList(
    notes: List<WorkNote>,
    folders: List<WorkNoteFolder>,
    isGridView: Boolean,
    onNoteClick: (Int) -> Unit,
    onNoteLongClick: (WorkNote) -> Unit
) {
    // 创建文件夹ID到名称的映射
    val folderMap = remember(folders) {
        folders.associateBy { it.id }
    }

    if (isGridView) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(notes) { note ->
                NoteCard(
                    note = note,
                    folderName = note.workNoteFolderId?.let { folderMap[it]?.name },
                    onClick = { onNoteClick(note.id) },
                    onLongClick = { onNoteLongClick(note) }
                )
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(notes) { note ->
                NoteListItem(
                    note = note,
                    folderName = note.workNoteFolderId?.let { folderMap[it]?.name },
                    onClick = { onNoteClick(note.id) },
                    onLongClick = { onNoteLongClick(note) }
                )
            }
        }
    }
}

/**
 * 空状态视图
 */
@Composable
private fun EmptyNotesView(
    onCreateNote: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Description,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
            Text(
                text = "还没有工作笔记",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Button(onClick = onCreateNote) {
                Icon(Icons.Default.Add, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("创建第一条工作笔记")
            }
        }
    }
}
