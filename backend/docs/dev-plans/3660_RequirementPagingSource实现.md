# 任务 #3660: RequirementPagingSource实现

## 任务信息
- **任务ID**: #3660
- **父任务**: #3656 - Android需求管理模块设计
- **负责Agent**: Agent 1 - 数据层专家
- **预估工时**: 0.5小时
- **优先级**: Medium
- **状态**: Todo

## 任务目标

实现Paging 3的PagingSource，支持需求列表的分页加载。

## 实现文件

```
android-app/app/src/main/java/com/aiproj/mobile/data/paging/RequirementPagingSource.kt
```

## 实现内容

```kotlin
package com.aiproj.mobile.data.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.models.Requirement

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

## 依赖关系

**前置依赖**:
- #3657 - RequirementApi接口（PagingSource需要调用API）
- #3658 - Requirement数据模型（泛型参数类型）

**后续依赖**:
- #3664 - 需求列表页面和ViewModel（ViewModel将使用PagingSource创建Pager）

## 验证标准

- [ ] 继承PagingSource<Int, Requirement>
- [ ] 实现load()方法处理分页逻辑
- [ ] 实现getRefreshKey()支持刷新
- [ ] 支持筛选参数（status, priority, search, projectId）
- [ ] 正确处理第一页和最后一页
- [ ] 正确处理错误情况（返回LoadResult.Error）
- [ ] 使用suspend函数支持协程

## 注意事项

1. **分页参数**：
   - 页码从1开始（page = 1表示第一页）
   - 使用 `params.loadSize` 作为每页大小
   - 第一页的 `prevKey` 应该为 `null`
   - 最后一页的 `nextKey` 应该为 `null`

2. **筛选参数**：
   - 所有筛选参数都是可选的（nullable）
   - 传入null表示不筛选该维度
   - `projectId` 参数用于按项目筛选

3. **错误处理**：
   - 网络错误、API错误都应该返回 `LoadResult.Error`
   - 空响应也应该视为错误

4. **刷新逻辑**：
   - `getRefreshKey()` 确保用户滚动位置在刷新后保持不变
   - 计算逻辑：找到当前锚点位置最近的页面，返回相邻页码

5. **与API接口协调**：
   - 确保API接口返回类型为 `Response<RequirementListResponse>`
   - `RequirementListResponse` 包含 `data` 和 `pagination` 两个字段
   - `Pagination` 使用 `total_pages` 字段判断是否有下一页

6. **Paging 3集成**：
   - 在ViewModel中使用 `Pager` 配置创建Flow：
     ```kotlin
     val requirementsPager = Pager(
         config = PagingConfig(pageSize = 20, enablePlaceholders = false),
         pagingSourceFactory = { RequirementPagingSource(api, projectId, status, priority, search) }
     ).flow.cachedIn(viewModelScope)
     ```

## 使用示例

### 在ViewModel中使用

```kotlin
class RequirementListViewModel @Inject constructor(
    private val requirementApi: RequirementApi
) : ViewModel() {

    private val _filters = MutableStateFlow(FilterState())

    val requirements: Flow<PagingData<Requirement>> = _filters
        .flatMapLatest { filters ->
            Pager(
                config = PagingConfig(
                    pageSize = 20,
                    enablePlaceholders = false,
                    initialLoadSize = 20
                ),
                pagingSourceFactory = {
                    RequirementPagingSource(
                        requirementApi = requirementApi,
                        projectId = filters.projectId,
                        status = filters.status,
                        priority = filters.priority,
                        search = filters.search
                    )
                }
            ).flow
        }
        .cachedIn(viewModelScope)
}
```

### 在Composable中使用

```kotlin
@Composable
fun RequirementListScreen(viewModel: RequirementListViewModel) {
    val requirements = viewModel.requirements.collectAsLazyPagingItems()

    LazyColumn {
        items(requirements.itemCount) { index ->
            requirements[index]?.let { requirement ->
                RequirementListItem(requirement = requirement)
            }
        }

        // 处理加载状态
        requirements.apply {
            when {
                loadState.refresh is LoadState.Loading -> {
                    item { LoadingIndicator() }
                }
                loadState.append is LoadState.Loading -> {
                    item { LoadingIndicator() }
                }
                loadState.refresh is LoadState.Error -> {
                    item { ErrorMessage() }
                }
            }
        }
    }
}
```

## 完成标记

完成后在此任务下评论："✅ RequirementPagingSource实现完成"
