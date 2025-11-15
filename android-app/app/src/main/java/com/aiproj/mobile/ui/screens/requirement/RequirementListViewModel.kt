package com.aiproj.mobile.ui.screens.requirement

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.*
import com.aiproj.mobile.data.repository.RequirementRepository
import com.aiproj.mobile.data.repository.ProjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 需求列表 ViewModel
 *
 * 职责:
 * - 管理需求列表数据加载
 * - 处理筛选和搜索
 * - 管理UI状态和错误处理
 * - 支持下拉刷新和加载更多
 */
@HiltViewModel
class RequirementListViewModel @Inject constructor(
    private val requirementRepository: RequirementRepository,
    private val projectRepository: ProjectRepository
) : ViewModel() {

    companion object {
        private const val TAG = "RequirementListVM"
    }

    // UI状态
    private val _uiState = MutableStateFlow(RequirementListUiState())
    val uiState: StateFlow<RequirementListUiState> = _uiState.asStateFlow()

    // 筛选条件
    private val _filterState = MutableStateFlow(RequirementFilterState())
    val filterState: StateFlow<RequirementFilterState> = _filterState.asStateFlow()

    // 需求列表数据
    private val _requirements = MutableStateFlow<List<Requirement>>(emptyList())
    val requirements: StateFlow<List<Requirement>> = _requirements.asStateFlow()

    // 项目列表数据（用于筛选抽屉）
    private val _projects = MutableStateFlow<List<Project>>(emptyList())
    val projects: StateFlow<List<Project>> = _projects.asStateFlow()

    // 项目加载状态
    private val _projectsLoading = MutableStateFlow(false)
    val projectsLoading: StateFlow<Boolean> = _projectsLoading.asStateFlow()

    init {
        loadRequirements()
    }

    /**
     * 加载需求列表
     */
    fun loadRequirements(forceRefresh: Boolean = false) {
        if (_uiState.value.isLoading && !forceRefresh) {
            Log.d(TAG, "Already loading, skip")
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val filter = _filterState.value
            requirementRepository.getRequirementsCached(
                projectId = filter.selectedProjectId,
                status = filter.selectedStatus?.name?.lowercase(),
                priority = filter.selectedPriority?.name?.lowercase(),
                search = filter.searchQuery.ifEmpty { null }
            ).collect { result ->
                result.fold(
                    onSuccess = { requirementsList ->
                        Log.d(TAG, "Loaded ${requirementsList.size} requirements")
                        _requirements.value = requirementsList
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = null,
                                isEmpty = requirementsList.isEmpty()
                            )
                        }
                    },
                    onFailure = { exception ->
                        Log.e(TAG, "Failed to load requirements", exception)
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = exception.message ?: "加载失败",
                                isEmpty = _requirements.value.isEmpty()
                            )
                        }
                    }
                )
            }
        }
    }

    /**
     * 刷新需求列表
     */
    fun refreshRequirements() {
        viewModelScope.launch {
            requirementRepository.clearCache()
            loadRequirements(forceRefresh = true)
        }
    }

    /**
     * 搜索需求
     */
    fun searchRequirements(query: String) {
        _filterState.update { it.copy(searchQuery = query) }
        loadRequirements(forceRefresh = true)
    }

    /**
     * 根据状态筛选
     */
    fun filterByStatus(status: RequirementStatus?) {
        _filterState.update { it.copy(selectedStatus = status) }
        loadRequirements(forceRefresh = true)
    }

    /**
     * 根据优先级筛选
     */
    fun filterByPriority(priority: RequirementPriority?) {
        _filterState.update { it.copy(selectedPriority = priority) }
        loadRequirements(forceRefresh = true)
    }

    /**
     * 根据类别筛选
     */
    fun filterByCategory(category: RequirementCategory?) {
        _filterState.update { it.copy(selectedCategory = category) }
        loadRequirements(forceRefresh = true)
    }

    /**
     * 根据项目筛选
     */
    fun filterByProject(projectId: Int?) {
        _filterState.update { it.copy(selectedProjectId = projectId) }
        loadRequirements(forceRefresh = true)
    }

    /**
     * 根据客户(公司)筛选
     * 通过公司名称过滤项目，然后筛选属于这些项目的需求
     */
    fun filterByCompany(companyName: String?) {
        _filterState.update { it.copy(selectedCompanyName = companyName) }

        if (companyName == null) {
            // 清除公司筛选，但保留其他筛选
            _filterState.update { it.copy(selectedProjectId = null) }
        } else {
            // 找到属于该公司的所有项目
            val companyProjects = _projects.value.filter { it.companyName == companyName }
            if (companyProjects.isNotEmpty()) {
                // 暂时只支持选择第一个项目，实际应该支持多项目筛选
                _filterState.update { it.copy(selectedProjectId = companyProjects.first().id) }
            }
        }

        loadRequirements(forceRefresh = true)
    }

    /**
     * 加载项目列表（用于筛选抽屉）
     */
    fun loadProjects(forceRefresh: Boolean = false) {
        if (_projectsLoading.value && !forceRefresh) {
            Log.d(TAG, "Projects already loading, skip")
            return
        }

        viewModelScope.launch {
            _projectsLoading.value = true

            val result = projectRepository.getProjectsCached(forceRefresh = forceRefresh)
            result.fold(
                onSuccess = { projectListData ->
                    Log.d(TAG, "Loaded ${projectListData.data.size} projects for filter")
                    _projects.value = projectListData.data
                    _projectsLoading.value = false
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to load projects", exception)
                    _projectsLoading.value = false
                }
            )
        }
    }

    /**
     * 清除所有筛选
     */
    fun clearFilters() {
        _filterState.value = RequirementFilterState()
        loadRequirements(forceRefresh = true)
    }

    /**
     * 切换筛选面板展开状态
     */
    fun toggleFilterPanel() {
        _uiState.update { it.copy(isFilterPanelExpanded = !it.isFilterPanelExpanded) }
    }

    /**
     * 删除需求
     */
    fun deleteRequirement(requirementId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            requirementRepository.deleteRequirement(requirementId).fold(
                onSuccess = {
                    Log.d(TAG, "Deleted requirement $requirementId")
                    refreshRequirements()
                },
                onFailure = { exception ->
                    Log.e(TAG, "Failed to delete requirement", exception)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "删除失败: ${exception.message}"
                        )
                    }
                }
            )
        }
    }
}

/**
 * 需求列表 UI 状态
 */
data class RequirementListUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isEmpty: Boolean = false,
    val isFilterPanelExpanded: Boolean = false
)

/**
 * 需求筛选状态
 */
data class RequirementFilterState(
    val searchQuery: String = "",
    val selectedStatus: RequirementStatus? = null,
    val selectedPriority: RequirementPriority? = null,
    val selectedCategory: RequirementCategory? = null,
    val selectedProjectId: Int? = null,
    val selectedCompanyName: String? = null
)
