package com.aiproj.mobile.data.local.entity

import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.User

/**
 * TaskEntity <-> Task 转换扩展函数
 */

fun TaskEntity.toTask(assignee: User? = null): Task {
    return Task(
        id = id,
        projectId = projectId,
        title = title,
        description = description,
        status = status,
        priority = priority,
        assigneeId = assigneeId,
        assignee = assignee,
        parentId = parentId,
        dueDate = dueDate,
        estimatedMinutes = estimatedMinutes,
        actualMinutes = actualMinutes,
        childrenCount = childrenCount,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

fun Task.toEntity(
    isSynced: Boolean = true,
    pendingAction: PendingAction? = null
): TaskEntity {
    return TaskEntity(
        id = id,
        projectId = projectId,
        title = title,
        description = description,
        status = status,
        priority = priority,
        assigneeId = assigneeId,
        assigneeName = assignee?.username,
        parentId = parentId,
        dueDate = dueDate,
        estimatedMinutes = estimatedMinutes,
        actualMinutes = actualMinutes,
        childrenCount = childrenCount,
        createdAt = createdAt,
        updatedAt = updatedAt,
        isSynced = isSynced,
        pendingAction = pendingAction
    )
}
