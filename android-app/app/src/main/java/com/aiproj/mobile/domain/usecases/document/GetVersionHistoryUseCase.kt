package com.aiproj.mobile.domain.usecases.document

import com.aiproj.mobile.data.models.VersionHistoryResponse
import com.aiproj.mobile.data.repository.DocumentVersionRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * 获取版本历史用例
 *
 * 业务逻辑：获取文档的版本历史列表
 */
class GetVersionHistoryUseCase @Inject constructor(
    private val repository: DocumentVersionRepository
) {
    /**
     * 执行用例
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param limit 每页数量
     * @param offset 偏移量
     * @param includeContent 是否包含内容
     * @return Flow<Result<VersionHistoryResponse>>
     */
    operator fun invoke(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        limit: Int = 20,
        offset: Int = 0,
        includeContent: Boolean = false
    ): Flow<Result<VersionHistoryResponse>> {
        return repository.getVersionHistory(
            projectId = projectId,
            taskId = taskId,
            documentId = documentId,
            limit = limit,
            offset = offset,
            includeContent = includeContent
        )
    }
}
