package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * 效率分析Tab内容组件
 *
 * 显示：
 * - 效率趋势图
 * - 效率指标统计
 * - 工作模式分析
 * - 效率vs时长对比
 */
@Composable
fun EfficiencyTabContent(
    uiState: AnalyticsUiState,
    viewModel: AnalyticsViewModel,
    modifier: Modifier = Modifier
) {
    // 生成模拟数据
    val mockEfficiencyState = generateMockEfficiencyState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // 效率趋势图
        item {
            EfficiencyTrendCard(
                trendData = mockEfficiencyState.efficiencyTrend,
                averageEfficiency = mockEfficiencyState.averageEfficiency,
                efficiencyChange = mockEfficiencyState.efficiencyChange
            )
        }

        // 效率指标卡片
        item {
            EfficiencyMetricsCard(
                averageEfficiency = mockEfficiencyState.averageEfficiency,
                bestEfficiency = mockEfficiencyState.bestDay,
                worstEfficiency = mockEfficiencyState.worstDay,
                volatility = mockEfficiencyState.volatility
            )
        }

        // 工作模式分析
        item {
            WorkPatternAnalysisCard(
                bestTimeSlot = mockEfficiencyState.bestTimeSlot,
                suggestions = mockEfficiencyState.suggestions
            )
        }

        // 效率vs时长对比
        item {
            EfficiencyVsDurationCard(
                durationEfficiency = mockEfficiencyState.durationEfficiencyMap
            )
        }

        // 底部空间
        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

/**
 * 生成模拟效率数据
 */
private fun generateMockEfficiencyState(): EfficiencyUiState {
    val today = LocalDate.now()

    return EfficiencyUiState(
        isLoading = false,
        error = null,
        efficiencyTrend = (0..6).map { daysAgo ->
            val date = today.minusDays(daysAgo.toLong())
            val weekday = when (date.dayOfWeek.value) {
                1 -> "周一"
                2 -> "周二"
                3 -> "周三"
                4 -> "周四"
                5 -> "周五"
                6 -> "周六"
                7 -> "周日"
                else -> ""
            }
            EfficiencyTrendPoint(
                date = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                label = weekday,
                efficiency = when (daysAgo) {
                    0 -> 0.75f  // 今天
                    1 -> 0.82f  // 昨天
                    2 -> 0.78f  // 前天
                    3 -> 0.92f  // 3天前（周三最高）
                    4 -> 0.80f  // 4天前
                    5 -> 0.70f  // 5天前
                    6 -> 0.65f  // 6天前（周一最低）
                    else -> 0.75f
                }
            )
        }.reversed(), // 反转使周一在前
        averageEfficiency = 0.78f,
        efficiencyChange = 0.12f, // +12%
        bestDay = EfficiencyDay(
            date = today.minusDays(3).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            weekday = "周三",
            efficiency = 0.92f,
            tasksCompleted = 5
        ),
        worstDay = EfficiencyDay(
            date = today.minusDays(6).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            weekday = "周一",
            efficiency = 0.65f,
            tasksCompleted = 2
        ),
        volatility = "中等",
        bestTimeSlot = TimeSlot(
            timeRange = "09:00-12:00",
            period = "上午",
            efficiency = 0.85f
        ),
        suggestions = listOf(
            "✓ 周三效率最高，建议安排重要任务到周三处理",
            "⚠️ 周一效率较低，建议轻任务开始，逐步进入状态",
            "⭐ 上午效率显著高于下午，重要工作安排在上午"
        ),
        durationEfficiencyMap = mapOf(
            "8h+" to DurationEfficiency("8h+", 0.65f, 3),
            "6-8h" to DurationEfficiency("6-8h", 0.88f, 5),
            "4-6h" to DurationEfficiency("4-6h", 0.82f, 4),
            "<4h" to DurationEfficiency("<4h", 0.75f, 2)
        )
    )
}
