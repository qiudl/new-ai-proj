package com.aiproj.mobile.data.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.models.Requirement

/**
 * 需求列表的分页数据源
 *
 * 支持按项目、状态、优先级和搜索关键词筛选需求列表
 *
 * @param requirementApi 需求 API 接口
 * @param projectId 项目ID（可选）
 * @param status 需求状态（可选）
 * @param priority 需求优先级（可选）
 * @param search 搜索关键词（可选）
 */
class RequirementPagingSource(
    private val requirementApi: RequirementApi,
    private val projectId: Int? = null,
    private val status: String? = null,
    private val priority: String? = null,
    private val search: String? = null
) : PagingSource<Int, Requirement>() {

    /**
     * 加载分页数据
     *
     * @param params 加载参数，包含页码和加载大小
     * @return 加载结果，包含数据和前后页码
     */
    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Requirement> {
        val page = params.key ?: 1

        return try {
            val response = requirementApi.getRequirements(
                page = page,
                pageSize = params.loadSize,
                status = status,
                priority = priority,
                search = search,
                projectId = projectId
            )

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val requirements = body.data
                val pagination = body.pagination

                LoadResult.Page(
                    data = requirements,
                    prevKey = if (page == 1) null else page - 1,
                    nextKey = if (page >= pagination.total_pages) null else page + 1
                )
            } else {
                LoadResult.Error(Exception("Failed to load requirements: ${response.code()}"))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    /**
     * 获取刷新时的锚点页码
     *
     * 确保刷新后用户的滚动位置保持在附近
     *
     * @param state 分页状态
     * @return 刷新时应该加载的页码
     */
    override fun getRefreshKey(state: PagingState<Int, Requirement>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            state.closestPageToPosition(anchorPosition)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchorPosition)?.nextKey?.minus(1)
        }
    }
}
