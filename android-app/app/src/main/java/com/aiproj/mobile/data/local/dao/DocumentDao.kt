package com.aiproj.mobile.data.local.dao

import androidx.room.*
import com.aiproj.mobile.data.local.entity.DocumentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DocumentDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(document: DocumentEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateAll(documents: List<DocumentEntity>)

    @Query("SELECT * FROM documents WHERE id = :documentId")
    suspend fun getById(documentId: Int): DocumentEntity?

    @Query("SELECT * FROM documents WHERE id = :documentId")
    fun getByIdFlow(documentId: Int): Flow<DocumentEntity?>

    @Query("SELECT * FROM documents WHERE task_id = :taskId ORDER BY updated_at DESC")
    suspend fun getByTaskId(taskId: Int): List<DocumentEntity>

    @Query("SELECT * FROM documents WHERE task_id = :taskId ORDER BY updated_at DESC")
    fun getByTaskIdFlow(taskId: Int): Flow<List<DocumentEntity>>

    @Query("DELETE FROM documents WHERE id = :documentId")
    suspend fun delete(documentId: Int)

    @Query("DELETE FROM documents WHERE task_id = :taskId")
    suspend fun clearByTaskId(taskId: Int)
}
