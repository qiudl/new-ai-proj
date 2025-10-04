package com.aiproj.mobile.data.repository

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.aiproj.mobile.data.api.AttachmentApi
import com.aiproj.mobile.data.models.Attachment
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 附件仓库
 */
@Singleton
class AttachmentRepository @Inject constructor(
    private val attachmentApi: AttachmentApi,
    @ApplicationContext private val context: Context
) {

    /**
     * 获取任务的附件列表
     */
    suspend fun getAttachments(taskId: Int): Result<List<Attachment>> {
        return try {
            val response = attachmentApi.getAttachments(taskId)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.attachments)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "获取附件列表失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 上传附件
     * @param taskId 任务ID
     * @param fileUri 文件URI（从文件选择器获取）
     * @param description 附件描述
     */
    suspend fun uploadAttachment(
        taskId: Int,
        fileUri: Uri,
        description: String? = null
    ): Result<Attachment> = withContext(Dispatchers.IO) {
        try {
            // 从URI创建临时文件
            val file = createTempFileFromUri(fileUri)
                ?: return@withContext Result.failure(Exception("无法读取文件"))

            // 获取MIME类型
            val mimeType = context.contentResolver.getType(fileUri)
                ?: "application/octet-stream"

            // 创建RequestBody
            val requestFile = file.asRequestBody(mimeType.toMediaTypeOrNull())
            val filePart = MultipartBody.Part.createFormData(
                "file",
                file.name,
                requestFile
            )

            // 创建描述RequestBody（如果有）
            val descriptionPart = description?.toRequestBody("text/plain".toMediaTypeOrNull())

            // 调用API
            val response = attachmentApi.uploadAttachment(
                taskId = taskId,
                file = filePart,
                description = descriptionPart
            )

            // 删除临时文件
            file.delete()

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "上传附件失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 下载附件到Downloads目录
     */
    suspend fun downloadAttachment(
        taskId: Int,
        attachment: Attachment
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            val response = attachmentApi.downloadAttachment(taskId, attachment.id)

            if (!response.isSuccessful || response.body() == null) {
                return@withContext Result.failure(
                    Exception(response.errorBody()?.string() ?: "下载失败")
                )
            }

            // 创建下载目录
            val downloadsDir = File(
                context.getExternalFilesDir(null),
                "Downloads"
            )
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }

            // 保存文件
            val file = File(downloadsDir, attachment.fileName)
            val inputStream = response.body()!!.byteStream()
            val outputStream = FileOutputStream(file)

            inputStream.use { input ->
                outputStream.use { output ->
                    input.copyTo(output)
                }
            }

            Result.success(file)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 删除附件
     */
    suspend fun deleteAttachment(
        taskId: Int,
        attachmentId: Int
    ): Result<Unit> {
        return try {
            val response = attachmentApi.deleteAttachment(taskId, attachmentId)

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "删除附件失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 从URI创建临时文件
     */
    private fun createTempFileFromUri(uri: Uri): File? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: return null

            // 获取原文件名
            val fileName = getFileName(uri)

            // 创建临时文件
            val tempFile = File(context.cacheDir, fileName)
            val outputStream = FileOutputStream(tempFile)

            inputStream.use { input ->
                outputStream.use { output ->
                    input.copyTo(output)
                }
            }

            tempFile
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 从URI获取文件名
     */
    private fun getFileName(uri: Uri): String {
        var fileName = "upload_${System.currentTimeMillis()}"

        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0) {
                    fileName = cursor.getString(nameIndex)
                }
            }
        }

        return fileName
    }
}
