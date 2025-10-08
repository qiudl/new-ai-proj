package com.aiproj.mobile.data.models

import com.google.gson.annotations.SerializedName

/**
 * 附件模型
 */
data class Attachment(
    @SerializedName("id")
    val id: Int,

    @SerializedName("task_id")
    val taskId: Int,

    @SerializedName("file_name")
    val fileName: String,

    @SerializedName("file_size")
    val fileSize: Long,

    @SerializedName("file_type")
    val fileType: String,

    @SerializedName("url")
    val url: String,

    @SerializedName("uploaded_at")
    val uploadedAt: String,

    @SerializedName("uploaded_by")
    val uploadedBy: Int,

    @SerializedName("uploader_name")
    val uploaderName: String? = null
)

/**
 * 附件列表响应
 */
data class AttachmentListResponse(
    @SerializedName("attachments")
    val attachments: List<Attachment>
)
