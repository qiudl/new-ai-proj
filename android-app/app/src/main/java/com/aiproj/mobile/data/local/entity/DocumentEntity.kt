package com.aiproj.mobile.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.aiproj.mobile.data.models.Document

@Entity(
    tableName = "documents",
    indices = [
        Index(value = ["task_id"]),
        Index(value = ["updated_at"])
    ]
)
data class DocumentEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: Int,

    @ColumnInfo(name = "task_id")
    val taskId: Int,

    @ColumnInfo(name = "title")
    val title: String,

    @ColumnInfo(name = "content")
    val content: String,

    @ColumnInfo(name = "type")
    val type: String,

    @ColumnInfo(name = "status")
    val status: String,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    @ColumnInfo(name = "created_by")
    val createdBy: Int,

    @ColumnInfo(name = "updated_by")
    val updatedBy: Int,

    @ColumnInfo(name = "version")
    val version: Int,

    @ColumnInfo(name = "is_synced")
    val isSynced: Boolean = true,

    @ColumnInfo(name = "local_updated_at")
    val localUpdatedAt: Long = System.currentTimeMillis()
)

fun Document.toEntity(isSynced: Boolean = true): DocumentEntity {
    return DocumentEntity(
        id = id,
        taskId = taskId,
        title = title,
        content = content,
        type = type ?: "markdown",
        status = status ?: "draft",
        createdAt = createdAt ?: "",
        updatedAt = updatedAt ?: "",
        createdBy = createdBy ?: 0,
        updatedBy = updatedBy ?: 0,
        version = version,
        isSynced = isSynced,
        localUpdatedAt = System.currentTimeMillis()
    )
}

fun DocumentEntity.toModel(): Document {
    return Document(
        id = id,
        taskId = taskId,
        title = title,
        content = content,
        type = type,
        status = status,
        createdAt = createdAt,
        updatedAt = updatedAt,
        createdBy = createdBy,
        updatedBy = updatedBy,
        version = version
    )
}
