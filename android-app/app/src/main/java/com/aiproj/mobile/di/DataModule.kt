package com.aiproj.mobile.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.aiproj.mobile.data.api.TokenProvider
import com.aiproj.mobile.data.local.TokenManager
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private val Context.timerDataStore: DataStore<Preferences> by preferencesDataStore(name = "timer_cache")

/**
 * 数据模块
 * 提供本地数据存储相关的依赖
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class DataModule {

    /**
     * 绑定 TokenProvider 实现
     */
    @Binds
    @Singleton
    abstract fun bindTokenProvider(
        tokenManager: TokenManager
    ): TokenProvider

    companion object {
        /**
         * 提供 Timer DataStore
         */
        @Provides
        @Singleton
        fun provideTimerDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
            return context.timerDataStore
        }
    }
}
