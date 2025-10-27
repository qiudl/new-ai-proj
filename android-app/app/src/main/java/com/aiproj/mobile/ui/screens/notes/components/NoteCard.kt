package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.WorkNote
import com.aiproj.mobile.data.models.WorkNoteType
import com.aiproj.mobile.data.models.WorkNotePriority
import com.aiproj.mobile.util.DateTimeUtils

/**
 * 笔记卡片组件（网格视图）
 *
 * 紧凑的卡片布局，适合网格展示，包含文件夹显示
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun NoteCard(
    note: WorkNote,
    folderName: String? = null,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .width(160.dp)
            .height(200.dp)
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp)
        ) {
            // 头部（图标+标记）
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = getNoteTypeIcon(note.workNoteType ?: WorkNoteType.MARKDOWN),
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = getPriorityColor(note.priority ?: WorkNotePriority.MEDIUM)
                )

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (note.isPinned == true) {
                        Icon(
                            imageVector = Icons.Default.PushPin,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    if (note.isBookmarked == true) {
                        Icon(
                            imageVector = Icons.Default.Bookmark,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 标题
            Text(
                text = note.title ?: "无标题",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(4.dp))

            // 内容预览
            Text(
                text = note.content?.take(60) ?: "",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )

            // 底部信息
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                // 文件夹
                if (!folderName.isNullOrBlank()) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = folderName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // 标签
                if (!note.tags.isNullOrEmpty()) {
                    Text(
                        text = "#${note.tags.first()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // 时间
                Text(
                    text = DateTimeUtils.formatTime(note.updatedAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun getNoteTypeIcon(type: WorkNoteType): ImageVector = when (type) {
    WorkNoteType.GENERAL -> Icons.Default.Description
    WorkNoteType.MARKDOWN -> Icons.Default.Article
    WorkNoteType.TEXT -> Icons.Default.Description
    WorkNoteType.HTML -> Icons.Default.Code
    WorkNoteType.RESEARCH -> Icons.Default.Search
    WorkNoteType.MEETING -> Icons.Default.Event
    WorkNoteType.PROJECT -> Icons.Default.AccountTree
}

private fun getPriorityColor(priority: WorkNotePriority): Color = when (priority) {
    WorkNotePriority.CRITICAL -> Color(0xFFD32F2F)
    WorkNotePriority.HIGH -> Color(0xFFFF9800)
    WorkNotePriority.MEDIUM -> Color(0xFF2196F3)
    WorkNotePriority.LOW -> Color(0xFF9E9E9E)
}
