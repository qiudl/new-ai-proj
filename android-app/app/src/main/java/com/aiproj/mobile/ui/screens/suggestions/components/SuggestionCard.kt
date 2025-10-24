package com.aiproj.mobile.ui.screens.suggestions.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.TimerSuggestion

/**
 * 智能建议卡片
 */
@Composable
fun SuggestionCard(
    suggestion: TimerSuggestion,
    onApply: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = getSuggestionIcon(suggestion.type),
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )

                    Column {
                        Text(
                            text = suggestion.taskTitle ?: "快速计时",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        suggestion.projectName?.let { project ->
                            Text(
                                text = project,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Confidence badge
                ConfidenceBadge(confidence = suggestion.confidence)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Reason
            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Row(
                    modifier = Modifier.padding(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = suggestion.reason,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            // Metadata
            if (suggestion.estimatedMinutes != null || suggestion.priority != null) {
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    suggestion.estimatedMinutes?.let { minutes ->
                        MetadataChip(
                            icon = Icons.Default.AccessTime,
                            text = "${minutes}分钟"
                        )
                    }

                    suggestion.priority?.let { priority ->
                        PriorityChip(priority = priority)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action button
            Button(
                onClick = onApply,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("开始计时")
            }
        }
    }
}

@Composable
private fun ConfidenceBadge(confidence: Double) {
    val (text, color) = when {
        confidence >= 0.8 -> "强烈推荐" to MaterialTheme.colorScheme.primary
        confidence >= 0.6 -> "推荐" to MaterialTheme.colorScheme.tertiary
        else -> "建议" to MaterialTheme.colorScheme.onSurfaceVariant
    }

    Surface(
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun MetadataChip(
    icon: ImageVector,
    text: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun PriorityChip(priority: String) {
    val color = when (priority.lowercase()) {
        "high" -> MaterialTheme.colorScheme.error
        "medium" -> MaterialTheme.colorScheme.tertiary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Surface(
        shape = MaterialTheme.shapes.extraSmall,
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = when (priority.lowercase()) {
                "high" -> "高优先级"
                "medium" -> "中优先级"
                "low" -> "低优先级"
                else -> priority
            },
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun getSuggestionIcon(type: String): ImageVector {
    return when (type) {
        "incomplete_task" -> Icons.AutoMirrored.Filled.Assignment
        "recurring_task" -> Icons.Default.Repeat
        "peak_time" -> Icons.AutoMirrored.Filled.TrendingUp
        "break_reminder" -> Icons.Default.SelfImprovement
        "focus_mode" -> Icons.Default.Whatshot
        else -> Icons.Default.AutoAwesome
    }
}
