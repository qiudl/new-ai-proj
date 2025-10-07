package com.aiproj.mobile.ui.screens.ai.document

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.DocumentData

@Composable
fun DocumentPreviewScreen(
    document: DocumentData,
    onSave: () -> Unit,
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
                text = "✅ 文档生成成功！",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(16.dp),
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }

        // 文档预览区域
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 文档标题
            Text(
                text = document.title,
                style = MaterialTheme.typography.headlineSmall
            )

            HorizontalDivider()

            // 文档内容（Markdown渲染）
            // TODO: 使用Markdown库渲染，这里暂时用Text显示
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("generatedDocumentPreview")
            ) {
                Text(
                    text = document.content,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(16.dp)
                )
            }

            HorizontalDivider()

            // 统计信息
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "📊 统计信息",
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = "• 字数: ${document.metadata.wordCount}",
                        modifier = Modifier.testTag("wordCountInfo")
                    )
                    Text("• 预计阅读时间: ${document.metadata.estimatedReadTime}")
                    if (document.metadata.sections.isNotEmpty()) {
                        Text("• 章节数: ${document.metadata.sections.size}")
                        Text(
                            text = "章节: ${document.metadata.sections.joinToString(", ")}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
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
                    onClick = onSave,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("保存文档")
                }
            }
        }
    }
}
