package com.aiproj.mobile.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiproj.mobile.data.models.Task
import com.aiproj.mobile.data.models.TaskPriority
import com.aiproj.mobile.data.models.TaskStatus

/**
 * 层级任务展示组件
 * Phase 4: 视觉效果优化
 */
@Composable
fun HierarchicalTaskItem(
    task: Task,
    isExpanded: Boolean = false,
    isLoading: Boolean = false,
    completedSubtasks: Int = 0,
    completionProgress: Float = 0f,
    onExpandClick: () -> Unit = {},
    onTaskClick: () -> Unit,
    onStatusChange: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val level = task.level
    val hasChildren = task.hasSubtasks
    val isCompleted = task.status == TaskStatus.COMPLETED

    // 使用传入的动态值或Task自带的值
    val actualCompletedSubtasks = if (hasChildren && isExpanded) completedSubtasks else task.completedSubtasks
    val actualProgress = if (hasChildren && isExpanded) completionProgress else task.completionProgress

    // 动画缩进
    val animatedIndent by animateDpAsState(
        targetValue = HierarchyStyle.IndentPerLevel * level,
        animationSpec = tween(
            durationMillis = 300,
            easing = FastOutSlowInEasing
        ),
        label = "indent_animation"
    )

    // 展开按钮旋转动画
    val expandIconRotation by animateFloatAsState(
        targetValue = if (isExpanded) 90f else 0f,
        animationSpec = tween(
            durationMillis = 300,
            easing = FastOutSlowInEasing
        ),
        label = "expand_icon_rotation"
    )

    // Phase 4: 进度条动画
    val animatedProgress by animateFloatAsState(
        targetValue = actualProgress,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "progress_animation"
    )

    // Phase 4: 完成状态缩放动画
    val completedScale by animateFloatAsState(
        targetValue = if (isCompleted) 0.98f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "completed_scale"
    )

    // Phase 4: 卡片边框颜色动画（已完成任务无边框）
    val borderColor by animateColorAsState(
        targetValue = when {
            isCompleted -> Color.Transparent  // 已完成任务去掉边框
            isExpanded -> MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
            else -> Color.Transparent
        },
        animationSpec = tween(
            durationMillis = 200,
            easing = LinearOutSlowInEasing
        ),
        label = "border_color_animation"
    )

    // Phase 4: 卡片背景颜色动画
    val cardBackgroundColor by animateColorAsState(
        targetValue = when {
            isCompleted -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            else -> MaterialTheme.colorScheme.surface
        },
        animationSpec = tween(
            durationMillis = 200,
            easing = LinearOutSlowInEasing
        ),
        label = "card_background_animation"
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = animatedIndent)
            .scale(completedScale)
            .border(
                width = 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onTaskClick),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isExpanded) 4.dp else HierarchyStyle.CardElevation
        ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = cardBackgroundColor
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(HierarchyStyle.CardPadding),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 层级指示器（垂直线条）
            if (level > 0) {
                LevelIndicator(level = level)
                Spacer(modifier = Modifier.width(8.dp))
            }

            // 展开/收起按钮（仅父任务）
            if (hasChildren) {
                IconButton(
                    onClick = onExpandClick,
                    modifier = Modifier.size(HierarchyStyle.IconSizeMedium),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = if (isExpanded) "收起" else "展开",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.rotate(expandIconRotation)
                        )
                    }
                }
            } else {
                // 占位空间保持对齐
                Spacer(modifier = Modifier.width(HierarchyStyle.IconSizeMedium))
            }

            Spacer(modifier = Modifier.width(8.dp))

            // 任务信息
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 任务ID徽章
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "#${task.id}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    // 优先级指示点（已完成任务显示绿色）
                    PriorityIndicator(
                        priority = task.priority,
                        isCompleted = isCompleted
                    )

                    Text(
                        text = task.title,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontSize = HierarchyStyle.FontSizeTitle,
                            fontWeight = FontWeight.Medium
                        ),
                        maxLines = 2,
                        modifier = Modifier.weight(1f)
                    )

                    // 子任务计数徽章
                    if (hasChildren) {
                        SubtaskBadge(
                            completed = actualCompletedSubtasks,
                            total = task.totalSubtasks
                        )
                    }
                }

                // 项目信息和状态
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    // 项目ID+名称标签
                    Text(
                        text = if (task.projectName != null) {
                            "项目 #${task.projectId} · ${task.projectName}"
                        } else {
                            "项目 #${task.projectId}"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // 状态标签
                    Surface(
                        color = when (task.status) {
                            TaskStatus.COMPLETED -> MaterialTheme.colorScheme.tertiaryContainer
                            TaskStatus.IN_PROGRESS -> MaterialTheme.colorScheme.secondaryContainer
                            TaskStatus.TODO -> MaterialTheme.colorScheme.surfaceVariant
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        },
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = when (task.status) {
                                TaskStatus.COMPLETED -> "已完成"
                                TaskStatus.IN_PROGRESS -> "进行中"
                                TaskStatus.TODO -> "待办"
                                TaskStatus.PLANNING -> "计划中"
                                TaskStatus.TESTING -> "测试中"
                                TaskStatus.BLOCKED -> "受阻"
                                TaskStatus.ON_HOLD -> "暂停"
                                TaskStatus.CANCELLED -> "已取消"
                                TaskStatus.ARCHIVED -> "已归档"
                                else -> task.status.name
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = when (task.status) {
                                TaskStatus.COMPLETED -> MaterialTheme.colorScheme.onTertiaryContainer
                                TaskStatus.IN_PROGRESS -> MaterialTheme.colorScheme.onSecondaryContainer
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    // 创建时间
                    Text(
                        text = "· ${formatDateTime(task.createdAt)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }

                // 进度条（仅父任务）- Phase 4: 使用动画进度
                if (hasChildren && task.totalSubtasks > 0) {
                    Spacer(modifier = Modifier.height(8.dp))

                    // 进度条颜色也添加动画
                    val progressColor by animateColorAsState(
                        targetValue = getProgressColor(animatedProgress),
                        animationSpec = tween(
                            durationMillis = 300,
                            easing = FastOutSlowInEasing
                        ),
                        label = "progress_color_animation"
                    )

                    LinearProgressIndicator(
                        progress = { animatedProgress.coerceIn(0f, 1f) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = progressColor,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${(animatedProgress * 100).toInt()}% 完成",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * 层级指示器 - 垂直彩色线条
 */
@Composable
private fun LevelIndicator(
    level: Int,
    modifier: Modifier = Modifier
) {
    val color = when (level) {
        1 -> HierarchyStyle.LevelIndicator1
        2 -> HierarchyStyle.LevelIndicator2
        3 -> HierarchyStyle.LevelIndicator3
        else -> HierarchyStyle.LevelIndicator3
    }

    Box(
        modifier = modifier
            .width(4.dp)
            .height(32.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(color)
    )
}

/**
 * 优先级指示点
 * Phase 4: 添加高优先级脉冲效果
 */
@Composable
private fun PriorityIndicator(
    priority: TaskPriority?,
    isCompleted: Boolean = false,
    modifier: Modifier = Modifier
) {
    // 已完成任务使用绿色底色，否则根据优先级显示
    val color = if (isCompleted) {
        HierarchyStyle.StatusCompleted
    } else {
        when (priority) {
            TaskPriority.HIGH -> HierarchyStyle.PriorityHigh
            TaskPriority.MEDIUM -> HierarchyStyle.PriorityMedium
            TaskPriority.LOW -> HierarchyStyle.PriorityLow
            null -> Color.Gray
        }
    }

    // Phase 4: 高优先级脉冲动画（已完成任务不脉冲）
    val scale by animateFloatAsState(
        targetValue = if (priority == TaskPriority.HIGH && !isCompleted) 1.2f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "priority_pulse"
    )

    Box(
        modifier = modifier
            .size(8.dp)
            .scale(scale)
            .clip(CircleShape)
            .background(color)
    )
}

/**
 * 子任务计数徽章
 * Phase 4: 添加完成状态动画效果
 */
@Composable
fun SubtaskBadge(
    completed: Int,
    total: Int,
    modifier: Modifier = Modifier
) {
    val isAllCompleted = completed == total && total > 0

    // Phase 4: 完成状态动画
    val badgeScale by animateFloatAsState(
        targetValue = if (isAllCompleted) 1.1f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "badge_scale"
    )

    val backgroundColor by animateColorAsState(
        targetValue = if (isAllCompleted)
            HierarchyStyle.StatusCompleted.copy(alpha = 0.15f)
        else
            MaterialTheme.colorScheme.primaryContainer,
        animationSpec = tween(
            durationMillis = 300,
            easing = FastOutSlowInEasing
        ),
        label = "badge_background"
    )

    val textColor by animateColorAsState(
        targetValue = if (isAllCompleted)
            HierarchyStyle.StatusCompleted
        else
            MaterialTheme.colorScheme.onPrimaryContainer,
        animationSpec = tween(
            durationMillis = 300,
            easing = FastOutSlowInEasing
        ),
        label = "badge_text_color"
    )

    Surface(
        modifier = modifier.scale(badgeScale),
        shape = RoundedCornerShape(12.dp),
        color = backgroundColor,
        shadowElevation = if (isAllCompleted) 2.dp else 0.dp
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (isAllCompleted) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "全部完成",
                    tint = textColor,
                    modifier = Modifier.size(12.dp)
                )
            }
            Text(
                text = "$completed/$total",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = HierarchyStyle.FontSizeCaption,
                    fontWeight = FontWeight.Bold
                ),
                color = textColor
            )
        }
    }
}

/**
 * 获取进度条颜色
 */
private fun getProgressColor(progress: Float): Color {
    return when {
        progress >= 1.0f -> HierarchyStyle.StatusCompleted
        progress >= 0.5f -> HierarchyStyle.StatusInProgress
        else -> HierarchyStyle.PriorityMedium
    }
}

/**
 * 可展开的层级任务项（包含子任务）
 */
@Composable
fun ExpandableHierarchicalTaskItem(
    task: Task,
    children: List<Task> = emptyList(),
    isExpanded: Boolean = false,
    isLoading: Boolean = false,
    expandedTaskIds: Set<Int> = emptySet(),
    completedSubtasks: Int = 0,
    completionProgress: Float = 0f,
    onExpandClick: (Int) -> Unit,
    onTaskClick: (Int) -> Unit,
    onStatusChange: (Int, Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        // 父任务
        HierarchicalTaskItem(
            task = task,
            isExpanded = isExpanded,
            isLoading = isLoading,
            completedSubtasks = completedSubtasks,
            completionProgress = completionProgress,
            onExpandClick = { onExpandClick(task.id) },
            onTaskClick = { onTaskClick(task.id) },
            onStatusChange = { isCompleted -> onStatusChange(task.id, isCompleted) }
        )

        // 子任务列表（带动画）
        AnimatedVisibility(
            visible = isExpanded && children.isNotEmpty(),
            enter = expandVertically(
                animationSpec = tween(
                    durationMillis = 300,
                    easing = FastOutSlowInEasing
                )
            ) + fadeIn(
                animationSpec = tween(
                    durationMillis = 200,
                    delayMillis = 50
                )
            ),
            exit = shrinkVertically(
                animationSpec = tween(
                    durationMillis = 250,
                    easing = FastOutSlowInEasing
                )
            ) + fadeOut(
                animationSpec = tween(
                    durationMillis = 150
                )
            )
        ) {
            Column {
                children.forEach { childTask ->
                    val childExpanded = expandedTaskIds.contains(childTask.id)

                    HierarchicalTaskItem(
                        task = childTask,
                        isExpanded = childExpanded,
                        onExpandClick = { onExpandClick(childTask.id) },
                        onTaskClick = { onTaskClick(childTask.id) },
                        onStatusChange = { isCompleted -> onStatusChange(childTask.id, isCompleted) },
                        modifier = Modifier.padding(top = HierarchyStyle.CardSpacing)
                    )
                }
            }
        }
    }
}

/**
 * 格式化日期时间为友好显示
 */
private fun formatDateTime(dateTimeStr: String): String {
    return try {
        // 解析ISO 8601格式的日期时间
        val instant = java.time.Instant.parse(dateTimeStr)
        val zonedDateTime = instant.atZone(java.time.ZoneId.systemDefault())
        val now = java.time.ZonedDateTime.now()

        val duration = java.time.Duration.between(zonedDateTime, now)

        when {
            duration.toDays() == 0L -> {
                val hours = duration.toHours()
                val minutes = duration.toMinutes()
                when {
                    hours == 0L && minutes < 1 -> "刚刚"
                    hours == 0L -> "${minutes}分钟前"
                    hours < 24 -> "${hours}小时前"
                    else -> "今天"
                }
            }
            duration.toDays() == 1L -> "昨天"
            duration.toDays() < 7 -> "${duration.toDays()}天前"
            duration.toDays() < 30 -> "${duration.toDays() / 7}周前"
            duration.toDays() < 365 -> "${duration.toDays() / 30}个月前"
            else -> {
                val formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd")
                zonedDateTime.format(formatter)
            }
        }
    } catch (e: Exception) {
        // 如果解析失败，返回原始字符串的前10个字符（日期部分）
        dateTimeStr.take(10)
    }
}

/**
 * 层级展示设计系统常量
 */
object HierarchyStyle {
    // 间距和尺寸
    val CardSpacing = 8.dp
    val CardPadding = 16.dp
    val CardElevation = 2.dp

    // 缩进尺寸
    val IndentPerLevel = 24.dp

    // 图标尺寸
    val IconSizeSmall = 16.dp
    val IconSizeMedium = 24.dp
    val IconSizeLarge = 32.dp

    // 字体大小
    val FontSizeTitle = 16.sp
    val FontSizeSubtitle = 14.sp
    val FontSizeCaption = 12.sp

    // 优先级颜色
    val PriorityHigh = Color(0xFFEF5350)
    val PriorityMedium = Color(0xFFFFA726)
    val PriorityLow = Color(0xFF66BB6A)

    // 状态颜色
    val StatusTodo = Color(0xFF90A4AE)
    val StatusInProgress = Color(0xFF42A5F5)
    val StatusCompleted = Color(0xFF66BB6A)

    // 层级指示器颜色
    val LevelIndicator1 = Color(0xFF1976D2)
    val LevelIndicator2 = Color(0xFF0288D1)
    val LevelIndicator3 = Color(0xFF0277BD)
}
