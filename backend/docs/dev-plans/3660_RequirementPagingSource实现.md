# 任务 #3660: RequirementPagingSource实现

## 任务信息
- **任务ID**: #3660
- **负责Agent**: Agent 1 - 数据层专家
- **预估工时**: 0.5小时

## 任务目标

实现Paging 3的PagingSource，支持需求列表的分页加载。

## 实现文件

```
app/src/main/java/com/aiproj/mobile/data/paging/RequirementPagingSource.kt
```

## 实现内容

```kotlin
package com.aiproj.mobile.data.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.model.Requirement

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
                val body = response.body()!!
                val requirements = body.data
                val pagination = body.pagination

                LoadResult.Page(
                    data = requirements,
                    prevKey = if (page == 1) null else page - 1,
                    nextKey = if (page >= pagination.total_pages) null else page + 1
                )
            } else {
                LoadResult.Error(Exception("Failed to load"))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Requirement>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            state.closestPageToPosition(anchorPosition)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchorPosition)?.nextKey?.minus(1)
        }
    }
}
```

## 验证标准

- [ ] 继承PagingSource<Int, Requirement>
- [ ] 实现load()方法处理分页逻辑
- [ ] 实现getRefreshKey()支持刷新
- [ ] 支持筛选参数（status, priority, search）
- [ ] 正确处理第一页和最后一页

## 完成标记

完成后评论："✅ RequirementPagingSource实现完成"
