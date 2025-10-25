package com.aiproj.mobile.data.local.entity

import androidx.room.*

/**
 * 文档版本实体（Room Database）
 *
 * 用于本地缓存文档版本数据，支持离线访问
 */
@Entity(
    tableName = "document_versions",
    indices = [
        Index(value = ["document_id"]),
        Index(value = ["version_number"]),
        Index(value = ["cached_at"])
    ]
)
data class DocumentVersionEntity(
    @PrimaryKey
    val id: Long,

    @ColumnInfo(name = "document_id")
    val documentId: Long,

    @ColumnInfo(name = "version_number")
    val versionNumber: Int,

    val title: String,

    val content: String,

    @ColumnInfo(name = "change_description")
    val changeDescription: String? = null,

    @ColumnInfo(name = "created_by")
    val createdBy: Long,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "content_length")
    val contentLength: Int,

    @ColumnInfo(name = "change_type")
    val changeType: String, // "created", "updated", "restored"

    val tag: String? = null,

    @ColumnInfo(name = "creator_name")
    val creatorName: String? = null,

    @ColumnInfo(name = "cached_at")
    val cachedAt: Long = System.currentTimeMillis()
)

/**
 * 扩展函数：将 DTO 转换为 Entity
 */
fun com.aiproj.mobile.data.models.DocumentVersionDto.toEntity(): DocumentVersionEntity {
    return DocumentVersionEntity(
        id = this.id,
        documentId = this.documentId,
        versionNumber = this.versionNumber,
        title = this.title,
        content = this.content,
        changeDescription = this.changeDescription,
        createdBy = this.createdBy,
        createdAt = this.createdAt,
        contentLength = this.contentLength,
        changeType = this.changeType,
        tag = this.tag,
        creatorName = this.creatorName
    )
}

/**
 * 扩展函数：将 Entity 转换为 DTO
 */
fun DocumentVersionEntity.toDto(): com.aiproj.mobile.data.models.DocumentVersionDto {
    return com.aiproj.mobile.data.models.DocumentVersionDto(
        id = this.id,
        documentId = this.documentId,
        versionNumber = this.versionNumber,
        title = this.title,
        content = this.content,
        changeDescription = this.changeDescription,
        createdBy = this.createdBy,
        createdAt = this.createdAt,
        contentLength = this.contentLength,
        changeType = this.changeType,
        tag = this.tag,
        creatorName = this.creatorName
    )
}
