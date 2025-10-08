package com.aiproj.mobile.ui.screens.details.pendingtasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.PendingTasksData
import com.aiproj.mobile.data.repository.DetailRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 待办任务详情页ViewModel
 */
@HiltViewModel
class PendingTasksDetailViewModel @Inject constructor(
    private val detailRepository: DetailRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PendingTasksDetailUiState())
    val uiState: StateFlow<PendingTasksDetailUiState> = _uiState.asStateFlow()

    init {
        loadPendingTasks()
    }

    /**
     * 加载待办任务
     */
    fun loadPendingTasks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = detailRepository.getPendingTasks(
                status = _uiState.value.statusFilter,
                priority = _uiState.value.priorityFilter,
                projectId = _uiState.value.projectIdFilter,
                sortBy = _uiState.value.sortBy,
                order = _uiState.value.sortOrder,
                search = _uiState.value.searchQuery.ifEmpty { null },
                page = 1,
                limit = 100
            )

            result.onSuccess { data ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        pendingTasksData = data,
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
        loadPendingTasks()
    }

    /**
     * 切换多选模式
     */
    fun toggleMultiSelectMode() {
        _uiState.update {
            it.copy(
                isMultiSelectMode = !it.isMultiSelectMode,
                selectedTaskIds = if (it.isMultiSelectMode) emptySet() else it.selectedTaskIds
            )
        }
    }

    /**
     * 切换任务选择状态
     */
    fun toggleTaskSelection(taskId: Int) {
        _uiState.update {
            val newSelection = if (taskId in it.selectedTaskIds) {
                it.selectedTaskIds - taskId
            } else {
                it.selectedTaskIds + taskId
            }
            it.copy(selectedTaskIds = newSelection)
        }
    }

    /**
     * 批量完成任务
     */
    fun batchComplete() {
        viewModelScope.launch {
            val taskIds = _uiState.value.selectedTaskIds.toList()
            val result = detailRepository.batchCompleteTasks(taskIds)

            result.onSuccess {
                loadPendingTasks()
                _uiState.update {
                    it.copy(
                        selectedTaskIds = emptySet(),
                        isMultiSelectMode = false
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(error = "批量操作失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 批量修改优先级
     */
    fun batchUpdatePriority(priority: String) {
        viewModelScope.launch {
            val taskIds = _uiState.value.selectedTaskIds.toList()
            val result = detailRepository.batchUpdatePriority(taskIds, priority)

            result.onSuccess {
                loadPendingTasks()
                _uiState.update {
                    it.copy(
                        selectedTaskIds = emptySet(),
                        isMultiSelectMode = false
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(error = "批量操作失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 批量添加到焦点
     */
    fun batchAddToFocus() {
        viewModelScope.launch {
            val taskIds = _uiState.value.selectedTaskIds.toList()
            val result = detailRepository.batchAddToFocus(taskIds, focusPriority = "medium")

            result.onSuccess {
                loadPendingTasks()
                _uiState.update {
                    it.copy(
                        selectedTaskIds = emptySet(),
                        isMultiSelectMode = false
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(error = "批量操作失败: ${error.message}")
                }
            }
        }
    }

    /**
     * 切换分组展开状态
     */
    fun toggleGroupExpansion(priority: String) {
        _uiState.update {
            val newExpandedGroups = if (priority in it.expandedGroups) {
                it.expandedGroups - priority
            } else {
                it.expandedGroups + priority
            }
            it.copy(expandedGroups = newExpandedGroups)
        }
    }

    /**
     * 更新搜索
     */
    fun updateSearch(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        loadPendingTasks()
    }
}

/**
 * UI状态
 */
data class PendingTasksDetailUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val pendingTasksData: PendingTasksData? = null,
    val isMultiSelectMode: Boolean = false,
    val selectedTaskIds: Set<Int> = emptySet(),
    val expandedGroups: Set<String> = setOf("high", "medium", "low"),
    val statusFilter: String? = null,
    val priorityFilter: String? = null,
    val projectIdFilter: Int? = null,
    val sortBy: String = "priority",
    val sortOrder: String = "desc",
    val searchQuery: String = ""
)
