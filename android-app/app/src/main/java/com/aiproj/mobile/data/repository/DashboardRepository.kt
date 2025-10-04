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
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
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
            val response = dashboardApi.getTimeStats(days)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception("获取时间统计失败: ${response.code()}"))
            }
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
            val response = dashboardApi.getNotifications(limit)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.notifications)
            } else {
                Result.failure(Exception("获取通知失败: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

}
