package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * 关联关系管理对话框
 *
 * 用于添加/删除笔记与任务或其他笔记的关联关系
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RelationManagementDialog(
    relationType: RelationType,
    currentRelations: List<Int>,
    onDismiss: () -> Unit,
    onAddRelation: (Int) -> Unit,
    onRemoveRelation: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedId by remember { mutableStateOf<Int?>(null) }

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
                            imageVector = when (relationType) {
                                RelationType.TASK -> Icons.Default.Task
                                RelationType.NOTE -> Icons.Default.Description
                            },
                            contentDescription = null
                        )
                        Text(
                            text = when (relationType) {
                                RelationType.TASK -> "关联任务"
                                RelationType.NOTE -> "关联笔记"
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

                // 搜索框
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            when (relationType) {
                                RelationType.TASK -> "搜索任务..."
                                RelationType.NOTE -> "搜索笔记..."
                            }
                        )
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Search, null)
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Clear, "清除")
                            }
                        }
                    },
                    singleLine = true
                )

                // 当前关联列表
                if (currentRelations.isNotEmpty()) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "当前关联 (${currentRelations.size})",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )

                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 200.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(currentRelations) { id ->
                                RelationItem(
                                    id = id,
                                    relationType = relationType,
                                    isSelected = false,
                                    onRemove = { onRemoveRelation(id) }
                                )
                            }
                        }
                    }

                    HorizontalDivider()
                }

                // 添加新关联
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "添加关联",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )

                    // ID输入框
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = selectedId?.toString() ?: "",
                            onValueChange = { value ->
                                selectedId = value.toIntOrNull()
                            },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("输入ID") },
                            singleLine = true
                        )

                        Button(
                            onClick = {
                                selectedId?.let { id ->
                                    if (!currentRelations.contains(id)) {
                                        onAddRelation(id)
                                        selectedId = null
                                    }
                                }
                            },
                            enabled = selectedId != null && !currentRelations.contains(selectedId)
                        ) {
                            Icon(Icons.Default.Add, null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("添加")
                        }
                    }
                }
            }
        }
    }
}

/**
 * 关联项
 */
@Composable
private fun RelationItem(
    id: Int,
    relationType: RelationType,
    isSelected: Boolean,
    onRemove: () -> Unit
) {
    OutlinedCard(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = when (relationType) {
                        RelationType.TASK -> Icons.Default.Task
                        RelationType.NOTE -> Icons.Default.Description
                    },
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Column {
                    Text(
                        text = when (relationType) {
                            RelationType.TASK -> "任务"
                            RelationType.NOTE -> "笔记"
                        } + " #$id",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    // TODO: 显示标题
                    Text(
                        text = "点击查看详情",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            IconButton(onClick = onRemove) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "移除关联",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

/**
 * 关联类型
 */
enum class RelationType {
    TASK,
    NOTE
}
