package com.aiproj.mobile.ui.screens.projects.tabs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.Project
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskStatus
import com.aiproj.mobile.ui.components.ProjectProgressBarWithStats
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottomAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStartAxis
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.compose.common.component.rememberShapeComponent
import com.patrykandpatrick.vico.compose.common.component.rememberTextComponent
import com.patrykandpatrick.vico.compose.common.of
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries
import com.patrykandpatrick.vico.core.common.shape.Shape

/**
 * 统计Tab
 */
@Composable
fun StatisticsTab(
    project: Project,
    tasks: List<Task>
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 项目概览卡片
        ProjectOverviewCard(project = project, tasks = tasks)

        // 任务状态分布图表卡片
        TaskDistributionChartCard(tasks = tasks)

        // 任务状态分布卡片（原有列表）
        TaskDistributionCard(tasks = tasks)

        // 项目进度卡片
        ProjectProgressCard(project = project, tasks = tasks)
    }
}

/**
 * 项目概览卡片
 */
@Composable
private fun ProjectOverviewCard(
    project: Project,
    tasks: List<Task>
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "项目概览",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // 项目描述
            project.description?.let { description ->
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            // 基础统计
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(
                    icon = Icons.AutoMirrored.Filled.Assignment,
                    label = "总任务",
                    value = "${project.taskCount ?: tasks.size}",
                    color = MaterialTheme.colorScheme.primary
                )
                StatItem(
                    icon = Icons.Default.People,
                    label = "成员",
                    value = "${project.memberCount ?: 0}",
                    color = MaterialTheme.colorScheme.secondary
                )
                StatItem(
                    icon = Icons.Default.CheckCircle,
                    label = "完成率",
                    value = calculateCompletionRate(tasks),
                    color = MaterialTheme.colorScheme.tertiary
                )
            }
        }
    }
}

/**
 * 任务状态分布卡片
 */
@Composable
private fun TaskDistributionCard(
    tasks: List<Task>
) {
    val taskStats = calculateTaskStats(tasks)

    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.BarChart,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "任务状态分布",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // 状态统计列表
            taskStats.forEach { (status, count) ->
                TaskStatusRow(status = status, count = count, total = tasks.size)
            }
        }
    }
}

/**
 * 任务状态分布图表卡片
 */
@Composable
private fun TaskDistributionChartCard(tasks: List<Task>) {
    if (tasks.isEmpty()) return

    val taskStats = calculateTaskStats(tasks)

    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PieChart,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "任务状态分布图",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // 简单的柱状图展示
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                taskStats.forEach { (status, count) ->
                    TaskStatusBar(
                        status = status,
                        count = count,
                        total = tasks.size
                    )
                }
            }
        }
    }
}

/**
 * 任务状态柱状图
 */
@Composable
private fun TaskStatusBar(
    status: TaskStatus,
    count: Int,
    total: Int
) {
    val (label, color) = getStatusInfo(status)
    val percentage = if (total > 0) count.toFloat() / total else 0f

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = "$count (${(percentage * 100).toInt()}%)",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold
            )
        }

        LinearProgressIndicator(
            progress = { percentage },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp),
            color = color,
            trackColor = color.copy(alpha = 0.2f)
        )
    }
}

/**
 * 项目进度卡片
 */
@Composable
private fun ProjectProgressCard(
    project: Project,
    tasks: List<Task>
) {
    val completedTasks = tasks.count { it.status == TaskStatus.COMPLETED }
    val totalTasks = tasks.size

    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.TrendingUp,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "项目进度",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            if (project.taskStats != null) {
                ProjectProgressBarWithStats(
                    completed = project.taskStats.completed,
                    total = project.taskStats.total,
                    modifier = Modifier.fillMaxWidth()
                )
            } else if (totalTasks > 0) {
                ProjectProgressBarWithStats(
                    completed = completedTasks,
                    total = totalTasks,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                Text(
                    text = "暂无任务数据",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 统计项
 */
@Composable
private fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(32.dp)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 任务状态行
 */
@Composable
private fun TaskStatusRow(
    status: TaskStatus,
    count: Int,
    total: Int
) {
    val percentage = if (total > 0) (count.toFloat() / total * 100).toInt() else 0
    val (label, color) = getStatusInfo(status)

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            Surface(
                modifier = Modifier.size(12.dp),
                shape = MaterialTheme.shapes.small,
                color = color
            ) {}
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "$count 个",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "$percentage%",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 计算任务统计
 */
private fun calculateTaskStats(tasks: List<Task>): Map<TaskStatus, Int> {
    return tasks.groupBy { it.status }
        .mapValues { it.value.size }
}

/**
 * 计算完成率
 */
private fun calculateCompletionRate(tasks: List<Task>): String {
    if (tasks.isEmpty()) return "0%"
    val completed = tasks.count { it.status == TaskStatus.COMPLETED }
    val rate = (completed.toFloat() / tasks.size * 100).toInt()
    return "$rate%"
}

/**
 * 获取状态信息
 */
private fun getStatusInfo(status: TaskStatus): Pair<String, Color> {
    return when (status) {
        TaskStatus.TODO -> "待办" to Color(0xFFFF9800)
        TaskStatus.IN_PROGRESS -> "进行中" to Color(0xFF2196F3)
        TaskStatus.TESTING -> "测试中" to Color(0xFF9C27B0)
        TaskStatus.COMPLETED -> "已完成" to Color(0xFF4CAF50)
        TaskStatus.BLOCKED -> "已阻塞" to Color(0xFFF44336)
        TaskStatus.CANCELLED -> "已取消" to Color(0xFF9E9E9E)
        TaskStatus.DRAFT -> "草稿" to Color(0xFF9E9E9E)
        TaskStatus.PLANNING -> "规划中" to Color(0xFFFF9800)
        TaskStatus.ON_HOLD -> "暂停" to Color(0xFFF44336)
        TaskStatus.ARCHIVED -> "已归档" to Color(0xFF607D8B)
    }
}
