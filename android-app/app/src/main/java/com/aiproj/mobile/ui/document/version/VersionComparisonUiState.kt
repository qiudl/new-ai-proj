package com.aiproj.mobile.ui.document.version

import com.aiproj.mobile.data.models.ChangeDto
import com.aiproj.mobile.data.models.DocumentVersionDto

/**
 * 版本对比UI状态
 *
 * 管理版本对比界面的所有状态
 */
data class VersionComparisonUiState(
    // 加载状态
    val isLoading: Boolean = false,

    // 版本1（旧版本）
    val version1: DocumentVersionDto? = null,

    // 版本2（新版本）
    val version2: DocumentVersionDto? = null,

    // 差异列表
    val changes: List<ChangeDto> = emptyList(),

    // Unified diff格式（可选展示）
    val unifiedDiff: String = "",

    // 统计信息
    val additions: Int = 0,
    val deletions: Int = 0,
    val modifications: Int = 0,

    // 错误信息
    val error: String? = null,

    // 显示模式
    val displayMode: DiffDisplayMode = DiffDisplayMode.SIDE_BY_SIDE
) {
    /**
     * 计算状态：是否有数据
     */
    val hasData: Boolean
        get() = version1 != null && version2 != null && changes.isNotEmpty()

    /**
     * 计算状态：是否应该显示空状态
     */
    val shouldShowEmptyState: Boolean
        get() = !isLoading && version1 != null && version2 != null && changes.isEmpty()

    /**
     * 计算状态：是否应该显示错误
     */
    val shouldShowError: Boolean
        get() = !isLoading && error != null

    /**
     * 计算状态：是否应该显示内容
     */
    val shouldShowContent: Boolean
        get() = !isLoading && hasData && error == null

    /**
     * 总变更数
     */
    val totalChanges: Int
        get() = additions + deletions + modifications
}

/**
 * 差异显示模式
 */
enum class DiffDisplayMode {
    /**
     * 并排对比模式（左右分屏）
     */
    SIDE_BY_SIDE,

    /**
     * 统一视图模式（单列显示增删改）
     */
    UNIFIED,

    /**
     * 仅显示变更行
     */
    CHANGES_ONLY
}
