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
                val customStart = _uiState.value.customStartDate
                val customEnd = _uiState.value.customEndDate
                val (startDate, endDate) = calculateDateRange(timeRange, customStart, customEnd)
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
                    // 注意：由于后端summary数据可能为0，我们从daily_stats计算实际值
                    val dailyStats = weeklyStats.daily_stats ?: emptyList()
                    val totalCreated = dailyStats.sumOf { it.tasks_created }
                    val totalCompleted = dailyStats.sumOf { it.tasks_completed }

                    // 使用task_stats作为基础数据
                    val taskStats = weeklyStats.task_stats
                    val total = taskStats.todo + taskStats.in_progress + taskStats.completed

                    // 如果总数为0，使用daily_stats计算的值
                    val actualTotal = if (total > 0) total else totalCreated
                    val actualCompleted = if (taskStats.completed > 0) taskStats.completed else totalCompleted

                    val taskStatusDistribution = TaskStatusDistribution(
                        completed = actualCompleted,
                        completedPercentage = if (actualTotal > 0) actualCompleted.toFloat() / actualTotal else 0f,
                        inProgress = taskStats.in_progress,
                        inProgressPercentage = if (actualTotal > 0) taskStats.in_progress.toFloat() / actualTotal else 0f,
                        todo = taskStats.todo,
                        todoPercentage = if (actualTotal > 0) taskStats.todo.toFloat() / actualTotal else 0f
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

                    // 如果summary数据为0，使用计算值
                    val summaryTotal = if (weeklyStats.summary.total_tasks > 0) {
                        weeklyStats.summary.total_tasks
                    } else {
                        actualTotal
                    }

                    val summaryCompleted = if (weeklyStats.summary.completed_tasks > 0) {
                        weeklyStats.summary.completed_tasks
                    } else {
                        actualCompleted
                    }

                    val summaryRate = if (summaryTotal > 0) {
                        summaryCompleted.toFloat() / summaryTotal
                    } else {
                        0f
                    }

                    _uiState.update { state ->
                        state.copy(
                            isLoading = false,
                            workTimeTrend = workTimeTrend,
                            completedTasksCount = summaryCompleted,
                            totalTasksCount = summaryTotal,
                            taskCompletionRate = summaryRate,
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
        if (range == TimeRange.CUSTOM_DATE) {
            // 显示日期选择器
            _uiState.update { it.copy(showDatePicker = true) }
        } else {
            _uiState.update { it.copy(selectedTimeRange = range) }
            loadAnalyticsData()
        }
    }

    fun setCustomDateRange(startDate: LocalDate, endDate: LocalDate) {
        // 验证日期范围
        if (startDate.isAfter(endDate)) {
            _uiState.update {
                it.copy(
                    error = "开始日期不能晚于结束日期",
                    showDatePicker = false
                )
            }
            return
        }

        // 验证不能选择未来日期
        val today = LocalDate.now()
        if (endDate.isAfter(today)) {
            _uiState.update {
                it.copy(
                    error = "不能选择未来日期",
                    showDatePicker = false
                )
            }
            return
        }

        _uiState.update {
            it.copy(
                selectedTimeRange = TimeRange.CUSTOM_DATE,
                customStartDate = startDate,
                customEndDate = endDate,
                showDatePicker = false,
                error = null
            )
        }
        loadAnalyticsData()
    }

    fun dismissDatePicker() {
        _uiState.update { it.copy(showDatePicker = false) }
    }

    fun getDateRangeText(): String {
        val (startDate, endDate) = calculateDateRange(
            _uiState.value.selectedTimeRange,
            _uiState.value.customStartDate,
            _uiState.value.customEndDate
        )

        return if (_uiState.value.selectedTimeRange == TimeRange.CUSTOM_DATE) {
            "$startDate ~ $endDate"
        } else {
            _uiState.value.selectedTimeRange.displayName
        }
    }

    fun refresh() {
        loadAnalyticsData()
    }

    /**
     * 根据TimeRange计算日期范围
     */
    fun calculateDateRange(
        timeRange: TimeRange,
        customStart: LocalDate? = null,
        customEnd: LocalDate? = null
    ): Pair<String, String> {
        val today = LocalDate.now()
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

        return when (timeRange) {
            TimeRange.TODAY -> {
                val dateStr = today.format(formatter)
                dateStr to dateStr
            }
            TimeRange.YESTERDAY -> {
                val yesterday = today.minusDays(1)
                val dateStr = yesterday.format(formatter)
                dateStr to dateStr
            }
            TimeRange.DAY_BEFORE_YESTERDAY -> {
                val dayBeforeYesterday = today.minusDays(2)
                val dateStr = dayBeforeYesterday.format(formatter)
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
            TimeRange.CUSTOM_DATE -> {
                if (customStart != null && customEnd != null) {
                    // 使用用户选择的日期范围
                    customStart.format(formatter) to customEnd.format(formatter)
                } else {
                    // 默认最近7天
                    val sevenDaysAgo = today.minusDays(6)
                    sevenDaysAgo.format(formatter) to today.format(formatter)
                }
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
