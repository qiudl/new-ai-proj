package com.aiproj.mobile.ui.screens.tasks.components

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.tooling.preview.Preview
import com.aiproj.mobile.data.models.Project

/**
 * 项目过滤面板
 *
 * 可展开/收起的项目选择面板，用于快速过滤任务列表
 *
 * @param projects 项目列表
 * @param selectedProjectId 当前选中的项目ID（null表示"全部项目"）
 * @param isExpanded 面板是否展开
 * @param isLoading 是否正在加载
 * @param onProjectSelect 项目选择回调（null表示选择"全部项目"）
 * @param onToggleExpand 展开/收起切换回调
 * @param modifier Modifier
 */
@Composable
fun ProjectFilterPanel(
    projects: List<Project>,
    selectedProjectId: Int?,
    isExpanded: Boolean,
    isLoading: Boolean = false,
    onProjectSelect: (Int?) -> Unit,
    onToggleExpand: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // 头部（始终显示）
        ProjectFilterHeader(
            isExpanded = isExpanded,
            selectedProjectName = remember(selectedProjectId, projects) {
                if (selectedProjectId == null) "全部项目"
                else projects.find { it.id == selectedProjectId }?.name ?: "未知项目"
            },
            onToggleExpand = onToggleExpand
        )

        // 项目列表（可展开/收起）
        AnimatedVisibility(
            visible = isExpanded,
            enter = expandVertically(
                animationSpec = tween(300),
                expandFrom = Alignment.Top
            ) + fadeIn(animationSpec = tween(200)),
            exit = shrinkVertically(
                animationSpec = tween(300),
                shrinkTowards = Alignment.Top
            ) + fadeOut(animationSpec = tween(200))
        ) {
            if (isLoading) {
                ProjectListLoading()
            } else {
                // 构建完整的项目列表（包含"全部项目"选项）
                val allProjects = remember(projects) {
                    listOf(
                        Project(
                            id = 0,
                            name = "全部项目",
                            description = null,
                            status = null,
                            ownerId = null,
                            owner = null,
                            taskCount = projects.sumOf { it.taskCount ?: 0 },
                            memberCount = null,
                            completionRate = null,
                            createdAt = "",
                            updatedAt = ""
                        )
                    ) + projects
                }

                ProjectList(
                    projects = allProjects,
                    selectedProjectId = selectedProjectId,
                    onProjectSelect = onProjectSelect
                )
            }
        }

        // 底部分隔线
        if (isExpanded) {
            HorizontalDivider(
                thickness = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant
            )
        }
    }
}

/**
 * 项目过滤头部组件
 */
@Composable
private fun ProjectFilterHeader(
    isExpanded: Boolean,
    selectedProjectName: String,
    onToggleExpand: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onToggleExpand),
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 左侧：图标 + 文本
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = Icons.Default.FolderOpen,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )

                Spacer(modifier = Modifier.width(8.dp))

                Text(
                    text = selectedProjectName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // 右侧：展开/收起图标
            Icon(
                imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                contentDescription = if (isExpanded) "收起项目过滤" else "展开项目过滤",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

/**
 * 项目列表组件
 */
@Composable
private fun ProjectList(
    projects: List<Project>,
    selectedProjectId: Int?,
    onProjectSelect: (Int?) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(max = 300.dp)
            .background(MaterialTheme.colorScheme.surface),
        contentPadding = PaddingValues(vertical = 8.dp)
    ) {
        items(
            items = projects,
            key = { project -> project.id }
        ) { project ->
            val onClick = remember(project.id, onProjectSelect) {
                { onProjectSelect(if (project.id == 0) null else project.id) }
            }

            ProjectItem(
                project = if (project.id == 0) null else project,
                isSelected = (project.id == 0 && selectedProjectId == null) ||
                            (project.id == selectedProjectId),
                taskCount = project.taskCount,
                onClick = onClick
            )
        }
    }
}

/**
 * 项目列表项组件
 *
 * @param project 项目数据（null表示"全部项目"选项）
 * @param isSelected 是否选中
 * @param taskCount 任务数量
 * @param onClick 点击回调
 */
@Composable
private fun ProjectItem(
    project: Project?,
    isSelected: Boolean,
    taskCount: Int?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        Color.Transparent
    }

    val textColor = if (isSelected) {
        MaterialTheme.colorScheme.onPrimaryContainer
    } else {
        MaterialTheme.colorScheme.onSurface
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(backgroundColor)
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .semantics {
                contentDescription = if (isSelected) {
                    "${project?.name ?: "全部项目"} - 已选中"
                } else {
                    project?.name ?: "全部项目"
                }
                role = Role.RadioButton
            },
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 左侧：项目名称
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            // 选中指示器
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
            } else {
                Spacer(modifier = Modifier.width(28.dp))
            }

            Column {
                Text(
                    text = project?.name ?: "全部项目",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    color = textColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                // 项目描述（仅当有描述时显示）
                project?.description?.let { desc ->
                    if (desc.isNotBlank()) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = desc,
                            style = MaterialTheme.typography.bodySmall,
                            color = textColor.copy(alpha = 0.7f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }

        // 右侧：任务数量
        taskCount?.let { count ->
            Surface(
                shape = MaterialTheme.shapes.small,
                color = if (isSelected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                },
                modifier = Modifier.padding(start = 8.dp)
            ) {
                Text(
                    text = count.toString(),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                    color = if (isSelected) {
                        MaterialTheme.colorScheme.onPrimary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

/**
 * 项目列表加载状态组件
 */
@Composable
private fun ProjectListLoading(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(150.dp)
            .background(MaterialTheme.colorScheme.surface),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(32.dp),
                color = MaterialTheme.colorScheme.primary,
                strokeWidth = 3.dp
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "加载项目中...",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ========================================
// Compose Previews
// ========================================

/**
 * Preview: 收起状态
 */
@Preview(showBackground = true, name = "Collapsed State")
@Composable
private fun ProjectFilterPanelCollapsedPreview() {
    MaterialTheme {
        ProjectFilterPanel(
            projects = createSampleProjects(),
            selectedProjectId = 1,
            isExpanded = false,
            isLoading = false,
            onProjectSelect = {},
            onToggleExpand = {}
        )
    }
}

/**
 * Preview: 展开状态
 */
@Preview(showBackground = true, name = "Expanded State")
@Composable
private fun ProjectFilterPanelExpandedPreview() {
    MaterialTheme {
        ProjectFilterPanel(
            projects = createSampleProjects(),
            selectedProjectId = 2,
            isExpanded = true,
            isLoading = false,
            onProjectSelect = {},
            onToggleExpand = {}
        )
    }
}

/**
 * Preview: 展开状态 - 选中"全部项目"
 */
@Preview(showBackground = true, name = "Expanded - All Projects")
@Composable
private fun ProjectFilterPanelAllProjectsPreview() {
    MaterialTheme {
        ProjectFilterPanel(
            projects = createSampleProjects(),
            selectedProjectId = null,
            isExpanded = true,
            isLoading = false,
            onProjectSelect = {},
            onToggleExpand = {}
        )
    }
}

/**
 * Preview: 加载中状态
 */
@Preview(showBackground = true, name = "Loading State")
@Composable
private fun ProjectFilterPanelLoadingPreview() {
    MaterialTheme {
        ProjectFilterPanel(
            projects = emptyList(),
            selectedProjectId = null,
            isExpanded = true,
            isLoading = true,
            onProjectSelect = {},
            onToggleExpand = {}
        )
    }
}

/**
 * Preview: 空状态
 */
@Preview(showBackground = true, name = "Empty State")
@Composable
private fun ProjectFilterPanelEmptyPreview() {
    MaterialTheme {
        ProjectFilterPanel(
            projects = emptyList(),
            selectedProjectId = null,
            isExpanded = true,
            isLoading = false,
            onProjectSelect = {},
            onToggleExpand = {}
        )
    }
}

/**
 * Preview: 单个项目Item - 未选中
 */
@Preview(showBackground = true, name = "Project Item - Not Selected")
@Composable
private fun ProjectItemPreview() {
    MaterialTheme {
        ProjectItem(
            project = Project(
                id = 1,
                name = "AI项目管理系统",
                description = "一个智能的项目管理平台",
                status = null,
                ownerId = null,
                owner = null,
                taskCount = 42,
                memberCount = 5,
                completionRate = null,
                createdAt = "",
                updatedAt = ""
            ),
            isSelected = false,
            taskCount = 42,
            onClick = {}
        )
    }
}

/**
 * Preview: 单个项目Item - 已选中
 */
@Preview(showBackground = true, name = "Project Item - Selected")
@Composable
private fun ProjectItemSelectedPreview() {
    MaterialTheme {
        ProjectItem(
            project = Project(
                id = 2,
                name = "移动端开发",
                description = "Android和iOS应用开发",
                status = null,
                ownerId = null,
                owner = null,
                taskCount = 28,
                memberCount = 3,
                completionRate = null,
                createdAt = "",
                updatedAt = ""
            ),
            isSelected = true,
            taskCount = 28,
            onClick = {}
        )
    }
}

/**
 * Preview: "全部项目"选项
 */
@Preview(showBackground = true, name = "All Projects Item")
@Composable
private fun AllProjectsItemPreview() {
    MaterialTheme {
        ProjectItem(
            project = null,
            isSelected = true,
            taskCount = 156,
            onClick = {}
        )
    }
}

/**
 * 创建示例项目数据（用于Preview）
 */
private fun createSampleProjects(): List<Project> {
    return listOf(
        Project(
            id = 1,
            name = "AI项目管理系统",
            description = "一个智能的项目管理平台",
            status = null,
            ownerId = null,
            owner = null,
            taskCount = 42,
            memberCount = 5,
            completionRate = null,
            createdAt = "2024-01-01T00:00:00Z",
            updatedAt = "2024-06-01T00:00:00Z"
        ),
        Project(
            id = 2,
            name = "移动端开发",
            description = "Android和iOS应用开发",
            status = null,
            ownerId = null,
            owner = null,
            taskCount = 28,
            memberCount = 3,
            completionRate = null,
            createdAt = "2024-02-01T00:00:00Z",
            updatedAt = "2024-05-15T00:00:00Z"
        ),
        Project(
            id = 3,
            name = "后端API服务",
            description = null,
            status = null,
            ownerId = null,
            owner = null,
            taskCount = 35,
            memberCount = 4,
            completionRate = null,
            createdAt = "2024-03-01T00:00:00Z",
            updatedAt = "2024-05-20T00:00:00Z"
        ),
        Project(
            id = 4,
            name = "数据分析平台",
            description = "大数据分析和可视化",
            status = null,
            ownerId = null,
            owner = null,
            taskCount = 51,
            memberCount = 6,
            completionRate = null,
            createdAt = "2024-01-15T00:00:00Z",
            updatedAt = "2024-06-03T00:00:00Z"
        )
    )
}
