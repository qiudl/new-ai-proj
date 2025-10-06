package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.*

/**
 * 笔记筛选面板
 *
 * 提供类型、优先级、状态等多维度筛选功能
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteFilterPanel(
    selectedType: WorkNoteType?,
    selectedPriority: WorkNotePriority?,
    isPinnedOnly: Boolean,
    isBookmarkedOnly: Boolean,
    onTypeChange: (WorkNoteType?) -> Unit,
    onPriorityChange: (WorkNotePriority?) -> Unit,
    onPinnedOnlyChange: (Boolean) -> Unit,
    onBookmarkedOnlyChange: (Boolean) -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 头部
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "筛选条件",
                style = MaterialTheme.typography.titleMedium
            )

            TextButton(onClick = onReset) {
                Icon(Icons.Default.Clear, null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("重置")
            }
        }

        // 类型筛选
        Text(
            text = "笔记类型",
            style = MaterialTheme.typography.labelMedium
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(WorkNoteType.values().toList()) { type ->
                FilterChip(
                    selected = selectedType == type,
                    onClick = {
                        onTypeChange(if (selectedType == type) null else type)
                    },
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
                    leadingIcon = if (selectedType == type) {
                        { Icon(Icons.Default.Check, null, Modifier.size(18.dp)) }
                    } else null
                )
            }
        }

        // 优先级筛选
        Text(
            text = "优先级",
            style = MaterialTheme.typography.labelMedium
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(WorkNotePriority.values().toList()) { priority ->
                FilterChip(
                    selected = selectedPriority == priority,
                    onClick = {
                        onPriorityChange(if (selectedPriority == priority) null else priority)
                    },
                    label = {
                        Text(
                            text = when (priority) {
                                WorkNotePriority.CRITICAL -> "紧急"
                                WorkNotePriority.HIGH -> "高"
                                WorkNotePriority.MEDIUM -> "中"
                                WorkNotePriority.LOW -> "低"
                            }
                        )
                    },
                    leadingIcon = if (selectedPriority == priority) {
                        { Icon(Icons.Default.Check, null, Modifier.size(18.dp)) }
                    } else null
                )
            }
        }

        // 特殊筛选
        Text(
            text = "特殊标记",
            style = MaterialTheme.typography.labelMedium
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = isPinnedOnly,
                onClick = { onPinnedOnlyChange(!isPinnedOnly) },
                label = { Text("仅显示置顶") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.PushPin,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
            )

            FilterChip(
                selected = isBookmarkedOnly,
                onClick = { onBookmarkedOnlyChange(!isBookmarkedOnly) },
                label = { Text("仅显示书签") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Bookmark,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
            )
        }
    }
}
