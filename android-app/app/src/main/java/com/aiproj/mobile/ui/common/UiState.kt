package com.aiproj.mobile.ui.common

/**
 * 通用UI状态封装
 * 使用Sealed Class提供类型安全的状态管理
 */
sealed class UiState<out T> {
    /**
     * 空闲状态
     */
    object Idle : UiState<Nothing>()

    /**
     * 加载中状态
     */
    object Loading : UiState<Nothing>()

    /**
     * 成功状态
     */
    data class Success<T>(val data: T) : UiState<T>()

    /**
     * 错误状态
     */
    data class Error(
        val exception: Throwable? = null,
        val message: String = exception?.message ?: "未知错误"
    ) : UiState<Nothing>()

    /**
     * 判断是否为加载中
     */
    val isLoading: Boolean get() = this is Loading

    /**
     * 判断是否为成功
     */
    val isSuccess: Boolean get() = this is Success

    /**
     * 判断是否为错误
     */
    val isError: Boolean get() = this is Error

    /**
     * 获取数据(如果是Success状态)
     */
    fun getDataOrNull(): T? = (this as? Success)?.data

    /**
     * 获取错误信息(如果是Error状态)
     */
    fun getErrorOrNull(): String? = (this as? Error)?.message
}

/**
 * 操作结果状态(用于单次操作,如删除、更新等)
 */
sealed class OperationState {
    object Idle : OperationState()
    object InProgress : OperationState()
    data class Success(val message: String? = null) : OperationState()
    data class Failure(val error: String) : OperationState()

    val isInProgress: Boolean get() = this is InProgress
    val isSuccess: Boolean get() = this is Success
    val isFailure: Boolean get() = this is Failure
}

/**
 * Result扩展函数: 转换为UiState
 */
fun <T> Result<T>.toUiState(): UiState<T> {
    return fold(
        onSuccess = { UiState.Success(it) },
        onFailure = { UiState.Error(it, it.message ?: "操作失败") }
    )
}

/**
 * Result扩展函数: 转换为OperationState
 */
fun <T> Result<T>.toOperationState(successMessage: String? = null): OperationState {
    return fold(
        onSuccess = { OperationState.Success(successMessage) },
        onFailure = { OperationState.Failure(it.message ?: "操作失败") }
    )
}
