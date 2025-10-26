package com.aiproj.mobile.ui.document.version.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.ChangeDto
import com.aiproj.mobile.ui.document.version.DiffDisplayMode

/**
 * 差异展示组件
 *
 * 根据显示模式展示版本差异
 */
@Composable
fun DiffDisplay(
    changes: List<ChangeDto>,
    displayMode: DiffDisplayMode,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        when (displayMode) {
            DiffDisplayMode.UNIFIED, DiffDisplayMode.CHANGES_ONLY -> {
                // 统一视图：显示所有变更
                items(
                    items = changes,
                    key = { "${it.type}_${it.lineNumber}_${it.content.hashCode()}" }
                ) { change ->
                    UnifiedDiffLine(change = change)
                }
            }
            DiffDisplayMode.SIDE_BY_SIDE -> {
                // 并排对比：暂时使用统一视图
                // TODO: Phase 4.1 可以增强为真正的并排对比
                items(
                    items = changes,
                    key = { "${it.type}_${it.lineNumber}_${it.content.hashCode()}" }
                ) { change ->
                    UnifiedDiffLine(change = change)
                }
            }
        }

        // 空状态提示
        if (changes.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "这两个版本没有差异",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * 统一格式的差异行
 */
@Composable
private fun UnifiedDiffLine(
    change: ChangeDto,
    modifier: Modifier = Modifier
) {
    val (backgroundColor, icon, iconColor, prefix) = when (change.type.lowercase()) {
        "added" -> ChangeStyle(
            background = Color(0xFFE6FFE6),
            icon = Icons.Default.Add,
            iconColor = Color(0xFF00C853),
            prefix = "+"
        )
        "removed" -> ChangeStyle(
            background = Color(0xFFFFE6E6),
            icon = Icons.Default.Remove,
            iconColor = Color(0xFFD50000),
            prefix = "-"
        )
        "modified" -> ChangeStyle(
            background = Color(0xFFFFF8E1),
            icon = Icons.Default.Edit,
            iconColor = Color(0xFFFFA000),
            prefix = "~"
        )
        else -> ChangeStyle(
            background = Color.Transparent,
            icon = Icons.Default.Code,
            iconColor = MaterialTheme.colorScheme.onSurfaceVariant,
            prefix = " "
        )
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = backgroundColor,
        shape = MaterialTheme.shapes.small
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // 图标
            Icon(
                imageVector = icon,
                contentDescription = change.type,
                modifier = Modifier.size(20.dp),
                tint = iconColor
            )

            // 行号
            Text(
                text = change.lineNumber.toString(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.width(40.dp)
            )

            // 前缀符号
            Text(
                text = prefix,
                style = MaterialTheme.typography.bodyMedium,
                color = iconColor,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(16.dp)
            )

            // 内容
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // 如果是修改，先显示旧内容
                if (change.type.lowercase() == "modified" && change.oldContent != null) {
                    Text(
                        text = change.oldContent,
                        style = MaterialTheme.typography.bodyMedium,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFFD50000),
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = Color(0xFFFFE6E6),
                                shape = MaterialTheme.shapes.extraSmall
                            )
                            .padding(4.dp)
                    )
                }

                // 新内容
                Text(
                    text = change.content,
                    style = MaterialTheme.typography.bodyMedium,
                    fontFamily = FontFamily.Monospace,
                    color = when (change.type.lowercase()) {
                        "added" -> Color(0xFF00C853)
                        "removed" -> Color(0xFFD50000)
                        "modified" -> Color(0xFFFFA000)
                        else -> MaterialTheme.colorScheme.onSurface
                    },
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/**
 * 变更样式数据类
 */
private data class ChangeStyle(
    val background: Color,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val iconColor: Color,
    val prefix: String
)

/**
 * 统计信息卡片
 */
@Composable
fun DiffStatsCard(
    additions: Int,
    deletions: Int,
    modifications: Int,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            // 新增
            StatItem(
                icon = Icons.Default.Add,
                iconColor = Color(0xFF00C853),
                label = "新增",
                count = additions
            )

            // 删除
            StatItem(
                icon = Icons.Default.Remove,
                iconColor = Color(0xFFD50000),
                label = "删除",
                count = deletions
            )

            // 修改
            StatItem(
                icon = Icons.Default.Edit,
                iconColor = Color(0xFFFFA000),
                label = "修改",
                count = modifications
            )
        }
    }
}

/**
 * 统计项
 */
@Composable
private fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    label: String,
    count: Int
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = iconColor,
            modifier = Modifier.size(24.dp)
        )
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = iconColor
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
