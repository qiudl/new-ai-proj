package com.aiproj.mobile.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.aiproj.mobile.data.local.dao.TaskDao
import com.aiproj.mobile.data.local.dao.DocumentDao
import com.aiproj.mobile.data.local.dao.DocumentVersionDao
import com.aiproj.mobile.data.local.entity.TaskEntity
import com.aiproj.mobile.data.local.entity.DocumentEntity
import com.aiproj.mobile.data.local.entity.DocumentVersionEntity

/**
 * 应用数据库
 */
@Database(
    entities = [
        TaskEntity::class,
        DocumentEntity::class,
        DocumentVersionEntity::class
    ],
    version = 4,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun taskDao(): TaskDao
    abstract fun documentDao(): DocumentDao
    abstract fun documentVersionDao(): DocumentVersionDao

    companion object {
        private const val DATABASE_NAME = "aiproj_database"

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()

                INSTANCE = instance
                instance
            }
        }
    }
}
