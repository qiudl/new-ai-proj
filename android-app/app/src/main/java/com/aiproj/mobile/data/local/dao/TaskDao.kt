package com.aiproj.mobile.data.local.dao

import androidx.room.*
import com.aiproj.mobile.data.local.entity.TaskEntity
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import kotlinx.coroutines.flow.Flow

/**
 * 任务数据访问对象
 */
@Dao
interface TaskDao {

    /**
     * 获取任务列表（支持筛选）
     */
    @Query("""
        SELECT * FROM tasks
        WHERE (:status IS NULL OR status = :status)
        AND (:priority IS NULL OR priority = :priority)
        AND (:projectId IS NULL OR project_id = :projectId)
        AND (:search IS NULL OR :search = '' OR title LIKE '%' || :search || '%')
        ORDER BY
            CASE WHEN priority = 'high' THEN 0
                 WHEN priority = 'medium' THEN 1
                 WHEN priority = 'low' THEN 2
                 ELSE 3
            END,
            updated_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getTasks(
        status: TaskStatus?,
        priority: TaskPriority?,
        projectId: Int?,
        search: String?,
        limit: Int,
        offset: Int
    ): List<TaskEntity>

    /**
     * 观察任务列表（Flow）
     */
    @Query("""
        SELECT * FROM tasks
        WHERE (:status IS NULL OR status = :status)
        AND (:priority IS NULL OR priority = :priority)
        ORDER BY updated_at DESC
    """)
    fun observeTasks(
        status: TaskStatus?,
        priority: TaskPriority?
    ): Flow<List<TaskEntity>>

    /**
     * 根据ID获取任务
     */
    @Query("SELECT * FROM tasks WHERE id = :taskId")
    suspend fun getTaskById(taskId: Int): TaskEntity?

    /**
     * 观察单个任务（Flow）
     */
    @Query("SELECT * FROM tasks WHERE id = :taskId")
    fun observeTaskById(taskId: Int): Flow<TaskEntity?>

    /**
     * 插入任务列表
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTasks(tasks: List<TaskEntity>)

    /**
     * 插入单个任务
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity): Long

    /**
     * 更新任务
     */
    @Update
    suspend fun updateTask(task: TaskEntity)

    /**
     * 快速更新任务状态
     */
    @Query("""
        UPDATE tasks
        SET status = :newStatus,
            is_synced = 0,
            pending_action = 'UPDATE',
            local_updated_at = :timestamp
        WHERE id = :taskId
    """)
    suspend fun updateTaskStatus(
        taskId: Int,
        newStatus: TaskStatus,
        timestamp: Long = System.currentTimeMillis()
    )

    /**
     * 获取待同步任务
     */
    @Query("SELECT * FROM tasks WHERE is_synced = 0 AND pending_action IS NOT NULL")
    suspend fun getPendingSyncTasks(): List<TaskEntity>

    /**
     * 标记任务已同步
     */
    @Query("UPDATE tasks SET is_synced = 1, pending_action = NULL WHERE id = :taskId")
    suspend fun markTaskAsSynced(taskId: Int)

    /**
     * 删除任务
     */
    @Query("DELETE FROM tasks WHERE id = :taskId")
    suspend fun deleteTask(taskId: Int)

    /**
     * 清理旧缓存（保留最近30天）
     */
    @Query("""
        DELETE FROM tasks
        WHERE updated_at < :timestamp
        AND is_synced = 1
        AND pending_action IS NULL
    """)
    suspend fun deleteOldSyncedTasks(timestamp: String)

    /**
     * 清空所有任务
     */
    @Query("DELETE FROM tasks")
    suspend fun deleteAllTasks()

    /**
     * 获取任务总数
     */
    @Query("SELECT COUNT(*) FROM tasks")
    suspend fun getTaskCount(): Int

    // ==================== Paging 3支持 ====================

    /**
     * 分页获取所有任务
     */
    @Query("""
        SELECT * FROM tasks
        ORDER BY
            CASE WHEN priority = 'high' THEN 0
                 WHEN priority = 'medium' THEN 1
                 WHEN priority = 'low' THEN 2
                 ELSE 3
            END,
            updated_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getTasksPaged(limit: Int, offset: Int): List<TaskEntity>

    /**
     * 分页获取指定项目的任务
     */
    @Query("""
        SELECT * FROM tasks
        WHERE project_id = :projectId
        ORDER BY
            CASE WHEN priority = 'high' THEN 0
                 WHEN priority = 'medium' THEN 1
                 WHEN priority = 'low' THEN 2
                 ELSE 3
            END,
            updated_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getTasksByProject(projectId: Int, limit: Int, offset: Int): List<TaskEntity>

    /**
     * 分页获取指定状态的任务
     */
    @Query("""
        SELECT * FROM tasks
        WHERE status = :status
        ORDER BY
            CASE WHEN priority = 'high' THEN 0
                 WHEN priority = 'medium' THEN 1
                 WHEN priority = 'low' THEN 2
                 ELSE 3
            END,
            updated_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getTasksByStatus(status: String, limit: Int, offset: Int): List<TaskEntity>

    /**
     * 分页获取指定项目和状态的任务
     */
    @Query("""
        SELECT * FROM tasks
        WHERE project_id = :projectId AND status = :status
        ORDER BY
            CASE WHEN priority = 'high' THEN 0
                 WHEN priority = 'medium' THEN 1
                 WHEN priority = 'low' THEN 2
                 ELSE 3
            END,
            updated_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getTasksByProjectAndStatus(
        projectId: Int,
        status: String,
        limit: Int,
        offset: Int
    ): List<TaskEntity>

    /**
     * 分页搜索任务
     */
    @Query("""
        SELECT * FROM tasks
        WHERE title LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%'
        ORDER BY
            CASE WHEN priority = 'high' THEN 0
                 WHEN priority = 'medium' THEN 1
                 WHEN priority = 'low' THEN 2
                 ELSE 3
            END,
            updated_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun searchTasks(query: String, limit: Int, offset: Int): List<TaskEntity>
}
