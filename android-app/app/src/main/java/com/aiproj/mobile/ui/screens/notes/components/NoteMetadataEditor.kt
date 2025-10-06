package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.*

/**
 * 笔记元信息编辑器
 *
 * 提供笔记类型、优先级、可见性、标签、文件夹等元信息的编辑功能
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteMetadataEditor(
    selectedFolder: WorkNoteFolder?,
    noteType: WorkNoteType,
    priority: WorkNotePriority,
    visibility: WorkNoteVisibility,
    tags: List<String>,
    folders: List<WorkNoteFolder>,
    onFolderChange: (WorkNoteFolder?) -> Unit,
    onTypeChange: (WorkNoteType) -> Unit,
    onPriorityChange: (WorkNotePriority) -> Unit,
    onVisibilityChange: (WorkNoteVisibility) -> Unit,
    onTagsChange: (List<String>) -> Unit,
    modifier: Modifier = Modifier
) {
    var showFolderDialog by remember { mutableStateOf(false) }
    var tagInput by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 文件夹选择
        Text(
            text = "所属文件夹",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        OutlinedCard(
            onClick = { showFolderDialog = true },
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = selectedFolder?.name ?: "未分类",
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        HorizontalDivider()

        // 笔记类型
        Text(
            text = "笔记类型",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            WorkNoteType.values().forEach { type ->
                FilterChip(
                    selected = noteType == type,
                    onClick = { onTypeChange(type) },
                    label = {
                        Text(
                            text = when (type) {
                                WorkNoteType.GENERAL -> "通用"
                                WorkNoteType.MARKDOWN -> "Markdown"
                                WorkNoteType.TEXT -> "纯文本"
                                WorkNoteType.HTML -> "HTML"
                                WorkNoteType.RESEARCH -> "研究"
                                WorkNoteType.MEETING -> "会议"
                                WorkNoteType.PROJECT -> "项目"
                            }
                        )
                    },
                    leadingIcon = if (noteType == type) {
                        {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    } else null
                )
            }
        }

        HorizontalDivider()

        // 优先级
        Text(
            text = "优先级",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            WorkNotePriority.values().forEach { p ->
                FilterChip(
                    selected = priority == p,
                    onClick = { onPriorityChange(p) },
                    label = {
                        Text(
                            text = when (p) {
                                WorkNotePriority.CRITICAL -> "紧急"
                                WorkNotePriority.HIGH -> "高"
                                WorkNotePriority.MEDIUM -> "中"
                                WorkNotePriority.LOW -> "低"
                            }
                        )
                    },
                    leadingIcon = if (priority == p) {
                        {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    } else null,
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = when (p) {
                            WorkNotePriority.CRITICAL -> MaterialTheme.colorScheme.errorContainer
                            WorkNotePriority.HIGH -> MaterialTheme.colorScheme.tertiaryContainer
                            WorkNotePriority.MEDIUM -> MaterialTheme.colorScheme.primaryContainer
                            WorkNotePriority.LOW -> MaterialTheme.colorScheme.surfaceVariant
                        }
                    )
                )
            }
        }

        HorizontalDivider()

        // 可见性
        Text(
            text = "可见性",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            WorkNoteVisibility.values().forEach { v ->
                FilterChip(
                    selected = visibility == v,
                    onClick = { onVisibilityChange(v) },
                    label = {
                        Text(
                            text = when (v) {
                                WorkNoteVisibility.PRIVATE -> "私有"
                                WorkNoteVisibility.TEAM -> "团队"
                                WorkNoteVisibility.PUBLIC -> "公开"
                            }
                        )
                    },
                    leadingIcon = {
                        Icon(
                            imageVector = when (v) {
                                WorkNoteVisibility.PRIVATE -> Icons.Default.Lock
                                WorkNoteVisibility.TEAM -> Icons.Default.Group
                                WorkNoteVisibility.PUBLIC -> Icons.Default.Public
                            },
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                )
            }
        }

        HorizontalDivider()

        // 标签管理
        Text(
            text = "标签",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // 标签输入框
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = tagInput,
                onValueChange = { tagInput = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("输入标签...") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(
                    onDone = {
                        if (tagInput.isNotBlank() && !tags.contains(tagInput.trim())) {
                            onTagsChange(tags + tagInput.trim())
                            tagInput = ""
                        }
                    }
                ),
                trailingIcon = {
                    if (tagInput.isNotBlank()) {
                        IconButton(
                            onClick = {
                                if (tagInput.isNotBlank() && !tags.contains(tagInput.trim())) {
                                    onTagsChange(tags + tagInput.trim())
                                    tagInput = ""
                                }
                            }
                        ) {
                            Icon(Icons.Default.Add, "添加标签")
                        }
                    }
                }
            )
        }

        // 已有标签
        if (tags.isNotEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(tags) { tag ->
                    AssistChip(
                        onClick = {},
                        label = { Text(tag) },
                        trailingIcon = {
                            IconButton(
                                onClick = { onTagsChange(tags - tag) },
                                modifier = Modifier.size(18.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "移除标签",
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    )
                }
            }
        } else {
            Text(
                text = "暂无标签",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
        }
    }

    // 文件夹选择对话框
    if (showFolderDialog) {
        FolderPickerDialog(
            folders = folders,
            selectedFolder = selectedFolder,
            onDismiss = { showFolderDialog = false },
            onConfirm = { folder ->
                onFolderChange(folder)
                showFolderDialog = false
            }
        )
    }
}

/**
 * 文件夹选择对话框
 */
@Composable
private fun FolderPickerDialog(
    folders: List<WorkNoteFolder>,
    selectedFolder: WorkNoteFolder?,
    onDismiss: () -> Unit,
    onConfirm: (WorkNoteFolder?) -> Unit
) {
    var tempSelection by remember { mutableStateOf(selectedFolder) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("选择文件夹") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // "未分类"选项
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = tempSelection == null,
                        onClick = { tempSelection = null }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        imageVector = Icons.Default.FolderOff,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("未分类")
                }

                // 文件夹列表
                folders.forEach { folder ->
                    FolderPickerItem(
                        folder = folder,
                        isSelected = tempSelection?.id == folder.id,
                        onSelect = { tempSelection = folder },
                        level = 0
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(tempSelection) }) {
                Text("确定")
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
 * 文件夹选择项（支持递归显示子文件夹）
 */
@Composable
private fun FolderPickerItem(
    folder: WorkNoteFolder,
    isSelected: Boolean,
    onSelect: () -> Unit,
    level: Int
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = (level * 16).dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            RadioButton(
                selected = isSelected,
                onClick = onSelect
            )
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                imageVector = Icons.Default.Folder,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(folder.name)
        }

        // 递归显示子文件夹
        folder.children?.forEach { child ->
            FolderPickerItem(
                folder = child,
                isSelected = isSelected,
                onSelect = onSelect,
                level = level + 1
            )
        }
    }
}
