package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.WorkNoteFolder
import com.aiproj.mobile.data.models.WorkNoteVisibility

/**
 * 文件夹树组件
 *
 * 显示完整的文件夹层级结构，支持展开/折叠、选择、长按操作
 */
@Composable
fun FolderTree(
    folders: List<WorkNoteFolder>,
    selectedFolderId: Int?,
    expandedFolderIds: Set<Int>,
    onFolderClick: (WorkNoteFolder) -> Unit,
    onFolderLongPress: (WorkNoteFolder) -> Unit,
    onExpandFolder: (Int) -> Unit,
    onCreateFolder: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // 顶部工具栏
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "文件夹",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            IconButton(onClick = onCreateFolder) {
                Icon(
                    imageVector = Icons.Default.CreateNewFolder,
                    contentDescription = "新建文件夹"
                )
            }
        }

        HorizontalDivider()

        // 文件夹树列表
        if (folders.isEmpty()) {
            // 空状态
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.FolderOpen,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "暂无文件夹",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = onCreateFolder) {
                        Icon(Icons.Default.Add, null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("创建文件夹")
                    }
                }
            }
        } else {
            LazyColumn {
                // 根级特殊项 - "全部笔记"
                item {
                    FolderTreeItem(
                        folder = WorkNoteFolder(
                            id = 0,
                            name = "全部笔记",
                            ownerId = 0,
                            visibility = WorkNoteVisibility.PRIVATE,
                            createdAt = "",
                            updatedAt = ""
                        ),
                        level = 0,
                        isExpanded = false,
                        isSelected = selectedFolderId == null || selectedFolderId == 0,
                        onExpand = {},
                        onClick = {
                            onFolderClick(WorkNoteFolder(
                                id = 0,
                                name = "全部笔记",
                                ownerId = 0,
                                visibility = WorkNoteVisibility.PRIVATE,
                                createdAt = "",
                                updatedAt = ""
                            ))
                        },
                        onLongClick = {}
                    )
                }

                // 根级文件夹
                items(folders.filter { it.parentId == null }) { folder ->
                    FolderTreeItemRecursive(
                        folder = folder,
                        level = 0,
                        selectedFolderId = selectedFolderId,
                        expandedFolderIds = expandedFolderIds,
                        onFolderClick = onFolderClick,
                        onFolderLongPress = onFolderLongPress,
                        onExpandFolder = onExpandFolder
                    )
                }
            }
        }
    }
}

/**
 * 递归渲染文件夹树项
 */
@Composable
private fun FolderTreeItemRecursive(
    folder: WorkNoteFolder,
    level: Int,
    selectedFolderId: Int?,
    expandedFolderIds: Set<Int>,
    onFolderClick: (WorkNoteFolder) -> Unit,
    onFolderLongPress: (WorkNoteFolder) -> Unit,
    onExpandFolder: (Int) -> Unit
) {
    val isExpanded = expandedFolderIds.contains(folder.id)

    Column {
        FolderTreeItem(
            folder = folder,
            level = level,
            isExpanded = isExpanded,
            isSelected = selectedFolderId == folder.id,
            onExpand = { onExpandFolder(folder.id) },
            onClick = { onFolderClick(folder) },
            onLongClick = { onFolderLongPress(folder) }
        )

        // 递归渲染子文件夹
        if (isExpanded && folder.children != null) {
            folder.children.forEach { childFolder ->
                FolderTreeItemRecursive(
                    folder = childFolder,
                    level = level + 1,
                    selectedFolderId = selectedFolderId,
                    expandedFolderIds = expandedFolderIds,
                    onFolderClick = onFolderClick,
                    onFolderLongPress = onFolderLongPress,
                    onExpandFolder = onExpandFolder
                )
            }
        }
    }
}
