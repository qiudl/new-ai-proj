package com.aiproj.mobile.ui.document.version

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.Label
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.DocumentVersionDto
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * 版本列表项组件
 *
 * 显示单个版本的信息
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VersionListItem(
    version: DocumentVersionDto,
    onClick: () -> Unit,
    onRestore: () -> Unit,
    modifier: Modifier = Modifier,
    isComparisonMode: Boolean = false,
    isSelected: Boolean = false,
    selectionLabel: String? = null,
    onCopySuccess: () -> Unit = {}
) {
    var showRestoreDialog by remember { mutableStateOf(false) }
    val clipboardManager = LocalClipboardManager.current

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = if (isSelected) {
            CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        } else {
            CardDefaults.cardColors()
        },
        border = if (isSelected) {
            androidx.compose.foundation.BorderStroke(
                width = 2.dp,
                color = MaterialTheme.colorScheme.primary
            )
        } else null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 版本号和标签
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 版本号
                    Text(
                        text = "版本 ${version.versionNumber}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    // 选择标签（对比模式下）
                    selectionLabel?.let { label ->
                        AssistChip(
                            onClick = { },
                            label = { Text(label) },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                            },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                labelColor = MaterialTheme.colorScheme.onPrimary
                            )
                        )
                    }

                    // 标签（如果有）
                    version.tag?.let { tag ->
                        AssistChip(
                            onClick = { },
                            label = { Text(tag) },
                            leadingIcon = {
                                Icon(
                                    Icons.AutoMirrored.Filled.Label,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        )
                    }
                }

                // 变更类型标识
                ChangeTypeChip(changeType = version.changeType ?: "updated")
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 标题（可选择复制）
            SelectionContainer {
                Text(
                    text = version.title ?: "",
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // 变更描述（如果有，可选择复制）
            version.changeDescription?.let { description ->
                Spacer(modifier = Modifier.height(4.dp))
                SelectionContainer {
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 元信息
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 创建者和时间
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = version.creatorName ?: "用户${version.createdBy ?: 0}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = formatDate(version.createdAt ?: ""),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // 操作按钮
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 内容大小
                    AssistChip(
                        onClick = { },
                        label = {
                            Text(
                                text = "${version.contentLength ?: 0} 字符",
                                style = MaterialTheme.typography.labelSmall
                            )
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Description,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    )

                    // 复制按钮
                    FilledTonalButton(
                        onClick = {
                            val textToCopy = buildString {
                                appendLine("版本 ${version.versionNumber}")
                                appendLine("标题: ${version.title ?: ""}")
                                version.changeDescription?.let {
                                    appendLine("描述: $it")
                                }
                                appendLine("创建者: ${version.creatorName ?: "用户${version.createdBy ?: 0}"}")
                                appendLine("时间: ${formatDate(version.createdAt ?: "")}")
                                appendLine("内容长度: ${version.contentLength ?: 0} 字符")
                            }
                            clipboardManager.setText(AnnotatedString(textToCopy))
                            onCopySuccess()
                        },
                        modifier = Modifier.height(32.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp)
                    ) {
                        Icon(
                            Icons.Default.ContentCopy,
                            contentDescription = "复制",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("复制", style = MaterialTheme.typography.labelMedium)
                    }

                    // 恢复按钮
                    FilledTonalButton(
                        onClick = { showRestoreDialog = true },
                        modifier = Modifier.height(32.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp)
                    ) {
                        Icon(
                            Icons.Default.Restore,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("恢复", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }

    // 恢复确认对话框
    if (showRestoreDialog) {
        AlertDialog(
            onDismissRequest = { showRestoreDialog = false },
            title = { Text("确认恢复") },
            text = {
                Text("确定要将文档恢复到版本 ${version.versionNumber} 吗？\n\n这将创建一个新版本，原有内容不会丢失。")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        onRestore()
                        showRestoreDialog = false
                    }
                ) {
                    Text("确定")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRestoreDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}

/**
 * 变更类型标识
 */
@Composable
private fun ChangeTypeChip(changeType: String) {
    val (icon, label, color) = when (changeType.lowercase()) {
        "created" -> Triple(
            Icons.Default.Add,
            "创建",
            MaterialTheme.colorScheme.primary
        )
        "updated" -> Triple(
            Icons.Default.Edit,
            "修改",
            MaterialTheme.colorScheme.tertiary
        )
        "restored" -> Triple(
            Icons.Default.Restore,
            "恢复",
            MaterialTheme.colorScheme.secondary
        )
        else -> Triple(
            Icons.Default.Description,
            changeType,
            MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}

/**
 * 格式化日期
 */
private fun formatDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
        val date = inputFormat.parse(dateString.substringBefore("Z").substringBefore("+"))
        outputFormat.format(date ?: Date())
    } catch (e: Exception) {
        dateString
    }
}
