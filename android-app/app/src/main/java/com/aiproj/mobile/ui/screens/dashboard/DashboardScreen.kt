package com.aiproj.mobile.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.Notification
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.ui.components.NotificationsSection
import com.aiproj.mobile.ui.components.TimeStatsChart
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

/**
 * Dashboard 仪表盘页面
 */
@Composable
fun DashboardScreen(
    onTaskClick: (Int) -> Unit,
    onProjectClick: (Int) -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val swipeRefreshState = rememberSwipeRefreshState(isRefreshing = uiState.isLoading)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("仪表盘") },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                }
            )
        },
        snackbarHost = {
            if (uiState.error != null) {
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("关闭")
                        }
                    }
                ) {
                    Text(uiState.error!!)
                }
            }
        }
    ) { paddingValues ->
        SwipeRefresh(
            state = swipeRefreshState,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading && uiState.dashboardData == null) {
                // 初次加载显示加载指示器
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 统计卡片区域
                    item {
                        uiState.stats?.let { stats ->
                            StatsSection(
                                todayTasksCompleted = stats.todayTasksCompleted,
                                todayTasksTotal = stats.todayTasksTotal,
                                todayWorkTime = stats.todayWorkTime,
                                activeProjects = stats.activeProjects,
                                pendingTasks = stats.pendingTasks
                            )
                        }
                    }

                    // 当前计时器
                    item {
                        uiState.currentTimer?.let { timer ->
                            CurrentTimerCard(
                                timer = timer,
                                onStopTimer = { viewModel.stopTimer() }
                            )
                        }
                    }

                    // 时间统计图表
                    item {
                        uiState.dashboardData?.timeStats?.let { timeStats ->
                            TimeStatsChart(timeStats = timeStats)
                        }
                    }

                    // 优先任务
                    item {
                        if (uiState.priorityTasks.isNotEmpty()) {
                            SectionHeader(title = "优先任务", icon = Icons.Default.PriorityHigh)
                        }
                    }

                    items(uiState.priorityTasks) { task ->
                        TaskCard(
                            task = task,
                            onClick = { onTaskClick(task.id) },
                            onStartTimer = { taskId -> viewModel.startTaskTimer(taskId) }
                        )
                    }

                    // 最新通知
                    item {
                        val notifications = uiState.dashboardData?.recentNotifications
                        if (!notifications.isNullOrEmpty()) {
                            NotificationsSection(
                                notifications = notifications,
                                onNotificationClick = { notification ->
                                    // TODO: 处理通知点击事件
                                    notification.relatedTaskId?.let { taskId ->
                                        onTaskClick(taskId)
                                    }
                                },
                                onViewAllClick = {
                                    // TODO: 导航到通知列表页面
                                }
                            )
                        }
                    }

                    // 活跃项目（横向滚动）
                    item {
                        if (uiState.recentProjects.isNotEmpty()) {
                            ActiveProjectsSection(
                                projects = uiState.recentProjects,
                                onProjectClick = onProjectClick
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * 统计卡片区域
 */
@Composable
fun StatsSection(
    todayTasksCompleted: Int,
    todayTasksTotal: Int,
    todayWorkTime: Long,
    activeProjects: Int,
    pendingTasks: Int
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "今日概览",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.CheckCircle,
                title = "今日任务",
                value = "$todayTasksCompleted/$todayTasksTotal",
                color = MaterialTheme.colorScheme.primary
            )

            StatCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.AccessTime,
                title = "工作时长",
                value = formatWorkTime(todayWorkTime),
                color = MaterialTheme.colorScheme.secondary
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Folder,
                title = "活跃项目",
                value = activeProjects.toString(),
                color = MaterialTheme.colorScheme.tertiary
            )

            StatCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Assignment,
                title = "待办任务",
                value = pendingTasks.toString(),
                color = Color(0xFFFF9800)
            )
        }
    }
}

/**
 * 统计卡片
 */
@Composable
fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    value: String,
    color: Color
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(32.dp)
            )
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

/**
 * 当前计时器卡片
 */
@Composable
fun CurrentTimerCard(
    timer: com.aiproj.mobile.data.models.TimeLog,
    onStopTimer: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(40.dp)
            )
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = "正在进行",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                )
                Text(
                    text = timer.description ?: "工作计时中...",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            // TODO: 显示实时计时
            Text(
                text = "进行中",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )

            // 停止计时按钮
            Button(
                onClick = onStopTimer,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                ),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Stop,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "停止",
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

/**
 * 区域标题
 */
@Composable
fun SectionHeader(title: String, icon: ImageVector) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(vertical = 8.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary
        )
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
    }
}

/**
 * 任务卡片
 */
@Composable
fun TaskCard(
    task: Task,
    onClick: () -> Unit,
    onStartTimer: (Int) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 优先级标记
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(
                        color = when (task.priority) {
                            TaskPriority.HIGH -> Color.Red
                            TaskPriority.MEDIUM -> Color(0xFFFF9800)
                            TaskPriority.LOW -> Color.Gray
                            null -> Color.Gray
                        },
                        shape = RoundedCornerShape(4.dp)
                    )
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                task.description?.let { desc ->
                    Text(
                        text = desc,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // 状态标签
            TaskStatusChip(status = task.status)

            // 快捷计时按钮
            IconButton(
                onClick = { onStartTimer(task.id) },
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "开始计时",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

/**
 * 项目卡片
 */
@Composable
fun ProjectCard(project: Project, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Folder,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = project.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            project.description?.let { desc ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = desc,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }
        }
    }
}

/**
 * 任务状态标签
 */
@Composable
fun TaskStatusChip(status: TaskStatus) {
    val (text, color) = when (status) {
        TaskStatus.TODO -> "待办" to Color(0xFF2196F3)
        TaskStatus.IN_PROGRESS -> "进行中" to Color(0xFF4CAF50)
        TaskStatus.COMPLETED -> "已完成" to Color(0xFF9E9E9E)
        TaskStatus.BLOCKED -> "阻塞" to Color(0xFFF44336)
        else -> status.name to Color.Gray
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * 格式化工作时长
 */
fun formatWorkTime(minutes: Long): String {
    val hours = minutes / 60
    val mins = minutes % 60
    return if (hours > 0) {
        "${hours}h ${mins}m"
    } else {
        "${mins}m"
    }
}

/**
 * 活跃项目区域（横向滚动）
 */
@Composable
fun ActiveProjectsSection(
    projects: List<Project>,
    onProjectClick: (Int) -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Section Header
        SectionHeader(title = "活跃项目", icon = Icons.Default.Folder)

        // 横向滚动列表
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) {
            items(projects) { project ->
                ProjectCardEnhanced(
                    project = project,
                    onClick = { onProjectClick(project.id) }
                )
            }
        }
    }
}

/**
 * 增强版项目卡片（用于横向滚动）
 */
@Composable
fun ProjectCardEnhanced(
    project: Project,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(280.dp)  // 固定宽度
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            // 项目名称
            Text(
                text = project.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 进度条
            LinearProgressIndicator(
                progress = (project.completionRate ?: 0f) / 100f,
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Spacer(modifier = Modifier.height(4.dp))

            // 完成率文本
            Text(
                text = "${(project.completionRate ?: 0f).toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 统计信息行
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // 任务数
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Assignment,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${project.taskCount ?: 0}个任务",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // 成员数
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${project.memberCount ?: 0}人",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
