package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * 其他状态详情底部弹窗
 *
 * 显示"其他"类别包含的具体任务状态分布
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OtherStatusDetailSheet(
    statusBreakdown: Map<String, OtherStatusItem>,
    onDismiss: () -> Unit,
    onStatusClick: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // 标题栏
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🗑️ 其他状态详情",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "关闭")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "包含以下状态的任务：",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 状态列表
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 按数量排序显示
                statusBreakdown.entries
                    .sortedByDescending { it.value.count }
                    .filter { it.value.count > 0 }
                    .forEach { (statusKey, item) ->
                        OtherStatusDetailItem(
                            emoji = item.emoji,
                            label = item.displayName,
                            count = item.count,
                            color = item.color,
                            onClick = { onStatusClick(statusKey) }
                        )
                    }

                // 如果没有任何状态数据
                if (statusBreakdown.all { it.value.count == 0 }) {
                    Text(
                        text = "暂无其他状态的任务",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 24.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

/**
 * 单个其他状态详情项
 */
@Composable
private fun OtherStatusDetailItem(
    emoji: String,
    label: String,
    count: Int,
    color: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 状态指示器
            Surface(
                modifier = Modifier.size(16.dp),
                shape = MaterialTheme.shapes.small,
                color = color
            ) {}

            // Emoji + 标签
            Text(
                text = "$emoji $label",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
        }

        // 数量
        Text(
            text = "$count 个",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Bold
        )
    }
}

/**
 * 其他状态项数据类
 */
data class OtherStatusItem(
    val emoji: String,
    val displayName: String,
    val count: Int,
    val color: androidx.compose.ui.graphics.Color
)
