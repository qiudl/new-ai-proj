package com.aiproj.mobile.ui.screens.tasks.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.TrendDataPoint

/**
 * 子任务完成趋势图
 * Phase 3: 简化版占位实现
 * TODO: Phase 4 可以集成 Vico 图表库实现真实的折线图
 */
@Composable
fun CompletionTrendChart(
    trendData: List<TrendDataPoint>,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 标题
            Text(
                text = "📈 子任务完成趋势",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            if (trendData.isEmpty()) {
                // 空状态
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "暂无趋势数据\n请选择更长的时间范围",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                // 简化的数据展示
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 最新数据点
                        val latestPoint = trendData.lastOrNull()
                        if (latestPoint != null) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(
                                        text = "计划完成",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = "${latestPoint.planned} 个",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF2196F3)
                                    )
                                </Column>

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "实际完成",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = "${latestPoint.actual} 个",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF4CAF50)
                                    )
                                </Column>
                            }

                            // 完成率
                            Spacer(modifier = Modifier.height(8.dp))
                            LinearProgressIndicator(
                                progress = { latestPoint.completionRate.coerceIn(0f, 1f) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp),
                                color = Color(0xFF4CAF50),
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                            Text(
                                text = "完成率: ${(latestPoint.completionRate * 100).toInt()}%",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }

                        HorizontalDivider()

                        // 占位提示
                        Text(
                            text = "💡 详细趋势图表将在后续版本实现",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        )
                    }
                }

                // 图例
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ChartLegendItem(
                        color = Color(0xFF2196F3),
                        label = "计划完成"
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    ChartLegendItem(
                        color = Color(0xFF4CAF50),
                        label = "实际完成"
                    )
                }
            }
        }
    }
}

@Composable
private fun ChartLegendItem(
    color: Color,
    label: String
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier.size(12.dp),
            color = color,
            shape = MaterialTheme.shapes.small
        ) {}
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall
        )
    }
}
