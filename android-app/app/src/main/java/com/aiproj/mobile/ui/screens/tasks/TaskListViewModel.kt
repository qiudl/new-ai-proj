package com.aiproj.mobile.ui.screens.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 任务列表 ViewModel
 */
@HiltViewModel
class TaskListViewModel @Inject constructor(
    private val taskRepository: TaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskListUiState())
    val uiState: StateFlow<TaskListUiState> = _uiState.asStateFlow()

    // 筛选条件
    private val _filterState = MutableStateFlow(TaskFilterState())
    val filterState: StateFlow<TaskFilterState> = _filterState.asStateFlow()

    init {
        loadTasks()
    }

    /**
     * 加载任务列表
     */
    fun loadTasks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, currentPage = 1) }

            val filter = _filterState.value
            // Use first status/priority or null if empty
            val statusFilter = filter.selectedStatuses.firstOrNull()
            val priorityFilter = filter.selectedPriorities.firstOrNull()

            taskRepository.getTasks(
                page = 1,
                limit = _uiState.value.pageSize,
                status = statusFilter,
                priority = priorityFilter,
                search = filter.searchQuery.ifEmpty { null }
            ).collect { result ->
                result.onSuccess { response ->
                    // 应用排序
                    val sortedTasks = sortTasks(response.tasks, filter.sortBy, filter.sortAscending)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            tasks = sortedTasks,
                            totalCount = response.total,
                            hasMore = sortedTasks.size >= it.pageSize,
                            currentPage = 1,
                            error = null
                        )
                    }
                }

                result.onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "加载失败，请重试"
                        )
                    }
                }
            }
        }
    }

    /**
     * 加载更多任务
     */
    fun loadMoreTasks() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMore) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }

            val filter = _filterState.value
            val statusFilter = filter.selectedStatuses.firstOrNull()
            val priorityFilter = filter.selectedPriorities.firstOrNull()
            val nextPage = _uiState.value.currentPage + 1

            taskRepository.getTasks(
                page = nextPage,
                limit = _uiState.value.pageSize,
                status = statusFilter,
                priority = priorityFilter,
                search = filter.searchQuery.ifEmpty { null }
            ).collect { result ->
                result.onSuccess { response ->
                    // 应用排序
                    val sortedNewTasks = sortTasks(response.tasks, filter.sortBy, filter.sortAscending)
                    _uiState.update { state ->
                        state.copy(
                            tasks = state.tasks + sortedNewTasks,
                            currentPage = nextPage,
                            hasMore = sortedNewTasks.size >= state.pageSize,
                            isLoadingMore = false
                        )
                    }
                }

                result.onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoadingMore = false,
                            error = error.message ?: "加载失败，请重试"
                        )
                    }
                }
            }
        }
    }

    /**
     * 搜索任务
     */
    fun searchTasks(query: String) {
        _filterState.update { it.copy(searchQuery = query) }
        loadTasks()
    }

    /**
     * 筛选状态
     */
    fun filterByStatus(statuses: Set<TaskStatus>) {
        _filterState.update { it.copy(selectedStatuses = statuses) }
        loadTasks()
    }

    /**
     * 筛选优先级
     */
    fun filterByPriority(priorities: Set<TaskPriority>) {
        _filterState.update { it.copy(selectedPriorities = priorities) }
        loadTasks()
    }

    /**
     * 清除筛选
     */
    fun clearFilters() {
        _filterState.update { TaskFilterState() }
        loadTasks()
    }

    /**
     * 完成任务
     */
    fun completeTask(taskId: Int) {
        viewModelScope.launch {
            val result = taskRepository.completeTask(taskId)
            result.onSuccess {
                loadTasks() // 重新加载列表
            }
            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = error.message ?: "操作失败")
                }
            }
        }
    }

    /**
     * 删除任务
     */
    fun deleteTask(taskId: Int) {
        viewModelScope.launch {
            val result = taskRepository.deleteTask(taskId)
            result.onSuccess {
                // 从列表中移除任务
                _uiState.update { state ->
                    state.copy(
                        tasks = state.tasks.filter { it.id != taskId }
                    )
                }
            }
            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = error.message ?: "删除失败")
                }
            }
        }
    }

    /**
     * 刷新列表
     */
    fun refresh() {
        loadTasks()
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 排序任务列表
     */
    fun sortBy(option: SortOption, toggleDirection: Boolean = false) {
        _filterState.update { state ->
            val newAscending = if (toggleDirection) {
                !state.sortAscending
            } else {
                option == SortOption.TITLE // 标题默认升序
            }
            state.copy(
                sortBy = option,
                sortAscending = newAscending
            )
        }

        // 对当前任务列表进行排序
        _uiState.update { state ->
            val sortedTasks = sortTasks(state.tasks, _filterState.value.sortBy, _filterState.value.sortAscending)
            state.copy(tasks = sortedTasks)
        }
    }

    /**
     * 排序任务列表
     */
    private fun sortTasks(tasks: List<Task>, sortBy: SortOption, ascending: Boolean): List<Task> {
        val comparator: Comparator<Task> = when (sortBy) {
            SortOption.CREATED_AT -> compareBy { it.createdAt ?: "" }
            SortOption.UPDATED_AT -> compareBy { it.updatedAt ?: "" }
            SortOption.DUE_DATE -> compareBy(nullsLast()) { it.dueDate }
            SortOption.PRIORITY -> compareBy(nullsLast()) { it.priority?.ordinal }
            SortOption.TITLE -> compareBy { it.title }
            SortOption.STATUS -> compareBy { it.status.ordinal }
        }

        return if (ascending) {
            tasks.sortedWith(comparator)
        } else {
            tasks.sortedWith(comparator.reversed())
        }
    }
}

/**
 * 任务列表 UI 状态
 */
data class TaskListUiState(
    val isLoading: Boolean = false,
    val tasks: List<Task> = emptyList(),
    val totalCount: Int = 0,
    val error: String? = null,
    val currentPage: Int = 1,
    val pageSize: Int = 20,
    val hasMore: Boolean = true,
    val isLoadingMore: Boolean = false
)

/**
 * 任务筛选状态
 */
data class TaskFilterState(
    val searchQuery: String = "",
    val selectedStatuses: Set<TaskStatus> = emptySet(),
    val selectedPriorities: Set<TaskPriority> = emptySet(),
    val sortBy: SortOption = SortOption.UPDATED_AT,
    val sortAscending: Boolean = false
)

/**
 * 排序选项
 */
enum class SortOption(val label: String) {
    CREATED_AT("创建时间"),
    UPDATED_AT("更新时间"),
    DUE_DATE("截止日期"),
    PRIORITY("优先级"),
    TITLE("标题"),
    STATUS("状态")
}
