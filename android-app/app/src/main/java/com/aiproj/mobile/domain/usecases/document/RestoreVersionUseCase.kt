package com.aiproj.mobile.domain.usecases.document

import com.aiproj.mobile.data.models.DocumentVersionDto
import com.aiproj.mobile.data.repository.DocumentVersionRepository
import javax.inject.Inject

/**
 * 恢复版本用例
 *
 * 业务逻辑：将文档恢复到指定版本
 */
class RestoreVersionUseCase @Inject constructor(
    private val repository: DocumentVersionRepository
) {
    /**
     * 执行用例
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param versionNumber 要恢复到的版本号
     * @return Result<DocumentVersionDto>
     */
    suspend operator fun invoke(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        versionNumber: Int
    ): Result<DocumentVersionDto> {
        return repository.restoreVersion(
            projectId = projectId,
            taskId = taskId,
            documentId = documentId,
            versionNumber = versionNumber
        )
    }
}
