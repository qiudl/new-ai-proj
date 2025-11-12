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
import com.aiproj.mobile.data.models.RequirementPriority

/**
 * 需求优先级徽章组件
 *
 * 根据需求优先级显示不同颜色和文本的徽章
 *
 * @param priority 需求优先级枚举
 * @param modifier 修饰符
 */
@Composable
fun RequirementPriorityBadge(
    priority: RequirementPriority,
    modifier: Modifier = Modifier
) {
    val isDarkTheme = isSystemInDarkTheme()

    data class PriorityConfig(
        val backgroundColor: Color,
        val textColor: Color,
        val displayText: String,
        val icon: ImageVector
    )

    val priorityConfig = when (priority) {
        RequirementPriority.LOW -> PriorityConfig(
            backgroundColor = if (isDarkTheme) Color(0xFF757575) else Color(0xFF9E9E9E),
            textColor = Color.White,
            displayText = "低",
            icon = Icons.Filled.KeyboardArrowDown
        )
        RequirementPriority.MEDIUM -> PriorityConfig(
            backgroundColor = if (isDarkTheme) Color(0xFF1976D2) else Color(0xFF2196F3),
            textColor = Color.White,
            displayText = "中",
            icon = Icons.Filled.Remove
        )
        RequirementPriority.HIGH -> PriorityConfig(
            backgroundColor = if (isDarkTheme) Color(0xFFF57C00) else Color(0xFFFF9800),
            textColor = Color.White,
            displayText = "高",
            icon = Icons.Filled.KeyboardArrowUp
        )
        RequirementPriority.URGENT -> PriorityConfig(
            backgroundColor = if (isDarkTheme) Color(0xFFD32F2F) else Color(0xFFF44336),
            textColor = Color.White,
            displayText = "紧急",
            icon = Icons.Filled.PriorityHigh
        )
    }

    SuggestionChip(
        onClick = { },
        label = {
            Text(
                text = priorityConfig.displayText,
                style = MaterialTheme.typography.labelSmall,
                color = priorityConfig.textColor
            )
        },
        icon = {
            Icon(
                imageVector = priorityConfig.icon,
                contentDescription = priorityConfig.displayText,
                modifier = Modifier.size(16.dp),
                tint = priorityConfig.textColor
            )
        },
        modifier = modifier,
        colors = SuggestionChipDefaults.suggestionChipColors(
            containerColor = priorityConfig.backgroundColor,
            labelColor = priorityConfig.textColor,
            iconContentColor = priorityConfig.textColor
        )
    )
}

/**
 * 需求优先级徽章预览
 */
@Composable
private fun RequirementPriorityBadgePreview(priority: RequirementPriority) {
    Surface(
        modifier = Modifier.padding(4.dp),
        color = MaterialTheme.colorScheme.background
    ) {
        RequirementPriorityBadge(priority = priority)
    }
}
