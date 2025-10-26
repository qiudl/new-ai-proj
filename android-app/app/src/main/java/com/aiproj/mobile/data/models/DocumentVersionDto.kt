package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName
import com.google.gson.annotations.JsonAdapter

/**
 * 文档版本 DTO（数据传输对象）
 *
 * 用于网络请求和响应的数据模型
 */
data class DocumentVersionDto(
    @SerializedName("id")
    val id: Long,

    @SerializedName("document_id")
    val documentId: Long,

    @SerializedName("version_number")
    @JsonAdapter(LenientIntAdapter::class)
    val versionNumber: Int,

    @SerializedName("title")
    val title: String? = "",

    @SerializedName("content")
    val content: String? = "",

    @SerializedName("change_description")
    val changeDescription: String? = null,

    @SerializedName("created_by")
    val createdBy: Long? = null,

    @SerializedName("created_at")
    val createdAt: String? = "",

    @SerializedName("content_length")
    @JsonAdapter(LenientIntAdapter::class)
    val contentLength: Int? = 0,

    @SerializedName("change_type")
    val changeType: String? = "updated", // "created", "updated", "restored"

    @SerializedName("tag")
    val tag: String? = null,

    @SerializedName("creator_name")
    val creatorName: String? = null
)

/**
 * 版本历史响应
 */
data class VersionHistoryResponse(
    @SerializedName("versions")
    val versions: List<DocumentVersionDto>? = emptyList(),

    @SerializedName("pagination")
    val pagination: PaginationDto? = null,

    @SerializedName("total_versions")
    val totalVersions: Int = 0
)

/**
 * 分页信息
 */
data class PaginationDto(
    @SerializedName("limit")
    val limit: Int? = null,

    @SerializedName("offset")
    val offset: Int? = null,

    @SerializedName("total")
    val total: Int? = null,

    @SerializedName("has_more")
    val hasMore: Boolean? = null
)

/**
 * 版本对比响应
 */
data class VersionComparisonResponse(
    @SerializedName("version1")
    val version1: DocumentVersionDto,

    @SerializedName("version2")
    val version2: DocumentVersionDto,

    @SerializedName("diff")
    val diff: String, // Unified diff format

    @SerializedName("changes")
    val changes: List<ChangeDto>,

    @SerializedName("additions")
    val additions: Int,

    @SerializedName("deletions")
    val deletions: Int
)

/**
 * 变更详情
 */
data class ChangeDto(
    @SerializedName("type")
    val type: String, // "added", "removed", "modified"

    @SerializedName("line_number")
    val lineNumber: Int,

    @SerializedName("content")
    val content: String,

    @SerializedName("old_content")
    val oldContent: String? = null
)
