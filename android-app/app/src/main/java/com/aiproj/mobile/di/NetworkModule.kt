package com.aiproj.mobile.di

import com.aiproj.mobile.BuildConfig
import com.aiproj.mobile.data.api.AttachmentApi
import com.aiproj.mobile.data.api.AuthApi
import com.aiproj.mobile.data.api.AuthInterceptor
import com.aiproj.mobile.data.api.CommentApi
import com.aiproj.mobile.data.api.DashboardApi
import com.aiproj.mobile.data.api.ProjectApi
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.api.TimeLogApi
import com.aiproj.mobile.data.api.TokenProvider
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * 网络模块
 * 提供 Retrofit、OkHttp、API 接口等依赖
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * 提供 Gson
     */
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setLenient()
            .create()
    }

    /**
     * 提供 OkHttpClient
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor
    ): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)

        // Debug 模式下添加日志拦截器
        if (BuildConfig.DEBUG) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(loggingInterceptor)
        }

        return builder.build()
    }

    /**
     * 提供 Retrofit
     */
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    /**
     * 提供 AuthApi
     */
    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi {
        return retrofit.create(AuthApi::class.java)
    }

    /**
     * 提供 TaskApi
     */
    @Provides
    @Singleton
    fun provideTaskApi(retrofit: Retrofit): TaskApi {
        return retrofit.create(TaskApi::class.java)
    }

    /**
     * 提供 ProjectApi
     */
    @Provides
    @Singleton
    fun provideProjectApi(retrofit: Retrofit): ProjectApi {
        return retrofit.create(ProjectApi::class.java)
    }

    /**
     * 提供 DashboardApi
     */
    @Provides
    @Singleton
    fun provideDashboardApi(retrofit: Retrofit): DashboardApi {
        return retrofit.create(DashboardApi::class.java)
    }

    /**
     * 提供 TimeLogApi
     */
    @Provides
    @Singleton
    fun provideTimeLogApi(retrofit: Retrofit): TimeLogApi {
        return retrofit.create(TimeLogApi::class.java)
    }

    /**
     * 提供 AttachmentApi
     */
    @Provides
    @Singleton
    fun provideAttachmentApi(retrofit: Retrofit): AttachmentApi {
        return retrofit.create(AttachmentApi::class.java)
    }

    /**
     * 提供 CommentApi
     */
    @Provides
    @Singleton
    fun provideCommentApi(retrofit: Retrofit): CommentApi {
        return retrofit.create(CommentApi::class.java)
    }
}
