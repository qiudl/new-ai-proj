package com.aiproj.mobile.core.ui

import com.aiproj.mobile.core.error.AppException

/**
 * UI状态封装
 */
sealed class UiState<out T> {
    /**
     * 空闲状态
     */
    object Idle : UiState<Nothing>()

    /**
     * 加载中
     */
    object Loading : UiState<Nothing>()

    /**
     * 成功
     */
    data class Success<T>(val data: T) : UiState<T>()

    /**
     * 错误
     */
    data class Error(val exception: AppException) : UiState<Nothing>()

    /**
     * 判断是否为加载中
     */
    val isLoading: Boolean
        get() = this is Loading

    /**
     * 判断是否为成功
     */
    val isSuccess: Boolean
        get() = this is Success

    /**
     * 判断是否为错误
     */
    val isError: Boolean
        get() = this is Error

    /**
     * 获取数据 (如果有)
     */
    fun getDataOrNull(): T? {
        return when (this) {
            is Success -> data
            else -> null
        }
    }

    /**
     * 获取异常 (如果有)
     */
    fun getExceptionOrNull(): AppException? {
        return when (this) {
            is Error -> exception
            else -> null
        }
    }
}

/**
 * 将Result转换为UiState
 */
fun <T> Result<T>.toUiState(): UiState<T> {
    return fold(
        onSuccess = { UiState.Success(it) },
        onFailure = { UiState.Error(it.toAppException()) }
    )
}

/**
 * 转换UiState的数据类型
 */
fun <T, R> UiState<T>.map(transform: (T) -> R): UiState<R> {
    return when (this) {
        is UiState.Idle -> UiState.Idle
        is UiState.Loading -> UiState.Loading
        is UiState.Success -> UiState.Success(transform(data))
        is UiState.Error -> UiState.Error(exception)
    }
}

/**
 * 扁平化转换
 */
fun <T, R> UiState<T>.flatMap(transform: (T) -> UiState<R>): UiState<R> {
    return when (this) {
        is UiState.Idle -> UiState.Idle
        is UiState.Loading -> UiState.Loading
        is UiState.Success -> transform(data)
        is UiState.Error -> UiState.Error(exception)
    }
}

/**
 * 成功时执行
 */
inline fun <T> UiState<T>.onSuccess(action: (T) -> Unit): UiState<T> {
    if (this is UiState.Success) {
        action(data)
    }
    return this
}

/**
 * 错误时执行
 */
inline fun <T> UiState<T>.onError(action: (AppException) -> Unit): UiState<T> {
    if (this is UiState.Error) {
        action(exception)
    }
    return this
}

/**
 * 加载时执行
 */
inline fun <T> UiState<T>.onLoading(action: () -> Unit): UiState<T> {
    if (this is UiState.Loading) {
        action()
    }
    return this
}

/**
 * 扩展Result支持toAppException
 */
private fun Throwable.toAppException(): AppException {
    return when (this) {
        is AppException -> this
        is java.net.UnknownHostException -> AppException.NetworkException.NoConnectivity
        is java.net.SocketTimeoutException -> AppException.NetworkException.Timeout
        else -> AppException.Unknown(this)
    }
}
