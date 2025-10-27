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
 * 按可见性分组显示完整的文件夹层级结构，支持展开/折叠、选择、长按操作
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
    // 按可见性分组（只取根级文件夹）
    val rootFolders = folders.filter { it.parentId == null }
    val privateFolders = rootFolders.filter { it.visibility == WorkNoteVisibility.PRIVATE }
    val teamFolders = rootFolders.filter { it.visibility == WorkNoteVisibility.TEAM }
    val publicFolders = rootFolders.filter { it.visibility == WorkNoteVisibility.PUBLIC }

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

                // 私人文件夹分组
                if (privateFolders.isNotEmpty()) {
                    item {
                        FolderGroupHeader(
                            title = "私人文件夹",
                            icon = Icons.Default.Lock,
                            count = privateFolders.size
                        )
                    }
                    items(privateFolders) { folder ->
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

                // 团队文件夹分组
                if (teamFolders.isNotEmpty()) {
                    item {
                        FolderGroupHeader(
                            title = "团队文件夹",
                            icon = Icons.Default.Group,
                            count = teamFolders.size
                        )
                    }
                    items(teamFolders) { folder ->
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

                // 公开文件夹分组
                if (publicFolders.isNotEmpty()) {
                    item {
                        FolderGroupHeader(
                            title = "公开文件夹",
                            icon = Icons.Default.Public,
                            count = publicFolders.size
                        )
                    }
                    items(publicFolders) { folder ->
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
}

/**
 * 文件夹分组标题
 */
@Composable
private fun FolderGroupHeader(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    count: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = "($count)",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
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
