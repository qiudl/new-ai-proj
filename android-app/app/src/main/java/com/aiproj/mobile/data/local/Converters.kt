package com.aiproj.mobile.data.local

import androidx.room.TypeConverter
import com.aiproj.mobile.data.local.entity.PendingAction
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus

/**
 * Room类型转换器
 */
class Converters {

    @TypeConverter
    fun fromTaskStatus(value: TaskStatus): String {
        return value.name.lowercase()
    }

    @TypeConverter
    fun toTaskStatus(value: String): TaskStatus {
        return try {
            TaskStatus.valueOf(value.uppercase())
        } catch (e: IllegalArgumentException) {
            TaskStatus.TODO
        }
    }

    @TypeConverter
    fun fromTaskPriority(value: TaskPriority?): String? {
        return value?.name?.lowercase()
    }

    @TypeConverter
    fun toTaskPriority(value: String?): TaskPriority? {
        return try {
            value?.let { TaskPriority.valueOf(it.uppercase()) }
        } catch (e: IllegalArgumentException) {
            null
        }
    }

    @TypeConverter
    fun fromPendingAction(value: PendingAction?): String? {
        return value?.name
    }

    @TypeConverter
    fun toPendingAction(value: String?): PendingAction? {
        return try {
            value?.let { PendingAction.valueOf(it) }
        } catch (e: IllegalArgumentException) {
            null
        }
    }
}
