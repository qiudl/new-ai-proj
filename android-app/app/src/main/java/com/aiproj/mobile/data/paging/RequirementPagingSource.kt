package com.aiproj.mobile.data.paging

import android.util.Log
import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.models.Requirement

/**
 * 需求分页数据源
 *
 * 实现 Paging 3 分页加载功能
 *
 * @param requirementApi 需求 API 接口
 * @param projectId 项目 ID 筛选（可选）
 * @param status 状态筛选（可选）
 * @param priority 优先级筛选（可选）
 * @param search 搜索关键词（可选）
 */
class RequirementPagingSource(
    private val requirementApi: RequirementApi,
    private val projectId: Int? = null,
    private val status: String? = null,
    private val priority: String? = null,
    private val search: String? = null
) : PagingSource<Int, Requirement>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Requirement> {
        return try {
            val page = params.key ?: 1
            val pageSize = params.loadSize

            Log.d(TAG, "加载需求列表 - 页码: $page, 每页数量: $pageSize")

            // 从 API 加载数据
            val response = requirementApi.getRequirements(
                page = page,
                pageSize = pageSize,
                status = status,
                priority = priority,
                search = search,
                projectId = projectId
            )

            when {
                !response.isSuccessful || response.body() == null -> {
                    val errorMessage = "API 错误: ${response.code()}"
                    Log.e(TAG, errorMessage)
                    LoadResult.Error(Exception(errorMessage))
                }
                else -> {
                    val responseBody = response.body()!!
                    val requirements = responseBody.data
                    val pagination = responseBody.pagination

                    Log.d(
                        TAG,
                        "成功加载 ${requirements.size} 条需求 (总计: ${pagination.total}, 当前页: ${pagination.page}/${pagination.total_pages})"
                    )

                    // 计算上一页和下一页
                    val prevKey = if (page == 1) null else page - 1
                    val nextKey = if (page >= pagination.total_pages) null else page + 1

                    LoadResult.Page(
                        data = requirements,
                        prevKey = prevKey,
                        nextKey = nextKey
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "加载需求失败", e)
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Requirement>): Int? {
        // 刷新时返回最接近当前位置的页码
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }

    companion object {
        private const val TAG = "RequirementPagingSource"
    }
}
