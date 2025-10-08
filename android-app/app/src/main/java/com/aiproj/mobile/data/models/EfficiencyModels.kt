package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 每日效率指标数据
 */
data class DailyEfficiencyMetrics(
    @SerializedName("date")
    val date: String,                                // 日期，格式: "2025-09-01T00:00:00Z"

    @SerializedName("total_work_minutes")
    val totalWorkMinutes: Int,                      // 总工作分钟数

    @SerializedName("tasks_completed")
    val tasksCompleted: Int,                        // 已完成任务数

    @SerializedName("tasks_started")
    val tasksStarted: Int,                          // 开始的任务数

    @SerializedName("focus_time")
    val focusTime: Int,                             // 专注时间（分钟，>=25分钟的工作时段）

    @SerializedName("avg_task_duration")
    val avgTaskDuration: Double,                    // 平均任务时长（小时）

    @SerializedName("efficiency_score")
    val efficiencyScore: Double,                    // 效率得分（0-100）

    @SerializedName("completion_rate")
    val completionRate: Double                      // 任务完成率（0-1）
) {
    /**
     * 获取显示用的日期（yyyy-MM-dd格式）
     */
    fun getDisplayDate(): String {
        return date.substring(0, 10)
    }

    /**
     * 获取工作时长（小时）
     */
    fun getWorkHours(): Double {
        return totalWorkMinutes / 60.0
    }

    /**
     * 获取专注时长（小时）
     */
    fun getFocusHours(): Double {
        return focusTime / 60.0
    }

    /**
     * 获取专注度百分比
     */
    fun getFocusRatio(): Double {
        return if (totalWorkMinutes > 0) {
            (focusTime.toDouble() / totalWorkMinutes) * 100
        } else 0.0
    }

    /**
     * 获取完成率百分比
     */
    fun getCompletionRatePercent(): Double {
        return completionRate * 100
    }
}

/**
 * 效率趋势数据
 */
data class EfficiencyTrend(
    @SerializedName("time_range")
    val timeRange: String,                          // 时间范围，如 "2025-09-01 ~ 2025-09-12"

    @SerializedName("start_date")
    val startDate: String,                          // 开始日期

    @SerializedName("end_date")
    val endDate: String,                            // 结束日期

    @SerializedName("daily_data")
    val dailyData: List<DailyEfficiencyMetrics>,         // 每日数据

    @SerializedName("average_score")
    val averageScore: Double,                       // 平均得分

    @SerializedName("trend")
    val trend: String,                              // 趋势：improving, stable, declining

    @SerializedName("best_day")
    val bestDay: DailyEfficiencyMetrics?,                // 最佳日期

    @SerializedName("worst_day")
    val worstDay: DailyEfficiencyMetrics?                // 最差日期
) {
    /**
     * 获取趋势描述文本
     */
    fun getTrendDescription(): String {
        return when (trend) {
            "improving" -> "上升趋势 ↗"
            "declining" -> "下降趋势 ↘"
            else -> "保持稳定 →"
        }
    }

    /**
     * 趋势是否积极
     */
    fun isTrendPositive(): Boolean {
        return trend == "improving" || trend == "stable"
    }
}

/**
 * 智能建议
 */
data class SmartSuggestion(
    @SerializedName("id")
    val id: String,                                 // 建议ID

    @SerializedName("category")
    val category: String,                           // 类别：time_management, task_breakdown, focus

    @SerializedName("priority")
    val priority: String,                           // 优先级：high, medium, low

    @SerializedName("title")
    val title: String,                              // 标题

    @SerializedName("description")
    val description: String,                        // 描述

    @SerializedName("impact")
    val impact: String,                             // 预期影响

    @SerializedName("action_items")
    val actionItems: List<String>,                  // 行动项列表

    @SerializedName("icon")
    val icon: String                                // 图标emoji
) {
    /**
     * 获取类别显示名称
     */
    fun getCategoryName(): String {
        return when (category) {
            "time_management" -> "时间管理"
            "task_breakdown" -> "任务规划"
            "focus" -> "专注力"
            else -> "其他"
        }
    }

    /**
     * 是否高优先级
     */
    fun isHighPriority(): Boolean {
        return priority == "high"
    }
}

/**
 * 智能建议响应
 */
data class SuggestionsResponse(
    @SerializedName("suggestions")
    val suggestions: List<SmartSuggestion>,         // 建议列表

    @SerializedName("insights")
    val insights: List<String>,                     // 洞察列表

    @SerializedName("summary")
    val summary: String                             // 总结
)

/**
 * 效率综合分析
 */
data class EfficiencyAnalysis(
    @SerializedName("trend")
    val trend: EfficiencyTrend,                     // 趋势数据

    @SerializedName("suggestions")
    val suggestions: List<SmartSuggestion>,         // 建议

    @SerializedName("insights")
    val insights: List<String>,                     // 洞察

    @SerializedName("summary")
    val summary: String                             // 总结
)

/**
 * API响应包装
 */
data class EfficiencyTrendResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: EfficiencyTrend?,

    @SerializedName("error")
    val error: String? = null
)

data class SuggestionsApiResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: SuggestionsResponse?,

    @SerializedName("error")
    val error: String? = null
)

data class EfficiencyAnalysisResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: EfficiencyAnalysis?,

    @SerializedName("error")
    val error: String? = null
)

/**
 * 3日对比响应
 */
data class DailyComparisonResponse(
    @SerializedName("days") val days: List<DayData>,
    @SerializedName("average_work_minutes") val averageWorkMinutes: Double,
    @SerializedName("trend") val trend: String,  // "improving", "stable", "declining"
    @SerializedName("insights") val insights: List<String>
)

/**
 * 单日数据
 */
data class DayData(
    @SerializedName("date") val date: String,
    @SerializedName("day_of_week") val dayOfWeek: String,
    @SerializedName("work_minutes") val workMinutes: Int,
    @SerializedName("task_count") val taskCount: Int,
    @SerializedName("completed_task_count") val completedTaskCount: Int,
    @SerializedName("focus_score") val focusScore: Double,  // 0-100, 专注度评分
    @SerializedName("label") val label: String  // "今天", "昨天", "前天"
)

/**
 * 效率洞察
 */
data class EfficiencyInsight(
    @SerializedName("type") val type: String,  // "peak_time", "task_pattern", "focus_trend"
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("score") val score: Double,
    @SerializedName("recommendation") val recommendation: String?
)
