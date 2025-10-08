package com.aiproj.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.aiproj.mobile.data.models.User

/**
 * 成员头像组组件
 *
 * @param members 成员列表
 * @param maxVisible 最多显示的头像数量
 * @param modifier Modifier
 * @param avatarSize 头像大小
 */
@Composable
fun MemberAvatarRow(
    members: List<User>,
    modifier: Modifier = Modifier,
    maxVisible: Int = 5,
    avatarSize: Int = 32
) {
    if (members.isEmpty()) {
        return
    }

    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy((-8).dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        members.take(maxVisible).forEach { member ->
            UserAvatar(
                user = member,
                size = avatarSize
            )
        }

        // 显示剩余成员数量
        if (members.size > maxVisible) {
            Box(
                modifier = Modifier
                    .size(avatarSize.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.secondaryContainer)
                    .border(
                        width = 2.dp,
                        color = MaterialTheme.colorScheme.surface,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "+${members.size - maxVisible}",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = (avatarSize / 3).sp,
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
        }
    }
}

/**
 * 单个用户头像
 */
@Composable
fun UserAvatar(
    user: User,
    size: Int = 32,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(size.dp)
            .clip(CircleShape)
            .border(
                width = 2.dp,
                color = MaterialTheme.colorScheme.surface,
                shape = CircleShape
            )
    ) {
        if (user.avatarUrl?.isNotBlank() == true) {
            AsyncImage(
                model = user.avatarUrl,
                contentDescription = user.username,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            // 使用用户名首字母作为占位符
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(getUserAvatarColor(user.id)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = user.username.take(1).uppercase(),
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontSize = (size / 2).sp,
                        fontWeight = FontWeight.Bold
                    ),
                    color = Color.White
                )
            }
        }
    }
}

/**
 * 根据用户ID生成头像背景色
 */
private fun getUserAvatarColor(userId: Int): Color {
    val colors = listOf(
        Color(0xFF2196F3), // Blue
        Color(0xFF4CAF50), // Green
        Color(0xFFF44336), // Red
        Color(0xFFFF9800), // Orange
        Color(0xFF9C27B0), // Purple
        Color(0xFF00BCD4), // Cyan
        Color(0xFFFF5722), // Deep Orange
        Color(0xFF607D8B)  // Blue Grey
    )
    return colors[userId % colors.size]
}
