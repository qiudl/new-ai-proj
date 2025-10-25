package com.aiproj.mobile.data.local.dao

import androidx.room.*
import com.aiproj.mobile.data.local.entity.DocumentVersionEntity
import kotlinx.coroutines.flow.Flow

/**
 * 文档版本 DAO（Data Access Object）
 *
 * 提供文档版本数据的本地数据库访问操作
 */
@Dao
interface DocumentVersionDao {

    /**
     * 获取指定文档的版本历史（Flow，支持响应式更新）
     *
     * @param documentId 文档ID
     * @param limit 数量限制
     * @param offset 偏移量
     * @return 版本列表 Flow
     */
    @Query("""
        SELECT * FROM document_versions
        WHERE document_id = :documentId
        ORDER BY version_number DESC
        LIMIT :limit OFFSET :offset
    """)
    fun getVersionHistoryFlow(
        documentId: Long,
        limit: Int = 20,
        offset: Int = 0
    ): Flow<List<DocumentVersionEntity>>

    /**
     * 获取指定文档的版本历史（一次性查询）
     *
     * @param documentId 文档ID
     * @param limit 数量限制
     * @param offset 偏移量
     * @return 版本列表
     */
    @Query("""
        SELECT * FROM document_versions
        WHERE document_id = :documentId
        ORDER BY version_number DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getVersionHistory(
        documentId: Long,
        limit: Int = 20,
        offset: Int = 0
    ): List<DocumentVersionEntity>

    /**
     * 根据版本号获取指定版本
     *
     * @param documentId 文档ID
     * @param versionNumber 版本号
     * @return 版本实体，可能为null
     */
    @Query("""
        SELECT * FROM document_versions
        WHERE document_id = :documentId AND version_number = :versionNumber
    """)
    suspend fun getVersionByNumber(
        documentId: Long,
        versionNumber: Int
    ): DocumentVersionEntity?

    /**
     * 根据ID获取版本
     *
     * @param id 版本ID
     * @return 版本实体，可能为null
     */
    @Query("SELECT * FROM document_versions WHERE id = :id")
    suspend fun getVersionById(id: Long): DocumentVersionEntity?

    /**
     * 插入或替换版本列表
     *
     * @param versions 版本列表
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVersions(versions: List<DocumentVersionEntity>)

    /**
     * 插入或替换单个版本
     *
     * @param version 版本实体
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVersion(version: DocumentVersionEntity)

    /**
     * 更新版本
     *
     * @param version 版本实体
     */
    @Update
    suspend fun updateVersion(version: DocumentVersionEntity)

    /**
     * 删除指定文档的所有版本缓存
     *
     * @param documentId 文档ID
     */
    @Query("DELETE FROM document_versions WHERE document_id = :documentId")
    suspend fun deleteVersionsByDocumentId(documentId: Long)

    /**
     * 删除指定版本
     *
     * @param id 版本ID
     */
    @Query("DELETE FROM document_versions WHERE id = :id")
    suspend fun deleteVersionById(id: Long)

    /**
     * 获取指定文档的版本数量
     *
     * @param documentId 文档ID
     * @return 版本数量
     */
    @Query("SELECT COUNT(*) FROM document_versions WHERE document_id = :documentId")
    suspend fun getVersionCount(documentId: Long): Int

    /**
     * 删除过期的缓存（超过指定时间戳）
     *
     * @param timestamp 时间戳（毫秒）
     * @return 删除的记录数
     */
    @Query("DELETE FROM document_versions WHERE cached_at < :timestamp")
    suspend fun deleteOldCache(timestamp: Long): Int

    /**
     * 获取带标签的版本列表
     *
     * @param documentId 文档ID
     * @return 带标签的版本列表
     */
    @Query("""
        SELECT * FROM document_versions
        WHERE document_id = :documentId AND tag IS NOT NULL
        ORDER BY version_number DESC
    """)
    suspend fun getTaggedVersions(documentId: Long): List<DocumentVersionEntity>

    /**
     * 清空所有版本缓存
     */
    @Query("DELETE FROM document_versions")
    suspend fun clearAll()

    /**
     * 获取最新版本
     *
     * @param documentId 文档ID
     * @return 最新版本，可能为null
     */
    @Query("""
        SELECT * FROM document_versions
        WHERE document_id = :documentId
        ORDER BY version_number DESC
        LIMIT 1
    """)
    suspend fun getLatestVersion(documentId: Long): DocumentVersionEntity?
}
