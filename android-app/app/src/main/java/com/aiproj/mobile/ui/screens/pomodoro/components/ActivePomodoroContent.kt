package com.aiproj.mobile.ui.screens.pomodoro.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.PomodoroPhase
import com.aiproj.mobile.data.models.PomodoroSession

/**
 * 活动番茄钟内容
 * 显示计时器和控制按钮
 */
@Composable
fun ActivePomodoroContent(
    session: PomodoroSession,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onStop: () -> Unit,
    onSkipPhase: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // 任务信息
        session.taskTitle?.let { title ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Task,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        maxLines = 2
                    )
                }
            }
        }

        // 阶段指示器
        PhaseIndicator(
            phase = session.currentPhase,
            cycle = session.currentCycle
        )

        // 计时器圆环
        TimerCircle(
            remainingSeconds = session.remainingSeconds,
            totalSeconds = getTotalSeconds(session),
            isPaused = session.isPaused,
            phase = session.currentPhase
        )

        // 时间显示
        Text(
            text = formatTime(session.remainingSeconds),
            style = MaterialTheme.typography.displayLarge,
            color = MaterialTheme.colorScheme.onSurface
        )

        // 控制按钮
        ControlButtons(
            isPaused = session.isPaused,
            onPause = onPause,
            onResume = onResume,
            onStop = onStop,
            onSkipPhase = onSkipPhase
        )
    }
}

/**
 * 阶段指示器
 */
@Composable
private fun PhaseIndicator(
    phase: PomodoroPhase,
    cycle: Int
) {
    val (text, color) = when (phase) {
        PomodoroPhase.WORK -> "工作中 - 第${cycle}个番茄" to MaterialTheme.colorScheme.error
        PomodoroPhase.SHORT_BREAK -> "短休息" to MaterialTheme.colorScheme.tertiary
        PomodoroPhase.LONG_BREAK -> "长休息" to MaterialTheme.colorScheme.tertiary
        PomodoroPhase.IDLE -> "空闲" to MaterialTheme.colorScheme.onSurfaceVariant
    }

    AssistChip(
        onClick = {},
        label = {
            Text(
                text = text,
                style = MaterialTheme.typography.titleMedium
            )
        },
        leadingIcon = {
            Icon(
                imageVector = when (phase) {
                    PomodoroPhase.WORK -> Icons.Default.Work
                    else -> Icons.Default.Coffee
                },
                contentDescription = null
            )
        },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = color.copy(alpha = 0.1f),
            labelColor = color,
            leadingIconContentColor = color
        )
    )
}

/**
 * 计时器圆环（带脉冲动画）
 */
@Composable
private fun TimerCircle(
    remainingSeconds: Int,
    totalSeconds: Int,
    isPaused: Boolean,
    phase: PomodoroPhase
) {
    // 脉冲动画（仅在运行时）
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    val progress = if (totalSeconds > 0) {
        remainingSeconds.toFloat() / totalSeconds.toFloat()
    } else 0f

    val color = when (phase) {
        PomodoroPhase.WORK -> MaterialTheme.colorScheme.error
        PomodoroPhase.SHORT_BREAK, PomodoroPhase.LONG_BREAK -> MaterialTheme.colorScheme.tertiary
        PomodoroPhase.IDLE -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Box(
        modifier = Modifier.size(280.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (!isPaused) Modifier.graphicsLayer(
                        scaleX = scale,
                        scaleY = scale
                    ) else Modifier
                )
        ) {
            val strokeWidth = 16.dp.toPx()

            // 背景圆环
            drawCircle(
                color = color.copy(alpha = 0.1f),
                radius = size.minDimension / 2f,
                style = Stroke(width = strokeWidth)
            )

            // 进度圆环
            drawArc(
                color = color,
                startAngle = -90f,
                sweepAngle = 360f * progress,
                useCenter = false,
                style = Stroke(
                    width = strokeWidth,
                    cap = StrokeCap.Round
                )
            )
        }
    }
}

/**
 * 控制按钮组
 */
@Composable
private fun ControlButtons(
    isPaused: Boolean,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onStop: () -> Unit,
    onSkipPhase: () -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 停止按钮
        OutlinedButton(
            onClick = onStop,
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error
            )
        ) {
            Icon(Icons.Default.Stop, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("停止")
        }

        // 暂停/继续按钮
        FilledTonalButton(
            onClick = if (isPaused) onResume else onPause,
            modifier = Modifier.height(56.dp)
        ) {
            Icon(
                imageVector = if (isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                contentDescription = null,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (isPaused) "继续" else "暂停",
                style = MaterialTheme.typography.titleMedium
            )
        }

        // 跳过阶段按钮
        OutlinedButton(onClick = onSkipPhase) {
            Icon(Icons.Default.SkipNext, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("跳过")
        }
    }
}

/**
 * 格式化时间显示（MM:SS）
 */
private fun formatTime(seconds: Int): String {
    val minutes = seconds / 60
    val secs = seconds % 60
    return "%02d:%02d".format(minutes, secs)
}

/**
 * 获取总秒数
 */
private fun getTotalSeconds(session: PomodoroSession): Int {
    return when (session.currentPhase) {
        PomodoroPhase.WORK -> session.config.workMinutes * 60
        PomodoroPhase.SHORT_BREAK -> session.config.shortBreakMinutes * 60
        PomodoroPhase.LONG_BREAK -> session.config.longBreakMinutes * 60
        PomodoroPhase.IDLE -> 0
    }
}
