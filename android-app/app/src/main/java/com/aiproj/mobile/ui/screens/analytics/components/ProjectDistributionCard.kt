package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.ProjectTimeData

/**
 * 项目时间分布卡片
 */
@Composable
fun ProjectDistributionCard(
    projects: List<ProjectTimeData>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // 标题
            Text(
                text = "📂 项目分布",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (projects.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    projects.forEach { project ->
                        ProjectTimeItem(project)
                    }
                }
            } else {
                EmptyState(message = "暂无项目数据")
            }
        }
    }
}

@Composable
private fun ProjectTimeItem(project: ProjectTimeData) {
    Column {
        // 项目名称和时长
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = project.projectName,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            Text(
                text = String.format("%.1fh (%.0f%%)", project.hours, project.percentage * 100),
                style = MaterialTheme.typography.bodyMedium,
                color = project.color
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 进度条
        LinearProgressIndicator(
            progress = { project.percentage },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp),
            color = project.color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )
    }
}
