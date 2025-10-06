package com.aiproj.mobile.ui.screens.ai.subtask

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubtaskGenerateForm(
    selectedModel: String,
    onModelChange: (String) -> Unit,
    subtaskCount: Int,
    onCountChange: (Int) -> Unit,
    customPrompt: String,
    onPromptChange: (String) -> Unit,
    includeEstimates: Boolean,
    onToggleEstimates: () -> Unit,
    onGenerate: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // AI模型选择
        Text(
            text = "AI模型",
            style = MaterialTheme.typography.titleMedium
        )

        var expanded by remember { mutableStateOf(false) }
        val models = listOf("gpt-4o", "deepseek-chat", "claude-3-sonnet")

        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded }
        ) {
            OutlinedTextField(
                value = selectedModel,
                onValueChange = {},
                readOnly = true,
                label = { Text("选择模型") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor()
            )

            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                models.forEach { model ->
                    DropdownMenuItem(
                        text = { Text(model) },
                        onClick = {
                            onModelChange(model)
                            expanded = false
                        }
                    )
                }
            }
        }

        HorizontalDivider()

        // 子任务数量
        Text(
            text = "子任务数量",
            style = MaterialTheme.typography.titleMedium
        )

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "数量: $subtaskCount",
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    text = "(1-10)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Slider(
                value = subtaskCount.toFloat(),
                onValueChange = { onCountChange(it.toInt()) },
                valueRange = 1f..10f,
                steps = 8,
                modifier = Modifier.fillMaxWidth()
            )
        }

        HorizontalDivider()

        // 自定义提示词
        Text(
            text = "自定义提示词（可选）",
            style = MaterialTheme.typography.titleMedium
        )

        OutlinedTextField(
            value = customPrompt,
            onValueChange = onPromptChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            placeholder = { Text("输入自定义提示词，例如：重点关注性能优化和测试覆盖...") },
            maxLines = 5
        )

        HorizontalDivider()

        // 生成选项
        Text(
            text = "生成选项",
            style = MaterialTheme.typography.titleMedium
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = includeEstimates,
                onCheckedChange = { onToggleEstimates() }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text("包含工时估算")
                Text(
                    text = "为每个子任务生成预计工时",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 生成按钮
        Button(
            onClick = onGenerate,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        ) {
            Text(
                text = "🤖 开始生成子任务",
                style = MaterialTheme.typography.titleMedium
            )
        }

        // 提示信息
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "💡 提示",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "• AI将根据父任务的标题和描述生成子任务\n" +
                            "• 生成的子任务将包含标题、描述和优先级\n" +
                            "• 可以在预览后选择性创建或重新生成",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}
