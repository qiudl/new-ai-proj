package com.aiproj.mobile.data.network

import kotlinx.coroutines.flow.Flow

/**
 * 网络连接状态观察器
 */
interface ConnectivityObserver {

    /**
     * 观察网络连接状态（Flow）
     */
    fun observe(): Flow<NetworkStatus>

    /**
     * 获取当前网络状态（同步）
     */
    fun isConnected(): Boolean

    /**
     * 网络状态枚举
     */
    enum class NetworkStatus {
        /** 可用 */
        AVAILABLE,
        /** 不可用 */
        UNAVAILABLE,
        /** 正在失去连接 */
        LOSING,
        /** 已失去连接 */
        LOST
    }
}
