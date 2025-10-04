package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.DashboardApi
import com.aiproj.mobile.data.local.CacheManager
import com.aiproj.mobile.data.models.DashboardData
import com.aiproj.mobile.data.models.DashboardStats
import com.aiproj.mobile.data.models.DailyTimeStat
import com.aiproj.mobile.data.models.Notification
import com.aiproj.mobile.data.models.NotificationType
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.models.TimeStatsData
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Dashboard 数据仓库
 */
@Singleton
class DashboardRepository @Inject constructor(
    private val dashboardApi: DashboardApi,
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
    private val timeLogRepository: TimeLogRepository,
    private val cacheManager: CacheManager
) {
    companion object {
        private const val CACHE_KEY_DASHBOARD = "dashboard_data"
        private const val CACHE_KEY_TIMESTAMP = "dashboard_timestamp"
        private const val CACHE_EXPIRY_MS = 5 * 60 * 1000L // 5分钟
    }

    /**
     * 缓存数据包装类
     */
    private data class CachedDashboardData(
        val data: DashboardData,
        val timestamp: Long = System.currentTimeMillis()
    ) {
        fun isExpired(): Boolean {
            return System.currentTimeMillis() - timestamp > CACHE_EXPIRY_MS
        }
    }

    /**
     * 获取完整的 Dashboard 数据（带缓存）
     * @param forceRefresh 是否强制刷新，默认false
     */
    suspend fun getDashboardData(forceRefresh: Boolean = false): Result<DashboardData> = coroutineScope {
        try {
            // 1. 检查缓存（如果不强制刷新）
            if (!forceRefresh) {
                val cachedData = cacheManager.getCache(CACHE_KEY_DASHBOARD, CachedDashboardData::class.java)
                if (cachedData != null && !cachedData.isExpired()) {
                    return@coroutineScope Result.success(cachedData.data)
                }
            }

            // 2. 缓存过期或强制刷新，从网络加载
            // 并行加载所有数据
            val statsDeferred = async { getDashboardStats() }
            val priorityTasksDeferred = async {
                taskRepository.getTasks(
                    page = 1,
                    limit = 5,
                    status = TaskStatus.IN_PROGRESS,
                    priority = TaskPriority.HIGH
                ).first()
            }
            val recentProjectsDeferred = async {
                projectRepository.getProjects(page = 1, limit = 5).first()
            }
            val currentTimerDeferred = async { timeLogRepository.getCurrentTimer() }
            val timeStatsDeferred = async { getTimeStats(days = 7) }
            val notificationsDeferred = async { getRecentNotifications(limit = 5) }

            // 等待所有数据加载完成（改为容错处理）
            val stats = statsDeferred.await().getOrNull() ?: DashboardStats(
                todayTasksCompleted = 0,
                todayTasksTotal = 0,
                todayWorkTime = 0,
                activeProjects = 0,
                pendingTasks = 0
            )
            val priorityTasks = priorityTasksDeferred.await().getOrNull()?.tasks ?: emptyList()
            val recentProjects = recentProjectsDeferred.await().getOrNull()?.projects ?: emptyList()
            val currentTimer = currentTimerDeferred.await().getOrNull()
            val timeStats = timeStatsDeferred.await().getOrNull()
            val notifications = notificationsDeferred.await().getOrNull() ?: emptyList()

            val dashboardData = DashboardData(
                stats = stats,
                priorityTasks = priorityTasks,
                recentProjects = recentProjects,
                currentTimer = currentTimer,
                timeStats = timeStats,
                recentNotifications = notifications
            )

            // 3. 保存到缓存
            cacheManager.saveCache(
                CACHE_KEY_DASHBOARD,
                CachedDashboardData(data = dashboardData)
            )

            Result.success(dashboardData)
        } catch (e: Exception) {
            // 4. 网络失败时尝试返回过期缓存
            val cachedData = cacheManager.getCache(CACHE_KEY_DASHBOARD, CachedDashboardData::class.java)
            if (cachedData != null) {
                Result.success(cachedData.data)
            } else {
                Result.failure(e)
            }
        }
    }

    /**
     * 获取 Dashboard 统计数据
     */
    suspend fun getDashboardStats(date: String? = null): Result<DashboardStats> {
        return try {
            val response = dashboardApi.getDashboardStats(date)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("获取统计数据失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取时间统计数据
     * @param days 统计天数，默认7天
     */
    suspend fun getTimeStats(days: Int = 7): Result<TimeStatsData> {
        return try {
            // TODO: 实现实际的 API 调用
            // 暂时返回模拟数据用于UI开发
            val dailyStats = generateMockDailyStats(days)
            val totalHours = dailyStats.sumOf { it.hours.toDouble() }.toFloat()
            val averageHours = totalHours / days
            val mostProductiveDay = dailyStats.maxByOrNull { it.hours }?.label

            Result.success(
                TimeStatsData(
                    dailyStats = dailyStats,
                    totalHours = totalHours,
                    averageHoursPerDay = averageHours,
                    mostProductiveDay = mostProductiveDay
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 获取最新通知
     * @param limit 获取数量，默认5条
     */
    suspend fun getRecentNotifications(limit: Int = 5): Result<List<Notification>> {
        return try {
            // TODO: 实现实际的 API 调用
            // 暂时返回模拟数据用于UI开发
            val mockNotifications = generateMockNotifications(limit)
            Result.success(mockNotifications)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 生成模拟的每日统计数据
     * TODO: 移除此方法，改为实际API调用
     */
    private fun generateMockDailyStats(days: Int): List<DailyTimeStat> {
        val dayLabels = listOf("周一", "周二", "周三", "周四", "周五", "周六", "周日")
        return (0 until days).map { index ->
            DailyTimeStat(
                date = "2025-10-${String.format("%02d", index + 1)}",
                hours = (2..8).random().toFloat() + (0..9).random() / 10f,
                taskCount = (1..5).random(),
                label = dayLabels[index % 7]
            )
        }
    }

    /**
     * 生成模拟通知数据
     * TODO: 移除此方法，改为实际API调用
     */
    private fun generateMockNotifications(limit: Int): List<Notification> {
        val types = listOf(
            NotificationType.TASK_ASSIGNED,
            NotificationType.TASK_UPDATED,
            NotificationType.DEADLINE_APPROACHING,
            NotificationType.COMMENT_ADDED
        )

        val messages = listOf(
            "你被分配了新任务：实现用户认证模块",
            "任务「API文档编写」已被更新",
            "任务「数据库优化」即将到期，请及时处理",
            "王小明在「前端重构」任务中添加了评论",
            "项目「移动端开发」有新的更新"
        )

        return (0 until limit).map { index ->
            Notification(
                id = index + 1,
                type = types.random(),
                title = "通知标题 ${index + 1}",
                message = messages.random(),
                isRead = index > 1, // 前2条未读
                relatedTaskId = if (index % 2 == 0) (100 + index) else null,
                createdAt = "2025-10-0${4 - index / 2}T${10 + index}:30:00Z"
            )
        }
    }
}
