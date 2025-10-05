package com.aiproj.mobile.ui.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * ErrorHandler单元测试
 */
class ErrorHandlerTest {

    @Test
    fun `getErrorMessage returns correct message for UnknownHostException`() {
        val exception = UnknownHostException("Unable to resolve host")
        val message = ErrorHandler.getErrorMessage(exception)
        assertEquals("网络连接失败,请检查网络设置", message)
    }

    @Test
    fun `getErrorMessage returns correct message for SocketTimeoutException`() {
        val exception = SocketTimeoutException("timeout")
        val message = ErrorHandler.getErrorMessage(exception)
        assertEquals("请求超时,请稍后重试", message)
    }

    @Test
    fun `getErrorMessage returns correct message for IOException`() {
        val exception = IOException("Network IO error")
        val message = ErrorHandler.getErrorMessage(exception)
        assertEquals("网络错误: Network IO error", message)
    }

    @Test
    fun `getErrorMessage returns correct message for HTTP 401`() {
        val exception = createHttpException(401)
        val message = ErrorHandler.getErrorMessage(exception)
        assertEquals("未授权,请重新登录", message)
    }

    @Test
    fun `getErrorMessage returns correct message for HTTP 404`() {
        val exception = createHttpException(404)
        val message = ErrorHandler.getErrorMessage(exception)
        assertEquals("请求的资源不存在", message)
    }

    @Test
    fun `getErrorMessage returns correct message for HTTP 500`() {
        val exception = createHttpException(500)
        val message = ErrorHandler.getErrorMessage(exception)
        assertEquals("服务器内部错误", message)
    }

    @Test
    fun `getErrorMessage returns correct message for unknown HTTP code`() {
        val exception = createHttpException(999)
        val message = ErrorHandler.getErrorMessage(exception)
        assertTrue(message.startsWith("HTTP错误 (999)"))
    }

    @Test
    fun `isNetworkError returns true for network exceptions`() {
        assertTrue(ErrorHandler.isNetworkError(IOException()))
        assertTrue(ErrorHandler.isNetworkError(UnknownHostException()))
        assertTrue(ErrorHandler.isNetworkError(SocketTimeoutException()))
    }

    @Test
    fun `isNetworkError returns false for non-network exceptions`() {
        assertFalse(ErrorHandler.isNetworkError(RuntimeException()))
        assertFalse(ErrorHandler.isNetworkError(NullPointerException()))
    }

    @Test
    fun `isAuthError returns true for HTTP 401`() {
        val exception = createHttpException(401)
        assertTrue(ErrorHandler.isAuthError(exception))
    }

    @Test
    fun `isAuthError returns false for other HTTP codes`() {
        assertFalse(ErrorHandler.isAuthError(createHttpException(403)))
        assertFalse(ErrorHandler.isAuthError(createHttpException(500)))
    }

    @Test
    fun `isAuthError returns false for non-HTTP exceptions`() {
        assertFalse(ErrorHandler.isAuthError(IOException()))
    }

    @Test
    fun `isRetryable returns true for retryable errors`() {
        assertTrue(ErrorHandler.isRetryable(SocketTimeoutException()))
        assertTrue(ErrorHandler.isRetryable(UnknownHostException()))
        assertTrue(ErrorHandler.isRetryable(createHttpException(408))) // Request Timeout
        assertTrue(ErrorHandler.isRetryable(createHttpException(429))) // Too Many Requests
        assertTrue(ErrorHandler.isRetryable(createHttpException(500))) // Internal Server Error
        assertTrue(ErrorHandler.isRetryable(createHttpException(502))) // Bad Gateway
        assertTrue(ErrorHandler.isRetryable(createHttpException(503))) // Service Unavailable
        assertTrue(ErrorHandler.isRetryable(createHttpException(504))) // Gateway Timeout
    }

    @Test
    fun `isRetryable returns false for non-retryable errors`() {
        assertFalse(ErrorHandler.isRetryable(createHttpException(400))) // Bad Request
        assertFalse(ErrorHandler.isRetryable(createHttpException(401))) // Unauthorized
        assertFalse(ErrorHandler.isRetryable(createHttpException(403))) // Forbidden
        assertFalse(ErrorHandler.isRetryable(createHttpException(404))) // Not Found
        assertFalse(ErrorHandler.isRetryable(RuntimeException()))
    }

    @Test
    fun `toUserFriendlyMessage extension works correctly`() {
        val exception = UnknownHostException()
        val message = exception.toUserFriendlyMessage()
        assertEquals("网络连接失败,请检查网络设置", message)
    }

    @Test
    fun `isNetworkError extension works correctly`() {
        val exception = IOException()
        assertTrue(exception.isNetworkError())
    }

    @Test
    fun `isAuthError extension works correctly`() {
        val exception = createHttpException(401)
        assertTrue(exception.isAuthError())
    }

    @Test
    fun `isRetryable extension works correctly`() {
        val exception = SocketTimeoutException()
        assertTrue(exception.isRetryable())
    }

    /**
     * 创建HttpException用于测试
     */
    private fun createHttpException(code: Int): HttpException {
        val response = Response.error<Any>(code, okhttp3.ResponseBody.create(null, ""))
        return HttpException(response)
    }
}
