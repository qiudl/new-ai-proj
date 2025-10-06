package com.aiproj.mobile.ui.screens.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 任务列表 ViewModel (使用Paging 3)
 */
@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class TaskListViewModel @Inject constructor(
    private val taskRepository: TaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskListUiState())
    val uiState: StateFlow<TaskListUiState> = _uiState.asStateFlow()

    // 筛选条件
    private val _filterState = MutableStateFlow(TaskFilterState())
    val filterState: StateFlow<TaskFilterState> = _filterState.asStateFlow()

    // Paging数据流
    val tasksPagingData: Flow<PagingData<Task>> = filterState
        .flatMapLatest { filter ->
            val statusFilter = filter.selectedStatuses.firstOrNull()?.name?.lowercase()
            val searchQuery = filter.searchQuery.ifEmpty { null }

            taskRepository.getTasksPaging(
                projectId = filter.selectedProjectId,
                status = statusFilter,
                search = searchQuery
            )
        }
        .cachedIn(viewModelScope)

    init {
        // 初始化时不需要立即加载，Paging会自动处理
    }

    /**
     * 搜索任务
     */
    fun searchTasks(query: String) {
        _filterState.update { it.copy(searchQuery = query) }
        // flatMapLatest会自动触发新的Paging数据流
    }

    /**
     * 筛选状态
     */
    fun filterByStatus(statuses: Set<TaskStatus>) {
        _filterState.update { it.copy(selectedStatuses = statuses) }
    }

    /**
     * 筛选优先级
     */
    fun filterByPriority(priorities: Set<TaskPriority>) {
        _filterState.update { it.copy(selectedPriorities = priorities) }
    }

    /**
     * 筛选项目
     */
    fun filterByProject(projectId: Int?) {
        _filterState.update { it.copy(selectedProjectId = projectId) }
    }

    /**
     * 清除筛选
     */
    fun clearFilters() {
        _filterState.update { TaskFilterState() }
    }

    /**
     * 完成任务
     */
    fun completeTask(taskId: Int) {
        viewModelScope.launch {
            val result = taskRepository.completeTask(taskId)
            result.onSuccess {
                // Paging会通过数据库变化自动刷新
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
                // Paging会通过数据库变化自动刷新
            }
            result.onFailure { error ->
                _uiState.update {
                    it.copy(error = error.message ?: "删除失败")
                }
            }
        }
    }

    /**
     * 清除错误
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 排序任务列表
     * 注意: 当前Paging实现使用服务器排序，客户端排序需要在UI层使用map转换
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
        // Paging数据流会自动重新加载
    }

    /**
     * 切换任务展开/收起状态
     */
    fun toggleTaskExpanded(taskId: Int) {
        val currentState = _uiState.value
        val isCurrentlyExpanded = currentState.expandedTaskIds.contains(taskId)

        if (isCurrentlyExpanded) {
            // 收起任务
            _uiState.update {
                it.copy(
                    expandedTaskIds = it.expandedTaskIds - taskId
                )
            }
        } else {
            // 展开任务
            _uiState.update {
                it.copy(
                    expandedTaskIds = it.expandedTaskIds + taskId
                )
            }

            // 如果还未加载子任务，则加载
            if (!currentState.loadedChildrenMap.containsKey(taskId)) {
                loadChildTasks(taskId)
            }
        }
    }

    /**
     * 加载子任务
     */
    private fun loadChildTasks(parentId: Int) {
        viewModelScope.launch {
            // 标记为加载中
            _uiState.update {
                it.copy(loadingChildrenIds = it.loadingChildrenIds + parentId)
            }

            val result = taskRepository.getTaskChildren(parentId)

            result.onSuccess { children ->
                _uiState.update {
                    it.copy(
                        loadedChildrenMap = it.loadedChildrenMap + (parentId to children),
                        loadingChildrenIds = it.loadingChildrenIds - parentId
                    )
                }
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(
                        error = "加载子任务失败: ${error.message}",
                        loadingChildrenIds = it.loadingChildrenIds - parentId,
                        expandedTaskIds = it.expandedTaskIds - parentId // 加载失败时自动收起
                    )
                }
            }
        }
    }

    /**
     * 计算任务的完成子任务数
     */
    fun getCompletedSubtasksCount(parentId: Int): Int {
        val children = _uiState.value.loadedChildrenMap[parentId] ?: return 0
        return children.count { it.status == TaskStatus.COMPLETED }
    }

    /**
     * 计算任务的完成进度
     */
    fun getTaskCompletionProgress(parentId: Int): Float {
        val children = _uiState.value.loadedChildrenMap[parentId] ?: return 0f
        if (children.isEmpty()) return 0f
        val completed = children.count { it.status == TaskStatus.COMPLETED }
        return completed.toFloat() / children.size.toFloat()
    }

    /**
     * 刷新父任务的子任务（用于状态更新后）
     */
    fun refreshParentTask(parentId: Int) {
        // 如果父任务已展开且已加载子任务，重新加载以获取最新状态
        val currentState = _uiState.value
        if (currentState.expandedTaskIds.contains(parentId) &&
            currentState.loadedChildrenMap.containsKey(parentId)) {
            loadChildTasks(parentId)
        }
    }

    /**
     * 检查任务是否已展开
     */
    fun isTaskExpanded(taskId: Int): Boolean {
        return _uiState.value.expandedTaskIds.contains(taskId)
    }

    /**
     * 获取任务的子任务
     */
    fun getChildTasks(parentId: Int): List<Task> {
        return _uiState.value.loadedChildrenMap[parentId] ?: emptyList()
    }

    /**
     * 检查是否正在加载子任务
     */
    fun isLoadingChildren(taskId: Int): Boolean {
        return _uiState.value.loadingChildrenIds.contains(taskId)
    }
}

/**
 * 任务列表 UI 状态
 * 注意: Paging 3版本不再需要tasks, currentPage, hasMore, isLoadingMore字段
 */
data class TaskListUiState(
    val error: String? = null,
    val expandedTaskIds: Set<Int> = emptySet(),
    val loadedChildrenMap: Map<Int, List<Task>> = emptyMap(),
    val loadingChildrenIds: Set<Int> = emptySet()
)

/**
 * 任务筛选状态
 */
data class TaskFilterState(
    val searchQuery: String = "",
    val selectedStatuses: Set<TaskStatus> = emptySet(),
    val selectedPriorities: Set<TaskPriority> = emptySet(),
    val selectedProjectId: Int? = null,
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
