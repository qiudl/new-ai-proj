package com.aiproj.mobile.ui.components.requirement

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
    val (backgroundColor, textColor, displayText) = when (status) {
        RequirementStatus.DRAFT -> Triple(
            Color(0xFF9E9E9E),  // Gray
            Color.White,
            "草稿"
        )
        RequirementStatus.PENDING -> Triple(
            Color(0xFF2196F3),  // Blue
            Color.White,
            "待评审"
        )
        RequirementStatus.REVIEWING -> Triple(
            Color(0xFFFF9800),  // Orange
            Color.White,
            "评审中"
        )
        RequirementStatus.APPROVED -> Triple(
            Color(0xFF4CAF50),  // Green
            Color.White,
            "已批准"
        )
        RequirementStatus.REJECTED -> Triple(
            Color(0xFFF44336),  // Red
            Color.White,
            "已拒绝"
        )
        RequirementStatus.ARCHIVED -> Triple(
            Color(0xFF616161),  // Dark Gray
            Color.White,
            "已归档"
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
