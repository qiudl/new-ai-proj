package com.aiproj.mobile.ui.screens.analytics

import androidx.compose.ui.graphics.Color

/**
 * 概览Tab UI状态
 */
data class OverviewUiState(
    val isLoading: Boolean = false,
    val error: String? = null,

    // 核心指标
    val totalHours: Float = 0f,
    val completedTasks: Int = 0,
    val totalTasks: Int = 0,
    val completionRate: Float = 0f,
    val consecutiveDays: Int = 0,

    // 趋势数据
    val workTimeTrend: List<DailyWorkTime> = emptyList(),

    // 任务状态分布
    val taskStatusDistribution: TaskStatusDistribution = TaskStatusDistribution(
        completed = 0,
        completedPercentage = 0f,
        inProgress = 0,
        inProgressPercentage = 0f,
        todo = 0,
        todoPercentage = 0f
    ),

    // 项目分布
    val projectDistribution: List<ProjectTimeData> = emptyList()
)

/**
 * 每日详情Tab UI状态
 */
data class DailyDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,

    // 日期列表（最近7-14天）
    val dailyList: List<DayListItem> = emptyList(),

    // 选中日期的详细信息
    val selectedDayDetail: DayDetail? = null
)

data class DayListItem(
    val date: String,           // "2025-10-06"
    val weekday: String,        // "周一"
    val hours: Float,           // 8.5
    val tasksCompleted: Int     // 3
)

data class DayDetail(
    val date: String,
    val weekday: String,
    val hours: Float,
    val tasksCompleted: Int,
    val efficiency: Float,      // 0.0 ~ 1.0
    val taskEntries: List<TaskTimeEntry>
)

data class TaskTimeEntry(
    val taskId: Int,
    val taskTitle: String,
    val projectName: String,
    val duration: Float,        // 小时
    val startTime: String,      // "09:00"
    val endTime: String,        // "12:30"
    val status: String,         // "completed", "in_progress", "todo"
    val isCompleted: Boolean
)

/**
 * 任务统计Tab UI状态
 */
data class TaskStatsUiState(
    val isLoading: Boolean = false,
    val error: String? = null,

    // 任务总览
    val totalTasks: Int = 0,
    val completedTasks: Int = 0,
    val inProgressTasks: Int = 0,
    val todoTasks: Int = 0,
    val completionRate: Float = 0f,

    // Top任务
    val topTasks: List<TopTask> = emptyList(),

    // 每日完成趋势
    val dailyCompletionTrend: List<DailyCompletion> = emptyList(),

    // 优先级分布
    val priorityDistribution: PriorityStats = PriorityStats()
)

data class TopTask(
    val taskId: Int,
    val title: String,
    val hours: Float,
    val status: String,
    val priority: String
)

data class DailyCompletion(
    val date: String,
    val weekday: String,
    val completedCount: Int
)

data class PriorityStats(
    val highPriority: Int = 0,
    val mediumPriority: Int = 0,
    val lowPriority: Int = 0
) {
    val total: Int
        get() = highPriority + mediumPriority + lowPriority
}

/**
 * 效率分析Tab UI状态
 */
data class EfficiencyUiState(
    val isLoading: Boolean = false,
    val error: String? = null,

    // 效率趋势
    val efficiencyTrend: List<EfficiencyTrendPoint> = emptyList(),
    val averageEfficiency: Float = 0f,
    val efficiencyChange: Float = 0f, // 与上周相比的变化

    // 效率指标
    val bestDay: EfficiencyDay? = null,
    val worstDay: EfficiencyDay? = null,
    val volatility: String = "中等", // "低", "中等", "高"

    // 工作模式
    val bestTimeSlot: TimeSlot? = null,
    val suggestions: List<String> = emptyList(),

    // 时长效率对比
    val durationEfficiencyMap: Map<String, DurationEfficiency> = emptyMap()
)

data class EfficiencyTrendPoint(
    val date: String,
    val label: String, // "周一", "周二"...
    val efficiency: Float // 0.0 ~ 1.0
)

data class EfficiencyDay(
    val date: String,
    val weekday: String,
    val efficiency: Float,
    val tasksCompleted: Int
)

data class TimeSlot(
    val timeRange: String, // "09:00-12:00"
    val period: String,    // "上午", "下午", "晚上"
    val efficiency: Float
)

data class DurationEfficiency(
    val durationRange: String, // "6-8h"
    val efficiency: Float,
    val sampleCount: Int
)
