package com.aiproj.mobile.di

import android.content.Context
import com.aiproj.mobile.BuildConfig
import com.aiproj.mobile.data.api.AIDescriptionApi
import com.aiproj.mobile.data.api.AIDocumentApi
import com.aiproj.mobile.data.api.AISubtaskApi
import com.aiproj.mobile.data.api.AnalyticsApi
import com.aiproj.mobile.data.api.AttachmentApi
import com.aiproj.mobile.data.api.AuthApi
import com.aiproj.mobile.data.api.AuthInterceptor
import com.aiproj.mobile.data.api.CommentApi
import com.aiproj.mobile.data.api.DailyFocusTaskApi
import com.aiproj.mobile.data.api.DashboardApi
import com.aiproj.mobile.data.api.DetailApi
import com.aiproj.mobile.data.api.DocumentApi
import com.aiproj.mobile.data.api.EfficiencyApi
import com.aiproj.mobile.data.api.ProjectApi
import com.aiproj.mobile.data.api.SuggestionApi
import com.aiproj.mobile.data.api.TaskApi
import com.aiproj.mobile.data.api.TimeLogApi
import com.aiproj.mobile.data.api.TimerApi
import com.aiproj.mobile.data.network.ConnectivityObserver
import com.aiproj.mobile.data.network.ConnectivityObserverImpl
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.CertificatePinner
import okhttp3.ConnectionSpec
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.TlsVersion
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
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
     * 提供 Kotlin Serialization Json
     */
    @Provides
    @Singleton
    fun provideJson(): Json {
        return Json {
            ignoreUnknownKeys = true // 忽略 JSON 中存在但数据类中没有的字段
            isLenient = true
            coerceInputValues = true // 将 null 强制转换为默认值
            encodeDefaults = true
        }
    }

    /**
     * 提供 Gson
     */
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setLenient()
            // Gson会将null赋值给有默认值的字段，这是已知问题
            // 最好的解决方案是在数据类中使用可空类型或在Repository层做null检查
            .create()
    }

    /**
     * 提供 OkHttpClient
     *
     * 安全配置:
     * - TLS 1.2+ 强制执行
     * - 证书固定（仅Release构建）
     * - 现代密码套件
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
        } else {
            // Release构建：启用证书固定（安全审查要求）
            // Primary: proj.joylodging.com leaf certificate
            // Backup: Let's Encrypt E8 intermediate CA
            // Last updated: 2025-10-07
            val certificatePinner = CertificatePinner.Builder()
                .add("proj.joylodging.com", "sha256/kOELsxWB35wXy3x9mpbYBDvbXbu+44ulQ5GMTMw7yNc=") // Leaf cert
                .add("proj.joylodging.com", "sha256/iFvwVyJSxnQdyaUvUERIf+8qk7gRze3612JMwoO3zdU=") // Let's Encrypt E8 CA
                .build()

            builder.certificatePinner(certificatePinner)
        }

        // 强制使用 TLS 1.2+ 和现代密码套件（安全审查要求）
        val modernTls = ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
            .tlsVersions(TlsVersion.TLS_1_2, TlsVersion.TLS_1_3)
            .build()

        builder.connectionSpecs(listOf(modernTls, ConnectionSpec.CLEARTEXT))

        return builder.build()
    }

    /**
     * 提供 Retrofit
     */
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        gson: Gson,
        json: Json
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            // Use Gson as primary converter for models with @SerializedName
            .addConverterFactory(GsonConverterFactory.create(gson))
            // Keep Kotlinx Serialization as fallback for @Serializable models
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
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
     * 提供 TimerApi
     */
    @Provides
    @Singleton
    fun provideTimerApi(retrofit: Retrofit): TimerApi {
        return retrofit.create(TimerApi::class.java)
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

    /**
     * 提供 DocumentApi
     */
    @Provides
    @Singleton
    fun provideDocumentApi(retrofit: Retrofit): DocumentApi {
        return retrofit.create(DocumentApi::class.java)
    }

    /**
     * 提供 DailyFocusTaskApi
     */
    @Provides
    @Singleton
    fun provideDailyFocusTaskApi(retrofit: Retrofit): DailyFocusTaskApi {
        return retrofit.create(DailyFocusTaskApi::class.java)
    }

    /**
     * 提供 AnalyticsApi
     */
    @Provides
    @Singleton
    fun provideAnalyticsApi(retrofit: Retrofit): AnalyticsApi {
        return retrofit.create(AnalyticsApi::class.java)
    }

    /**
     * 提供 DetailApi
     * 用于获取仪表盘统计详情数据
     */
    @Provides
    @Singleton
    fun provideDetailApi(retrofit: Retrofit): DetailApi {
        return retrofit.create(DetailApi::class.java)
    }

    /**
     * 提供 AIDocumentApi
     * 用于AI文档生成功能
     */
    @Provides
    @Singleton
    fun provideAIDocumentApi(retrofit: Retrofit): AIDocumentApi {
        return retrofit.create(AIDocumentApi::class.java)
    }

    /**
     * 提供 AISubtaskApi
     * 用于AI子任务生成功能
     */
    @Provides
    @Singleton
    fun provideAISubtaskApi(retrofit: Retrofit): AISubtaskApi {
        return retrofit.create(AISubtaskApi::class.java)
    }

    /**
     * 提供 AIDescriptionApi
     * 用于AI描述生成功能
     */
    @Provides
    @Singleton
    fun provideAIDescriptionApi(retrofit: Retrofit): AIDescriptionApi {
        return retrofit.create(AIDescriptionApi::class.java)
    }

    /**
     * 提供 EfficiencyApi
     * 用于效率分析和3日对比功能
     */
    @Provides
    @Singleton
    fun provideEfficiencyApi(retrofit: Retrofit): EfficiencyApi {
        return retrofit.create(EfficiencyApi::class.java)
    }

    /**
     * 提供 SuggestionApi
     * 用于智能建议功能
     */
    @Provides
    @Singleton
    fun provideSuggestionApi(retrofit: Retrofit): SuggestionApi {
        return retrofit.create(SuggestionApi::class.java)
    }

    /**
     * 提供 ConnectivityObserver
     */
    @Provides
    @Singleton
    fun provideConnectivityObserver(
        @ApplicationContext context: Context
    ): ConnectivityObserver {
        return ConnectivityObserverImpl(context)
    }
}
