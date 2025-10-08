package com.aiproj.mobile.data.paging

import android.util.Log
import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiproj.mobile.data.api.TimerApi
import com.aiproj.mobile.data.models.TimerLog

/**
 * 计时器历史记录分页数据源
 *
 * 特点:
 * - 纯API加载（不需要离线缓存，历史记录是只读数据）
 * - 支持日期范围筛选
 * - 支持任务ID和状态筛选
 */
class TimerHistoryPagingSource(
    private val timerApi: TimerApi,
    private val startDate: String? = null,
    private val endDate: String? = null,
    private val taskId: Long? = null,
    private val status: String? = null
) : PagingSource<Int, TimerLog>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, TimerLog> {
        return try {
            val page = params.key ?: 1
            val pageSize = params.loadSize

            Log.d(TAG, "Loading timer history: page=$page, pageSize=$pageSize")

            val response = timerApi.getTimerHistory(
                page = page,
                pageSize = pageSize,
                startDate = startDate,
                endDate = endDate,
                taskId = taskId,
                status = status
            )

            when {
                !response.isSuccessful || response.body() == null -> {
                    val errorMsg = "API错误: ${response.code()}"
                    Log.e(TAG, errorMsg)
                    LoadResult.Error(Exception(errorMsg))
                }
                else -> {
                    val apiResponse = response.body()!!

                    // 检查API响应是否成功
                    if (!apiResponse.success || apiResponse.data == null) {
                        val errorMsg = apiResponse.error ?: apiResponse.message ?: "加载失败"
                        Log.e(TAG, "API返回失败: $errorMsg")
                        LoadResult.Error(Exception(errorMsg))
                    } else {
                        val historyData = apiResponse.data
                        val logs = historyData.logs

                        Log.d(TAG, "Loaded ${logs.size} timer logs (total: ${historyData.total})")

                        LoadResult.Page(
                            data = logs,
                            prevKey = if (page == 1) null else page - 1,
                            nextKey = if (logs.isEmpty() || logs.size < pageSize) null else page + 1
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load timer history", e)
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, TimerLog>): Int? {
        // 刷新时返回最接近当前位置的页码
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }

    companion object {
        private const val TAG = "TimerHistoryPagingSource"
    }
}
