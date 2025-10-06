package com.aiproj.mobile.ui.screens.details.activeprojects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.ActiveProjectsData
import com.aiproj.mobile.data.repository.DetailRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 活跃项目详情页ViewModel
 */
@HiltViewModel
class ActiveProjectsDetailViewModel @Inject constructor(
    private val detailRepository: DetailRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ActiveProjectsDetailUiState())
    val uiState: StateFlow<ActiveProjectsDetailUiState> = _uiState.asStateFlow()

    init {
        loadActiveProjects()
    }

    /**
     * 加载活跃项目
     */
    fun loadActiveProjects() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = detailRepository.getActiveProjects(
                sortBy = _uiState.value.sortBy,
                order = _uiState.value.sortOrder,
                page = 1,
                limit = 50
            )

            result.onSuccess { data ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        projectsData = data,
                        error = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "加载失败"
                    )
                }
            }
        }
    }

    /**
     * 刷新数据
     */
    fun refreshData() {
        loadActiveProjects()
    }

    /**
     * 更新排序
     */
    fun updateSort(sortBy: String) {
        _uiState.update { it.copy(sortBy = sortBy) }
        loadActiveProjects()
    }

    /**
     * 更新排序方向
     */
    fun toggleSortOrder() {
        val newOrder = if (_uiState.value.sortOrder == "desc") "asc" else "desc"
        _uiState.update { it.copy(sortOrder = newOrder) }
        loadActiveProjects()
    }

    /**
     * 搜索
     */
    fun search(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        // TODO: Implement search filter
    }
}

/**
 * UI状态
 */
data class ActiveProjectsDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val projectsData: ActiveProjectsData? = null,
    val sortBy: String = "completion_rate",
    val sortOrder: String = "desc",
    val searchQuery: String = ""
)
