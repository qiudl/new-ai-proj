package com.aiproj.mobile.di

import android.content.Context
import com.aiproj.mobile.data.local.AppDatabase
import com.aiproj.mobile.data.local.dao.TaskDao
import com.aiproj.mobile.data.local.dao.DocumentDao
import com.aiproj.mobile.data.local.dao.DocumentVersionDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * 数据库依赖注入模块
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        return AppDatabase.getInstance(context)
    }

    @Provides
    @Singleton
    fun provideTaskDao(database: AppDatabase): TaskDao {
        return database.taskDao()
    }

    @Provides
    @Singleton
    fun provideDocumentDao(database: AppDatabase): DocumentDao {
        return database.documentDao()
    }

    @Provides
    @Singleton
    fun provideDocumentVersionDao(database: AppDatabase): DocumentVersionDao {
        return database.documentVersionDao()
    }
}
