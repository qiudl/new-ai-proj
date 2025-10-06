package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 任务统计数据模型
 */
data class TaskStats(
    @SerializedName("total")
    val total: Int,

    @SerializedName("completed")
    val completed: Int,

    @SerializedName("in_progress")
    val inProgress: Int,

    @SerializedName("todo")
    val todo: Int,

    @SerializedName("testing")
    val testing: Int = 0,

    @SerializedName("blocked")
    val blocked: Int = 0,

    @SerializedName("cancelled")
    val cancelled: Int = 0
) {
    /**
     * 计算完成率
     */
    val completionRate: Float
        get() = if (total > 0) completed.toFloat() / total else 0f

    /**
     * 进行中任务数（包含testing）
     */
    val activeCount: Int
        get() = inProgress + testing

    /**
     * 获取状态分布Map（用于图表）
     */
    fun getDistributionMap(): Map<String, Int> = mapOf(
        "待办" to todo,
        "进行中" to inProgress,
        "测试中" to testing,
        "已完成" to completed,
        "已阻塞" to blocked,
        "已取消" to cancelled
    )
}
