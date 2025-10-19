package com.aiproj.mobile.data.api

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody
import okhttp3.MediaType
import okhttp3.ResponseBody.Companion.toResponseBody

/**
 * 服务器偶发返回 JSON 前后带有额外内容时，清理响应体以避免解析错误：
 * - 去除 UTF-8 BOM
 * - 去除常见的反 JSON 劫持前缀 ")]}'", 等
 * - 去除 JSON 前后的杂质文本，仅保留首个完整的 JSON 对象/数组
 *
 * 注意：仅在 Content-Type 为 application/json 时处理。
 */
class ResponseSanitizingInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val originResponse = chain.proceed(request)

        val body = originResponse.body ?: return originResponse
        val contentType: MediaType? = body.contentType()
        val isJson = contentType?.toString()?.startsWith("application/json") == true
        if (!isJson) return originResponse

        val raw = try {
            body.string()
        } catch (e: Exception) {
            // 读取失败则原样返回
            return originResponse
        }

        val sanitized = sanitizeJson(raw)
        return if (sanitized !== null && sanitized != raw) {
            // 重建响应体
            val newBody: ResponseBody = sanitized.toResponseBody(contentType)
            originResponse.newBuilder()
                .body(newBody)
                .build()
        } else {
            // 即使没有变化，也需要重建一次 body，因为 string() 已消费
            val rebuilt: ResponseBody = raw.toResponseBody(contentType)
            originResponse.newBuilder()
                .body(rebuilt)
                .build()
        }
    }

    private fun sanitizeJson(input: String): String? {
        var s = input
        if (s.isEmpty()) return s

        // 去除 BOM
        if (s.isNotEmpty() && s[0] == '\uFEFF') {
            s = s.substring(1)
        }

        // 去除常见前缀：)]}', 或包含换行变体
        val xssiPrefixes = listOf(")]}'", ")]}'\n", ")]}'\r\n")
        for (p in xssiPrefixes) {
            if (s.startsWith(p)) {
                s = s.substring(p.length)
                break
            }
        }

        // 去除前置非 JSON 垃圾：定位第一个非空白且为 { 或 [ 的位置
        run {
            var i = 0
            while (i < s.length && s[i].isWhitespace()) i++
            if (i < s.length && s[i] != '{' && s[i] != '[') {
                val firstBrace = s.indexOf('{', i)
                val firstBracket = s.indexOf('[', i)
                val start = listOf(firstBrace, firstBracket)
                    .filter { it >= 0 }
                    .minOrNull() ?: -1
                if (start >= 0) s = s.substring(start)
            }
        }

        // 去除尾部非 JSON 垃圾：裁剪到最后一个 } 或 ]
        run {
            val lastBrace = s.lastIndexOf('}')
            val lastBracket = s.lastIndexOf(']')
            val end = maxOf(lastBrace, lastBracket)
            if (end >= 0 && end < s.length - 1) {
                s = s.substring(0, end + 1)
            }
        }

        // 最后整体 trim（允许前后空白）
        s = s.trim()
        return s
    }
}