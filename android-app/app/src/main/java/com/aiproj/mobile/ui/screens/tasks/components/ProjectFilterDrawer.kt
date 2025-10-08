package com.aiproj.mobile.ui.screens.tasks.components

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
import androidx.compose.ui.tooling.preview.Preview
import com.aiproj.mobile.data.models.Project

/**
 * 项目过滤侧边抽屉组件
 *
 * Material Design 3 侧边抽屉，用于项目筛选
 * 遵循设计规范：280dp宽度，支持手势关闭
 *
 * @param projects 项目列表
 * @param selectedProjectId 当前选中的项目ID（null表示"全部项目"）
 * @param isLoading 是否正在加载
 * @param onProjectSelect 项目选择回调（null表示选择"全部项目"）
 * @param onCreateProject 创建项目回调
 * @param onClose 关闭抽屉回调
 * @param modifier Modifier
 */
@Composable
fun ProjectFilterDrawer(
    projects: List<Project>,
    selectedProjectId: Int?,
    isLoading: Boolean = false,
    onProjectSelect: (Int?) -> Unit,
    onCreateProject: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .width(280.dp)
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // 抽屉头部
        DrawerHeader(onClose = onClose)

        HorizontalDivider(
            thickness = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant
        )

        if (isLoading) {
            // 加载状态
            DrawerLoadingState()
        } else {
            // 项目列表内容
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                // "全部项目"选项
                item {
                    val totalTaskCount = remember(projects) {
                        projects.sumOf { it.taskCount ?: 0 }
                    }

                    ProjectDrawerItem(
                        project = null,
                        taskCount = totalTaskCount,
                        isSelected = selectedProjectId == null,
                        onClick = {
                            onProjectSelect(null)
                            onClose()
                        }
                    )
                }

                // 项目列表
                items(
                    items = projects,
                    key = { project -> project.id }
                ) { project ->
                    ProjectDrawerItem(
                        project = project,
                        taskCount = project.taskCount,
                        isSelected = selectedProjectId == project.id,
                        onClick = {
                            onProjectSelect(project.id)
                            onClose()
                        }
                    )
                }
            }

            HorizontalDivider(
                thickness = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant
            )

            // 创建项目按钮
            CreateProjectButton(
                onClick = {
                    onCreateProject()
                    onClose()
                }
            )
        }
    }
}

/**
 * 抽屉头部组件
 */
@Composable
private fun DrawerHeader(
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "项目筛选",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        IconButton(
            onClick = onClose,
            modifier = Modifier.size(40.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "关闭",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 项目抽屉列表项组件
 *
 * @param project 项目数据（null表示"全部项目"选项）
 * @param taskCount 任务数量
 * @param isSelected 是否选中
 * @param onClick 点击回调
 */
@Composable
private fun ProjectDrawerItem(
    project: Project?,
    taskCount: Int?,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.secondaryContainer
    } else {
        Color.Transparent
    }

    val textColor = if (isSelected) {
        MaterialTheme.colorScheme.onSecondaryContainer
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
        // 左侧：单选按钮图标 + 项目信息
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            // 单选按钮图标
            Icon(
                imageVector = if (isSelected) {
                    Icons.Default.CheckCircle
                } else {
                    Icons.Default.RadioButtonUnchecked
                },
                contentDescription = null,
                tint = if (isSelected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                modifier = Modifier.size(20.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

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

        // 右侧：任务数量徽章
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
 * 创建项目按钮组件
 */
@Composable
private fun CreateProjectButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.primaryContainer
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(20.dp)
            )

            Spacer(modifier = Modifier.width(8.dp))

            Text(
                text = "创建新项目",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

/**
 * 抽屉加载状态组件
 */
@Composable
private fun DrawerLoadingState(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .fillMaxHeight()
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
 * Preview: 抽屉正常状态
 */
@Preview(showBackground = true, name = "Drawer - Normal State")
@Composable
private fun ProjectFilterDrawerPreview() {
    MaterialTheme {
        ProjectFilterDrawer(
            projects = createSampleProjects(),
            selectedProjectId = 2,
            isLoading = false,
            onProjectSelect = {},
            onCreateProject = {},
            onClose = {}
        )
    }
}

/**
 * Preview: 抽屉选中"全部项目"
 */
@Preview(showBackground = true, name = "Drawer - All Projects Selected")
@Composable
private fun ProjectFilterDrawerAllProjectsPreview() {
    MaterialTheme {
        ProjectFilterDrawer(
            projects = createSampleProjects(),
            selectedProjectId = null,
            isLoading = false,
            onProjectSelect = {},
            onCreateProject = {},
            onClose = {}
        )
    }
}

/**
 * Preview: 抽屉加载状态
 */
@Preview(showBackground = true, name = "Drawer - Loading State")
@Composable
private fun ProjectFilterDrawerLoadingPreview() {
    MaterialTheme {
        ProjectFilterDrawer(
            projects = emptyList(),
            selectedProjectId = null,
            isLoading = true,
            onProjectSelect = {},
            onCreateProject = {},
            onClose = {}
        )
    }
}

/**
 * Preview: 单个项目Item - 已选中
 */
@Preview(showBackground = true, name = "Drawer Item - Selected", widthDp = 280)
@Composable
private fun ProjectDrawerItemSelectedPreview() {
    MaterialTheme {
        ProjectDrawerItem(
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
            taskCount = 42,
            isSelected = true,
            onClick = {}
        )
    }
}

/**
 * Preview: 单个项目Item - 未选中
 */
@Preview(showBackground = true, name = "Drawer Item - Not Selected", widthDp = 280)
@Composable
private fun ProjectDrawerItemNotSelectedPreview() {
    MaterialTheme {
        ProjectDrawerItem(
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
            taskCount = 28,
            isSelected = false,
            onClick = {}
        )
    }
}

/**
 * Preview: "全部项目"Item
 */
@Preview(showBackground = true, name = "All Projects Item", widthDp = 280)
@Composable
private fun AllProjectsItemPreview() {
    MaterialTheme {
        ProjectDrawerItem(
            project = null,
            taskCount = 156,
            isSelected = true,
            onClick = {}
        )
    }
}

/**
 * Preview: 创建项目按钮
 */
@Preview(showBackground = true, name = "Create Project Button", widthDp = 280)
@Composable
private fun CreateProjectButtonPreview() {
    MaterialTheme {
        CreateProjectButton(onClick = {})
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
