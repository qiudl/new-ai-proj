package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.WorkNoteVisibility

/**
 * 文档转换对话框
 *
 * 用于将笔记转换为任务文档，或将任务文档转换为笔记
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentConversionDialog(
    conversionType: ConversionType,
    onDismiss: () -> Unit,
    onConfirm: (ConversionOptions) -> Unit,
    modifier: Modifier = Modifier
) {
    var targetId by remember { mutableStateOf("") }
    var preserveOriginal by remember { mutableStateOf(true) }
    var copyRelations by remember { mutableStateOf(true) }
    var visibility by remember { mutableStateOf(WorkNoteVisibility.PRIVATE) }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = modifier
    ) {
        Card {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 标题
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = when (conversionType) {
                                ConversionType.NOTE_TO_TASK_DOC -> Icons.Default.SwapHoriz
                                ConversionType.TASK_DOC_TO_NOTE -> Icons.Default.SwapHoriz
                            },
                            contentDescription = null
                        )
                        Text(
                            text = when (conversionType) {
                                ConversionType.NOTE_TO_TASK_DOC -> "转换为任务文档"
                                ConversionType.TASK_DOC_TO_NOTE -> "转换为笔记"
                            },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "关闭")
                    }
                }

                HorizontalDivider()

                // 说明文本
                Text(
                    text = when (conversionType) {
                        ConversionType.NOTE_TO_TASK_DOC -> "将此笔记转换为指定任务的文档"
                        ConversionType.TASK_DOC_TO_NOTE -> "将任务文档转换为独立笔记"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // 目标ID输入（仅笔记转任务文档需要）
                if (conversionType == ConversionType.NOTE_TO_TASK_DOC) {
                    OutlinedTextField(
                        value = targetId,
                        onValueChange = { targetId = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("目标任务ID") },
                        placeholder = { Text("请输入任务ID") },
                        leadingIcon = {
                            Icon(Icons.Default.Task, null)
                        },
                        singleLine = true,
                        isError = targetId.isNotEmpty() && targetId.toIntOrNull() == null
                    )
                }

                // 选项
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "转换选项",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )

                    // 保留原始文档
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "保留原始文档",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = "转换后保留源文档",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = preserveOriginal,
                            onCheckedChange = { preserveOriginal = it }
                        )
                    }

                    // 复制关联关系
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "复制关联关系",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = "将关联的任务和笔记同时复制",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = copyRelations,
                            onCheckedChange = { copyRelations = it }
                        )
                    }

                    // 可见性（仅任务文档转笔记需要）
                    if (conversionType == ConversionType.TASK_DOC_TO_NOTE) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "笔记可见性",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                WorkNoteVisibility.values().forEach { v ->
                                    FilterChip(
                                        selected = visibility == v,
                                        onClick = { visibility = v },
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
                        }
                    }
                }

                HorizontalDivider()

                // 按钮
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("取消")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val options = ConversionOptions(
                                targetId = when (conversionType) {
                                    ConversionType.NOTE_TO_TASK_DOC -> targetId.toIntOrNull()
                                    ConversionType.TASK_DOC_TO_NOTE -> null
                                },
                                preserveOriginal = preserveOriginal,
                                copyRelations = copyRelations,
                                visibility = visibility
                            )
                            onConfirm(options)
                        },
                        enabled = when (conversionType) {
                            ConversionType.NOTE_TO_TASK_DOC -> targetId.toIntOrNull() != null
                            ConversionType.TASK_DOC_TO_NOTE -> true
                        }
                    ) {
                        Icon(Icons.Default.Check, null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("确认转换")
                    }
                }
            }
        }
    }
}

/**
 * 转换类型
 */
enum class ConversionType {
    NOTE_TO_TASK_DOC,  // 笔记 -> 任务文档
    TASK_DOC_TO_NOTE   // 任务文档 -> 笔记
}

/**
 * 转换选项
 */
data class ConversionOptions(
    val targetId: Int?,
    val preserveOriginal: Boolean,
    val copyRelations: Boolean,
    val visibility: WorkNoteVisibility
)
