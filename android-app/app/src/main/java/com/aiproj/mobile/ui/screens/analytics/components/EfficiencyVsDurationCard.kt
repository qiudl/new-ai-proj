package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.DurationEfficiency

/**
 * 效率vs时长对比卡片组件
 *
 * 显示不同工作时长段的效率对比
 */
@Composable
fun EfficiencyVsDurationCard(
    durationEfficiency: Map<String, DurationEfficiency>,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "⏱️ 效率vs时长对比",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "工作时长与效率关系分析",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // 各时长段的效率条形图
            val sortedEntries = listOf("8h+", "6-8h", "4-6h", "<4h")
            val maxEfficiency = durationEfficiency.values.maxOfOrNull { it.efficiency } ?: 1f

            sortedEntries.forEach { range ->
                durationEfficiency[range]?.let { data ->
                    DurationEfficiencyBar(
                        durationRange = range,
                        efficiency = data.efficiency,
                        maxEfficiency = maxEfficiency
                    )
                }
            }

            // 最佳工作时长建议
            val bestRange = durationEfficiency.maxByOrNull { it.value.efficiency }
            if (bestRange != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lightbulb,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "💡 最佳工作时长: ${bestRange.key}（效率${(bestRange.value.efficiency * 100).toInt()}%）",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

/**
 * 时长效率条形图
 */
@Composable
private fun DurationEfficiencyBar(
    durationRange: String,
    efficiency: Float,
    maxEfficiency: Float
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = durationRange,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.width(50.dp)
        )

        Box(modifier = Modifier.weight(1f)) {
            val progress = if (maxEfficiency > 0) efficiency / maxEfficiency else 0f

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(24.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Text(
                text = "效率${(efficiency * 100).toInt()}%",
                style = MaterialTheme.typography.labelSmall,
                color = if (progress > 0.5f) Color.White else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 8.dp)
            )
        }
    }
}
