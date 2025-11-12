package com.aiproj.mobile.ui.components.requirement

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.RequirementStatus

/**
 * 需求状态徽章组件
 *
 * 根据需求状态显示不同颜色和文本的徽章
 *
 * @param status 需求状态枚举
 * @param modifier 修饰符
 */
@Composable
fun RequirementStatusBadge(
    status: RequirementStatus,
    modifier: Modifier = Modifier
) {
    val isDarkTheme = isSystemInDarkTheme()

    data class StatusConfig(
        val backgroundColor: Color,
        val textColor: Color,
        val displayText: String,
        val icon: ImageVector
    )

    val statusConfig = when (status) {
        RequirementStatus.DRAFT -> StatusConfig(
            backgroundColor = if (isDarkTheme) Color(0xFF757575) else Color(0xFF9E9E9E),
            textColor = Color.White,
            displayText = "草稿",
            icon = Icons.Filled.Edit
        )
        RequirementStatus.PENDING -> StatusConfig(
            backgroundColor = if (isDarkTheme) Color(0xFF1976D2) else Color(0xFF2196F3),
            textColor = Color.White,
            displayText = "待评审",
            icon = Icons.Filled.Schedule
        )
        RequirementStatus.REVIEWING -> StatusConfig(
            backgroundColor = if (isDarkTheme) Color(0xFFF57C00) else Color(0xFFFF9800),
            textColor = Color.White,
            displayText = "评审中",
            icon = Icons.Filled.Search
        )
        RequirementStatus.APPROVED -> StatusConfig(
            backgroundColor = if (isDarkTheme) Color(0xFF388E3C) else Color(0xFF4CAF50),
            textColor = Color.White,
            displayText = "已批准",
            icon = Icons.Filled.CheckCircle
        )
        RequirementStatus.REJECTED -> StatusConfig(
            backgroundColor = if (isDarkTheme) Color(0xFFD32F2F) else Color(0xFFF44336),
            textColor = Color.White,
            displayText = "已拒绝",
            icon = Icons.Filled.Cancel
        )
        RequirementStatus.ARCHIVED -> StatusConfig(
            backgroundColor = if (isDarkTheme) Color(0xFF424242) else Color(0xFF616161),
            textColor = Color.White,
            displayText = "已归档",
            icon = Icons.Filled.Archive
        )
    }

    SuggestionChip(
        onClick = { },
        label = {
            Text(
                text = statusConfig.displayText,
                style = MaterialTheme.typography.labelSmall,
                color = statusConfig.textColor
            )
        },
        icon = {
            Icon(
                imageVector = statusConfig.icon,
                contentDescription = statusConfig.displayText,
                modifier = Modifier.size(16.dp),
                tint = statusConfig.textColor
            )
        },
        modifier = modifier,
        colors = SuggestionChipDefaults.suggestionChipColors(
            containerColor = statusConfig.backgroundColor,
            labelColor = statusConfig.textColor,
            iconContentColor = statusConfig.textColor
        )
    )
}

/**
 * 需求状态徽章预览
 */
@Composable
private fun RequirementStatusBadgePreview(status: RequirementStatus) {
    Surface(
        modifier = Modifier.padding(4.dp),
        color = MaterialTheme.colorScheme.background
    ) {
        RequirementStatusBadge(status = status)
    }
}
