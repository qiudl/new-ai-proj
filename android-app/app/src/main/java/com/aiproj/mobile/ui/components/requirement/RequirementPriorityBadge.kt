package com.aiproj.mobile.ui.components.requirement

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
    val (backgroundColor, textColor, displayText) = when (priority) {
        RequirementPriority.LOW -> Triple(
            Color(0xFF9E9E9E),  // Gray
            Color.White,
            "低"
        )
        RequirementPriority.MEDIUM -> Triple(
            Color(0xFF2196F3),  // Blue
            Color.White,
            "中"
        )
        RequirementPriority.HIGH -> Triple(
            Color(0xFFFF9800),  // Orange
            Color.White,
            "高"
        )
        RequirementPriority.URGENT -> Triple(
            Color(0xFFF44336),  // Red
            Color.White,
            "紧急"
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
            containerColor = backgroundColor,
            labelColor = textColor
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
