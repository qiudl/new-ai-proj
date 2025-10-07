package com.aiproj.mobile.ui.screens.timer

/**
 * 格式化秒数为时:分:秒格式
 */
fun formatTime(seconds: Long): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    val secs = seconds % 60

    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, secs)
    } else {
        String.format("%d:%02d", minutes, secs)
    }
}

/**
 * 格式化分钟为小时和分钟
 */
fun formatDuration(minutes: Long): String {
    val hours = minutes / 60
    val mins = minutes % 60

    return when {
        hours > 0 && mins > 0 -> "${hours}h ${mins}m"
        hours > 0 -> "${hours}h"
        else -> "${mins}m"
    }
}
