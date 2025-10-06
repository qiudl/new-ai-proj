package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiproj.mobile.ui.screens.analytics.DailyWorkTime
import com.aiproj.mobile.ui.screens.analytics.TimeGranularity
import com.aiproj.mobile.ui.screens.analytics.TimeRange
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberAxisLabelComponent
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottomAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStartAxis
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.compose.common.component.rememberShapeComponent
import com.patrykandpatrick.vico.compose.common.component.rememberTextComponent
import com.patrykandpatrick.vico.compose.common.of
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries
import com.patrykandpatrick.vico.core.common.shape.Shape
import kotlin.math.roundToInt

/**
 * 工作时长趋势图表卡片
 */
@Composable
fun WorkTimeTrendCard(
    data: List<DailyWorkTime>,
    timeRange: TimeRange?,
    modifier: Modifier = Modifier,
    granularity: TimeGranularity = TimeGranularity.DAY
) {
    var showDetailDialog by remember { mutableStateOf(false) }
    var selectedDataPoint by remember { mutableStateOf<DailyWorkTime?>(null) }
    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // 标题和总时长
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "📊 工作时长趋势",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Text(
                    text = "📈 ${timeRange?.displayName ?: "本周"}: ${calculateTotalHours(data)}",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 图表
            if (data.isNotEmpty()) {
                val modelProducer = remember { CartesianChartModelProducer() }
                LaunchedEffect(data) {
                    modelProducer.runTransaction {
                        lineSeries {
                            series(data.map { it.hours })
                        }
                    }
                }

                CartesianChartHost(
                    chart = rememberCartesianChart(
                        rememberLineCartesianLayer(),
                        startAxis = rememberStartAxis(
                            label = rememberAxisLabelComponent(
                                color = MaterialTheme.colorScheme.onSurface,
                                background = rememberShapeComponent(
                                    shape = Shape.Rectangle,
                                    color = androidx.compose.ui.graphics.Color.Transparent
                                )
                            )
                        ),
                        bottomAxis = rememberBottomAxis(
                            label = rememberTextComponent(
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textSize = 10.sp
                            ),
                            valueFormatter = { value, _, _ ->
                                // 优化X轴刻度显示：确保间隔合理
                                val index = value.toInt()
                                val stepSize = calculateXAxisStep(data.size, granularity)
                                if (index % stepSize == 0 || index == data.size - 1) {
                                    data.getOrNull(index)?.dayLabel ?: ""
                                } else {
                                    ""
                                }
                            }
                        )
                    ),
                    modelProducer = modelProducer,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // 统计信息
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatColumn(
                        label = "总时长",
                        value = calculateTotalHours(data),
                        color = MaterialTheme.colorScheme.primary
                    )

                    StatColumn(
                        label = "平均/天",
                        value = String.format("%.1fh", calculateAverageHours(data)),
                        color = MaterialTheme.colorScheme.secondary
                    )

                    StatColumn(
                        label = "最高",
                        value = String.format("%.1fh", data.maxOfOrNull { it.hours } ?: 0f),
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
            } else {
                EmptyState(message = "暂无工作时长数据")
            }
        }
    }

    // 详情对话框
    if (showDetailDialog && selectedDataPoint != null) {
        AlertDialog(
            onDismissRequest = { showDetailDialog = false },
            title = { Text("时段详情") },
            text = {
                Column {
                    Text("时间: ${selectedDataPoint!!.dayLabel}")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("工作时长: ${String.format("%.1f", selectedDataPoint!!.hours)}小时")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("任务数: ${selectedDataPoint!!.taskCount}个")
                    if (!selectedDataPoint!!.detailInfo.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("备注: ${selectedDataPoint!!.detailInfo}")
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDetailDialog = false }) {
                    Text("关闭")
                }
            }
        )
    }
}

@Composable
private fun StatColumn(
    label: String,
    value: String,
    color: androidx.compose.ui.graphics.Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

private fun calculateTotalHours(data: List<DailyWorkTime>): String {
    val total = data.sumOf { it.hours.toDouble() }
    return String.format("%.1fh", total)
}

private fun calculateAverageHours(data: List<DailyWorkTime>): Float {
    if (data.isEmpty()) return 0f
    return data.map { it.hours }.average().toFloat()
}

/**
 * 计算X轴刻度步长（确保不超过7个刻度）
 */
private fun calculateXAxisStep(dataSize: Int, granularity: TimeGranularity): Int {
    return when (granularity) {
        TimeGranularity.HOUR -> {
            // 24小时：每4小时一个刻度 (0, 4, 8, 12, 16, 20)
            4
        }
        TimeGranularity.DAY -> {
            // 按天：确保不超过7个刻度
            when {
                dataSize <= 7 -> 1      // 7天内：每天显示
                dataSize <= 14 -> 2     // 8-14天：每2天
                dataSize <= 21 -> 3     // 15-21天：每3天
                else -> dataSize / 7    // 更长：最多7个刻度
            }
        }
        TimeGranularity.WEEK -> {
            // 按周：通常不会超过7个刻度
            1
        }
    }
}
