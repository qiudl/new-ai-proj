package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.WorkNote
import com.aiproj.mobile.data.models.WorkNoteType
import com.aiproj.mobile.data.models.WorkNotePriority
import androidx.compose.ui.graphics.vector.ImageVector
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * 笔记列表项组件（列表视图）
 *
 * 支持优先级颜色条、类型图标、内容预览、标签、关联任务数量等
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun NoteListItem(
    note: WorkNote,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 优先级颜色条
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(56.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(getPriorityColor(note.priority ?: WorkNotePriority.MEDIUM))
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                // 标题行
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 笔记类型图标
                    Icon(
                        imageVector = getNoteTypeIcon(note.workNoteType ?: WorkNoteType.GENERAL),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )

                    // 标题
                    Text(
                        text = note.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )

                    // 置顶标记
                    if (note.isPinned) {
                        Icon(
                            imageVector = Icons.Default.PushPin,
                            contentDescription = "已置顶",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }

                    // 书签标记
                    if (note.isBookmarked) {
                        Icon(
                            imageVector = Icons.Default.Bookmark,
                            contentDescription = "已加书签",
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.secondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // 内容预览
                if (!note.content.isNullOrBlank()) {
                    Text(
                        text = note.content.take(100).replace("\n", " "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // 底部信息行
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // 时间
                    Text(
                        text = formatTime(note.updatedAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // 标签（最多显示2个）
                    note.tags?.take(2)?.forEach { tag ->
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer
                        ) {
                            Text(
                                text = "#$tag",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    // 关联任务数量
                    if (!note.relatedTasks.isNullOrEmpty()) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Link,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = note.relatedTasks.size.toString(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // 更多菜单
            IconButton(
                onClick = onLongClick,
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "更多操作",
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

/**
 * 根据笔记类型返回对应图标
 */
private fun getNoteTypeIcon(type: WorkNoteType): ImageVector = when (type) {
    WorkNoteType.GENERAL -> Icons.Default.Description
    WorkNoteType.MARKDOWN -> Icons.Default.Article
    WorkNoteType.TEXT -> Icons.Default.Description
    WorkNoteType.HTML -> Icons.Default.Code
    WorkNoteType.RESEARCH -> Icons.Default.Search
    WorkNoteType.MEETING -> Icons.Default.Event
    WorkNoteType.PROJECT -> Icons.Default.AccountTree
}

/**
 * 根据优先级返回对应颜色
 */
private fun getPriorityColor(priority: WorkNotePriority): Color = when (priority) {
    WorkNotePriority.CRITICAL -> Color(0xFFD32F2F)  // 红色
    WorkNotePriority.HIGH -> Color(0xFFFF9800)      // 橙色
    WorkNotePriority.MEDIUM -> Color(0xFF2196F3)    // 蓝色
    WorkNotePriority.LOW -> Color(0xFF9E9E9E)       // 灰色
}

/**
 * 格式化时间
 */
private fun formatTime(dateStr: String): String {
    return try {
        val instant = Instant.parse(dateStr)
        val formatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
            .withZone(ZoneId.systemDefault())
        formatter.format(instant)
    } catch (e: Exception) {
        dateStr
    }
}
