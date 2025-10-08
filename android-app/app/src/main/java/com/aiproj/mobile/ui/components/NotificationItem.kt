package com.aiproj.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.Notification
import com.aiproj.mobile.data.models.NotificationType

/**
 * 通知项组件
 */
@Composable
fun NotificationItem(
    notification: Notification,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val icon = getNotificationIcon(notification.type)
    val iconColor = getNotificationColor(notification.type)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (notification.isRead) {
                MaterialTheme.colorScheme.surface
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // 图标
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        color = iconColor.copy(alpha = 0.1f),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp)
                )
            }

            // 内容
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // 消息内容
                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = if (notification.isRead) FontWeight.Normal else FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                // 时间
                Text(
                    text = formatNotificationTime(notification.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // 未读标记
            if (!notification.isRead) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(
                            color = MaterialTheme.colorScheme.primary,
                            shape = CircleShape
                        )
                )
            }
        }
    }
}

/**
 * 获取通知图标
 */
private fun getNotificationIcon(type: NotificationType): ImageVector {
    return when (type) {
        NotificationType.TASK_ASSIGNED -> Icons.Default.Assignment
        NotificationType.TASK_UPDATED -> Icons.Default.Update
        NotificationType.TASK_COMPLETED -> Icons.Default.CheckCircle
        NotificationType.COMMENT_ADDED -> Icons.Default.Comment
        NotificationType.DEADLINE_APPROACHING -> Icons.Default.Warning
        NotificationType.PROJECT_UPDATED -> Icons.Default.Folder
        NotificationType.SYSTEM -> Icons.Default.Notifications
    }
}

/**
 * 获取通知颜色
 */
@Composable
private fun getNotificationColor(type: NotificationType): Color {
    return when (type) {
        NotificationType.TASK_ASSIGNED -> MaterialTheme.colorScheme.primary
        NotificationType.TASK_UPDATED -> MaterialTheme.colorScheme.secondary
        NotificationType.TASK_COMPLETED -> Color(0xFF4CAF50) // Green
        NotificationType.COMMENT_ADDED -> Color(0xFF2196F3) // Blue
        NotificationType.DEADLINE_APPROACHING -> Color(0xFFFF9800) // Orange
        NotificationType.PROJECT_UPDATED -> MaterialTheme.colorScheme.tertiary
        NotificationType.SYSTEM -> MaterialTheme.colorScheme.outline
    }
}

/**
 * 格式化通知时间
 * TODO: 实现更智能的时间格式化（刚刚、5分钟前、今天 10:30等）
 */
private fun formatNotificationTime(createdAt: String): String {
    // 简单实现，返回相对时间
    return try {
        val parts = createdAt.split("T")
        if (parts.size == 2) {
            val time = parts[1].substring(0, 5)
            "今天 $time"
        } else {
            "刚刚"
        }
    } catch (e: Exception) {
        "刚刚"
    }
}
