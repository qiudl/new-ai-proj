package com.aiproj.mobile.ui.screens.requirement

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.aiproj.mobile.data.api.RequirementApi
import com.aiproj.mobile.data.models.Requirement
import com.aiproj.mobile.data.models.RequirementCategory
import com.aiproj.mobile.data.models.RequirementPriority
import com.aiproj.mobile.data.models.RequirementStatus
import com.aiproj.mobile.data.paging.RequirementPagingSource
import com.aiproj.mobile.data.repository.RequirementRepository
import com.aiproj.mobile.ui.components.requirement.RequirementFilter
import com.aiproj.mobile.ui.components.requirement.RequirementStats
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 需求列表 ViewModel
 *
 * 负责管理需求列表的状态、数据加载和用户交互
 */
@HiltViewModel
class RequirementListViewModel @Inject constructor(
    private val requirementApi: RequirementApi,
    private val requirementRepository: RequirementRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RequirementListUiState())
    val uiState: StateFlow<RequirementListUiState> = _uiState.asStateFlow()

    // 当前筛选条件
    private val _currentFilter = MutableStateFlow(RequirementFilter())
    val currentFilter: StateFlow<RequirementFilter> = _currentFilter.asStateFlow()

    // 分页数据流
    val pagingDataFlow: Flow<PagingData<Requirement>> = _currentFilter
        .flatMapLatest { filter ->
            Pager(
                config = PagingConfig(
                    pageSize = 20,
                    enablePlaceholders = false,
                    initialLoadSize = 20
                ),
                pagingSourceFactory = {
                    RequirementPagingSource(
                        requirementApi = requirementApi,
                        status = filter.status?.name?.lowercase(),
                        priority = filter.priority?.name?.lowercase(),
                        search = _uiState.value.searchQuery.ifBlank { null }
                    )
                }
            ).flow
        }
        .cachedIn(viewModelScope)

    init {
        loadStats()
    }

    /**
     * 加载统计数据
     */
    fun loadStats() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingStats = true)

            requirementRepository.getRequirementsCached()
                .collect { result ->
                    result.onSuccess { requirements ->
                        val stats = RequirementStats(
                            totalCount = requirements.size,
                            draftCount = requirements.count { it.status == RequirementStatus.DRAFT },
                            pendingCount = requirements.count { it.status == RequirementStatus.PENDING },
                            reviewingCount = requirements.count { it.status == RequirementStatus.REVIEWING },
                            approvedCount = requirements.count { it.status == RequirementStatus.APPROVED },
                            rejectedCount = requirements.count { it.status == RequirementStatus.REJECTED }
                        )
                        _uiState.value = _uiState.value.copy(
                            stats = stats,
                            isLoadingStats = false
                        )
                    }.onFailure {
                        _uiState.value = _uiState.value.copy(isLoadingStats = false)
                    }
                }
        }
    }

    /**
     * 更新筛选条件
     */
    fun updateFilter(filter: RequirementFilter) {
        _currentFilter.value = filter
    }

    /**
     * 快速筛选（从统计卡片点击）
     */
    fun quickFilterByStatus(statusString: String) {
        val status = when (statusString.lowercase()) {
            "draft" -> RequirementStatus.DRAFT
            "pending" -> RequirementStatus.PENDING
            "reviewing" -> RequirementStatus.REVIEWING
            "approved" -> RequirementStatus.APPROVED
            "rejected" -> RequirementStatus.REJECTED
            else -> null
        }
        _currentFilter.value = _currentFilter.value.copy(status = status)
    }

    /**
     * 更新搜索关键词
     */
    fun updateSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }

    /**
     * 执行搜索
     */
    fun performSearch() {
        // 触发分页数据重新加载
        _currentFilter.value = _currentFilter.value.copy()
    }

    /**
     * 清除搜索
     */
    fun clearSearch() {
        _uiState.value = _uiState.value.copy(searchQuery = "")
        performSearch()
    }
}

/**
 * 需求列表 UI 状态
 */
data class RequirementListUiState(
    val isLoadingStats: Boolean = false,
    val stats: RequirementStats = RequirementStats(),
    val searchQuery: String = "",
    val error: String? = null
)
