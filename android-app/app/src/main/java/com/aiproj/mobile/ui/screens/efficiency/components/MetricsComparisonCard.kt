package com.aiproj.mobile.ui.screens.efficiency.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.DayData

@Composable
fun MetricsComparisonCard(
    days: List<DayData>,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "指标对比",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Metrics table
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                MetricRow(
                    label = "任务完成数",
                    values = days.map { "${it.completedTaskCount}/${it.taskCount}" }
                )

                MetricRow(
                    label = "完成率",
                    values = days.map {
                        if (it.taskCount > 0) {
                            "${(it.completedTaskCount * 100 / it.taskCount)}%"
                        } else {
                            "0%"
                        }
                    }
                )

                MetricRow(
                    label = "专注度评分",
                    values = days.map { "${it.focusScore.toInt()}/100" }
                )
            }
        }
    }
}

@Composable
private fun MetricRow(
    label: String,
    values: List<String>
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.width(100.dp)
        )

        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            values.forEach { value ->
                Text(
                    text = value,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
