package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.DetailApi
import com.aiproj.mobile.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 详情页数据仓库
 * 负责获取仪表盘统计详情数据
 */
@Singleton
class DetailRepository @Inject constructor(
    private val api: DetailApi
) {

    /**
     * 获取今日任务详情
     * 组合 /tasks/today 和 /tasks/today/stats 两个接口的数据
     *
     * @param date 日期，格式: YYYY-MM-DD
     * @param projectId 可选，按项目筛选
     * @return 今日任务详情数据
     */
    suspend fun getTodayTasksDetail(
        date: String,
        projectId: Int? = null
    ): Result<TodayTasksDetail> = withContext(Dispatchers.IO) {
        try {
            // 并行调用两个API
            val tasksResponse = api.getTodayTasksList(date, projectId)
            val statsResponse = api.getTodayTasksStats(date, projectId)

            // 检查任务列表响应
            if (!tasksResponse.isSuccessful || tasksResponse.body() == null) {
                val errorMessage = tasksResponse.errorBody()?.string() ?: "获取任务列表失败"
                return@withContext Result.failure(Exception("HTTP ${tasksResponse.code()}: $errorMessage"))
            }

            // 检查统计响应
            if (!statsResponse.isSuccessful || statsResponse.body() == null) {
                val errorMessage = statsResponse.errorBody()?.string() ?: "获取统计数据失败"
                return@withContext Result.failure(Exception("HTTP ${statsResponse.code()}: $errorMessage"))
            }

            val tasksApiResponse = tasksResponse.body()!!
            val statsApiResponse = statsResponse.body()!!

            // 检查API响应状态
            if (!tasksApiResponse.success || tasksApiResponse.data == null) {
                return@withContext Result.failure(Exception(tasksApiResponse.message ?: "获取任务列表失败"))
            }

            if (!statsApiResponse.success || statsApiResponse.data == null) {
                return@withContext Result.failure(Exception(statsApiResponse.message ?: "获取统计数据失败"))
            }

            val tasks = tasksApiResponse.data
            val stats = statsApiResponse.data

            // 从统计数据中提取优先级分布
            val priorityStats = stats.priorityStats ?: emptyMap()
            val priorityDistribution = PriorityDistribution(
                high = priorityStats["high"] ?: 0,
                medium = priorityStats["medium"] ?: 0,
                low = priorityStats["low"] ?: 0
            )

            // 计算完成率
            val completionRate = if (stats.totalCount > 0) {
                (stats.completedCount.toFloat() / stats.totalCount.toFloat()) * 100f
            } else {
                0f
            }

            // 组合成TodayTasksDetail
            val todayTasksDetail = TodayTasksDetail(
                date = date,
                total = stats.totalCount,
                completed = stats.completedCount,
                pending = stats.pendingCount,
                completionRate = completionRate,
                priorityDistribution = priorityDistribution,
                tasks = tasks
            )

            Result.success(todayTasksDetail)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取工作时长统计
     *
     * @param startDate 开始日期，格式: YYYY-MM-DD
     * @param endDate 结束日期，格式: YYYY-MM-DD
     * @param granularity 粒度: day | week | month
     * @return 工作时长统计数据
     */
    suspend fun getWorkTimeStats(
        startDate: String,
        endDate: String,
        granularity: String = "day"
    ): Result<DetailedWorkTimeStats> = withContext(Dispatchers.IO) {
        try {
            val response = api.getWorkTimeStats(startDate, endDate, granularity)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "获取工作时长统计失败"))
                }
            } else {
                val errorMessage = response.errorBody()?.string() ?: "网络请求失败"
                Result.failure(Exception("HTTP ${response.code()}: $errorMessage"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取活跃项目列表
     *
     * @param sortBy 排序字段: completion_rate | task_count | updated_at
     * @param order 排序方向: asc | desc
     * @param page 页码
     * @param limit 每页数量
     * @return 活跃项目列表数据
     */
    suspend fun getActiveProjects(
        sortBy: String = "completion_rate",
        order: String = "desc",
        page: Int = 1,
        limit: Int = 20
    ): Result<ActiveProjectsData> = withContext(Dispatchers.IO) {
        try {
            val response = api.getActiveProjects(sortBy, order, page, limit)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "获取活跃项目失败"))
                }
            } else {
                val errorMessage = response.errorBody()?.string() ?: "网络请求失败"
                Result.failure(Exception("HTTP ${response.code()}: $errorMessage"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取待办任务列表
     *
     * @param status 状态筛选，多个用逗号分隔
     * @param priority 优先级筛选
     * @param projectId 项目ID筛选
     * @param sortBy 排序字段: priority | due_date | created_at
     * @param order 排序方向: asc | desc
     * @param search 搜索关键词
     * @param page 页码
     * @param limit 每页数量
     * @return 待办任务列表数据
     */
    suspend fun getPendingTasks(
        status: String? = null,
        priority: String? = null,
        projectId: Int? = null,
        sortBy: String = "priority",
        order: String = "desc",
        search: String? = null,
        page: Int = 1,
        limit: Int = 50
    ): Result<PendingTasksData> = withContext(Dispatchers.IO) {
        try {
            val response = api.getPendingTasks(
                status, priority, projectId, sortBy, order, search, page, limit
            )
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "获取待办任务失败"))
                }
            } else {
                val errorMessage = response.errorBody()?.string() ?: "网络请求失败"
                Result.failure(Exception("HTTP ${response.code()}: $errorMessage"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 批量操作任务
     *
     * @param taskIds 任务ID列表
     * @param action 操作类型: complete | update_priority | add_to_focus | delete
     * @param params 额外参数
     * @return 批量操作结果
     */
    suspend fun batchOperateTasks(
        taskIds: List<Int>,
        action: String,
        params: Map<String, Any>? = null
    ): Result<BatchTaskResult> = withContext(Dispatchers.IO) {
        try {
            val request = BatchTaskRequest(taskIds, action, params)
            val response = api.batchOperateTasks(request)
            if (response.isSuccessful && response.body() != null) {
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    Result.success(apiResponse.data)
                } else {
                    Result.failure(Exception(apiResponse.message ?: "批量操作失败"))
                }
            } else {
                val errorMessage = response.errorBody()?.string() ?: "网络请求失败"
                Result.failure(Exception("HTTP ${response.code()}: $errorMessage"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 批量标记任务完成
     *
     * @param taskIds 任务ID列表
     * @return 操作结果
     */
    suspend fun batchCompleteTasks(taskIds: List<Int>): Result<BatchTaskResult> {
        return batchOperateTasks(taskIds, "complete")
    }

    /**
     * 批量修改任务优先级
     *
     * @param taskIds 任务ID列表
     * @param priority 新优先级: high | medium | low
     * @return 操作结果
     */
    suspend fun batchUpdatePriority(
        taskIds: List<Int>,
        priority: String
    ): Result<BatchTaskResult> {
        return batchOperateTasks(
            taskIds,
            "update_priority",
            mapOf("priority" to priority)
        )
    }

    /**
     * 批量添加任务到今日焦点
     *
     * @param taskIds 任务ID列表
     * @param focusPriority 焦点优先级: critical | high | medium | low
     * @return 操作结果
     */
    suspend fun batchAddToFocus(
        taskIds: List<Int>,
        focusPriority: String = "medium"
    ): Result<BatchTaskResult> {
        return batchOperateTasks(
            taskIds,
            "add_to_focus",
            mapOf("focus_priority" to focusPriority)
        )
    }

    /**
     * 获取今日工作时长详情
     * 组合多个API的数据
     *
     * @param date 日期，格式: YYYY-MM-DD
     * @return 今日工作时长详情数据
     */
    suspend fun getTodayWorkTimeDetail(
        date: String
    ): Result<TodayWorkTimeDetail> = withContext(Dispatchers.IO) {
        try {
            // 1. 并行调用Dashboard统计和任务列表API
            val statsResponse = api.getDashboardStats(date)
            val tasksResponse = api.getDailyTasksWithTimers(date)

            // 2. 检查Dashboard统计响应
            if (!statsResponse.isSuccessful || statsResponse.body() == null) {
                val errorMessage = statsResponse.errorBody()?.string() ?: "获取统计数据失败"
                return@withContext Result.failure(Exception("HTTP ${statsResponse.code()}: $errorMessage"))
            }

            // 3. 检查任务列表响应
            if (!tasksResponse.isSuccessful || tasksResponse.body() == null) {
                val errorMessage = tasksResponse.errorBody()?.string() ?: "获取任务列表失败"
                return@withContext Result.failure(Exception("HTTP ${tasksResponse.code()}: $errorMessage"))
            }

            val statsApiResponse = statsResponse.body()!!
            val tasksApiResponse = tasksResponse.body()!!

            // 4. 检查API响应状态
            if (!statsApiResponse.success || statsApiResponse.data == null) {
                return@withContext Result.failure(Exception(statsApiResponse.message ?: "获取统计数据失败"))
            }

            if (!tasksApiResponse.success || tasksApiResponse.data == null) {
                return@withContext Result.failure(Exception(tasksApiResponse.message ?: "获取任务列表失败"))
            }

            val stats = statsApiResponse.data
            val dailyTasksData = tasksApiResponse.data

            // 5. 处理任务数据，构建TaskTimeDetail列表
            val taskTimeDetails = dailyTasksData.tasks
                .filter { it.workHours > 0 }  // 只包含有工作时长的任务
                .map { task ->
                    TaskTimeDetail(
                        taskId = task.id,
                        taskTitle = task.title,
                        workMinutes = (task.workHours * 60).toInt(),  // 小时转分钟
                        status = task.status,
                        projectName = task.projectName
                    )
                }

            // 6. 计算时间分布（上午/下午/晚上）
            val timeDistribution = calculateTimeDistribution(dailyTasksData.tasks)

            // 7. 获取昨日数据进行对比
            val yesterday = java.time.LocalDate.parse(date).minusDays(1).toString()
            val yesterdayComparison = try {
                calculateYesterdayComparison(date, yesterday)
            } catch (e: Exception) {
                null  // 昨日数据获取失败时，对比为null
            }

            // 8. 组合成TodayWorkTimeDetail
            val todayWorkTimeDetail = TodayWorkTimeDetail(
                date = date,
                totalMinutes = stats.todayWorkTime.toInt(),
                completedTasks = stats.todayTasksCompleted,
                totalTasks = stats.todayTasksTotal,
                taskTimeDetails = taskTimeDetails,
                timeDistribution = timeDistribution,
                comparisonYesterday = yesterdayComparison
            )

            Result.success(todayWorkTimeDetail)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 计算时间分布（上午/下午/晚上）
     * 根据任务的工作会话时间段进行分类
     */
    private fun calculateTimeDistribution(tasks: List<TaskWithTimer>): TimeDistribution? {
        if (tasks.isEmpty()) return null

        var morningMinutes = 0
        var afternoonMinutes = 0
        var eveningMinutes = 0

        // 尝试使用timerLogs计算精确的时间分布
        tasks.forEach { task ->
            task.timerLogs?.forEach { log ->
                try {
                    val startTime = java.time.LocalTime.parse(
                        log.startTime.substring(11, 16)  // 提取 "HH:mm"
                    )
                    val hour = startTime.hour
                    val minutes: Int = (log.actualWorkSeconds / 60.0).toInt()

                    when {
                        hour in 6..11 -> morningMinutes += minutes
                        hour in 12..17 -> afternoonMinutes += minutes
                        else -> eveningMinutes += minutes
                    }
                } catch (e: Exception) {
                    // 时间解析失败时，跳过该日志
                }
            }
        }

        // 如果没有timer log数据，使用总工作时长按比例分配（fallback）
        if (morningMinutes == 0 && afternoonMinutes == 0 && eveningMinutes == 0) {
            val totalMinutes = tasks.sumOf { (it.workHours * 60).toInt() }
            return TimeDistribution(
                morning = (totalMinutes * 0.4).toInt(),
                afternoon = (totalMinutes * 0.5).toInt(),
                evening = (totalMinutes * 0.1).toInt()
            )
        }

        return TimeDistribution(
            morning = morningMinutes,
            afternoon = afternoonMinutes,
            evening = eveningMinutes
        )
    }

    /**
     * 计算与昨日的对比
     */
    private suspend fun calculateYesterdayComparison(
        today: String,
        yesterday: String
    ): DayComparison? {
        return try {
            // 获取今日和昨日的统计数据
            val todayStatsResponse = api.getDashboardStats(today)
            val yesterdayStatsResponse = api.getDashboardStats(yesterday)

            if (todayStatsResponse.isSuccessful && yesterdayStatsResponse.isSuccessful) {
                val todayStats = todayStatsResponse.body()?.data
                val yesterdayStats = yesterdayStatsResponse.body()?.data

                if (todayStats != null && yesterdayStats != null) {
                    val workTimeChange = todayStats.todayWorkTime.toInt() - yesterdayStats.todayWorkTime.toInt()
                    val workTimePercent = if (yesterdayStats.todayWorkTime > 0) {
                        (workTimeChange.toFloat() / yesterdayStats.todayWorkTime.toFloat()) * 100f
                    } else {
                        100f  // 昨日为0时，显示100%增长
                    }

                    val taskCountChange = todayStats.todayTasksCompleted - yesterdayStats.todayTasksCompleted
                    val taskCountPercent = if (yesterdayStats.todayTasksCompleted > 0) {
                        (taskCountChange.toFloat() / yesterdayStats.todayTasksCompleted.toFloat()) * 100f
                    } else {
                        100f
                    }

                    DayComparison(
                        workTimeChange = workTimeChange,
                        workTimePercent = workTimePercent,
                        taskCountChange = taskCountChange,
                        taskCountPercent = taskCountPercent
                    )
                } else {
                    null
                }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}
