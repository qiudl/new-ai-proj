package com.aiproj.mobile.core.error

/**
 * 应用异常封装
 */
sealed class AppException(
    message: String? = null,
    cause: Throwable? = null
) : Exception(message, cause) {

    /**
     * 网络异常
     */
    sealed class NetworkException(message: String? = null, cause: Throwable? = null) : AppException(message, cause) {
        /**
         * 无网络连接
         */
        object NoConnectivity : NetworkException("网络连接不可用，请检查网络设置")

        /**
         * 请求超时
         */
        object Timeout : NetworkException("请求超时，请稍后重试")

        /**
         * 服务器错误
         */
        data class ServerError(val code: Int, val errorMessage: String?) : NetworkException("服务器错误: ${errorMessage ?: code}")

        /**
         * 其他网络错误
         */
        data class Unknown(val error: Throwable) : NetworkException("网络请求失败: ${error.message}", error)
    }

    /**
     * API异常
     */
    sealed class ApiException(message: String? = null, cause: Throwable? = null) : AppException(message, cause) {
        /**
         * 未授权 (401)
         */
        object Unauthorized : ApiException("登录已过期，请重新登录")

        /**
         * 禁止访问 (403)
         */
        object Forbidden : ApiException("没有权限访问此资源")

        /**
         * 资源未找到 (404)
         */
        data class NotFound(val resource: String) : ApiException("$resource 不存在")

        /**
         * 请求冲突 (409)
         */
        data class Conflict(val reason: String) : ApiException("请求冲突: $reason")

        /**
         * 请求参数错误 (400)
         */
        data class BadRequest(val reason: String) : ApiException("请求参数错误: $reason")

        /**
         * 服务器内部错误 (500)
         */
        object InternalServerError : ApiException("服务器内部错误，请稍后重试")

        /**
         * 服务不可用 (503)
         */
        object ServiceUnavailable : ApiException("服务暂时不可用，请稍后重试")
    }

    /**
     * 数据异常
     */
    sealed class DataException(message: String? = null, cause: Throwable? = null) : AppException(message, cause) {
        /**
         * 数据解析错误
         */
        data class ParseError(val error: Throwable) : DataException("数据解析失败", error)

        /**
         * 数据库错误
         */
        data class DatabaseError(val error: Throwable) : DataException("数据库操作失败", error)

        /**
         * 缓存错误
         */
        data class CacheError(val error: Throwable) : DataException("缓存操作失败", error)

        /**
         * 数据为空
         */
        object EmptyData : DataException("没有可用数据")
    }

    /**
     * 业务逻辑异常
     */
    sealed class BusinessException(message: String? = null) : AppException(message) {
        /**
         * 任务不存在
         */
        object TaskNotFound : BusinessException("任务不存在")

        /**
         * 项目不存在
         */
        object ProjectNotFound : BusinessException("项目不存在")

        /**
         * 操作失败
         */
        data class OperationFailed(val operation: String, val reason: String) : BusinessException("$operation 失败: $reason")

        /**
         * 验证失败
         */
        data class ValidationFailed(val field: String, val reason: String) : BusinessException("$field 验证失败: $reason")
    }

    /**
     * 未知异常
     */
    data class Unknown(val error: Throwable) : AppException("未知错误: ${error.message}", error)
}

/**
 * 将通用异常转换为AppException
 */
fun Throwable.toAppException(): AppException {
    return when (this) {
        is AppException -> this
        is java.net.UnknownHostException -> AppException.NetworkException.NoConnectivity
        is java.net.SocketTimeoutException -> AppException.NetworkException.Timeout
        is retrofit2.HttpException -> {
            when (code()) {
                401 -> AppException.ApiException.Unauthorized
                403 -> AppException.ApiException.Forbidden
                404 -> AppException.ApiException.NotFound(message())
                409 -> AppException.ApiException.Conflict(message())
                400 -> AppException.ApiException.BadRequest(message())
                500 -> AppException.ApiException.InternalServerError
                503 -> AppException.ApiException.ServiceUnavailable
                in 500..599 -> AppException.NetworkException.ServerError(code(), message())
                else -> AppException.NetworkException.ServerError(code(), message())
            }
        }
        is com.google.gson.JsonParseException,
        is com.google.gson.JsonSyntaxException -> AppException.DataException.ParseError(this)
        else -> AppException.Unknown(this)
    }
}

/**
 * 获取用户友好的错误消息
 */
fun AppException.getUserMessage(): String {
    return this.message ?: "发生未知错误"
}

/**
 * 判断是否需要重新登录
 */
fun AppException.requiresReLogin(): Boolean {
    return this is AppException.ApiException.Unauthorized
}

/**
 * 判断是否可重试
 */
fun AppException.isRetryable(): Boolean {
    return when (this) {
        is AppException.NetworkException.Timeout,
        is AppException.NetworkException.NoConnectivity,
        is AppException.ApiException.InternalServerError,
        is AppException.ApiException.ServiceUnavailable -> true
        else -> false
    }
}
