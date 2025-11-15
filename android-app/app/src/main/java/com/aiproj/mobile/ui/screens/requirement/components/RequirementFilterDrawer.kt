package com.aiproj.mobile.ui.screens.requirement.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
 * 需求筛选侧边抽屉组件
 *
 * Material Design 3 侧边抽屉，用于项目和客户筛选
 * 支持按项目和客户(公司)两个维度筛选需求
 *
 * @param projects 项目列表
 * @param selectedProjectId 当前选中的项目ID（null表示"全部项目"）
 * @param selectedCompanyName 当前选中的客户名称（null表示"全部客户"）
 * @param isLoading 是否正在加载
 * @param onProjectSelect 项目选择回调（null表示选择"全部项目"）
 * @param onCompanySelect 客户选择回调（null表示选择"全部客户"）
 * @param onClose 关闭抽屉回调
 * @param modifier Modifier
 */
@Composable
fun RequirementFilterDrawer(
    projects: List<Project>,
    selectedProjectId: Int?,
    selectedCompanyName: String?,
    isLoading: Boolean = false,
    onProjectSelect: (Int?) -> Unit,
    onCompanySelect: (String?) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    // 提取唯一的客户列表
    val companies = remember(projects) {
        projects
            .mapNotNull { it.companyName }
            .distinct()
            .sorted()
    }

    var selectedTab by remember { mutableStateOf(0) }

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

        // Tab切换（项目/客户）
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.primary
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("按项目") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("按客户") }
            )
        }

        if (isLoading) {
            // 加载状态
            DrawerLoadingState()
        } else {
            // 根据选中的Tab显示不同内容
            when (selectedTab) {
                0 -> ProjectFilterContent(
                    projects = projects,
                    selectedProjectId = selectedProjectId,
                    onProjectSelect = onProjectSelect,
                    onClose = onClose
                )
                1 -> CompanyFilterContent(
                    companies = companies,
                    selectedCompanyName = selectedCompanyName,
                    onCompanySelect = onCompanySelect,
                    onClose = onClose
                )
            }
        }
    }
}

/**
 * 项目筛选内容
 */
@Composable
private fun ProjectFilterContent(
    projects: List<Project>,
    selectedProjectId: Int?,
    onProjectSelect: (Int?) -> Unit,
    onClose: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp)
    ) {
        // "全部项目"选项
        item {
            val totalCount = remember(projects) {
                // 假设每个项目的需求数量，实际应该从API获取
                projects.size
            }

            FilterDrawerItem(
                title = "全部项目",
                count = totalCount,
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
            FilterDrawerItem(
                title = project.name,
                subtitle = project.description,
                count = null, // 需求数量需要从后端获取
                isSelected = selectedProjectId == project.id,
                onClick = {
                    onProjectSelect(project.id)
                    onClose()
                }
            )
        }
    }
}

/**
 * 客户筛选内容
 */
@Composable
private fun CompanyFilterContent(
    companies: List<String>,
    selectedCompanyName: String?,
    onCompanySelect: (String?) -> Unit,
    onClose: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp)
    ) {
        // "全部客户"选项
        item {
            FilterDrawerItem(
                title = "全部客户",
                count = companies.size,
                isSelected = selectedCompanyName == null,
                onClick = {
                    onCompanySelect(null)
                    onClose()
                }
            )
        }

        // 客户列表
        items(
            items = companies,
            key = { company -> company }
        ) { companyName ->
            FilterDrawerItem(
                title = companyName,
                count = null,
                isSelected = selectedCompanyName == companyName,
                onClick = {
                    onCompanySelect(companyName)
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
            text = "需求筛选",
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
 * 通用筛选项组件
 *
 * @param title 标题
 * @param subtitle 副标题（可选）
 * @param count 数量徽章（可选）
 * @param isSelected 是否选中
 * @param onClick 点击回调
 */
@Composable
private fun FilterDrawerItem(
    title: String,
    subtitle: String? = null,
    count: Int? = null,
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
                    "$title - 已选中"
                } else {
                    title
                }
                role = Role.RadioButton
            },
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 左侧：单选按钮图标 + 信息
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
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    color = textColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                // 副标题（仅当有副标题时显示）
                subtitle?.let { desc ->
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

        // 右侧：数量徽章
        count?.let { itemCount ->
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
                    text = itemCount.toString(),
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
                text = "加载中...",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ========================================
// Compose Previews
// ========================================

@Preview(showBackground = true, name = "需求筛选抽屉 - 项目Tab")
@Composable
private fun RequirementFilterDrawerProjectTabPreview() {
    MaterialTheme {
        RequirementFilterDrawer(
            projects = createSampleProjects(),
            selectedProjectId = 2,
            selectedCompanyName = null,
            isLoading = false,
            onProjectSelect = {},
            onCompanySelect = {},
            onClose = {}
        )
    }
}

@Preview(showBackground = true, name = "需求筛选抽屉 - 客户Tab")
@Composable
private fun RequirementFilterDrawerCompanyTabPreview() {
    MaterialTheme {
        var selectedTab by remember { mutableStateOf(1) }
        RequirementFilterDrawer(
            projects = createSampleProjects(),
            selectedProjectId = null,
            selectedCompanyName = "科技公司A",
            isLoading = false,
            onProjectSelect = {},
            onCompanySelect = {},
            onClose = {}
        )
    }
}

@Preview(showBackground = true, name = "需求筛选抽屉 - 加载状态")
@Composable
private fun RequirementFilterDrawerLoadingPreview() {
    MaterialTheme {
        RequirementFilterDrawer(
            projects = emptyList(),
            selectedProjectId = null,
            selectedCompanyName = null,
            isLoading = true,
            onProjectSelect = {},
            onCompanySelect = {},
            onClose = {}
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
            companyId = 1,
            companyName = "科技公司A",
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
            companyId = 2,
            companyName = "科技公司B",
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
            companyId = 1,
            companyName = "科技公司A",
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
            companyId = 3,
            companyName = "科技公司C",
            createdAt = "2024-01-15T00:00:00Z",
            updatedAt = "2024-06-03T00:00:00Z"
        )
    )
}
