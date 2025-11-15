package com.aiproj.mobile.ui.components.requirement

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.*
import java.util.Date

/**
 * 需求列表项组件
 *
 * 显示需求的关键信息，包括：
 * - 优先级颜色条
 * - 标题和状态徽章
 * - 类别图标
 * - 描述预览
 * - 提交者信息
 * - 关联任务和评论数量
 * - 时间信息
 *
 * @param requirement 需求数据
 * @param onClick 点击回调
 * @param onLongClick 长按回调
 * @param modifier 修饰符
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun RequirementListItem(
    requirement: Requirement,
    onClick: () -> Unit,
    onLongClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 优先级颜色条
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(72.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(getPriorityColor(requirement.priority))
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                // 标题行：类别图标 + 标题 + 状态徽章
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 类别图标
                    Icon(
                        imageVector = getCategoryIcon(requirement.category),
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = getCategoryColor(requirement.category)
                    )

                    // 标题
                    Text(
                        text = requirement.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )

                    // 状态徽章
                    RequirementStatusBadge(
                        status = requirement.status,
                        modifier = Modifier.wrapContentSize()
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // 优先级徽章和复杂度评级
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RequirementPriorityBadge(priority = requirement.priority)

                    // 复杂度评级（如果有）
                    requirement.complexityRating?.let { complexity ->
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = MaterialTheme.colorScheme.tertiaryContainer
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Assessment,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                                Text(
                                    text = getComplexityText(complexity),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                            }
                        }
                    }
                }

                // 描述预览
                if (!requirement.description.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = requirement.description.take(120).replace("\n", " "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // 底部信息行
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // 提交者
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = requirement.submitterName ?: "未知",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    // 时间
                    Text(
                        text = formatRelativeTime(requirement.createdAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.weight(1f))

                    // 关联任务数量
                    if (requirement.relatedTasksCount > 0) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Link,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = requirement.relatedTasksCount.toString(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // 评论数量
                    if (requirement.commentsCount > 0) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Comment,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = requirement.commentsCount.toString(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // 项目ID
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Text(
                            text = "#${requirement.projectId}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 根据优先级返回对应的颜色
 */
private fun getPriorityColor(priority: RequirementPriority): Color = when (priority) {
    RequirementPriority.URGENT -> Color(0xFFF44336)   // 红色
    RequirementPriority.HIGH -> Color(0xFFFF9800)     // 橙色
    RequirementPriority.MEDIUM -> Color(0xFF2196F3)   // 蓝色
    RequirementPriority.LOW -> Color(0xFF9E9E9E)      // 灰色
}

/**
 * 根据类别返回对应的图标
 */
private fun getCategoryIcon(category: RequirementCategory?): ImageVector = when (category) {
    RequirementCategory.FEATURE -> Icons.Default.StarRate
    RequirementCategory.BUG -> Icons.Default.BugReport
    RequirementCategory.IMPROVEMENT -> Icons.Default.TrendingUp
    RequirementCategory.DOCUMENTATION -> Icons.Default.Description
    RequirementCategory.OTHER -> Icons.Default.MoreHoriz
    null -> Icons.Default.MoreHoriz  // 默认图标
}

/**
 * 根据类别返回对应的颜色
 */
private fun getCategoryColor(category: RequirementCategory?): Color = when (category) {
    RequirementCategory.FEATURE -> Color(0xFF4CAF50)      // 绿色
    RequirementCategory.BUG -> Color(0xFFF44336)          // 红色
    RequirementCategory.IMPROVEMENT -> Color(0xFF2196F3)  // 蓝色
    RequirementCategory.DOCUMENTATION -> Color(0xFF9C27B0) // 紫色
    RequirementCategory.OTHER -> Color(0xFF757575)        // 灰色
    null -> Color(0xFF9E9E9E)  // 默认灰色
}

/**
 * 获取复杂度文本
 */
private fun getComplexityText(complexity: ComplexityRating): String = when (complexity) {
    ComplexityRating.SIMPLE -> "简单"
    ComplexityRating.MEDIUM -> "中等"
    ComplexityRating.COMPLEX -> "复杂"
    ComplexityRating.VERY_COMPLEX -> "非常复杂"
}

/**
 * 格式化相对时间
 */
private fun formatRelativeTime(date: Date?): String {
    if (date == null) return "未知"

    val now = System.currentTimeMillis()
    val diff = now - date.time

    return when {
        diff < 60_000 -> "刚刚"
        diff < 3_600_000 -> "${diff / 60_000}分钟前"
        diff < 86_400_000 -> "${diff / 3_600_000}小时前"
        diff < 604_800_000 -> "${diff / 86_400_000}天前"
        diff < 2_592_000_000 -> "${diff / 604_800_000}周前"
        diff < 31_536_000_000 -> "${diff / 2_592_000_000}个月前"
        else -> "${diff / 31_536_000_000}年前"
    }
}

// ============================================================
// 预览函数
// ============================================================

/**
 * 功能需求预览
 */
@Preview(showBackground = true)
@Composable
private fun RequirementListItemFeaturePreview() {
    MaterialTheme {
        RequirementListItem(
            requirement = Requirement(
                id = 3662,
                projectId = 34,
                title = "实现需求管理列表页面",
                description = "需要实现一个支持分页、筛选、搜索的需求管理列表页面，包括需求状态、优先级、类别等信息的展示。",
                status = RequirementStatus.PENDING,
                priority = RequirementPriority.HIGH,
                category = RequirementCategory.FEATURE,
                submitterId = 1,
                submitterName = "张三",
                reviewerId = null,
                reviewerName = null,
                reviewComment = null,
                complexityRating = ComplexityRating.MEDIUM,
                businessValue = 8,
                technicalRisk = null,
                acceptanceCriteria = null,
                relatedTasksCount = 3,
                commentsCount = 5,
                createdAt = Date(System.currentTimeMillis() - 7200000), // 2小时前
                updatedAt = Date(),
                submittedAt = Date(),
                reviewedAt = null
            ),
            onClick = {},
            onLongClick = {},
            modifier = Modifier.padding(8.dp)
        )
    }
}

/**
 * Bug需求预览
 */
@Preview(showBackground = true)
@Composable
private fun RequirementListItemBugPreview() {
    MaterialTheme {
        RequirementListItem(
            requirement = Requirement(
                id = 3663,
                projectId = 34,
                title = "修复列表页面滚动卡顿问题",
                description = "在Android设备上，列表页面快速滚动时出现明显卡顿，需要优化性能。",
                status = RequirementStatus.REVIEWING,
                priority = RequirementPriority.URGENT,
                category = RequirementCategory.BUG,
                submitterId = 2,
                submitterName = "李四",
                reviewerId = 1,
                reviewerName = "张三",
                reviewComment = null,
                complexityRating = ComplexityRating.COMPLEX,
                businessValue = 5,
                technicalRisk = null,
                acceptanceCriteria = null,
                relatedTasksCount = 1,
                commentsCount = 12,
                createdAt = Date(System.currentTimeMillis() - 86400000), // 1天前
                updatedAt = Date(),
                submittedAt = Date(),
                reviewedAt = null
            ),
            onClick = {},
            onLongClick = {},
            modifier = Modifier.padding(8.dp)
        )
    }
}

/**
 * 改进需求预览
 */
@Preview(showBackground = true)
@Composable
private fun RequirementListItemImprovementPreview() {
    MaterialTheme {
        RequirementListItem(
            requirement = Requirement(
                id = 3664,
                projectId = 34,
                title = "优化用户体验和交互流程",
                description = null,
                status = RequirementStatus.APPROVED,
                priority = RequirementPriority.MEDIUM,
                category = RequirementCategory.IMPROVEMENT,
                submitterId = 3,
                submitterName = "王五",
                reviewerId = 1,
                reviewerName = "张三",
                reviewComment = "已批准，可以开始实施",
                complexityRating = ComplexityRating.SIMPLE,
                businessValue = 7,
                technicalRisk = null,
                acceptanceCriteria = null,
                relatedTasksCount = 0,
                commentsCount = 0,
                createdAt = Date(System.currentTimeMillis() - 3600000), // 1小时前
                updatedAt = Date(),
                submittedAt = Date(),
                reviewedAt = Date()
            ),
            onClick = {},
            onLongClick = {},
            modifier = Modifier.padding(8.dp)
        )
    }
}

/**
 * 草稿状态预览
 */
@Preview(showBackground = true)
@Composable
private fun RequirementListItemDraftPreview() {
    MaterialTheme {
        RequirementListItem(
            requirement = Requirement(
                id = 3665,
                projectId = 34,
                title = "添加数据导出功能",
                description = "支持将需求数据导出为Excel和PDF格式，方便离线查看和分享。需要支持自定义字段选择。",
                status = RequirementStatus.DRAFT,
                priority = RequirementPriority.LOW,
                category = RequirementCategory.FEATURE,
                submitterId = 1,
                submitterName = "张三",
                reviewerId = null,
                reviewerName = null,
                reviewComment = null,
                complexityRating = null,
                businessValue = null,
                technicalRisk = null,
                acceptanceCriteria = null,
                relatedTasksCount = 0,
                commentsCount = 2,
                createdAt = Date(System.currentTimeMillis() - 300000), // 5分钟前
                updatedAt = Date(),
                submittedAt = null,
                reviewedAt = null
            ),
            onClick = {},
            onLongClick = {},
            modifier = Modifier.padding(8.dp)
        )
    }
}
