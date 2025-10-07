package com.aiproj.mobile.ui.screens.ai.document

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
import com.aiproj.mobile.data.models.AIDocumentType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentGenerateForm(
    documentTypes: List<AIDocumentType>,
    selectedDocType: String,
    onDocTypeChange: (String) -> Unit,
    selectedModel: String,
    onModelChange: (String) -> Unit,
    customPrompt: String,
    onPromptChange: (String) -> Unit,
    includeSubtasks: Boolean,
    onToggleSubtasks: () -> Unit,
    includeCodeExamples: Boolean,
    onToggleCodeExamples: () -> Unit,
    onGenerate: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // 文档类型选择
        Text(
            text = "选择文档类型",
            style = MaterialTheme.typography.titleMedium
        )

        documentTypes.forEach { docType ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = selectedDocType == docType.type,
                        onClick = { onDocTypeChange(docType.type) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = selectedDocType == docType.type,
                    onClick = null
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = docType.name,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = docType.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        HorizontalDivider()

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
                .testTag("customRequirementsInput"),
            placeholder = { Text("输入自定义提示词，例如：重点关注性能优化和安全方面...") },
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
                checked = includeSubtasks,
                onCheckedChange = { onToggleSubtasks() }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("包含子任务信息")
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = includeCodeExamples,
                onCheckedChange = { onToggleCodeExamples() }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("包含代码示例")
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 生成按钮
        Button(
            onClick = onGenerate,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            enabled = selectedDocType.isNotEmpty()
        ) {
            Text(
                text = "🤖 开始生成",
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}
