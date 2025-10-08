package com.aiproj.mobile.ui.screens.ai.description

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DescriptionGenerateForm(
    selectedModel: String,
    onModelChange: (String) -> Unit,
    selectedLength: String,
    onLengthChange: (String) -> Unit,
    selectedStyle: String,
    onStyleChange: (String) -> Unit,
    customPrompt: String,
    onPromptChange: (String) -> Unit,
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

        // 描述长度选择
        Text(
            text = "描述长度",
            style = MaterialTheme.typography.titleMedium
        )

        val lengthOptions = listOf(
            "short" to "简短 (50-100字)",
            "medium" to "中等 (100-200字)",
            "long" to "详细 (200-500字)"
        )

        lengthOptions.forEach { (value, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = selectedLength == value,
                        onClick = { onLengthChange(value) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = selectedLength == value,
                    onClick = null
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = label)
            }
        }

        HorizontalDivider()

        // 描述风格选择
        Text(
            text = "描述风格",
            style = MaterialTheme.typography.titleMedium
        )

        val styleOptions = listOf(
            "technical" to "技术风格 (专业、详细)",
            "business" to "商务风格 (简洁、正式)",
            "casual" to "轻松风格 (通俗易懂)"
        )

        styleOptions.forEach { (value, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = selectedStyle == value,
                        onClick = { onStyleChange(value) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = selectedStyle == value,
                    onClick = null
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = label)
            }
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
                .height(120.dp)
                .testTag("customPromptInput"),
            placeholder = { Text("输入自定义提示词，例如：重点描述技术实现细节和预期效果...") },
            maxLines = 5
        )

        Spacer(modifier = Modifier.height(16.dp))

        // 生成按钮
        Button(
            onClick = onGenerate,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        ) {
            Text(
                text = "🤖 开始生成描述",
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
                    text = "• AI将根据任务标题生成合适的描述\n" +
                            "• 可选择不同长度和风格以适应需求\n" +
                            "• 生成后可以预览并决定是否应用",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}
