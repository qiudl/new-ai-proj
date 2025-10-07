package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
 * 优化后的文件夹树 - 使用扁平化列表提升性能
 *
 * 性能优化:
 * 1. 将树形结构扁平化为线性列表，避免递归组合
 * 2. 使用key参数优化LazyColumn重组
 * 3. 使用remember缓存扁平化结果
 * 4. 只渲染展开状态下的子项
 */
@Composable
fun OptimizedFolderTree(
    folders: List<WorkNoteFolder>,
    selectedFolderId: Int?,
    expandedFolderIds: Set<Int>,
    onFolderClick: (WorkNoteFolder) -> Unit,
    onFolderLongPress: (WorkNoteFolder) -> Unit,
    onExpandFolder: (Int) -> Unit,
    onCreateFolder: () -> Unit,
    modifier: Modifier = Modifier
) {
    // 扁平化文件夹树，只包含应该显示的项
    val flattenedFolders = remember(folders, expandedFolderIds) {
        buildFlatList(folders, expandedFolderIds)
    }

    val listState = rememberLazyListState()

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
            LazyColumn(state = listState) {
                // 根级特殊项 - "全部笔记"
                item(key = "root") {
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
                            onFolderClick(
                                WorkNoteFolder(
                                    id = 0,
                                    name = "全部笔记",
                                    ownerId = 0,
                                    visibility = WorkNoteVisibility.PRIVATE,
                                    createdAt = "",
                                    updatedAt = ""
                                )
                            )
                        },
                        onLongClick = {}
                    )
                }

                // 扁平化的文件夹列表
                items(
                    items = flattenedFolders,
                    key = { it.folder.id }
                ) { item ->
                    FolderTreeItem(
                        folder = item.folder,
                        level = item.level,
                        isExpanded = expandedFolderIds.contains(item.folder.id),
                        isSelected = selectedFolderId == item.folder.id,
                        onExpand = { onExpandFolder(item.folder.id) },
                        onClick = { onFolderClick(item.folder) },
                        onLongClick = { onFolderLongPress(item.folder) }
                    )
                }
            }
        }
    }
}

/**
 * 扁平化文件夹列表项数据类
 */
private data class FlatFolderItem(
    val folder: WorkNoteFolder,
    val level: Int
)

/**
 * 构建扁平化文件夹列表
 *
 * 只包含应该显示的项：
 * - 根级文件夹总是显示
 * - 子文件夹只有在父文件夹展开时才显示
 *
 * @param folders 文件夹列表
 * @param expandedFolderIds 展开的文件夹ID集合
 * @param level 当前层级（用于缩进）
 * @return 扁平化的文件夹列表
 */
private fun buildFlatList(
    folders: List<WorkNoteFolder>,
    expandedFolderIds: Set<Int>,
    level: Int = 0
): List<FlatFolderItem> {
    val result = mutableListOf<FlatFolderItem>()

    folders.forEach { folder ->
        // 添加当前文件夹
        result.add(FlatFolderItem(folder, level))

        // 只有展开时才递归添加子文件夹
        if (expandedFolderIds.contains(folder.id) && !folder.children.isNullOrEmpty()) {
            result.addAll(
                buildFlatList(
                    folders = folder.children,
                    expandedFolderIds = expandedFolderIds,
                    level = level + 1
                )
            )
        }
    }

    return result
}
