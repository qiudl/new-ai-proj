package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.DayDetail
import com.aiproj.mobile.ui.screens.analytics.TaskTimeEntry
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * 日期详情组件（右侧栏）
 *
 * 显示选中日期的详细信息：
 * - 统计卡片（工作时长、完成任务、效率）
 * - 任务时间条目列表
 */
@Composable
fun DayDetailColumn(
    // dayDetail: DayDetail?,
    // isLoading: Boolean,
    // error: String?,
    modifier: Modifier = Modifier
) {
    // 生成模拟数据
    val today = LocalDate.now()
    val mockDayDetail = DayDetail(
        date = today.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
        weekday = when (today.dayOfWeek.value) {
            1 -> "周一"
            2 -> "周二"
            3 -> "周三"
            4 -> "周四"
            5 -> "周五"
            6 -> "周六"
            7 -> "周日"
            else -> ""
        },
        hours = 6.5f,
        tasksCompleted = 3,
        efficiency = 0.82f,
        taskEntries = listOf(
            TaskTimeEntry(
                taskId = 2867,
                taskTitle = "Phase 3: 每日详情Tab详细设计与开发",
                projectName = "AI项目管理",
                duration = 3.5f,
                startTime = "09:00",
                endTime = "12:30",
                status = "in_progress",
                isCompleted = false
            ),
            TaskTimeEntry(
                taskId = 2859,
                taskTitle = "前端：优化UI交互和用户引导",
                projectName = "AI项目管理",
                duration = 2.0f,
                startTime = "14:00",
                endTime = "16:00",
                status = "completed",
                isCompleted = true
            ),
            TaskTimeEntry(
                taskId = 2851,
                taskTitle = "方案设计与实际实现对比分析",
                projectName = "AI项目管理",
                duration = 1.0f,
                startTime = "16:30",
                endTime = "17:30",
                status = "in_progress",
                isCompleted = false
            )
        )
    )

    val isLoading = false
    val error: String? = null

    Column(
        modifier = modifier
    ) {
        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            error != null -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = "⚠️ $error",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
            mockDayDetail == null -> {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "📅 请选择一个日期查看详情",
                        modifier = Modifier.padding(24.dp),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            else -> {
                // 显示日期详情
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 统计卡片
                    DayStatisticsCard(dayDetail = mockDayDetail)

                    // 任务时间条目列表
                    Text(
                        text = "📋 任务明细 (${mockDayDetail.taskEntries.size})",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 8.dp)
                    )

                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(mockDayDetail.taskEntries) { taskEntry ->
                            TaskTimeEntryCard(taskEntry = taskEntry)
                        }
                    }
                }
            }
        }
    }
}
