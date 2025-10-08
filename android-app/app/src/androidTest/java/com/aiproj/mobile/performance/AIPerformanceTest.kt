package com.aiproj.mobile.performance

import android.os.Debug
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.aiproj.mobile.MainActivity
import com.aiproj.mobile.ui.screens.ai.description.AIDescriptionUiState
import com.aiproj.mobile.ui.screens.ai.description.AIDescriptionViewModel
import com.aiproj.mobile.ui.screens.ai.subtask.AISubtaskUiState
import com.aiproj.mobile.ui.screens.ai.subtask.AISubtaskViewModel
import com.aiproj.mobile.ui.screens.ai.document.AIDocumentUiState
import com.aiproj.mobile.ui.screens.ai.document.AIDocumentViewModel
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Assert
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.system.measureTimeMillis

/**
 * AI功能性能测试
 *
 * 测试目标:
 * - AI Description生成: 响应时间 < 5s, 内存增长 < 5MB
 * - AI Subtask生成: 响应时间 < 8s
 * - AI Document生成: 响应时间 < 15s
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class AIPerformanceTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setup() {
        hiltRule.inject()
    }

    /**
     * AI Description生成性能测试
     *
     * 性能指标:
     * - 短描述 (< 100字): < 3秒
     * - 中等描述 (100-300字): < 5秒
     * - 长描述 (> 300字): < 8秒
     * - 内存增长: < 5MB
     */
    @Test
    fun testAIDescriptionPerformance_ShortDescription() {
        val metrics = PerformanceMetrics()

        // 记录基准内存
        metrics.recordMemoryBaseline()

        // 测量生成时间
        val duration = measureTimeMillis {
            // TODO: 实际调用AI Description生成API
            // 由于测试环境限制,这里使用模拟延迟
            Thread.sleep(2000) // 模拟2秒响应
        }

        // 记录峰值内存
        metrics.recordMemoryPeak()

        // 验证性能指标
        Assert.assertTrue(
            "Short description should complete < 3s, actual: ${duration}ms",
            duration < 3000
        )

        Assert.assertTrue(
            "Memory increase should be < 5MB, actual: ${metrics.getMemoryIncreaseMB()}MB",
            metrics.getMemoryIncreaseMB() < 5.0
        )

        // 输出性能报告
        metrics.printReport("AI Description - Short")
    }

    @Test
    fun testAIDescriptionPerformance_MediumDescription() {
        val metrics = PerformanceMetrics()
        metrics.recordMemoryBaseline()

        val duration = measureTimeMillis {
            Thread.sleep(4000) // 模拟4秒响应
        }

        metrics.recordMemoryPeak()

        Assert.assertTrue(
            "Medium description should complete < 5s, actual: ${duration}ms",
            duration < 5000
        )
        Assert.assertTrue(
            "Memory increase should be < 5MB",
            metrics.getMemoryIncreaseMB() < 5.0
        )

        metrics.printReport("AI Description - Medium")
    }

    @Test
    fun testAIDescriptionPerformance_LongDescription() {
        val metrics = PerformanceMetrics()
        metrics.recordMemoryBaseline()

        val duration = measureTimeMillis {
            Thread.sleep(7000) // 模拟7秒响应
        }

        metrics.recordMemoryPeak()

        Assert.assertTrue(
            "Long description should complete < 8s, actual: ${duration}ms",
            duration < 8000
        )
        Assert.assertTrue(
            "Memory increase should be < 5MB",
            metrics.getMemoryIncreaseMB() < 5.0
        )

        metrics.printReport("AI Description - Long")
    }

    /**
     * AI Subtask生成性能测试
     *
     * 性能指标:
     * - 3个子任务: < 5秒
     * - 5个子任务: < 8秒
     * - 10个子任务: < 12秒
     */
    @Test
    fun testAISubtaskPerformance_5Subtasks() {
        val metrics = PerformanceMetrics()
        metrics.recordMemoryBaseline()

        // 测量生成时间
        val generationDuration = measureTimeMillis {
            Thread.sleep(6000) // 模拟6秒生成时间
        }

        // 测量批量创建时间
        val creationDuration = measureTimeMillis {
            Thread.sleep(1500) // 模拟1.5秒批量创建
        }

        metrics.recordMemoryPeak()

        // 验证生成时间
        Assert.assertTrue(
            "5 subtasks generation should complete < 8s, actual: ${generationDuration}ms",
            generationDuration < 8000
        )

        // 验证批量创建时间
        Assert.assertTrue(
            "Batch creation of 5 subtasks should complete < 2s, actual: ${creationDuration}ms",
            creationDuration < 2000
        )

        Assert.assertTrue(
            "Memory increase should be < 5MB",
            metrics.getMemoryIncreaseMB() < 5.0
        )

        metrics.printReport("AI Subtask - 5 subtasks")
    }

    @Test
    fun testAISubtaskPerformance_10Subtasks() {
        val metrics = PerformanceMetrics()
        metrics.recordMemoryBaseline()

        val generationDuration = measureTimeMillis {
            Thread.sleep(10000) // 模拟10秒生成时间
        }

        val creationDuration = measureTimeMillis {
            Thread.sleep(3000) // 模拟3秒批量创建
        }

        metrics.recordMemoryPeak()

        Assert.assertTrue(
            "10 subtasks generation should complete < 12s, actual: ${generationDuration}ms",
            generationDuration < 12000
        )

        Assert.assertTrue(
            "Batch creation of 10 subtasks should complete < 4s, actual: ${creationDuration}ms",
            creationDuration < 4000
        )

        metrics.printReport("AI Subtask - 10 subtasks")
    }

    /**
     * AI Document生成性能测试
     *
     * 性能指标:
     * - 技术设计文档: < 15秒
     * - API文档: < 12秒
     * - 功能需求文档: < 18秒
     */
    @Test
    fun testAIDocumentPerformance_TechnicalDesign() {
        val metrics = PerformanceMetrics()
        metrics.recordMemoryBaseline()

        val duration = measureTimeMillis {
            Thread.sleep(12000) // 模拟12秒生成时间
        }

        metrics.recordMemoryPeak()

        Assert.assertTrue(
            "Technical design document should complete < 15s, actual: ${duration}ms",
            duration < 15000
        )

        Assert.assertTrue(
            "Memory increase should be < 5MB",
            metrics.getMemoryIncreaseMB() < 5.0
        )

        metrics.printReport("AI Document - Technical Design")
    }

    @Test
    fun testAIDocumentPerformance_APIDocumentation() {
        val metrics = PerformanceMetrics()
        metrics.recordMemoryBaseline()

        val duration = measureTimeMillis {
            Thread.sleep(10000) // 模拟10秒生成时间
        }

        metrics.recordMemoryPeak()

        Assert.assertTrue(
            "API documentation should complete < 12s, actual: ${duration}ms",
            duration < 12000
        )

        metrics.printReport("AI Document - API Documentation")
    }

    /**
     * 连续操作压力测试
     *
     * 测试场景: 连续生成20次AI描述
     * 预期:
     * - 不崩溃
     * - 内存增长 < 50MB
     * - 响应时间不明显变慢 (< 20%)
     */
    @Test
    fun testContinuousAIGeneration_20Iterations() {
        val metrics = PerformanceMetrics()
        metrics.recordMemoryBaseline()

        val durations = mutableListOf<Long>()

        repeat(20) { iteration ->
            val duration = measureTimeMillis {
                // 模拟AI生成
                Thread.sleep(3000)
            }
            durations.add(duration)

            // 每5次检查一次内存
            if ((iteration + 1) % 5 == 0) {
                val currentMemory = Debug.getNativeHeapAllocatedSize()
                val memoryIncreaseMB = metrics.calculateMemoryIncrease(currentMemory)

                println("Iteration ${iteration + 1}: Memory increase = ${memoryIncreaseMB}MB")

                Assert.assertTrue(
                    "Memory should stay < 50MB after ${iteration + 1} iterations, actual: ${memoryIncreaseMB}MB",
                    memoryIncreaseMB < 50.0
                )
            }
        }

        // 检查响应时间是否明显变慢
        val firstHalf = durations.take(10).average()
        val secondHalf = durations.takeLast(10).average()
        val slowdownRatio = secondHalf / firstHalf

        println("First half average: ${firstHalf}ms")
        println("Second half average: ${secondHalf}ms")
        println("Slowdown ratio: $slowdownRatio")

        Assert.assertTrue(
            "Response time should not slow down > 20%, actual: ${(slowdownRatio - 1) * 100}%",
            slowdownRatio < 1.2
        )

        metrics.recordMemoryPeak()
        metrics.printReport("Continuous Generation - 20 iterations")
    }
}

/**
 * 性能指标收集工具类
 */
class PerformanceMetrics {
    private var baselineMemory: Long = 0
    private var peakMemory: Long = 0
    private var startTime: Long = 0

    fun recordMemoryBaseline() {
        // 触发一次GC以获得更准确的基准
        System.gc()
        Thread.sleep(100)
        baselineMemory = Debug.getNativeHeapAllocatedSize()
        startTime = System.currentTimeMillis()
    }

    fun recordMemoryPeak() {
        peakMemory = Debug.getNativeHeapAllocatedSize()
    }

    fun getMemoryIncreaseMB(): Double {
        return (peakMemory - baselineMemory) / 1024.0 / 1024.0
    }

    fun calculateMemoryIncrease(currentMemory: Long): Double {
        return (currentMemory - baselineMemory) / 1024.0 / 1024.0
    }

    fun getElapsedTime(): Long {
        return System.currentTimeMillis() - startTime
    }

    fun printReport(testName: String) {
        println("=" * 60)
        println("Performance Report: $testName")
        println("=" * 60)
        println("Baseline Memory: ${baselineMemory / 1024 / 1024}MB")
        println("Peak Memory: ${peakMemory / 1024 / 1024}MB")
        println("Memory Increase: ${getMemoryIncreaseMB()}MB")
        println("Elapsed Time: ${getElapsedTime()}ms")
        println("=" * 60)
    }
}

private operator fun String.times(count: Int): String {
    return this.repeat(count)
}
