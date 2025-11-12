package com.aiproj.mobile.ui.components.requirement

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

/**
 * 需求统计数据类
 *
 * @param totalCount 总需求数
 * @param draftCount 草稿数
 * @param pendingCount 待评审数
 * @param reviewingCount 评审中数
 * @param approvedCount 已批准数
 * @param rejectedCount 已拒绝数
 */
data class RequirementStats(
    val totalCount: Int = 0,
    val draftCount: Int = 0,
    val pendingCount: Int = 0,
    val reviewingCount: Int = 0,
    val approvedCount: Int = 0,
    val rejectedCount: Int = 0
)

/**
 * 需求统计卡片组件
 *
 * 显示需求模块的统计信息，包括各状态的需求数量
 *
 * @param stats 统计数据
 * @param modifier 修饰符
 * @param onStatItemClick 统计项点击回调，参数为状态过滤条件
 */
@Composable
fun RequirementStatsCard(
    stats: RequirementStats,
    modifier: Modifier = Modifier,
    onStatItemClick: ((String) -> Unit)? = null
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 标题
            Text(
                text = "需求统计",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 总数显示
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "总需求数",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = stats.totalCount.toString(),
                    style = MaterialTheme.typography.displaySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Divider(color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.2f))

            Spacer(modifier = Modifier.height(16.dp))

            // 状态统计网格（2列）
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatItem(
                        icon = Icons.Outlined.Edit,
                        label = "草稿",
                        count = stats.draftCount,
                        color = Color(0xFF9E9E9E),
                        modifier = Modifier.weight(1f),
                        onClick = { onStatItemClick?.invoke("draft") }
                    )
                    StatItem(
                        icon = Icons.Outlined.PendingActions,
                        label = "待评审",
                        count = stats.pendingCount,
                        color = Color(0xFF2196F3),
                        modifier = Modifier.weight(1f),
                        onClick = { onStatItemClick?.invoke("pending") }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatItem(
                        icon = Icons.Outlined.RateReview,
                        label = "评审中",
                        count = stats.reviewingCount,
                        color = Color(0xFFFF9800),
                        modifier = Modifier.weight(1f),
                        onClick = { onStatItemClick?.invoke("reviewing") }
                    )
                    StatItem(
                        icon = Icons.Outlined.CheckCircle,
                        label = "已批准",
                        count = stats.approvedCount,
                        color = Color(0xFF4CAF50),
                        modifier = Modifier.weight(1f),
                        onClick = { onStatItemClick?.invoke("approved") }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatItem(
                        icon = Icons.Outlined.Cancel,
                        label = "已拒绝",
                        count = stats.rejectedCount,
                        color = Color(0xFFF44336),
                        modifier = Modifier.weight(1f),
                        onClick = { onStatItemClick?.invoke("rejected") }
                    )
                    // 占位，保持对齐
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

/**
 * 统计项组件
 */
@Composable
private fun StatItem(
    icon: ImageVector,
    label: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        onClick = { onClick?.invoke() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            Text(
                text = count.toString(),
                style = MaterialTheme.typography.titleMedium,
                color = color
            )
        }
    }
}
