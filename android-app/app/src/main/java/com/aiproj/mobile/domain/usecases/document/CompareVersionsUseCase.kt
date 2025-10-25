package com.aiproj.mobile.domain.usecases.document

import com.aiproj.mobile.data.models.VersionComparisonResponse
import com.aiproj.mobile.data.repository.DocumentVersionRepository
import javax.inject.Inject

/**
 * 对比版本用例
 *
 * 业务逻辑：对比两个版本的差异
 */
class CompareVersionsUseCase @Inject constructor(
    private val repository: DocumentVersionRepository
) {
    /**
     * 执行用例
     *
     * @param projectId 项目ID
     * @param taskId 任务ID
     * @param documentId 文档ID
     * @param version1 版本1
     * @param version2 版本2
     * @return Result<VersionComparisonResponse>
     */
    suspend operator fun invoke(
        projectId: Long,
        taskId: Long,
        documentId: Long,
        version1: Int,
        version2: Int
    ): Result<VersionComparisonResponse> {
        return repository.compareVersions(
            projectId = projectId,
            taskId = taskId,
            documentId = documentId,
            version1 = version1,
            version2 = version2
        )
    }
}
