package com.aiproj.mobile.ui.screens.analytics

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * 统计分析Tab枚举
 *
 * 4个Tab对应Web版时间周报的功能:
 * - OVERVIEW: 概览分析（工作时长趋势、任务完成率、项目分布）
 * - DAILY_DETAIL: 每日详情（每日工作记录、任务时间条目）
 * - TASK_STATS: 任务统计（Top任务、完成趋势）
 * - EFFICIENCY: 效率分析（效率趋势、智能分析建议）
 */
enum class AnalyticsTab(
    val title: String,
    val icon: ImageVector,
    val description: String
) {
    OVERVIEW(
        title = "概览",
        icon = Icons.Default.BarChart,
        description = "工作时长趋势、任务完成率、项目分布"
    ),
    DAILY_DETAIL(
        title = "每日",
        icon = Icons.Default.CalendarToday,
        description = "每日工作记录、任务时间条目"
    ),
    TASK_STATS(
        title = "任务",
        icon = Icons.Default.Assignment,
        description = "任务统计、Top任务、完成趋势"
    ),
    EFFICIENCY(
        title = "效率",
        icon = Icons.Default.TrendingUp,
        description = "效率趋势、智能分析建议"
    )
}
