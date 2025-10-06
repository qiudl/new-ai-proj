package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp

/**
 * Markdown编辑器组件
 *
 * 支持编辑模式和预览模式切换
 */
@Composable
fun MarkdownEditor(
    content: String,
    onContentChange: (String) -> Unit,
    isPreviewMode: Boolean,
    onTogglePreview: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxSize()) {
        // 编辑器工具栏
        MarkdownToolbar(
            isPreviewMode = isPreviewMode,
            onTogglePreview = onTogglePreview,
            onInsertBold = { insertMarkdown(content, onContentChange, "**", "**") },
            onInsertItalic = { insertMarkdown(content, onContentChange, "*", "*") },
            onInsertHeading = { insertMarkdown(content, onContentChange, "## ", "") },
            onInsertList = { insertMarkdown(content, onContentChange, "- ", "") },
            onInsertCode = { insertMarkdown(content, onContentChange, "```\n", "\n```") },
            onInsertLink = { insertMarkdown(content, onContentChange, "[", "](url)") },
            onInsertImage = { insertMarkdown(content, onContentChange, "![", "](url)") }
        )

        HorizontalDivider()

        // 编辑/预览区域
        if (isPreviewMode) {
            MarkdownPreview(
                content = content,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            )
        } else {
            MarkdownTextField(
                content = content,
                onContentChange = onContentChange,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            )
        }
    }
}

/**
 * Markdown文本编辑框
 */
@Composable
private fun MarkdownTextField(
    content: String,
    onContentChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    BasicTextField(
        value = content,
        onValueChange = onContentChange,
        modifier = modifier.verticalScroll(scrollState),
        textStyle = TextStyle(
            fontSize = MaterialTheme.typography.bodyLarge.fontSize,
            color = MaterialTheme.colorScheme.onSurface,
            lineHeight = MaterialTheme.typography.bodyLarge.lineHeight
        ),
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        decorationBox = { innerTextField ->
            Box(modifier = Modifier.fillMaxSize()) {
                if (content.isEmpty()) {
                    Text(
                        text = "开始写作...",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                }
                innerTextField()
            }
        }
    )
}

/**
 * Markdown预览组件
 *
 * 使用AndroidView集成Markwon库进行渲染
 */
@Composable
private fun MarkdownPreview(
    content: String,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    // 使用AndroidView集成Markwon
    androidx.compose.ui.viewinterop.AndroidView(
        modifier = modifier.verticalScroll(scrollState),
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
                // TODO: 添加语法高亮（需要配置Prism4j注解处理器）
                // .usePlugin(io.noties.markwon.syntax.SyntaxHighlightPlugin.create(...))
                .build()

            markwon.setMarkdown(textView, content)
        }
    )
}

/**
 * 插入Markdown语法
 */
private fun insertMarkdown(
    currentContent: String,
    onContentChange: (String) -> Unit,
    prefix: String,
    suffix: String
) {
    // 简化实现：在末尾插入
    val newContent = currentContent + prefix + suffix
    onContentChange(newContent)
}
