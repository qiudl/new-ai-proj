package com.aiproj.mobile.ui.common

import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * 错误处理器
 * 将异常转换为用户友好的错误消息
 */
object ErrorHandler {
    /**
     * 将异常转换为用户友好的错误消息
     */
    fun getErrorMessage(throwable: Throwable): String {
        return when (throwable) {
            is UnknownHostException -> "网络连接失败,请检查网络设置"
            is SocketTimeoutException -> "请求超时,请稍后重试"
            is IOException -> "网络错误: ${throwable.message ?: "未知错误"}"
            is HttpException -> handleHttpException(throwable)
            else -> throwable.message ?: "未知错误,请稍后重试"
        }
    }

    /**
     * 处理HTTP异常
     */
    private fun handleHttpException(exception: HttpException): String {
        return when (exception.code()) {
            400 -> "请求参数错误"
            401 -> "未授权,请重新登录"
            403 -> "无权限访问"
            404 -> "请求的资源不存在"
            408 -> "请求超时"
            409 -> "数据冲突,请刷新后重试"
            422 -> "数据验证失败"
            429 -> "请求过于频繁,请稍后重试"
            500 -> "服务器内部错误"
            502 -> "网关错误"
            503 -> "服务暂时不可用"
            504 -> "网关超时"
            else -> "HTTP错误 (${exception.code()}): ${exception.message()}"
        }
    }

    /**
     * 判断是否为网络错误
     */
    fun isNetworkError(throwable: Throwable): Boolean {
        return throwable is IOException ||
                throwable is UnknownHostException ||
                throwable is SocketTimeoutException
    }

    /**
     * 判断是否为认证错误
     */
    fun isAuthError(throwable: Throwable): Boolean {
        return throwable is HttpException && throwable.code() == 401
    }

    /**
     * 判断是否可重试
     */
    fun isRetryable(throwable: Throwable): Boolean {
        return when {
            throwable is SocketTimeoutException -> true
            throwable is UnknownHostException -> true
            throwable is HttpException -> when (throwable.code()) {
                408, 429, 500, 502, 503, 504 -> true
                else -> false
            }
            else -> false
        }
    }
}

/**
 * Throwable扩展函数: 获取用户友好的错误消息
 */
fun Throwable.toUserFriendlyMessage(): String {
    return ErrorHandler.getErrorMessage(this)
}

/**
 * Throwable扩展函数: 判断是否为网络错误
 */
fun Throwable.isNetworkError(): Boolean {
    return ErrorHandler.isNetworkError(this)
}

/**
 * Throwable扩展函数: 判断是否为认证错误
 */
fun Throwable.isAuthError(): Boolean {
    return ErrorHandler.isAuthError(this)
}

/**
 * Throwable扩展函数: 判断是否可重试
 */
fun Throwable.isRetryable(): Boolean {
    return ErrorHandler.isRetryable(this)
}
