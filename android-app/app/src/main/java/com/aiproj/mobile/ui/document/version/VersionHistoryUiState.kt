package com.aiproj.mobile.ui.document.version

import com.aiproj.mobile.data.models.DocumentVersionDto

/**
 * 版本历史UI状态
 *
 * 用于管理版本历史页面的状态
 */
data class VersionHistoryUiState(
    /**
     * 版本列表
     */
    val versions: List<DocumentVersionDto> = emptyList(),

    /**
     * 是否正在加载
     */
    val isLoading: Boolean = false,

    /**
     * 是否正在刷新
     */
    val isRefreshing: Boolean = false,

    /**
     * 是否还有更多数据
     */
    val hasMore: Boolean = true,

    /**
     * 当前页码（用于分页）
     */
    val currentPage: Int = 0,

    /**
     * 错误信息
     */
    val error: String? = null,

    /**
     * 总版本数
     */
    val totalVersions: Int = 0,

    /**
     * 是否为空状态
     */
    val isEmpty: Boolean = false,

    /**
     * 是否处于对比选择模式
     */
    val isComparisonMode: Boolean = false,

    /**
     * 选中用于对比的版本1（旧版本）
     */
    val selectedVersion1: Int? = null,

    /**
     * 选中用于对比的版本2（新版本）
     */
    val selectedVersion2: Int? = null,

    /**
     * 成功消息（用于显示操作成功反馈）
     */
    val successMessage: String? = null
) {
    /**
     * 是否显示空状态
     */
    val shouldShowEmptyState: Boolean
        get() = isEmpty && !isLoading && error == null

    /**
     * 是否显示错误状态
     */
    val shouldShowError: Boolean
        get() = error != null && !isLoading

    /**
     * 是否显示内容
     */
    val shouldShowContent: Boolean
        get() = versions.isNotEmpty() && error == null

    /**
     * 是否可以执行对比（已选择两个版本）
     */
    val canCompare: Boolean
        get() = isComparisonMode && selectedVersion1 != null && selectedVersion2 != null
}

/**
 * 版本详情UI状态
 */
data class VersionDetailUiState(
    /**
     * 版本信息
     */
    val version: DocumentVersionDto? = null,

    /**
     * 是否正在加载
     */
    val isLoading: Boolean = false,

    /**
     * 是否正在回滚
     */
    val isRestoring: Boolean = false,

    /**
     * 是否正在下载
     */
    val isDownloading: Boolean = false,

    /**
     * 下载进度 (0-100)
     */
    val downloadProgress: Int = 0,

    /**
     * 错误信息
     */
    val error: String? = null,

    /**
     * 操作成功消息
     */
    val successMessage: String? = null
)

/**
 * 版本操作结果
 */
sealed class VersionOperationResult {
    /**
     * 成功
     */
    data class Success(val message: String) : VersionOperationResult()

    /**
     * 失败
     */
    data class Error(val message: String) : VersionOperationResult()

    /**
     * 进行中
     */
    object InProgress : VersionOperationResult()
}
