package com.aiproj.mobile.ui.screens.analytics

import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.api.PriorityDistribution
import com.aiproj.mobile.data.models.TaskStatus
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

                // 1. 确定时间粒度和获取工作时长趋势数据
                // Bug修复: 时间段小于7天时，始终显示最近7天的工作时长趋势
                val trendDays = if (days < 7) 7 else days
                // 粒度应该根据trendDays（实际获取的数据天数）来决定，而不是days（用户选择的天数）
                val granularity = determineTimeGranularity(trendDays, timeRange)
                val timeStatsResult = analyticsRepository.getTimeStats(trendDays)

                // 2. 获取周统计数据
                val weeklyStatsResult = analyticsRepository.getWeeklyStats(startDate, endDate)

                if (timeStatsResult.isSuccess && weeklyStatsResult.isSuccess) {
                    val timeStats = timeStatsResult.getOrNull()
                    val weeklyStats = weeklyStatsResult.getOrNull()

                    // 处理可能为null的数据
                    if (timeStats == null || weeklyStats == null) {
                        throw Exception("数据加载失败：统计数据为空")
                    }

                    // 转换工作时长趋势数据（根据粒度处理）
                    val workTimeTrend = processWorkTimeTrend(
                        dailyStats = timeStats.dailyStats ?: emptyList(),
                        granularity = granularity,
                        days = days,
                        startDate = startDate,
                        endDate = endDate
                    )

                    // 计算任务状态分布 - 使用后端返回的详细状态数据
                    val taskStats = weeklyStats.task_stats

                    // 计算所有状态的总任务数
                    val total = taskStats.draft + taskStats.planning + taskStats.todo +
                                taskStats.in_progress + taskStats.testing + taskStats.completed +
                                taskStats.cancelled + taskStats.on_hold + taskStats.blocked +
                                taskStats.archived

                    // 计算"其他"状态的总数(非主要状态的任务)
                    val othersTotal = taskStats.draft + taskStats.planning + taskStats.testing +
                                     taskStats.cancelled + taskStats.on_hold + taskStats.blocked +
                                     taskStats.archived

                    android.util.Log.d(
                        "AnalyticsViewModel",
                        "TaskStats - draft: ${taskStats.draft}, planning: ${taskStats.planning}, " +
                        "todo: ${taskStats.todo}, inProgress: ${taskStats.in_progress}, " +
                        "testing: ${taskStats.testing}, completed: ${taskStats.completed}, " +
                        "cancelled: ${taskStats.cancelled}, onHold: ${taskStats.on_hold}, " +
                        "blocked: ${taskStats.blocked}, archived: ${taskStats.archived}, " +
                        "total: $total, others: $othersTotal"
                    )

                    // 构建详细的其他状态分类
                    val othersBreakdown = OtherStatusBreakdown(
                        draft = taskStats.draft,
                        planning = taskStats.planning,
                        testing = taskStats.testing,
                        cancelled = taskStats.cancelled,
                        onHold = taskStats.on_hold,
                        blocked = taskStats.blocked,
                        archived = taskStats.archived
                    )

                    val taskStatusDistribution = TaskStatusDistribution(
                        completed = taskStats.completed,
                        completedPercentage = if (total > 0) taskStats.completed.toFloat() / total else 0f,
                        inProgress = taskStats.in_progress,
                        inProgressPercentage = if (total > 0) taskStats.in_progress.toFloat() / total else 0f,
                        todo = taskStats.todo,
                        todoPercentage = if (total > 0) taskStats.todo.toFloat() / total else 0f,
                        others = othersTotal,
                        othersPercentage = if (total > 0) othersTotal.toFloat() / total else 0f,
                        othersBreakdown = othersBreakdown
                    )

                    // 转换项目时间分布（从任务分布推算）
                    val projectColors = listOf(
                        Color(0xFFE57373), Color(0xFF64B5F6), Color(0xFF81C784),
                        Color(0xFFFFD54F), Color(0xFFBA68C8), Color(0xFF4DD0E1)
                    )
                    val projectStats = weeklyStats.project_stats ?: emptyList()
                    // Bug修复: 过滤掉task_count为0的项目，避免显示空数据
                    val validProjectStats = projectStats.filter { it.task_count > 0 }
                    val projectDistribution = validProjectStats.take(6).mapIndexed { index, project ->
                        val totalTaskCount = validProjectStats.sumOf { it.task_count }
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

                    // Bug修复: 计算连续工作天数应该从workTimeTrend（已按日期范围过滤的数据）计算
                    // 而不是从timeStats计算（timeStats是最近N天的原始数据）
                    val consecutiveDays = calculateConsecutiveDays(workTimeTrend.map { it.hours })

                    // Bug修复: 工作总时长应该从workTimeTrend（已按日期范围过滤）计算，而不是timeStats
                    val totalFocusHours = workTimeTrend.sumOf { it.hours.toDouble() }.toFloat()

                    // Summary使用详细状态统计后的总数
                    val summaryTotal = total
                    val summaryCompleted = taskStats.completed
                    val summaryRate = if (summaryTotal > 0) {
                        summaryCompleted.toFloat() / summaryTotal
                    } else {
                        0f
                    }

                    // 转换Top任务数据（Task Stats Tab需要）
                    // 注意：API返回的是TaskSummaryItem，需要转换为TopTask
                    // work_hours字段现在由后端通过JOIN unified_timer_logs返回
                    val topTasks = (weeklyStats.top_tasks ?: emptyList()).take(5).map { task ->
                        TopTask(
                            taskId = task.id,
                            title = task.title,
                            hours = task.work_hours,  // 使用后端返回的真实工作时长
                            status = task.status,
                            priority = task.priority
                        )
                    }

                    // 转换每日完成趋势数据（Task Stats Tab需要）
                    val dailyCompletion = (weeklyStats.daily_stats ?: emptyList()).map { dailyStat ->
                        val dateObj = try {
                            java.time.LocalDate.parse(dailyStat.date)
                        } catch (e: Exception) {
                            java.time.LocalDate.now()
                        }
                        val weekday = when (dateObj.dayOfWeek.value) {
                            1 -> "周一"
                            2 -> "周二"
                            3 -> "周三"
                            4 -> "周四"
                            5 -> "周五"
                            6 -> "周六"
                            7 -> "周日"
                            else -> ""
                        }
                        DailyCompletion(
                            date = dailyStat.date,
                            weekday = weekday,
                            completedCount = dailyStat.tasks_completed
                        )
                    }

                    // 优先级分布（Task Stats Tab需要）
                    // 使用API返回的priority_distribution数据，如果为null则使用空数据
                    val pd = weeklyStats.priority_distribution ?: PriorityDistribution()
                    val priorityStats = PriorityStats(
                        urgent = pd.urgent,
                        high = pd.high,
                        medium = pd.medium,
                        low = pd.low
                    )

                    _uiState.update { state ->
                        state.copy(
                            isLoading = false,
                            workTimeTrend = workTimeTrend,
                            timeGranularity = granularity,
                            completedTasksCount = summaryCompleted,
                            totalTasksCount = summaryTotal,
                            taskCompletionRate = summaryRate,
                            taskStatusDistribution = taskStatusDistribution,
                            projectTimeDistribution = projectDistribution,
                            consecutiveWorkDays = consecutiveDays,
                            totalFocusHours = totalFocusHours,
                            // Task Stats Tab数据
                            inProgressTasksCount = taskStats.in_progress,
                            todoTasksCount = taskStats.todo,
                            topTasks = topTasks,
                            dailyCompletionTrend = dailyCompletion,
                            priorityDistribution = priorityStats
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

    /**
     * 选择时间范围（与selectedDate互斥）
     */
    fun selectTimeRange(range: TimeRange) {
        if (range == TimeRange.CUSTOM_DATE) {
            // 显示日期选择器
            _uiState.update { it.copy(showDatePicker = true, selectedDate = null) }
        } else {
            _uiState.update {
                it.copy(
                    selectedTimeRange = range,
                    selectedDate = null  // 清空单日选择
                )
            }
            loadAnalyticsData()
        }
    }

    /**
     * 选择单个日期（与selectedTimeRange互斥）
     */
    fun selectDate(date: String) {
        _uiState.update {
            it.copy(
                selectedDate = date,
                selectedTimeRange = null  // 清空范围选择
            )
        }
        loadDataForDate(date)
    }

    /**
     * 加载指定日期的详细数据
     */
    private fun loadDataForDate(date: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // 从workTimeTrend中找到对应日期的数据
                val dayWorkTime = _uiState.value.workTimeTrend.find { it.date == date }

                // 调用dashboard stats API获取当天的统计数据
                val dashboardStatsResult = analyticsRepository.getDashboardStats(date)

                // 调用任务列表API获取当天的任务明细
                val tasksResult = analyticsRepository.getTasksByWorkDate(date)

                val dayDetail = if (dashboardStatsResult.isSuccess && dayWorkTime != null) {
                    val stats = dashboardStatsResult.getOrNull()
                    val tasks = tasksResult.getOrNull() ?: emptyList()

                    // 将Task转换为TaskTimeEntry
                    val taskEntries = tasks.map { task ->
                        TaskTimeEntry(
                            taskId = task.id,
                            taskTitle = task.title,
                            projectName = task.projectName ?: "项目#${task.projectId}",
                            duration = 0f,  // TODO: 从work_hours字段获取
                            startTime = "00:00",  // TODO: 从timer logs获取
                            endTime = "00:00",
                            status = task.status.name.lowercase(),
                            isCompleted = task.status == TaskStatus.COMPLETED
                        )
                    }

                    DayDetail(
                        date = date,
                        weekday = getWeekdayLabel(date),
                        hours = dayWorkTime.hours,
                        tasksCompleted = stats?.today_tasks_completed ?: dayWorkTime.taskCount,
                        efficiency = 0f,  // TODO: 计算效率
                        taskEntries = taskEntries
                    )
                } else {
                    // 如果API调用失败，使用workTimeTrend的数据
                    DayDetail(
                        date = date,
                        weekday = getWeekdayLabel(date),
                        hours = dayWorkTime?.hours ?: 0f,
                        tasksCompleted = dayWorkTime?.taskCount ?: 0,
                        efficiency = 0f,
                        taskEntries = emptyList()
                    )
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        selectedDayDetail = dayDetail
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "加载数据失败: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * 获取星期标签
     */
    private fun getWeekdayLabel(dateString: String): String {
        return try {
            val date = LocalDate.parse(dateString)
            when (date.dayOfWeek.value) {
                1 -> "周一"
                2 -> "周二"
                3 -> "周三"
                4 -> "周四"
                5 -> "周五"
                6 -> "周六"
                7 -> "周日"
                else -> ""
            }
        } catch (e: Exception) {
            ""
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
        val selectedDate = _uiState.value.selectedDate
        if (selectedDate != null) {
            // 单日选择模式
            return selectedDate
        }

        val (startDate, endDate) = calculateDateRange(
            _uiState.value.selectedTimeRange,
            _uiState.value.customStartDate,
            _uiState.value.customEndDate
        )

        return if (_uiState.value.selectedTimeRange == TimeRange.CUSTOM_DATE) {
            "$startDate ~ $endDate"
        } else {
            _uiState.value.selectedTimeRange?.displayName ?: "本周"
        }
    }

    fun refresh() {
        loadAnalyticsData()
    }

    /**
     * 选择Tab（目前所有Tab都共享同一个数据加载逻辑）
     */
    fun selectTab(tab: AnalyticsTab) {
        _uiState.update { it.copy(selectedTab = tab) }
        // Phase 1: 暂时不实现懒加载，所有Tab都使用Overview的数据
        // Phase 2-5: 会为每个Tab实现独立的数据加载逻辑
    }

    /**
     * 根据TimeRange计算日期范围
     */
    fun calculateDateRange(
        timeRange: TimeRange?,
        customStart: LocalDate? = null,
        customEnd: LocalDate? = null
    ): Pair<String, String> {
        val today = LocalDate.now()
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

        return when (timeRange ?: TimeRange.THIS_WEEK) {
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
     * 确定时间粒度
     * Bug修复: 只有"今日"显示HOUR视图，昨日/前日显示最近7天的DAY视图
     * 本月/上月等长时间段显示WEEK视图
     */
    private fun determineTimeGranularity(days: Int, timeRange: TimeRange?): TimeGranularity {
        return when {
            timeRange == TimeRange.TODAY -> TimeGranularity.HOUR  // 只有今日显示小时粒度（0-当前小时）
            days <= 14 -> TimeGranularity.DAY     // 昨日/前日/本周：按天显示（会显示7天趋势）
            else -> TimeGranularity.WEEK          // 本月/上月等：按周显示
        }
    }

    /**
     * 处理工作时长趋势数据（根据粒度转换）
     */
    private fun processWorkTimeTrend(
        dailyStats: List<com.aiproj.mobile.data.api.DailyTimeStat>,
        granularity: TimeGranularity,
        days: Int,
        startDate: String,
        endDate: String
    ): List<DailyWorkTime> {
        return when (granularity) {
            TimeGranularity.HOUR -> {
                // 单日按小时显示：使用用户选择的日期（endDate）而不是dailyStats第一条
                // 从dailyStats中找到用户选择日期的数据
                val selectedDayData = dailyStats.find { it.date == endDate }
                val totalHours = selectedDayData?.hours ?: 0f
                val hourlyHours = totalHours / 8 // 假设工作8小时
                val selectedDate = endDate  // 使用用户选择的日期
                val today = LocalDate.now().toString()
                val isToday = selectedDate == today

                // 计算显示的小时范围
                val endHour = if (isToday) {
                    // 今日：显示0点到当前小时
                    LocalDate.now().atStartOfDay().plusHours(java.time.LocalTime.now().hour.toLong()).hour
                } else {
                    // 其他日期：显示完整24小时
                    23
                }

                (0..endHour).map { hour ->
                    val isWorkHour = hour in 9..17 // 9:00-17:00 工作时间
                    DailyWorkTime(
                        date = selectedDate,
                        dayLabel = String.format("%02d:00", hour),
                        hours = if (isWorkHour) hourlyHours else 0f,
                        taskCount = if (isWorkHour) selectedDayData?.taskCount?.div(8) ?: 0 else 0,
                        detailInfo = if (isWorkHour) "工作时段" else "非工作时段"
                    )
                }
            }
            TimeGranularity.DAY -> {
                // 按天显示
                dailyStats.map { daily ->
                    DailyWorkTime(
                        date = daily.date,
                        dayLabel = daily.label,
                        hours = daily.hours,
                        taskCount = daily.taskCount,
                        detailInfo = "${daily.date}: ${daily.hours}h, ${daily.taskCount}个任务"
                    )
                }
            }
            TimeGranularity.WEEK -> {
                // 按周聚合显示
                dailyStats.chunked(7).mapIndexed { weekIndex, weekData ->
                    val weekHours = weekData.sumOf { it.hours.toDouble() }.toFloat()
                    val weekTaskCount = weekData.sumOf { it.taskCount }
                    val startDate = weekData.firstOrNull()?.date ?: ""
                    val endDate = weekData.lastOrNull()?.date ?: ""

                    DailyWorkTime(
                        date = startDate,
                        dayLabel = "第${weekIndex + 1}周",
                        hours = weekHours,
                        taskCount = weekTaskCount,
                        detailInfo = "$startDate ~ $endDate: ${weekHours}h, ${weekTaskCount}个任务"
                    )
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
