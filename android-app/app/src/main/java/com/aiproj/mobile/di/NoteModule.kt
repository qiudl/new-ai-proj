package com.aiproj.mobile.di

import com.aiproj.mobile.data.api.WorkNoteApi
import com.aiproj.mobile.data.local.CacheManager
import com.aiproj.mobile.data.repository.WorkNoteRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import retrofit2.Retrofit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NoteModule {

    @Provides
    @Singleton
    fun provideWorkNoteApi(retrofit: Retrofit): WorkNoteApi {
        return retrofit.create(WorkNoteApi::class.java)
    }

    @Provides
    @Singleton
    fun provideWorkNoteRepository(
        api: WorkNoteApi,
        cacheManager: CacheManager,
        json: Json
    ): WorkNoteRepository {
        return WorkNoteRepository(api, cacheManager, json)
    }
}
