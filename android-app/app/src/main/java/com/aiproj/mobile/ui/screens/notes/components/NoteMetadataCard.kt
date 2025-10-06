package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * 笔记元数据卡片
 *
 * 显示笔记的详细元信息，包括类型、优先级、可见性、创建时间等
 */
@Composable
fun NoteMetadataCard(
    note: WorkNote,
    folder: WorkNoteFolder?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "笔记信息",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            HorizontalDivider()

            // 基本信息
            MetadataRow(
                icon = Icons.Default.Folder,
                label = "文件夹",
                value = folder?.name ?: "未分类"
            )

            MetadataRow(
                icon = Icons.Default.Category,
                label = "类型",
                value = when (note.workNoteType ?: WorkNoteType.GENERAL) {
                    WorkNoteType.GENERAL -> "通用"
                    WorkNoteType.MARKDOWN -> "Markdown"
                    WorkNoteType.TEXT -> "纯文本"
                    WorkNoteType.HTML -> "HTML"
                    WorkNoteType.RESEARCH -> "研究"
                    WorkNoteType.MEETING -> "会议"
                    WorkNoteType.PROJECT -> "项目"
                }
            )

            MetadataRow(
                icon = Icons.Default.PriorityHigh,
                label = "优先级",
                value = when (note.priority ?: WorkNotePriority.MEDIUM) {
                    WorkNotePriority.CRITICAL -> "紧急"
                    WorkNotePriority.HIGH -> "高"
                    WorkNotePriority.MEDIUM -> "中"
                    WorkNotePriority.LOW -> "低"
                },
                valueColor = when (note.priority ?: WorkNotePriority.MEDIUM) {
                    WorkNotePriority.CRITICAL -> MaterialTheme.colorScheme.error
                    WorkNotePriority.HIGH -> MaterialTheme.colorScheme.tertiary
                    WorkNotePriority.MEDIUM -> MaterialTheme.colorScheme.primary
                    WorkNotePriority.LOW -> MaterialTheme.colorScheme.onSurfaceVariant
                }
            )

            MetadataRow(
                icon = when (note.visibility ?: WorkNoteVisibility.PRIVATE) {
                    WorkNoteVisibility.PRIVATE -> Icons.Default.Lock
                    WorkNoteVisibility.TEAM -> Icons.Default.Group
                    WorkNoteVisibility.PUBLIC -> Icons.Default.Public
                },
                label = "可见性",
                value = when (note.visibility ?: WorkNoteVisibility.PRIVATE) {
                    WorkNoteVisibility.PRIVATE -> "私有"
                    WorkNoteVisibility.TEAM -> "团队"
                    WorkNoteVisibility.PUBLIC -> "公开"
                }
            )

            MetadataRow(
                icon = Icons.Default.Info,
                label = "状态",
                value = when (note.status ?: WorkNoteStatus.DRAFT) {
                    WorkNoteStatus.DRAFT -> "草稿"
                    WorkNoteStatus.PUBLISHED -> "已发布"
                    WorkNoteStatus.ARCHIVED -> "已归档"
                }
            )

            // 标签
            if (!note.tags.isNullOrEmpty()) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Label,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "标签",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(note.tags) { tag ->
                            AssistChip(
                                onClick = {},
                                label = { Text(tag) }
                            )
                        }
                    }
                }
            }

            HorizontalDivider()

            // 统计信息
            MetadataRow(
                icon = Icons.Default.TextFields,
                label = "字数",
                value = note.wordCount?.toString() ?: "0"
            )

            MetadataRow(
                icon = Icons.Default.AccessTime,
                label = "阅读时长",
                value = "${note.readTime ?: 0} 分钟"
            )

            MetadataRow(
                icon = Icons.Default.Visibility,
                label = "浏览次数",
                value = note.viewCount.toString()
            )

            HorizontalDivider()

            // 时间信息
            MetadataRow(
                icon = Icons.Default.Create,
                label = "创建时间",
                value = note.createdAt?.let { formatDateTime(it) } ?: "未知"
            )

            MetadataRow(
                icon = Icons.Default.Update,
                label = "更新时间",
                value = note.updatedAt?.let { formatDateTime(it) } ?: "未知"
            )

            note.lastReadAt?.let {
                MetadataRow(
                    icon = Icons.Default.AccessTime,
                    label = "最后阅读",
                    value = formatDateTime(it)
                )
            }

            // 特殊标记
            if (note.isPinned || note.isBookmarked) {
                HorizontalDivider()

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (note.isPinned) {
                        AssistChip(
                            onClick = {},
                            label = { Text("已置顶") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.PushPin,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        )
                    }
                    if (note.isBookmarked) {
                        AssistChip(
                            onClick = {},
                            label = { Text("已收藏") },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Bookmark,
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
}

/**
 * 元数据行
 */
@Composable
private fun MetadataRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(80.dp)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = valueColor,
            modifier = Modifier.weight(1f)
        )
    }
}

/**
 * 格式化日期时间
 */
private fun formatDateTime(dateTimeStr: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
        val date = inputFormat.parse(dateTimeStr)
        date?.let { outputFormat.format(it) } ?: dateTimeStr
    } catch (e: Exception) {
        dateTimeStr
    }
}
