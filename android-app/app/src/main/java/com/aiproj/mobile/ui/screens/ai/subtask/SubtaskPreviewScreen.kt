package com.aiproj.mobile.ui.screens.ai.subtask

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.GeneratedSubtask
import com.aiproj.mobile.data.models.SubtaskMetadata

@Composable
fun SubtaskPreviewScreen(
    subtasks: List<GeneratedSubtask>,
    metadata: SubtaskMetadata,
    onCreate: () -> Unit,
    onRegenerate: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // 成功提示
        Surface(
            color = MaterialTheme.colorScheme.primaryContainer,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "✅ 子任务生成成功！",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(16.dp),
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }

        // 子任务列表
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 统计信息
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "📊 生成统计",
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text("• 子任务数量: ${metadata.totalSubtasks}")
                    metadata.estimatedTotalHours?.let { hours ->
                        Text("• 预计总工时: ${hours}小时")
                    }
                    Text("• 分解策略: ${metadata.breakdownLogic}")
                }
            }

            HorizontalDivider()

            // 子任务标题
            Text(
                text = "生成的子任务",
                style = MaterialTheme.typography.titleMedium
            )

            // 子任务卡片列表
            subtasks.forEachIndexed { index, subtask ->
                SubtaskCard(
                    index = index + 1,
                    subtask = subtask
                )
            }
        }

        // 底部按钮
        Surface(
            shadowElevation = 8.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("返回")
                }

                OutlinedButton(
                    onClick = onRegenerate,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("重新生成")
                }

                Button(
                    onClick = onCreate,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("创建全部")
                }
            }
        }
    }
}

/**
 * 子任务卡片
 */
@Composable
private fun SubtaskCard(
    index: Int,
    subtask: GeneratedSubtask
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // 标题和序号
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.primary,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = "$index",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }

                Text(
                    text = subtask.title,
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f)
                )
            }

            // 描述
            if (subtask.description.isNotBlank()) {
                Text(
                    text = subtask.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // 优先级和工时估算
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 优先级标签
                val priorityColor = when (subtask.priority) {
                    "high" -> MaterialTheme.colorScheme.error
                    "medium" -> MaterialTheme.colorScheme.tertiary
                    else -> MaterialTheme.colorScheme.surfaceVariant
                }

                val priorityText = when (subtask.priority) {
                    "high" -> "高优先级"
                    "medium" -> "中优先级"
                    else -> "低优先级"
                }

                Surface(
                    color = priorityColor,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = priorityText,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (subtask.priority == "low") {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onError
                        }
                    )
                }

                // 工时估算
                subtask.estimatedHours?.let { hours ->
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            text = "⏱️ 预计 ${hours}h",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }
            }
        }
    }
}
