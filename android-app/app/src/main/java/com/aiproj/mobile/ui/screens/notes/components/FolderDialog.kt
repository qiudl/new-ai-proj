package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.WorkNoteVisibility
import com.aiproj.mobile.data.models.WorkNoteFolder

/**
 * 创建/编辑文件夹对话框
 *
 * 支持设置文件夹名称、描述、颜色、可见性
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FolderDialog(
    folder: WorkNoteFolder? = null,
    parentFolder: WorkNoteFolder? = null,
    onDismiss: () -> Unit,
    onConfirm: (name: String, description: String?, color: String?, visibility: WorkNoteVisibility) -> Unit
) {
    var name by remember { mutableStateOf(folder?.name ?: "") }
    var description by remember { mutableStateOf(folder?.description ?: "") }
    var selectedColor by remember { mutableStateOf(folder?.color ?: "#2196F3") }
    var selectedVisibility by remember { mutableStateOf(folder?.visibility ?: WorkNoteVisibility.PRIVATE) }
    var nameError by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(text = if (folder == null) "新建文件夹" else "编辑文件夹")
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 父文件夹提示
                if (parentFolder != null) {
                    Text(
                        text = "父文件夹: ${parentFolder.name}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // 文件夹名称
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        nameError = it.isBlank()
                    },
                    label = { Text("文件夹名称") },
                    isError = nameError,
                    supportingText = if (nameError) {
                        { Text("请输入文件夹名称") }
                    } else null,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                // 描述
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("描述（可选）") },
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )

                // 颜色选择
                Column {
                    Text(
                        text = "颜色",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        folderColors.forEach { color ->
                            ColorOption(
                                color = color,
                                isSelected = selectedColor == color,
                                onClick = { selectedColor = color }
                            )
                        }
                    }
                }

                // 可见性选择
                Column {
                    Text(
                        text = "可见性",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        VisibilityChip(
                            visibility = WorkNoteVisibility.PRIVATE,
                            isSelected = selectedVisibility == WorkNoteVisibility.PRIVATE,
                            onClick = { selectedVisibility = WorkNoteVisibility.PRIVATE }
                        )
                        VisibilityChip(
                            visibility = WorkNoteVisibility.TEAM,
                            isSelected = selectedVisibility == WorkNoteVisibility.TEAM,
                            onClick = { selectedVisibility = WorkNoteVisibility.TEAM }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (name.isNotBlank()) {
                        onConfirm(
                            name,
                            description.ifBlank { null },
                            selectedColor,
                            selectedVisibility
                        )
                    } else {
                        nameError = true
                    }
                }
            ) {
                Text("确认")
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
 * 颜色选择项
 */
@Composable
private fun ColorOption(
    color: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.size(40.dp),
        shape = MaterialTheme.shapes.small,
        color = try {
            Color(android.graphics.Color.parseColor(color))
        } catch (e: Exception) {
            MaterialTheme.colorScheme.primary
        },
        border = if (isSelected) {
            BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
        } else null
    ) {
        if (isSelected) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

/**
 * 可见性选择芯片
 */
@Composable
private fun VisibilityChip(
    visibility: WorkNoteVisibility,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = isSelected,
        onClick = onClick,
        label = {
            Text(
                text = when (visibility) {
                    WorkNoteVisibility.PRIVATE -> "私有"
                    WorkNoteVisibility.TEAM -> "团队"
                    WorkNoteVisibility.PUBLIC -> "公开"
                }
            )
        }
    )
}

/**
 * 预设的文件夹颜色
 */
private val folderColors = listOf(
    "#2196F3", // Blue
    "#4CAF50", // Green
    "#FF9800", // Orange
    "#9C27B0", // Purple
    "#F44336", // Red
    "#00BCD4", // Cyan
    "#8BC34A", // Light Green
    "#FF5722"  // Deep Orange
)
