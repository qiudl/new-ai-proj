package com.aiproj.mobile.data.api

import com.aiproj.mobile.data.models.Attachment
import com.google.gson.annotations.SerializedName
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

/**
 * 附件API接口
 */
interface AttachmentApi {
    /**
     * 获取任务的附件列表
     * @param taskId 任务ID
     */
    @GET("tasks/{taskId}/attachments")
    suspend fun getAttachments(
        @Path("taskId") taskId: Int
    ): Response<AttachmentListResponse>

    /**
     * 上传附件
     * @param taskId 任务ID
     * @param file 文件（multipart）
     * @param description 附件描述（可选）
     */
    @Multipart
    @POST("tasks/{taskId}/attachments")
    suspend fun uploadAttachment(
        @Path("taskId") taskId: Int,
        @Part file: MultipartBody.Part,
        @Part("description") description: RequestBody? = null
    ): Response<Attachment>

    /**
     * 下载附件
     * @param taskId 任务ID
     * @param attachmentId 附件ID
     */
    @Streaming
    @GET("tasks/{taskId}/attachments/{attachmentId}/download")
    suspend fun downloadAttachment(
        @Path("taskId") taskId: Int,
        @Path("attachmentId") attachmentId: Int
    ): Response<ResponseBody>

    /**
     * 删除附件
     * @param taskId 任务ID
     * @param attachmentId 附件ID
     */
    @DELETE("tasks/{taskId}/attachments/{attachmentId}")
    suspend fun deleteAttachment(
        @Path("taskId") taskId: Int,
        @Path("attachmentId") attachmentId: Int
    ): Response<Unit>
}

/**
 * 附件列表响应
 */
data class AttachmentListResponse(
    @SerializedName("attachments")
    val attachments: List<Attachment>
)
