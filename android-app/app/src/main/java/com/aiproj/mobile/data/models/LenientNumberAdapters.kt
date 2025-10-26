package com.aiproj.mobile.data.models

import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter

/**
 * 宽松整型适配器：允许数字以字符串形式或带前缀（如 "v2"）返回
 */
class LenientIntAdapter : TypeAdapter<Int>() {
    override fun write(out: JsonWriter, value: Int?) {
        if (value == null) {
            out.nullValue()
        } else {
            out.value(value)
        }
    }

    override fun read(`in`: JsonReader): Int {
        return try {
            when (`in`.peek()) {
                JsonToken.NUMBER -> try {
                    `in`.nextInt()
                } catch (e: NumberFormatException) {
                    // Fallback: read as string then parse
                    parseToIntSafe(`in`.nextString())
                }
                JsonToken.STRING -> parseToIntSafe(`in`.nextString())
                JsonToken.BOOLEAN -> if (`in`.nextBoolean()) 1 else 0
                JsonToken.NULL -> {
                    `in`.nextNull()
                    0
                }
                else -> {
                    `in`.skipValue()
                    0
                }
            }
        } catch (e: Exception) {
            0
        }
    }

    private fun parseToIntSafe(raw: String?): Int {
        if (raw.isNullOrBlank()) return 0
        // 提取连续数字，例如 "v12" -> 12，"002" -> 2
        val match = Regex("\\d+").find(raw)
        val digits = match?.value
        return digits?.toIntOrNull() ?: raw.toIntOrNull() ?: 0
    }
}