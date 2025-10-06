package com.aiproj.mobile.ui.screens.details.todayworktime.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.TimeDistribution

@Composable
fun TimeDistributionChart(
    timeDistribution: TimeDistribution,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "时间分布",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            val maxMinutes = maxOf(
                timeDistribution.morning,
                timeDistribution.afternoon,
                timeDistribution.evening
            )

            if (maxMinutes > 0) {
                TimeBar(
                    label = "上午",
                    minutes = timeDistribution.morning,
                    maxMinutes = maxMinutes
                )

                Spacer(modifier = Modifier.height(12.dp))

                TimeBar(
                    label = "下午",
                    minutes = timeDistribution.afternoon,
                    maxMinutes = maxMinutes
                )

                Spacer(modifier = Modifier.height(12.dp))

                TimeBar(
                    label = "晚上",
                    minutes = timeDistribution.evening,
                    maxMinutes = maxMinutes
                )
            } else {
                Text(
                    text = "暂无时间分布数据",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun TimeBar(
    label: String,
    minutes: Int,
    maxMinutes: Int,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = formatMinutes(minutes),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        val progress = if (maxMinutes > 0) {
            minutes.toFloat() / maxMinutes.toFloat()
        } else {
            0f
        }

        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .height(12.dp),
        )
    }
}

private fun formatMinutes(minutes: Int): String {
    val hours = minutes / 60
    val mins = minutes % 60
    return if (hours > 0) {
        "${hours}h ${mins}min"
    } else {
        "${mins}min"
    }
}
