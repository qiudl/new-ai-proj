package com.aiproj.mobile.ui.screens.timer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.TaskPriority

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimerScreen(
    viewModel: TimerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("工时记录") })
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
        ) {
            // 当前任务信息区域
            if (uiState.currentTimer != null && uiState.currentTask != null) {
                CurrentTaskInfoCard(
                    taskTitle = uiState.currentTask?.title ?: "未知任务",
                    projectName = uiState.currentTask?.projectId?.let { "项目 #$it" } ?: "无项目",
                    priority = uiState.currentTask?.priority,
                    modifier = Modifier.padding(16.dp)
                )
            }

            // 计时器显示区域
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (uiState.currentTimer != null) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // 时间显示
                    Text(
                        text = formatTime(uiState.elapsedSeconds),
                        style = MaterialTheme.typography.displayLarge,
                        fontWeight = FontWeight.Bold,
                        color = if (uiState.currentTimer != null) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        }
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // 状态文本
                    Text(
                        text = if (uiState.currentTimer != null) {
                            uiState.currentTimer?.description ?: "计时中..."
                        } else {
                            "当前没有运行的计时器"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // 控制按钮
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (uiState.currentTimer != null) {
                            // 暂停按钮 (TODO: 实现暂停功能)
                            OutlinedButton(
                                onClick = { /* viewModel.pauseTimer() */ },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Pause, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("暂停")
                            }

                            // 停止按钮
                            Button(
                                onClick = { viewModel.stopTimer() },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Icon(Icons.Default.Stop, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("停止")
                            }
                        } else {
                            // 开始按钮
                            Button(
                                onClick = { /* viewModel.startTimer() */ },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = false // TODO: 实现选择任务后启用
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("开始计时")
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 今日时间统计
            TodayStatisticsCard(
                totalMinutes = uiState.todayTotalMinutes,
                taskCount = uiState.todayTaskCount,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 历史时间日志列表
            if (uiState.timeLogs.isNotEmpty()) {
                Text(
                    text = "历史记录",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )

                uiState.timeLogs.forEach { timeLog ->
                    TimeLogItem(
                        description = timeLog.description ?: "无描述",
                        duration = timeLog.duration?.toLong() ?: 0L,
                        startTime = timeLog.startedAt,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )
                }
            } else {
                // 空状态
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "暂无历史记录",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/**
 * 当前任务信息卡片
 */
@Composable
fun CurrentTaskInfoCard(
    taskTitle: String,
    projectName: String,
    priority: TaskPriority?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 优先级标记
            Box(
                modifier = Modifier
                    .size(4.dp, 40.dp)
                    .background(
                        color = when (priority) {
                            TaskPriority.HIGH -> Color(0xFFEF5350)
                            TaskPriority.MEDIUM -> Color(0xFFFFA726)
                            TaskPriority.LOW -> Color(0xFF78909C)
                            null -> Color.Gray
                        },
                        shape = RoundedCornerShape(2.dp)
                    )
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = taskTitle,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = projectName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 优先级文本
            priority?.let {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = when (it) {
                        TaskPriority.HIGH -> Color(0xFFEF5350).copy(alpha = 0.1f)
                        TaskPriority.MEDIUM -> Color(0xFFFFA726).copy(alpha = 0.1f)
                        TaskPriority.LOW -> Color(0xFF78909C).copy(alpha = 0.1f)
                    }
                ) {
                    Text(
                        text = when (it) {
                            TaskPriority.HIGH -> "高"
                            TaskPriority.MEDIUM -> "中"
                            TaskPriority.LOW -> "低"
                        },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = when (it) {
                            TaskPriority.HIGH -> Color(0xFFEF5350)
                            TaskPriority.MEDIUM -> Color(0xFFFFA726)
                            TaskPriority.LOW -> Color(0xFF78909C)
                        },
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

/**
 * 今日统计卡片
 */
@Composable
fun TodayStatisticsCard(
    totalMinutes: Long,
    taskCount: Int,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Today,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "今日统计",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(
                    icon = Icons.Default.AccessTime,
                    label = "工作时长",
                    value = formatDuration(totalMinutes)
                )
                StatItem(
                    icon = Icons.Default.Assignment,
                    label = "任务数",
                    value = "$taskCount"
                )
            }
        }
    }
}

/**
 * 统计项
 */
@Composable
fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 时间日志项
 */
@Composable
fun TimeLogItem(
    description: String,
    duration: Long,
    startTime: String,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = formatStartTime(startTime),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = formatDuration(duration),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

/**
 * 格式化时间 (HH:MM:SS)
 */
fun formatTime(seconds: Long): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    val secs = seconds % 60
    return String.format("%02d:%02d:%02d", hours, minutes, secs)
}

/**
 * 格式化时长 (XXh XXm)
 */
fun formatDuration(minutes: Long): String {
    val hours = minutes / 60
    val mins = minutes % 60
    return if (hours > 0) {
        "${hours}h ${mins}m"
    } else {
        "${mins}m"
    }
}

/**
 * 格式化开始时间
 */
fun formatStartTime(startTime: String): String {
    return try {
        // 简化处理,实际应该使用DateTimeFormatter
        startTime.take(16).replace("T", " ")
    } catch (e: Exception) {
        startTime
    }
}
