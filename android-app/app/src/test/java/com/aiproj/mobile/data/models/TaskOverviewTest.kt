package com.aiproj.mobile.data.models

import org.junit.Assert.*
import org.junit.Test

/**
 * 任务总览数据模型测试
 * Phase 4: 单元测试
 */
class TaskOverviewTest {

    @Test
    fun `SubtaskStats calculates completion rate correctly`() {
        val stats = SubtaskStats(
            total = 10,
            completed = 7,
            inProgress = 2,
            todo = 1
        )

        assertEquals(0.7f, stats.completionRate, 0.01f)
        assertEquals(70, stats.completedPercentage)
        assertEquals(20, stats.inProgressPercentage)
        assertEquals(10, stats.todoPercentage)
    }

    @Test
    fun `SubtaskStats handles zero total correctly`() {
        val stats = SubtaskStats(
            total = 0,
            completed = 0,
            inProgress = 0,
            todo = 0
        )

        assertEquals(0f, stats.completionRate, 0.01f)
        assertEquals(0, stats.completedPercentage)
        assertEquals(0, stats.inProgressPercentage)
        assertEquals(0, stats.todoPercentage)
    }

    @Test
    fun `SubtaskStats handles 100 percent completion`() {
        val stats = SubtaskStats(
            total = 5,
            completed = 5,
            inProgress = 0,
            todo = 0
        )

        assertEquals(1.0f, stats.completionRate, 0.01f)
        assertEquals(100, stats.completedPercentage)
    }

    @Test
    fun `PriorityDistribution calculates total correctly`() {
        val distribution = PriorityDistribution(
            high = 5,
            medium = 3,
            low = 2
        )

        assertEquals(10, distribution.total)
    }

    @Test
    fun `PriorityDistribution calculates percentages correctly`() {
        val distribution = PriorityDistribution(
            high = 5,
            medium = 3,
            low = 2
        )

        assertEquals(10, distribution.total)
        assertEquals(0.5f, distribution.highPercentage, 0.01f)
        assertEquals(0.3f, distribution.mediumPercentage, 0.01f)
        assertEquals(0.2f, distribution.lowPercentage, 0.01f)
    }

    @Test
    fun `PriorityDistribution handles zero total`() {
        val distribution = PriorityDistribution(
            high = 0,
            medium = 0,
            low = 0
        )

        assertEquals(0, distribution.total)
        assertEquals(0f, distribution.highPercentage, 0.01f)
        assertEquals(0f, distribution.mediumPercentage, 0.01f)
        assertEquals(0f, distribution.lowPercentage, 0.01f)
    }

    @Test
    fun `PriorityDistribution handles single priority`() {
        val distribution = PriorityDistribution(
            high = 10,
            medium = 0,
            low = 0
        )

        assertEquals(10, distribution.total)
        assertEquals(1.0f, distribution.highPercentage, 0.01f)
        assertEquals(0f, distribution.mediumPercentage, 0.01f)
        assertEquals(0f, distribution.lowPercentage, 0.01f)
    }

    @Test
    fun `TrendDataPoint calculates completion rate correctly`() {
        val point = TrendDataPoint(
            date = "2025-10-07",
            planned = 10,
            actual = 8
        )

        assertEquals(0.8f, point.completionRate, 0.01f)
    }

    @Test
    fun `TrendDataPoint handles exceeding planned completion`() {
        val point = TrendDataPoint(
            date = "2025-10-07",
            planned = 10,
            actual = 12
        )

        assertEquals(1.2f, point.completionRate, 0.01f)
    }

    @Test
    fun `TrendDataPoint handles zero planned`() {
        val point = TrendDataPoint(
            date = "2025-10-07",
            planned = 0,
            actual = 5
        )

        assertEquals(0f, point.completionRate, 0.01f)
    }

    @Test
    fun `TrendDataPoint handles zero actual and planned`() {
        val point = TrendDataPoint(
            date = "2025-10-07",
            planned = 0,
            actual = 0
        )

        assertEquals(0f, point.completionRate, 0.01f)
    }

    @Test
    fun `WorkTimeStats calculates correctly`() {
        val stats = WorkTimeStats(
            totalHours = 40f,
            averageHours = 8f,
            maxHours = 12f,
            minHours = 4f,
            taskCount = 5
        )

        assertEquals(40f, stats.totalHours, 0.01f)
        assertEquals(8f, stats.averageHours, 0.01f)
        assertEquals(12f, stats.maxHours, 0.01f)
        assertEquals(4f, stats.minHours, 0.01f)
        assertEquals(5, stats.taskCount)
    }

    @Test
    fun `TimeRange enum values are correct`() {
        assertEquals(0, TimeRange.TODAY.days)
        assertEquals(7, TimeRange.LAST_7_DAYS.days)
        assertEquals(30, TimeRange.LAST_30_DAYS.days)
        assertEquals(-1, TimeRange.THIS_MONTH.days)
        assertEquals(-2, TimeRange.CUSTOM.days)

        assertEquals("今天", TimeRange.TODAY.label)
        assertEquals("最近7天", TimeRange.LAST_7_DAYS.label)
        assertEquals("最近30天", TimeRange.LAST_30_DAYS.label)
        assertEquals("本月", TimeRange.THIS_MONTH.label)
        assertEquals("自定义", TimeRange.CUSTOM.label)
    }

    @Test
    fun `TopTaskItem calculates percentage correctly`() {
        val item = TopTaskItem(
            taskId = 1,
            title = "Test Task",
            status = TaskStatus.IN_PROGRESS,
            priority = TaskPriority.HIGH,
            workHours = 10f,
            percentage = 0.25f
        )

        assertEquals(0.25f, item.percentage, 0.01f)
    }
}
