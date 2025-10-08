package com.aiproj.mobile.ui.screens.efficiency.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun TrendCard(
    trend: String,
    averageMinutes: Double,
    modifier: Modifier = Modifier
) {
    val (trendText, trendColor, trendIcon) = when (trend) {
        "improving" -> Triple("效率提升中", Color(0xFF4CAF50), Icons.Default.TrendingUp)
        "declining" -> Triple("效率下降中", Color(0xFFF44336), Icons.Default.TrendingDown)
        else -> Triple("保持稳定", Color(0xFF2196F3), Icons.Default.Remove)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = trendColor.copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = trendIcon,
                        contentDescription = null,
                        tint = trendColor,
                        modifier = Modifier.size(32.dp)
                    )
                    Text(
                        text = trendText,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = trendColor
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "日均工作时长: ${formatHours(averageMinutes)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun formatHours(minutes: Double): String {
    val hours = (minutes / 60).toInt()
    val mins = (minutes % 60).toInt()
    return if (hours > 0) {
        "${hours}h ${mins}m"
    } else {
        "${mins}m"
    }
}
