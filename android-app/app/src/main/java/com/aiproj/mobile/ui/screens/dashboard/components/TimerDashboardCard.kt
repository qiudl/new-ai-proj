package com.aiproj.mobile.ui.screens.dashboard.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.TimerStatus
import com.aiproj.mobile.ui.screens.timer.formatDuration
import com.aiproj.mobile.ui.screens.timer.formatTime
import kotlinx.coroutines.delay

/**
 * Dashboard计时器卡片
 */
@Composable
fun TimerDashboardCard(
    currentTimer: TimerStatus?,
    elapsedSeconds: Long,
    todayTotalMinutes: Long,
    todayTaskCount: Int,
    onTimerClick: () -> Unit,
    onPauseClick: () -> Unit,
    onResumeClick: () -> Unit,
    onStopClick: () -> Unit,
    onStartClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onTimerClick),
        colors = CardDefaults.cardColors(
            containerColor = if (currentTimer != null && currentTimer.status == "running") {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Timer,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = "计时器",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Status badge
                currentTimer?.let { timer ->
                    StatusBadge(status = timer.status)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Timer content
            AnimatedContent(
                targetState = currentTimer != null,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "timer_content"
            ) { hasTimer ->
                if (hasTimer && currentTimer != null) {
                    ActiveTimerContent(
                        timer = currentTimer,
                        elapsedSeconds = elapsedSeconds,
                        onPauseClick = onPauseClick,
                        onResumeClick = onResumeClick,
                        onStopClick = onStopClick
                    )
                } else {
                    IdleTimerContent(
                        todayTotalMinutes = todayTotalMinutes,
                        todayTaskCount = todayTaskCount,
                        onStartClick = onStartClick
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val (text, color) = when (status.lowercase()) {
        "running" -> "运行中" to MaterialTheme.colorScheme.primary
        "paused" -> "已暂停" to MaterialTheme.colorScheme.tertiary
        else -> "空闲" to MaterialTheme.colorScheme.onSurfaceVariant
    }

    Surface(
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.15f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun ActiveTimerContent(
    timer: TimerStatus,
    elapsedSeconds: Long,
    onPauseClick: () -> Unit,
    onResumeClick: () -> Unit,
    onStopClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Task info
        Column {
            Text(
                text = timer.taskTitle ?: "无关联任务",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            timer.description?.let { desc ->
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }
        }

        // Timer display with real-time update
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Elapsed time with animation
            var displayTime by remember(timer.id) { mutableLongStateOf(elapsedSeconds) }

            LaunchedEffect(timer.id, timer.status) {
                if (timer.status == "running") {
                    while (true) {
                        delay(1000)
                        displayTime++
                    }
                }
            }

            Text(
                text = formatTime(displayTime),
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            // Action buttons
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (timer.status == "running") {
                    IconButton(onClick = onPauseClick) {
                        Icon(
                            imageVector = Icons.Default.Pause,
                            contentDescription = "暂停",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                } else {
                    IconButton(onClick = onResumeClick) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "继续",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                IconButton(onClick = onStopClick) {
                    Icon(
                        imageVector = Icons.Default.Stop,
                        contentDescription = "停止",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
private fun IdleTimerContent(
    todayTotalMinutes: Long,
    todayTaskCount: Int,
    onStartClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Today stats
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            TodayStatItem(
                icon = Icons.Default.AccessTime,
                label = "今日时长",
                value = formatDuration(todayTotalMinutes)
            )

            TodayStatItem(
                icon = Icons.Default.Assignment,
                label = "工作任务",
                value = "$todayTaskCount"
            )
        }

        // Start button
        Button(
            onClick = onStartClick,
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("开始计时")
        }
    }
}

@Composable
private fun TodayStatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        )
    }
}
