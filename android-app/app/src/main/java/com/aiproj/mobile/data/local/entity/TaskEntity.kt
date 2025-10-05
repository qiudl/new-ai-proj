package com.aiproj.mobile.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus

/**
 * 任务本地缓存实体
 */
@Entity(
    tableName = "tasks",
    indices = [
        Index(value = ["status"]),
        Index(value = ["priority"]),
        Index(value = ["project_id"]),
        Index(value = ["updated_at"]),
        Index(value = ["is_synced"])
    ]
)
data class TaskEntity(
    @PrimaryKey
    val id: Int,

    @ColumnInfo(name = "project_id")
    val projectId: Int,

    val title: String,

    val description: String?,

    val status: TaskStatus,

    val priority: TaskPriority?,

    @ColumnInfo(name = "assignee_id")
    val assigneeId: Int?,

    @ColumnInfo(name = "assignee_name")
    val assigneeName: String?,

    @ColumnInfo(name = "parent_id")
    val parentId: Int?,

    @ColumnInfo(name = "due_date")
    val dueDate: String?,

    @ColumnInfo(name = "estimated_minutes")
    val estimatedMinutes: Int?,

    @ColumnInfo(name = "actual_minutes")
    val actualMinutes: Int?,

    @ColumnInfo(name = "children_count")
    val childrenCount: Int?,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    // 离线同步字段
    @ColumnInfo(name = "is_synced")
    val isSynced: Boolean = true,

    @ColumnInfo(name = "pending_action")
    val pendingAction: PendingAction? = null,

    @ColumnInfo(name = "local_updated_at")
    val localUpdatedAt: Long = System.currentTimeMillis()
)
