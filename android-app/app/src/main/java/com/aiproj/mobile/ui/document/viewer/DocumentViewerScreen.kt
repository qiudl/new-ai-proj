package com.aiproj.mobile.ui.document.viewer

import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.Document
import android.text.SpannableStringBuilder
import android.widget.HorizontalScrollView
import android.widget.TableLayout
import io.noties.markwon.Markwon
import io.noties.markwon.core.CorePlugin
import io.noties.markwon.ext.strikethrough.StrikethroughPlugin
import io.noties.markwon.ext.tables.TablePlugin
import io.noties.markwon.ext.tasklist.TaskListPlugin
import io.noties.markwon.html.HtmlPlugin
import io.noties.markwon.image.coil.CoilImagesPlugin
import io.noties.markwon.linkify.LinkifyPlugin
import io.noties.markwon.syntax.Prism4jThemeDefault
import io.noties.markwon.syntax.SyntaxHighlightPlugin
import io.noties.prism4j.Prism4j
import kotlinx.coroutines.launch

/**
 * 文档查看界面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentViewerScreen(
    taskId: Int,
    documentId: Int,
    onNavigateBack: () -> Unit,
    onNavigateToEdit: (Int, Int) -> Unit,
    viewModel: DocumentViewerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var showDeleteDialog by remember { mutableStateOf(false) }
    var showMoreMenu by remember { mutableStateOf(false) }

    // 显示错误提示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Short
            )
        }
    }

    Scaffold(
        topBar = {
            if (!uiState.isFullScreen) {
                TopAppBar(
                    title = {
                        Text(
                            text = uiState.document?.title ?: "文档详情",
                            maxLines = 1
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, "返回")
                        }
                    },
                    actions = {
                        // 编辑按钮
                        IconButton(
                            onClick = {
                                uiState.document?.let { doc ->
                                    onNavigateToEdit(doc.taskId, doc.id)
                                }
                            }
                        ) {
                            Icon(Icons.Default.Edit, "编辑")
                        }

                        // 全屏按钮
                        IconButton(onClick = { viewModel.toggleFullScreen() }) {
                            Icon(Icons.Default.Fullscreen, "全屏")
                        }

                        // 更多菜单
                        Box {
                            IconButton(onClick = { showMoreMenu = true }) {
                                Icon(Icons.Default.MoreVert, "更多")
                            }

                            DropdownMenu(
                                expanded = showMoreMenu,
                                onDismissRequest = { showMoreMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("删除") },
                                    onClick = {
                                        showDeleteDialog = true
                                        showMoreMenu = false
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Default.Delete, null)
                                    }
                                )
                            }
                        }
                    }
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(if (uiState.isFullScreen) PaddingValues(0.dp) else paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                uiState.document != null -> {
                    DocumentContent(
                        document = uiState.document!!,
                        isFullScreen = uiState.isFullScreen,
                        onExitFullScreen = { viewModel.toggleFullScreen() }
                    )
                }

                else -> {
                    Text(
                        text = "文档加载失败",
                        modifier = Modifier.align(Alignment.Center),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }

    // 删除确认对话框
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("删除文档") },
            text = { Text("确定要删除这个文档吗？此操作无法撤销。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deleteDocument {
                            scope.launch {
                                snackbarHostState.showSnackbar("文档已删除")
                                onNavigateBack()
                            }
                        }
                    }
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
}

/**
 * 文档内容显示
 */
@Composable
private fun DocumentContent(
    document: Document,
    isFullScreen: Boolean,
    onExitFullScreen: () -> Unit
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    // 创建增强版Markwon实例（启用所有插件）
    val markwon = remember {
        val prism4j = Prism4j(Prism4jGrammarLocator.create())  // 代码语法识别器

        Markwon.builder(context)
            // HTML支持
            .usePlugin(HtmlPlugin.create())

            // 图片加载（Coil）
            .usePlugin(CoilImagesPlugin.create(context))

            // 删除线
            .usePlugin(StrikethroughPlugin.create())

            // 链接识别和点击
            .usePlugin(LinkifyPlugin.create())

            // ✅ 表格支持（带水平滚动）
            .usePlugin(TablePlugin.create(context))

            // ✅ 任务列表（复选框）
            .usePlugin(TaskListPlugin.create(context))

            // ✅ 代码语法高亮
            .usePlugin(SyntaxHighlightPlugin.create(
                prism4j,
                Prism4jThemeDefault.create()  // 使用默认高亮主题
            ))

            .build()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        // 全屏退出按钮
        if (isFullScreen) {
            IconButton(
                onClick = onExitFullScreen,
                modifier = Modifier.align(Alignment.End)
            ) {
                Icon(Icons.Default.FullscreenExit, "退出全屏")
            }
        }

        // 文档元信息
        if (!isFullScreen) {
            DocumentMetadata(document)
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Markdown内容渲染（优化版）
        val isDarkMode = isSystemInDarkTheme()
        AndroidView(
            factory = { ctx ->
                android.widget.TextView(ctx).apply {
                    // 适配深色/浅色模式
                    setTextColor(
                        if (isDarkMode) {
                            android.graphics.Color.parseColor("#E1E1E1")
                        } else {
                            android.graphics.Color.parseColor("#1F1F1F")
                        }
                    )

                    // 字体大小（sp单位）
                    textSize = 15f  // 从16sp减小到15sp，更紧凑

                    // 行间距优化（从1.5倍减少到1.25倍，更紧凑）
                    setLineSpacing(1f, 1.25f)

                    // 内边距优化（减少底部内边距到16dp）
                    setPadding(
                        0,
                        0,
                        0,
                        (16 * ctx.resources.displayMetrics.density).toInt()
                    )

                    // 启用文本选择
                    setTextIsSelectable(true)

                    // 渲染Markdown
                    markwon.setMarkdown(this, document.content)
                }
            },
            modifier = Modifier.fillMaxWidth()
        )
    }
}

/**
 * 文档元信息
 */
@Composable
private fun DocumentMetadata(document: Document) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // 标题
        Text(
            text = document.title,
            style = MaterialTheme.typography.headlineMedium
        )

        // 状态和类型
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            AssistChip(
                onClick = {},
                label = {
                    Text(
                        when (document.status) {
                            "draft" -> "草稿"
                            "published" -> "已发布"
                            "archived" -> "已归档"
                            else -> document.status
                        }
                    )
                }
            )

            AssistChip(
                onClick = {},
                label = { Text(document.type.uppercase()) }
            )
        }

        // 时间信息
        Text(
            text = "创建: ${formatTime(document.createdAt)}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Text(
            text = "更新: ${formatTime(document.updatedAt)}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 格式化时间显示
 */
private fun formatTime(timeString: String): String {
    return try {
        timeString.substring(0, 10)
    } catch (e: Exception) {
        timeString
    }
}
