package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.CommentApi
import com.aiproj.mobile.data.models.AddCommentRequest
import com.aiproj.mobile.data.models.Comment
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 评论仓库
 */
@Singleton
class CommentRepository @Inject constructor(
    private val commentApi: CommentApi
) {

    /**
     * 获取任务的评论列表
     * @param taskId 任务ID
     * @param page 页码
     * @param limit 每页数量
     */
    suspend fun getComments(
        taskId: Int,
        page: Int = 1,
        limit: Int = 20
    ): Result<List<Comment>> {
        return try {
            val response = commentApi.getComments(taskId, page, limit)

            if (response.isSuccessful && response.body() != null) {
                val commentListResponse = response.body()!!
                if (commentListResponse.success) {
                    Result.success(commentListResponse.data.comments)
                } else {
                    Result.failure(Exception("获取评论失败"))
                }
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "获取评论失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 添加评论
     * @param taskId 任务ID
     * @param content 评论内容
     */
    suspend fun addComment(
        taskId: Int,
        content: String
    ): Result<Comment> {
        return try {
            if (content.isBlank()) {
                return Result.failure(Exception("评论内容不能为空"))
            }

            val request = AddCommentRequest(content = content.trim())
            val response = commentApi.addComment(taskId, request)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "添加评论失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 更新评论
     * @param taskId 任务ID
     * @param commentId 评论ID
     * @param content 新内容
     */
    suspend fun updateComment(
        taskId: Int,
        commentId: Int,
        content: String
    ): Result<Comment> {
        return try {
            if (content.isBlank()) {
                return Result.failure(Exception("评论内容不能为空"))
            }

            val request = AddCommentRequest(content = content.trim())
            val response = commentApi.updateComment(taskId, commentId, request)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(
                    Exception(response.errorBody()?.string() ?: "更新评论失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 删除评论
     * @param taskId 任务ID
     * @param commentId 评论ID
     */
    suspend fun deleteComment(
        taskId: Int,
        commentId: Int
    ): Result<Unit> {
        return try {
            val response = commentApi.deleteComment(taskId, commentId)

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(
                    Exception(errorBody ?: "删除评论失败")
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
