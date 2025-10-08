package com.aiproj.mobile.ui.screens.details.todayworktime.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.DayComparison
import kotlin.math.abs

@Composable
fun ComparisonCard(
    comparison: DayComparison,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "对比昨日",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSecondaryContainer
            )

            Spacer(modifier = Modifier.height(16.dp))

            ComparisonRow(
                label = "工作时长",
                changeMinutes = comparison.workTimeChange,
                percent = comparison.workTimePercent
            )

            Spacer(modifier = Modifier.height(12.dp))

            HorizontalDivider()

            Spacer(modifier = Modifier.height(12.dp))

            ComparisonRow(
                label = "完成任务",
                changeCount = comparison.taskCountChange,
                percent = comparison.taskCountPercent
            )
        }
    }
}

@Composable
private fun ComparisonRow(
    label: String,
    changeMinutes: Int? = null,
    changeCount: Int? = null,
    percent: Float,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            val changeText = when {
                changeMinutes != null -> {
                    val absMinutes = abs(changeMinutes)
                    val hours = absMinutes / 60
                    val mins = absMinutes % 60
                    if (changeMinutes >= 0) {
                        "+${hours}h ${mins}min"
                    } else {
                        "-${hours}h ${mins}min"
                    }
                }
                changeCount != null -> {
                    if (changeCount >= 0) "+$changeCount" else "$changeCount"
                }
                else -> ""
            }

            Text(
                text = changeText,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = if (percent >= 0) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.error
                }
            )

            Spacer(modifier = Modifier.width(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = if (percent >= 0) {
                        Icons.Default.TrendingUp
                    } else {
                        Icons.Default.TrendingDown
                    },
                    contentDescription = null,
                    tint = if (percent >= 0) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.error
                    },
                    modifier = Modifier.size(20.dp)
                )

                Text(
                    text = "${abs(percent).toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (percent >= 0) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.error
                    }
                )
            }
        }
    }
}
