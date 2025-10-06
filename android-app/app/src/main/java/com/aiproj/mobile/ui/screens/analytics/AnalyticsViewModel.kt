package com.aiproj.mobile.ui.screens.analytics

import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.repository.AnalyticsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val analyticsRepository: AnalyticsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnalyticsUiState())
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    init {
        loadAnalyticsData()
    }

    fun loadAnalyticsData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val timeRange = _uiState.value.selectedTimeRange
                val (startDate, endDate) = calculateDateRange(timeRange)
                val days = ChronoUnit.DAYS.between(
                    LocalDate.parse(startDate),
                    LocalDate.parse(endDate)
                ).toInt() + 1

                // 1. 获取工作时长趋势数据
                val timeStatsResult = analyticsRepository.getTimeStats(days)

                // 2. 获取周统计数据
                val weeklyStatsResult = analyticsRepository.getWeeklyStats(startDate, endDate)

                if (timeStatsResult.isSuccess && weeklyStatsResult.isSuccess) {
                    val timeStats = timeStatsResult.getOrNull()
                    val weeklyStats = weeklyStatsResult.getOrNull()

                    // 处理可能为null的数据
                    if (timeStats == null || weeklyStats == null) {
                        throw Exception("数据加载失败：统计数据为空")
                    }

                    // 转换工作时长趋势数据
                    val workTimeTrend = (timeStats.dailyStats ?: emptyList()).map { daily ->
                        DailyWorkTime(
                            date = daily.date,
                            dayLabel = daily.label,
                            hours = daily.hours
                        )
                    }

                    // 计算任务状态分布
                    val taskStats = weeklyStats.task_stats
                    val total = taskStats.todo + taskStats.in_progress + taskStats.completed
                    val taskStatusDistribution = TaskStatusDistribution(
                        completed = taskStats.completed,
                        completedPercentage = if (total > 0) taskStats.completed.toFloat() / total else 0f,
                        inProgress = taskStats.in_progress,
                        inProgressPercentage = if (total > 0) taskStats.in_progress.toFloat() / total else 0f,
                        todo = taskStats.todo,
                        todoPercentage = if (total > 0) taskStats.todo.toFloat() / total else 0f
                    )

                    // 转换项目时间分布（从任务分布推算）
                    val projectColors = listOf(
                        Color(0xFFE57373), Color(0xFF64B5F6), Color(0xFF81C784),
                        Color(0xFFFFD54F), Color(0xFFBA68C8), Color(0xFF4DD0E1)
                    )
                    val projectStats = weeklyStats.project_stats ?: emptyList()
                    val projectDistribution = projectStats.take(6).mapIndexed { index, project ->
                        val totalTaskCount = projectStats.sumOf { it.task_count }
                        val percentage = if (totalTaskCount > 0) {
                            project.task_count.toFloat() / totalTaskCount
                        } else 0f

                        ProjectTimeData(
                            projectId = project.project_id,
                            projectName = project.project_name,
                            hours = timeStats.totalHours * percentage,
                            percentage = percentage,
                            color = projectColors.getOrElse(index) { Color.Gray }
                        )
                    }

                    // 计算连续工作天数（从daily stats中计算）
                    val consecutiveDays = calculateConsecutiveDays((timeStats.dailyStats ?: emptyList()).map { it.hours })

                    _uiState.update { state ->
                        state.copy(
                            isLoading = false,
                            workTimeTrend = workTimeTrend,
                            completedTasksCount = weeklyStats.summary.completed_tasks,
                            totalTasksCount = weeklyStats.summary.total_tasks,
                            taskCompletionRate = weeklyStats.summary.completion_rate / 100f,
                            taskStatusDistribution = taskStatusDistribution,
                            projectTimeDistribution = projectDistribution,
                            consecutiveWorkDays = consecutiveDays,
                            totalFocusHours = timeStats.totalHours
                        )
                    }
                } else {
                    // 处理错误
                    val error = timeStatsResult.exceptionOrNull() ?: weeklyStatsResult.exceptionOrNull()
                    throw error ?: Exception("Unknown error")
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "加载失败"
                    )
                }
            }
        }
    }

    fun selectTimeRange(range: TimeRange) {
        _uiState.update { it.copy(selectedTimeRange = range) }
        loadAnalyticsData()
    }

    fun refresh() {
        loadAnalyticsData()
    }

    /**
     * 根据TimeRange计算日期范围
     */
    private fun calculateDateRange(timeRange: TimeRange): Pair<String, String> {
        val today = LocalDate.now()
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

        return when (timeRange) {
            TimeRange.TODAY -> {
                val dateStr = today.format(formatter)
                dateStr to dateStr
            }
            TimeRange.THIS_WEEK -> {
                // 本周一到今天
                val monday = today.minusDays(today.dayOfWeek.value - 1L)
                monday.format(formatter) to today.format(formatter)
            }
            TimeRange.THIS_MONTH -> {
                // 本月1日到今天
                val firstDay = today.withDayOfMonth(1)
                firstDay.format(formatter) to today.format(formatter)
            }
            TimeRange.LAST_MONTH -> {
                // 上月1日到上月最后一天
                val lastMonth = today.minusMonths(1)
                val firstDay = lastMonth.withDayOfMonth(1)
                val lastDay = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth())
                firstDay.format(formatter) to lastDay.format(formatter)
            }
            TimeRange.CUSTOM -> {
                // 默认最近7天
                val sevenDaysAgo = today.minusDays(6)
                sevenDaysAgo.format(formatter) to today.format(formatter)
            }
        }
    }

    /**
     * 计算连续工作天数（从最近一天往前推）
     */
    private fun calculateConsecutiveDays(dailyHours: List<Float>): Int {
        var consecutiveDays = 0

        // 从最后一天（最近）往前数
        for (i in dailyHours.indices.reversed()) {
            if (dailyHours[i] > 0) {
                consecutiveDays++
            } else {
                break
            }
        }

        return consecutiveDays
    }
}
