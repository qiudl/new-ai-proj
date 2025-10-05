package com.aiproj.mobile.ui.document.list

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.Document
import com.aiproj.mobile.data.repository.DocumentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 文档列表ViewModel
 */
@HiltViewModel
class DocumentListViewModel @Inject constructor(
    private val documentRepository: DocumentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val taskId: Int = savedStateHandle["taskId"] ?: 0

    private val _uiState = MutableStateFlow(DocumentListUiState())
    val uiState: StateFlow<DocumentListUiState> = _uiState.asStateFlow()

    init {
        loadDocuments()
    }

    /**
     * 加载文档列表
     */
    fun loadDocuments() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            documentRepository.getDocuments(taskId)
                .onSuccess { documents ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        documents = documents,
                        filteredDocuments = applyFilters(documents),
                        error = null
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "加载文档列表失败"
                    )
                }
        }
    }

    /**
     * 刷新文档列表
     */
    fun refreshDocuments() {
        loadDocuments()
    }

    /**
     * 更新搜索关键词
     */
    fun updateSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        applyFiltersAndUpdate()
    }

    /**
     * 更新状态过滤
     */
    fun updateStatusFilter(status: String?) {
        _uiState.value = _uiState.value.copy(statusFilter = status)
        applyFiltersAndUpdate()
    }

    /**
     * 更新类型过滤
     */
    fun updateTypeFilter(type: String?) {
        _uiState.value = _uiState.value.copy(typeFilter = type)
        applyFiltersAndUpdate()
    }

    /**
     * 更新排序方式
     */
    fun updateSortBy(sortBy: SortBy) {
        _uiState.value = _uiState.value.copy(sortBy = sortBy)
        applyFiltersAndUpdate()
    }

    /**
     * 应用过滤器并更新
     */
    private fun applyFiltersAndUpdate() {
        val filtered = applyFilters(_uiState.value.documents)
        _uiState.value = _uiState.value.copy(filteredDocuments = filtered)
    }

    /**
     * 应用过滤和排序
     */
    private fun applyFilters(documents: List<Document>): List<Document> {
        var result = documents

        // 搜索过滤
        if (_uiState.value.searchQuery.isNotBlank()) {
            val query = _uiState.value.searchQuery.lowercase()
            result = result.filter {
                it.title.lowercase().contains(query) ||
                        it.content.lowercase().contains(query)
            }
        }

        // 状态过滤
        _uiState.value.statusFilter?.let { status ->
            result = result.filter { it.status == status }
        }

        // 类型过滤
        _uiState.value.typeFilter?.let { type ->
            result = result.filter { it.type == type }
        }

        // 排序
        result = when (_uiState.value.sortBy) {
            SortBy.UPDATED_DESC -> result.sortedByDescending { it.updatedAt }
            SortBy.UPDATED_ASC -> result.sortedBy { it.updatedAt }
            SortBy.CREATED_DESC -> result.sortedByDescending { it.createdAt }
            SortBy.CREATED_ASC -> result.sortedBy { it.createdAt }
            SortBy.TITLE_ASC -> result.sortedBy { it.title }
            SortBy.TITLE_DESC -> result.sortedByDescending { it.title }
        }

        return result
    }
}

/**
 * 文档列表UI状态
 */
data class DocumentListUiState(
    val isLoading: Boolean = false,
    val documents: List<Document> = emptyList(),
    val filteredDocuments: List<Document> = emptyList(),
    val searchQuery: String = "",
    val statusFilter: String? = null,
    val typeFilter: String? = null,
    val sortBy: SortBy = SortBy.UPDATED_DESC,
    val error: String? = null
)

/**
 * 排序方式枚举
 */
enum class SortBy {
    UPDATED_DESC,
    UPDATED_ASC,
    CREATED_DESC,
    CREATED_ASC,
    TITLE_ASC,
    TITLE_DESC
}
