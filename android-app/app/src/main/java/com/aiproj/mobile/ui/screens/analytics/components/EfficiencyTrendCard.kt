package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.EfficiencyTrendPoint
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottomAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStartAxis
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries

/**
 * 效率趋势图卡片
 *
 * 使用Vico图表库绘制效率折线图
 */
@Composable
fun EfficiencyTrendCard(
    trendData: List<EfficiencyTrendPoint>,
    averageEfficiency: Float,
    efficiencyChange: Float,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "📈 效率趋势图",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            // 折线图
            if (trendData.isNotEmpty()) {
                val modelProducer = remember { CartesianChartModelProducer() }
                LaunchedEffect(trendData) {
                    modelProducer.runTransaction {
                        lineSeries {
                            series(trendData.map { it.efficiency * 100 }) // 转换为百分比
                        }
                    }
                }

                CartesianChartHost(
                    chart = rememberCartesianChart(
                        rememberLineCartesianLayer(),
                        startAxis = rememberStartAxis(
                            title = "效率 (%)"
                        ),
                        bottomAxis = rememberBottomAxis(
                            valueFormatter = { value, _, _ ->
                                trendData.getOrNull(value.toInt())?.label ?: ""
                            }
                        )
                    ),
                    modelProducer = modelProducer,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                )
            }

            // 统计数据行
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                EfficiencyStat(
                    label = "平均效率",
                    value = "${(averageEfficiency * 100).toInt()}%",
                    icon = Icons.Default.BarChart,
                    color = MaterialTheme.colorScheme.primary
                )

                EfficiencyStat(
                    label = "效率趋势",
                    value = if (efficiencyChange >= 0) {
                        "↗ +${(efficiencyChange * 100).toInt()}%"
                    } else {
                        "↘ ${(efficiencyChange * 100).toInt()}%"
                    },
                    icon = if (efficiencyChange >= 0) Icons.AutoMirrored.Filled.TrendingUp else Icons.AutoMirrored.Filled.TrendingDown,
                    color = if (efficiencyChange >= 0) Color(0xFF4CAF50) else Color(0xFFE53935)
                )
            }
        }
    }
}

/**
 * 效率统计项
 */
@Composable
private fun EfficiencyStat(
    label: String,
    value: String,
    icon: ImageVector,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(24.dp)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
