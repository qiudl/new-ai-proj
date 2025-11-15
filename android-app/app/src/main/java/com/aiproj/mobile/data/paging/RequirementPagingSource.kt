package com.aiproj.mobile.data.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.models.Requirement

/**
 * 需求分页数据源
 * 实现 Paging 3 的 PagingSource，支持需求列表的分页加载
 */
class RequirementPagingSource(
    private val requirementApi: RequirementApi,
    private val projectId: Int? = null,
    private val status: String? = null,
    private val priority: String? = null,
    private val search: String? = null
) : PagingSource<Int, Requirement>() {

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
                val apiResponse = response.body()!!
                if (apiResponse.success && apiResponse.data != null) {
                    val requirementListResponse = apiResponse.data
                    val requirements = requirementListResponse.data
                    val pagination = requirementListResponse.pagination

                    LoadResult.Page(
                        data = requirements,
                        prevKey = if (page == 1) null else page - 1,
                        nextKey = if (page >= pagination.total_pages) null else page + 1
                    )
                } else {
                    LoadResult.Error(Exception(apiResponse.message ?: "Failed to load requirements"))
                }
            } else {
                LoadResult.Error(Exception("Failed to load requirements: ${response.code()}"))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Requirement>): Int? {
        // 刷新时返回最接近当前位置的页码
        return state.anchorPosition?.let { anchorPosition ->
            state.closestPageToPosition(anchorPosition)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchorPosition)?.nextKey?.minus(1)
        }
    }
}
