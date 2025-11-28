package com.aiproj.mobile.ui.screens.notes.components

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.util.DateTimeUtils
import com.aiproj.mobile.data.models.displayName
import com.aiproj.mobile.data.models.safeWorkNoteType
import com.aiproj.mobile.data.models.safePriority
import com.aiproj.mobile.data.models.safeVisibility
import com.aiproj.mobile.data.models.safeStatus
import com.aiproj.mobile.data.models.safeWordCount
import com.aiproj.mobile.data.models.safeReadTime
import com.aiproj.mobile.data.models.safeViewCount
import com.aiproj.mobile.data.models.safeTags
import com.aiproj.mobile.data.models.safeIsPinned
import com.aiproj.mobile.data.models.safeIsBookmarked

private const val TAG = "NoteMetadataCard"

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
    // 添加调试日志
    LaunchedEffect(note.id) {
        Log.d(TAG, "=== 笔记元数据调试 ===")
        Log.d(TAG, "笔记ID: ${note.id}")
        Log.d(TAG, "标题: ${note.title}")
        Log.d(TAG, "原始字段值:")
        Log.d(TAG, "  workNoteType (原始): ${note.workNoteType}")
        Log.d(TAG, "  priority (原始): ${note.priority}")
        Log.d(TAG, "  visibility (原始): ${note.visibility}")
        Log.d(TAG, "  status (原始): ${note.status}")
        Log.d(TAG, "  wordCount (原始): ${note.wordCount}")
        Log.d(TAG, "  readTime (原始): ${note.readTime}")
        Log.d(TAG, "  viewCount (原始): ${note.viewCount}")
        Log.d(TAG, "  tags (原始): ${note.tags}")
        Log.d(TAG, "扩展函数返回值:")
        Log.d(TAG, "  safeWorkNoteType: ${note.safeWorkNoteType}")
        Log.d(TAG, "  safePriority: ${note.safePriority}")
        Log.d(TAG, "  safeVisibility: ${note.safeVisibility}")
        Log.d(TAG, "  safeStatus: ${note.safeStatus}")
        Log.d(TAG, "  displayName示例: ${note.safeWorkNoteType.displayName}")
        Log.d(TAG, "时间字段:")
        Log.d(TAG, "  createdAt: ${note.createdAt}")
        Log.d(TAG, "  updatedAt: ${note.updatedAt}")
        Log.d(TAG, "文件夹信息: ${folder?.name ?: "null"}")
        Log.d(TAG, "====================")
    }
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
                value = note.safeWorkNoteType.displayName
            )

            MetadataRow(
                icon = Icons.Default.PriorityHigh,
                label = "优先级",
                value = note.safePriority.displayName,
                valueColor = when (note.safePriority) {
                    WorkNotePriority.CRITICAL -> MaterialTheme.colorScheme.error
                    WorkNotePriority.HIGH -> MaterialTheme.colorScheme.tertiary
                    WorkNotePriority.MEDIUM -> MaterialTheme.colorScheme.primary
                    WorkNotePriority.LOW -> MaterialTheme.colorScheme.onSurfaceVariant
                }
            )

            MetadataRow(
                icon = when (note.safeVisibility) {
                    WorkNoteVisibility.PRIVATE -> Icons.Default.Lock
                    WorkNoteVisibility.TEAM -> Icons.Default.Group
                    WorkNoteVisibility.PUBLIC -> Icons.Default.Public
                },
                label = "可见性",
                value = note.safeVisibility.displayName
            )

            MetadataRow(
                icon = Icons.Default.Info,
                label = "状态",
                value = note.safeStatus.displayName
            )

            // 标签
            if (note.safeTags.isNotEmpty()) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Label,
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
                        items(note.safeTags) { tag ->
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
                value = note.safeWordCount.toString()
            )

            MetadataRow(
                icon = Icons.Default.AccessTime,
                label = "阅读时长",
                value = "${note.safeReadTime} 分钟"
            )

            MetadataRow(
                icon = Icons.Default.Visibility,
                label = "浏览次数",
                value = note.safeViewCount.toString()
            )

            HorizontalDivider()

            // 时间信息
            MetadataRow(
                icon = Icons.Default.Create,
                label = "创建时间",
                value = DateTimeUtils.formatFullDateTime(note.createdAt)
            )

            MetadataRow(
                icon = Icons.Default.Update,
                label = "更新时间",
                value = DateTimeUtils.formatFullDateTimeWithFallback(note.updatedAt, note.createdAt)
            )

            note.lastReadAt?.let {
                MetadataRow(
                    icon = Icons.Default.AccessTime,
                    label = "最后阅读",
                    value = DateTimeUtils.formatFullDateTime(it)
                )
            }

            // 特殊标记
            if (note.safeIsPinned || note.safeIsBookmarked) {
                HorizontalDivider()

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (note.safeIsPinned) {
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
                    if (note.safeIsBookmarked) {
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
