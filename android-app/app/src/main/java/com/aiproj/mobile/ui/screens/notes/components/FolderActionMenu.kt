package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.aiproj.mobile.data.models.WorkNoteFolder

/**
 * 文件夹操作菜单
 *
 * 长按文件夹时显示的上下文菜单，提供重命名、创建子文件夹、移动、删除等操作
 */
@Composable
fun FolderActionMenu(
    folder: WorkNoteFolder,
    expanded: Boolean,
    onDismiss: () -> Unit,
    onRename: () -> Unit,
    onCreateSubfolder: () -> Unit,
    onMove: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        modifier = modifier
    ) {
        DropdownMenuItem(
            text = { Text("重命名") },
            onClick = {
                onDismiss()
                onRename()
            },
            leadingIcon = {
                Icon(Icons.Default.Edit, contentDescription = null)
            }
        )

        DropdownMenuItem(
            text = { Text("新建子文件夹") },
            onClick = {
                onDismiss()
                onCreateSubfolder()
            },
            leadingIcon = {
                Icon(Icons.Default.CreateNewFolder, contentDescription = null)
            }
        )

        DropdownMenuItem(
            text = { Text("移动文件夹") },
            onClick = {
                onDismiss()
                onMove()
            },
            leadingIcon = {
                Icon(Icons.Default.DriveFileMove, contentDescription = null)
            }
        )

        HorizontalDivider()

        DropdownMenuItem(
            text = { Text("删除") },
            onClick = {
                onDismiss()
                onDelete()
            },
            leadingIcon = {
                Icon(Icons.Default.Delete, contentDescription = null)
            },
            colors = MenuDefaults.itemColors(
                textColor = MaterialTheme.colorScheme.error,
                leadingIconColor = MaterialTheme.colorScheme.error
            )
        )
    }
}
