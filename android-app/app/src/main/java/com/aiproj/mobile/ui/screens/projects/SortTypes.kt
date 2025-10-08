package com.aiproj.mobile.ui.screens.projects

/**
 * 排序类型
 */
enum class SortType {
    NAME,           // 按名称
    UPDATE_TIME,    // 按更新时间
    CREATE_TIME,    // 按创建时间
    TASK_COUNT,     // 按任务数量
    COMPLETION      // 按完成率
}

/**
 * 排序顺序
 */
enum class SortOrder {
    ASC,   // 升序
    DESC   // 降序
}
