package com.aiproj.mobile.util

import android.util.Log
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.abs

/**
 * 日期时间工具类
 * 提供统一的日期时间格式化功能
 */
object DateTimeUtils {
    private const val TAG = "DateTimeUtils"

    /**
     * 格式化时间为简洁显示
     * - 今天: "HH:mm"
     * - 昨天: "昨天 HH:mm"
     * - 本年: "MM-dd HH:mm"
     * - 跨年: "yyyy-MM-dd HH:mm"
     *
     * @param dateStr ISO 8601格式的时间字符串 (例如: "2025-10-07T02:44:53.962597Z")
     * @return 格式化后的时间字符串，解析失败时返回 "未知时间"
     */
    fun formatTime(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) {
            Log.w(TAG, "formatTime: dateStr is null or blank")
            return "未知时间"
        }

        return try {
            val instant = Instant.parse(dateStr)
            val dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())

            // 检查是否是无效的零值时间（后端返回的 NULL 值会被转为 0001-01-01T00:00:00Z）
            if (dateTime.year < 1900) {
                Log.w(TAG, "formatTime: date is zero/invalid value: $dateStr")
                return "未知时间"
            }
            val now = LocalDateTime.now()

            when {
                // 今天 - 只显示时间
                isSameDay(dateTime, now) -> {
                    dateTime.format(DateTimeFormatter.ofPattern("HH:mm"))
                }
                // 昨天
                isYesterday(dateTime, now) -> {
                    "昨天 ${dateTime.format(DateTimeFormatter.ofPattern("HH:mm"))}"
                }
                // 本年 - 显示月日时间
                dateTime.year == now.year -> {
                    dateTime.format(DateTimeFormatter.ofPattern("MM-dd HH:mm"))
                }
                // 跨年 - 显示完整日期时间
                else -> {
                    dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse date: $dateStr", e)
            "未知时间"
        }
    }

    /**
     * 格式化时间，支持后备时间
     * 当主时间无效时使用后备时间
     *
     * @param primaryDate 主要时间（如 updatedAt）
     * @param fallbackDate 后备时间（如 createdAt）
     * @return 格式化后的时间字符串
     */
    fun formatTimeWithFallback(primaryDate: String?, fallbackDate: String?): String {
        val primaryResult = formatTimeOrNull(primaryDate)
        if (primaryResult != null) {
            return primaryResult
        }
        val fallbackResult = formatTimeOrNull(fallbackDate)
        if (fallbackResult != null) {
            return fallbackResult
        }
        return "未知时间"
    }

    /**
     * 格式化时间，返回 null 如果无效
     */
    private fun formatTimeOrNull(dateStr: String?): String? {
        if (dateStr.isNullOrBlank()) {
            return null
        }

        return try {
            val instant = Instant.parse(dateStr)
            val dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())

            // 检查是否是无效的零值时间
            if (dateTime.year < 1900) {
                return null
            }

            val now = LocalDateTime.now()

            when {
                isSameDay(dateTime, now) -> {
                    dateTime.format(DateTimeFormatter.ofPattern("HH:mm"))
                }
                isYesterday(dateTime, now) -> {
                    "昨天 ${dateTime.format(DateTimeFormatter.ofPattern("HH:mm"))}"
                }
                dateTime.year == now.year -> {
                    dateTime.format(DateTimeFormatter.ofPattern("MM-dd HH:mm"))
                }
                else -> {
                    dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                }
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 格式化时间为相对时间显示
     * - 1分钟内: "刚刚"
     * - 1小时内: "X分钟前"
     * - 今天: "X小时前"
     * - 其他: 使用 formatTime()
     *
     * @param dateStr ISO 8601格式的时间字符串
     * @return 相对时间字符串
     */
    fun formatRelativeTime(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) {
            return "未知时间"
        }

        return try {
            val instant = Instant.parse(dateStr)
            val dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())

            // 检查是否是无效的零值时间
            if (dateTime.year < 1900) {
                return "未知时间"
            }

            val now = LocalDateTime.now()

            val minutesDiff = ChronoUnit.MINUTES.between(dateTime, now)
            val hoursDiff = ChronoUnit.HOURS.between(dateTime, now)
            val daysDiff = ChronoUnit.DAYS.between(dateTime, now)

            when {
                minutesDiff < 1 -> "刚刚"
                minutesDiff < 60 -> "${minutesDiff}分钟前"
                hoursDiff < 24 && isSameDay(dateTime, now) -> "${hoursDiff}小时前"
                daysDiff == 1L -> "昨天 ${dateTime.format(DateTimeFormatter.ofPattern("HH:mm"))}"
                daysDiff < 7 -> "${daysDiff}天前"
                else -> formatTime(dateStr)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse relative time: $dateStr", e)
            formatTime(dateStr)
        }
    }

    /**
     * 格式化完整日期时间
     *
     * @param dateStr ISO 8601格式的时间字符串
     * @param pattern 格式化模式，默认 "yyyy-MM-dd HH:mm:ss"
     * @return 格式化后的时间字符串
     */
    fun formatFullDateTime(dateStr: String?, pattern: String = "yyyy-MM-dd HH:mm:ss"): String {
        if (dateStr.isNullOrBlank()) {
            return "未知时间"
        }

        return try {
            val instant = Instant.parse(dateStr)
            val dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())

            // 检查是否是无效的零值时间
            if (dateTime.year < 1900) {
                return "未知时间"
            }

            val formatter = DateTimeFormatter.ofPattern(pattern)
                .withZone(ZoneId.systemDefault())
            formatter.format(instant)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to format full date time: $dateStr with pattern: $pattern", e)
            "未知时间"
        }
    }

    /**
     * 格式化完整日期时间，支持后备时间
     *
     * @param primaryDate 主要时间（如 updatedAt）
     * @param fallbackDate 后备时间（如 createdAt）
     * @param pattern 格式化模式
     * @return 格式化后的时间字符串
     */
    fun formatFullDateTimeWithFallback(
        primaryDate: String?,
        fallbackDate: String?,
        pattern: String = "yyyy-MM-dd HH:mm:ss"
    ): String {
        val primaryResult = formatFullDateTimeOrNull(primaryDate, pattern)
        if (primaryResult != null) {
            return primaryResult
        }
        val fallbackResult = formatFullDateTimeOrNull(fallbackDate, pattern)
        if (fallbackResult != null) {
            return fallbackResult
        }
        return "未知时间"
    }

    /**
     * 格式化完整日期时间，返回 null 如果无效
     */
    private fun formatFullDateTimeOrNull(dateStr: String?, pattern: String): String? {
        if (dateStr.isNullOrBlank()) {
            return null
        }

        return try {
            val instant = Instant.parse(dateStr)
            val dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())

            if (dateTime.year < 1900) {
                return null
            }

            val formatter = DateTimeFormatter.ofPattern(pattern)
                .withZone(ZoneId.systemDefault())
            formatter.format(instant)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 格式化日期（不含时间）
     *
     * @param dateStr ISO 8601格式的时间字符串
     * @return 格式化后的日期字符串 (yyyy-MM-dd)
     */
    fun formatDate(dateStr: String?): String {
        return formatFullDateTime(dateStr, "yyyy-MM-dd")
    }

    /**
     * 判断是否是同一天
     */
    private fun isSameDay(date1: LocalDateTime, date2: LocalDateTime): Boolean {
        return date1.year == date2.year &&
                date1.dayOfYear == date2.dayOfYear
    }

    /**
     * 判断是否是昨天
     */
    private fun isYesterday(date: LocalDateTime, now: LocalDateTime): Boolean {
        val yesterday = now.minusDays(1)
        return isSameDay(date, yesterday)
    }

    /**
     * 解析ISO 8601时间字符串为Instant
     *
     * @param dateStr ISO 8601格式的时间字符串
     * @return Instant对象，解析失败返回null
     */
    fun parseISO8601(dateStr: String?): Instant? {
        if (dateStr.isNullOrBlank()) {
            return null
        }

        return try {
            Instant.parse(dateStr)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse ISO8601: $dateStr", e)
            null
        }
    }

    /**
     * 计算时间差（分钟）
     *
     * @param startDateStr 开始时间
     * @param endDateStr 结束时间（默认为当前时间）
     * @return 时间差（分钟），解析失败返回null
     */
    fun getDurationMinutes(startDateStr: String?, endDateStr: String? = null): Long? {
        val start = parseISO8601(startDateStr) ?: return null
        val end = if (endDateStr != null) {
            parseISO8601(endDateStr) ?: return null
        } else {
            Instant.now()
        }

        return ChronoUnit.MINUTES.between(start, end)
    }
}
