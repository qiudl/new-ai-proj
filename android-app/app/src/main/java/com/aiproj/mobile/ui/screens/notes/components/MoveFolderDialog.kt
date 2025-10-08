package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.WorkNoteFolder

/**
 * 移动文件夹对话框
 *
 * 允许用户选择目标位置移动文件夹，自动过滤掉循环引用的选项
 */
@Composable
fun MoveFolderDialog(
    folderToMove: WorkNoteFolder,
    availableFolders: List<WorkNoteFolder>,
    onDismiss: () -> Unit,
    onConfirm: (targetParentId: Int?) -> Unit
) {
    var selectedFolderId by remember { mutableStateOf<Int?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("移动文件夹: ${folderToMove.name}")
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "选择目标位置",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // 根目录选项
                FolderSelectionItem(
                    folder = null,
                    isSelected = selectedFolderId == null,
                    onClick = { selectedFolderId = null },
                    level = 0
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                // 文件夹列表（过滤掉自身和子文件夹）
                LazyColumn {
                    items(
                        availableFolders.filter {
                            it.id != folderToMove.id &&
                            !isDescendantOf(it, folderToMove, availableFolders)
                        }
                    ) { folder ->
                        FolderSelectionItem(
                            folder = folder,
                            isSelected = selectedFolderId == folder.id,
                            onClick = { selectedFolderId = folder.id },
                            level = 0
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(selectedFolderId) }
            ) {
                Text("移动")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

/**
 * 文件夹选择项
 */
@Composable
private fun FolderSelectionItem(
    folder: WorkNoteFolder?,
    isSelected: Boolean,
    onClick: () -> Unit,
    level: Int
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        color = if (isSelected) {
            MaterialTheme.colorScheme.primaryContainer
        } else {
            MaterialTheme.colorScheme.surface
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = (16 + level * 24).dp,
                    top = 12.dp,
                    end = 16.dp,
                    bottom = 12.dp
                ),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = if (folder == null) {
                    Icons.Default.Home
                } else {
                    Icons.Default.Folder
                },
                contentDescription = null,
                tint = if (isSelected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                }
            )

            Text(
                text = folder?.name ?: "根目录",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f)
            )

            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

/**
 * 检查folder是否是ancestor的后代（防止循环引用）
 */
private fun isDescendantOf(
    folder: WorkNoteFolder,
    ancestor: WorkNoteFolder,
    allFolders: List<WorkNoteFolder>
): Boolean {
    var currentId: Int? = folder.parentId
    val visited = mutableSetOf<Int>()

    while (currentId != null) {
        if (currentId == ancestor.id) {
            return true
        }
        if (visited.contains(currentId)) {
            // 检测到循环引用，停止检查
            break
        }
        visited.add(currentId)

        // 查找父文件夹
        val parent = allFolders.find { it.id == currentId }
        currentId = parent?.parentId
    }

    return false
}
