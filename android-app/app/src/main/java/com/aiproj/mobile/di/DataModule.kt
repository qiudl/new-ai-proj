package com.aiproj.mobile.di

import com.aiproj.mobile.data.api.TokenProvider
import com.aiproj.mobile.data.local.TokenManager
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

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
}
