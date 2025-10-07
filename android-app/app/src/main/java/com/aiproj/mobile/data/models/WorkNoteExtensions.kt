package com.aiproj.mobile.data.models

/**
 * WorkNote扩展属性
 *
 * 提供安全的默认值处理，解决Gson将null赋值给有默认值字段的问题
 */

/**
 * 获取笔记类型（带默认值）
 */
val WorkNote.safeWorkNoteType: WorkNoteType
    get() = workNoteType ?: WorkNoteType.GENERAL

/**
 * 获取优先级（带默认值）
 */
val WorkNote.safePriority: WorkNotePriority
    get() = priority ?: WorkNotePriority.MEDIUM

/**
 * 获取可见性（带默认值）
 */
val WorkNote.safeVisibility: WorkNoteVisibility
    get() = visibility ?: WorkNoteVisibility.PRIVATE

/**
 * 获取状态（带默认值）
 */
val WorkNote.safeStatus: WorkNoteStatus
    get() = status ?: WorkNoteStatus.DRAFT

/**
 * 获取字数统计（带默认值）
 */
val WorkNote.safeWordCount: Int
    get() = wordCount ?: 0

/**
 * 获取阅读时长（带默认值）
 */
val WorkNote.safeReadTime: Int
    get() = readTime ?: 0

/**
 * 获取浏览次数（确保非负）
 */
val WorkNote.safeViewCount: Int
    get() = if (viewCount < 0) 0 else viewCount

/**
 * 获取置顶状态（带默认值）
 */
val WorkNote.safeIsPinned: Boolean
    get() = isPinned ?: false

/**
 * 获取收藏状态（带默认值）
 */
val WorkNote.safeIsBookmarked: Boolean
    get() = isBookmarked ?: false

/**
 * 获取标签列表（非空）
 */
val WorkNote.safeTags: List<String>
    get() = tags ?: emptyList()

/**
 * 获取关联任务列表（非空）
 */
val WorkNote.safeRelatedTasks: List<Int>
    get() = relatedTasks ?: emptyList()

/**
 * 获取关联笔记列表（非空）
 */
val WorkNote.safeRelatedNotes: List<Int>
    get() = relatedNotes ?: emptyList()

/**
 * 笔记类型的中文名称
 */
val WorkNoteType.displayName: String
    get() = when (this) {
        WorkNoteType.GENERAL -> "通用"
        WorkNoteType.MARKDOWN -> "Markdown"
        WorkNoteType.TEXT -> "纯文本"
        WorkNoteType.HTML -> "HTML"
        WorkNoteType.RESEARCH -> "研究"
        WorkNoteType.MEETING -> "会议"
        WorkNoteType.PROJECT -> "项目"
    }

/**
 * 优先级的中文名称
 */
val WorkNotePriority.displayName: String
    get() = when (this) {
        WorkNotePriority.CRITICAL -> "紧急"
        WorkNotePriority.HIGH -> "高"
        WorkNotePriority.MEDIUM -> "中"
        WorkNotePriority.LOW -> "低"
    }

/**
 * 可见性的中文名称
 */
val WorkNoteVisibility.displayName: String
    get() = when (this) {
        WorkNoteVisibility.PRIVATE -> "私有"
        WorkNoteVisibility.TEAM -> "团队"
        WorkNoteVisibility.PUBLIC -> "公开"
    }

/**
 * 状态的中文名称
 */
val WorkNoteStatus.displayName: String
    get() = when (this) {
        WorkNoteStatus.DRAFT -> "草稿"
        WorkNoteStatus.PUBLISHED -> "已发布"
        WorkNoteStatus.ARCHIVED -> "已归档"
    }

/**
 * 检查笔记是否有内容
 */
val WorkNote.hasContent: Boolean
    get() = !content.isNullOrBlank()

/**
 * 检查笔记是否有描述
 */
val WorkNote.hasDescription: Boolean
    get() = !description.isNullOrBlank()

/**
 * 检查笔记是否有标签
 */
val WorkNote.hasTags: Boolean
    get() = !tags.isNullOrEmpty()

/**
 * 检查笔记是否有关联任务
 */
val WorkNote.hasRelatedTasks: Boolean
    get() = !relatedTasks.isNullOrEmpty()

/**
 * 检查笔记是否有关联笔记
 */
val WorkNote.hasRelatedNotes: Boolean
    get() = !relatedNotes.isNullOrEmpty()

/**
 * 获取关联项目总数
 */
val WorkNote.relatedItemsCount: Int
    get() = safeRelatedTasks.size + safeRelatedNotes.size

/**
 * 获取笔记摘要（用于列表显示）
 */
fun WorkNote.getSummary(maxLength: Int = 100): String {
    return content?.take(maxLength)?.replace("\n", " ") ?: description?.take(maxLength) ?: "无内容"
}
