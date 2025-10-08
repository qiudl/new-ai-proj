package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

/**
 * Markdown编辑器工具栏
 *
 * 提供常用Markdown语法快捷按钮
 */
@Composable
fun MarkdownToolbar(
    isPreviewMode: Boolean,
    onTogglePreview: () -> Unit,
    onInsertBold: () -> Unit,
    onInsertItalic: () -> Unit,
    onInsertHeading: () -> Unit,
    onInsertList: () -> Unit,
    onInsertCode: () -> Unit,
    onInsertLink: () -> Unit,
    onInsertImage: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        tonalElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 预览切换
            IconButton(onClick = onTogglePreview) {
                Icon(
                    imageVector = if (isPreviewMode) Icons.Default.Edit else Icons.Default.Visibility,
                    contentDescription = if (isPreviewMode) "编辑" else "预览",
                    tint = if (isPreviewMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            VerticalDivider(modifier = Modifier.height(24.dp))

            // 格式化按钮（仅编辑模式显示）
            if (!isPreviewMode) {
                ToolbarButton(
                    icon = Icons.Default.FormatBold,
                    contentDescription = "加粗",
                    onClick = onInsertBold
                )

                ToolbarButton(
                    icon = Icons.Default.FormatItalic,
                    contentDescription = "斜体",
                    onClick = onInsertItalic
                )

                ToolbarButton(
                    icon = Icons.Default.Title,
                    contentDescription = "标题",
                    onClick = onInsertHeading
                )

                ToolbarButton(
                    icon = Icons.Default.FormatListBulleted,
                    contentDescription = "列表",
                    onClick = onInsertList
                )

                ToolbarButton(
                    icon = Icons.Default.Code,
                    contentDescription = "代码块",
                    onClick = onInsertCode
                )

                ToolbarButton(
                    icon = Icons.Default.Link,
                    contentDescription = "链接",
                    onClick = onInsertLink
                )

                ToolbarButton(
                    icon = Icons.Default.Image,
                    contentDescription = "图片",
                    onClick = onInsertImage
                )
            }
        }
    }
}

/**
 * 工具栏按钮
 */
@Composable
private fun ToolbarButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit
) {
    IconButton(
        onClick = onClick,
        modifier = Modifier.size(40.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            modifier = Modifier.size(20.dp)
        )
    }
}
