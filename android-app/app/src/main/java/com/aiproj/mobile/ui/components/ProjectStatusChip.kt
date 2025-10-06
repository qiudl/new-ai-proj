package com.aiproj.mobile.ui.components

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

/**
 * 项目状态标签组件
 */
@Composable
fun ProjectStatusChip(
    status: String?,
    modifier: Modifier = Modifier
) {
    if (status.isNullOrBlank()) {
        return
    }

    val (backgroundColor, textColor, displayText) = when (status.lowercase()) {
        "active", "in_progress" -> Triple(
            Color(0xFF4CAF50),
            Color.White,
            "进行中"
        )
        "completed" -> Triple(
            Color(0xFF2196F3),
            Color.White,
            "已完成"
        )
        "planning" -> Triple(
            Color(0xFFFF9800),
            Color.White,
            "规划中"
        )
        "archived" -> Triple(
            Color(0xFF9E9E9E),
            Color.White,
            "已归档"
        )
        "on_hold" -> Triple(
            Color(0xFFF44336),
            Color.White,
            "暂停"
        )
        else -> Triple(
            MaterialTheme.colorScheme.secondaryContainer,
            MaterialTheme.colorScheme.onSecondaryContainer,
            status
        )
    }

    SuggestionChip(
        onClick = { },
        label = {
            Text(
                text = displayText,
                style = MaterialTheme.typography.labelSmall,
                color = textColor
            )
        },
        modifier = modifier,
        colors = SuggestionChipDefaults.suggestionChipColors(
            containerColor = backgroundColor
        )
    )
}
