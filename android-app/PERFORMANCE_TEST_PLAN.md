# Android App AI功能性能测试计划

## 概述

本文档定义了Android App AI功能的性能测试标准、测试方法和测试指标。

## 性能测试目标

- 确保AI生成功能响应时间在可接受范围内
- 监控内存使用，避免内存泄漏
- 优化网络请求，减少用户等待时间
- 确保UI保持流畅，不卡顿

## 测试环境

### 硬件配置
- **测试设备**:
  - 低端设备: Android 8.0 (API 26), 2GB RAM
  - 中端设备: Android 11 (API 30), 4GB RAM
  - 高端设备: Android 14 (API 34), 8GB+ RAM
- **网络环境**:
  - WiFi (100 Mbps)
  - 4G (10 Mbps)
  - 3G (1 Mbps)

### 软件配置
- Android Studio Profiler
- Firebase Performance Monitoring
- LeakCanary (内存泄漏检测)

## 测试指标

### 1. AI Description Generation (AI描述生成)

#### 响应时间指标
- **目标**: < 5秒 (90th percentile)
- **最大可接受**: < 10秒
- **测试场景**:
  - 短描述 (< 100字): < 3秒
  - 中等描述 (100-300字): < 5秒
  - 长描述 (> 300字): < 8秒

#### 内存使用指标
- **基准内存**: 启动后内存占用 (baseline)
- **峰值内存**: 生成过程中最大内存
- **内存增长**: 每次生成后的内存增长应 < 5MB
- **GC频率**: 不应触发频繁的Full GC

#### 测试方法
```kotlin
@Test
fun testAIDescriptionPerformance() {
    val startMemory = Debug.getNativeHeapAllocatedSize()
    val startTime = System.currentTimeMillis()

    // Execute AI description generation
    viewModel.generateDescription(
        taskId = 123,
        length = "medium",
        style = "technical"
    )

    // Wait for completion
    composeTestRule.waitUntil(timeout = 10000) {
        viewModel.uiState.value is AIDescriptionUiState.Success
    }

    val endTime = System.currentTimeMillis()
    val endMemory = Debug.getNativeHeapAllocatedSize()

    val duration = endTime - startTime
    val memoryIncrease = (endMemory - startMemory) / 1024 / 1024 // MB

    // Assertions
    Assert.assertTrue("Response time should be < 5s", duration < 5000)
    Assert.assertTrue("Memory increase should be < 5MB", memoryIncrease < 5)
}
```

### 2. AI Subtask Generation (AI子任务生成)

#### 响应时间指标
- **目标**: < 8秒 (90th percentile)
- **最大可接受**: < 15秒
- **测试场景**:
  - 3个子任务: < 5秒
  - 5个子任务: < 8秒
  - 10个子任务: < 12秒

#### 批量创建性能
- **单个子任务创建**: < 500ms
- **批量创建5个**: < 2秒
- **批量创建10个**: < 4秒

#### 测试方法
```kotlin
@Test
fun testAISubtaskGenerationPerformance() {
    val metrics = PerformanceMetrics()

    // Generate subtasks
    metrics.start("generation")
    viewModel.generateSubtasks(
        taskId = 123,
        count = 5,
        includeEstimates = true
    )

    composeTestRule.waitUntil(timeout = 15000) {
        viewModel.uiState.value is AISubtaskUiState.Success
    }
    metrics.end("generation")

    // Batch create
    metrics.start("batch_create")
    viewModel.createSubtasks()

    composeTestRule.waitUntil(timeout = 5000) {
        viewModel.uiState.value is AISubtaskUiState.Created
    }
    metrics.end("batch_create")

    // Assertions
    Assert.assertTrue("Generation < 8s", metrics.getDuration("generation") < 8000)
    Assert.assertTrue("Batch create < 2s", metrics.getDuration("batch_create") < 2000)
}
```

### 3. AI Document Generation (AI文档生成)

#### 响应时间指标
- **目标**: < 15秒 (90th percentile)
- **最大可接受**: < 30秒
- **测试场景**:
  - 技术设计文档: < 15秒
  - API文档: < 12秒
  - 功能需求文档: < 18秒

#### 文档大小与性能
- < 1000字: < 10秒
- 1000-3000字: < 15秒
- 3000-5000字: < 25秒

#### 测试方法
```kotlin
@Test
fun testAIDocumentGenerationPerformance() {
    val startTime = System.currentTimeMillis()

    viewModel.generateDocument(
        type = "technical_design",
        template = "standard",
        requirements = "详细的系统架构说明"
    )

    composeTestRule.waitUntil(timeout = 30000) {
        viewModel.uiState.value is AIDocumentUiState.Success
    }

    val duration = System.currentTimeMillis() - startTime

    Assert.assertTrue("Document generation < 15s", duration < 15000)
}
```

## UI性能测试

### 列表滚动性能
- **FPS目标**: 稳定在 60 FPS
- **卡顿指标**: Frame drop < 3 frames/second
- **测试场景**:
  - 100个任务列表滚动
  - 50个子任务展开/收起
  - 文档预览滚动

### 测试方法
使用 Android Studio Profiler 的 Frame Rendering 功能:
1. 启动应用并打开任务列表
2. 开始录制性能数据
3. 快速滚动列表
4. 分析帧渲染时间

## 网络性能测试

### API请求优化
- **并发请求**: 最多3个并发请求
- **请求超时**: 30秒
- **重试机制**: 最多3次重试，指数退避

### 测试场景
```kotlin
@Test
fun testNetworkPerformance() {
    // 模拟慢速网络
    networkSimulator.setSpeed("3G") // 1 Mbps

    val startTime = System.currentTimeMillis()

    viewModel.generateDescription(123, "medium", "technical")

    composeTestRule.waitUntil(timeout = 30000) {
        viewModel.uiState.value !is AIDescriptionUiState.Loading
    }

    val duration = System.currentTimeMillis() - startTime

    // 在3G网络下，应该在30秒内完成
    Assert.assertTrue("3G network should complete < 30s", duration < 30000)
}
```

## 内存泄漏测试

### 使用LeakCanary
1. 在debug版本中集成LeakCanary
2. 执行所有AI功能操作
3. 多次重复生成操作
4. 检查是否有内存泄漏报告

### 关键检查点
- ViewModel是否正确清理
- Coroutines是否正确取消
- Observers是否正确解注册
- Bitmaps是否正确回收

## 电池消耗测试

### 测试方法
使用 Battery Historian 工具:
1. 启动应用
2. 连续执行20次AI生成操作
3. 记录电池消耗百分比
4. 分析CPU/Network/Wake Lock使用

### 目标指标
- **20次AI操作总电量消耗**: < 5%
- **待机时电量消耗**: < 0.1%/小时

## 冷启动/热启动性能

### 冷启动
- **目标**: < 2秒到达主界面
- **测试**: 完全杀死应用后重新启动

### 热启动
- **目标**: < 500ms
- **测试**: 应用在后台，切回前台

### 测试方法
```bash
# 冷启动测试
adb shell am force-stop com.aiproj.mobile
adb shell am start-activity -W com.aiproj.mobile/.MainActivity

# 热启动测试
adb shell am start-activity -W com.aiproj.mobile/.MainActivity
```

## 压力测试

### 连续操作测试
- **场景**: 连续生成50次AI描述
- **预期**:
  - 不崩溃
  - 不出现ANR
  - 内存增长 < 50MB
  - 响应时间不明显变慢

### 测试代码
```kotlin
@Test
fun testContinuousAIGeneration() {
    val initialMemory = Debug.getNativeHeapAllocatedSize()
    val durations = mutableListOf<Long>()

    repeat(50) { i ->
        val startTime = System.currentTimeMillis()

        viewModel.generateDescription(i, "short", "technical")

        composeTestRule.waitUntil(timeout = 10000) {
            viewModel.uiState.value is AIDescriptionUiState.Success
        }

        durations.add(System.currentTimeMillis() - startTime)
        viewModel.reset()

        // 每10次检查一次内存
        if ((i + 1) % 10 == 0) {
            val currentMemory = Debug.getNativeHeapAllocatedSize()
            val memoryIncrease = (currentMemory - initialMemory) / 1024 / 1024
            Assert.assertTrue("Memory < 50MB after ${i+1} ops", memoryIncrease < 50)
        }
    }

    // 检查响应时间没有明显变慢
    val firstHalf = durations.take(25).average()
    val secondHalf = durations.takeLast(25).average()
    val slowdownRatio = secondHalf / firstHalf

    Assert.assertTrue("Response time should not slow down > 20%", slowdownRatio < 1.2)
}
```

## 数据上报

### 性能指标上报
使用 Firebase Performance Monitoring 记录:
- 每次AI生成的响应时间
- 成功率/失败率
- 内存使用情况
- 网络请求时间

### 自定义Trace
```kotlin
val trace = Firebase.performance.newTrace("ai_description_generation")
trace.start()

try {
    // AI generation logic
    trace.putAttribute("length", length)
    trace.putAttribute("style", style)
    trace.incrementMetric("success_count", 1)
} catch (e: Exception) {
    trace.incrementMetric("error_count", 1)
} finally {
    trace.stop()
}
```

## 测试报告模板

### 每次测试后生成报告

```markdown
## 性能测试报告 - [日期]

### 测试环境
- 设备: [设备型号]
- Android版本: [版本]
- App版本: [版本]
- 网络: [WiFi/4G/3G]

### 测试结果

#### AI Description Generation
- 平均响应时间: [X]秒
- 90th percentile: [X]秒
- 99th percentile: [X]秒
- 内存增长: [X]MB
- 成功率: [X]%

#### AI Subtask Generation
- 平均响应时间: [X]秒
- 批量创建时间: [X]秒
- 内存增长: [X]MB
- 成功率: [X]%

#### AI Document Generation
- 平均响应时间: [X]秒
- 内存增长: [X]MB
- 成功率: [X]%

### 问题发现
- [列出发现的性能问题]

### 优化建议
- [列出优化建议]
```

## 性能优化建议

### 1. 网络优化
- 使用OkHttp连接池
- 启用HTTP/2
- 合理设置超时时间
- 实现请求缓存

### 2. 内存优化
- 及时释放大对象
- 使用弱引用缓存
- 避免内存泄漏
- 合理使用Bitmap

### 3. UI优化
- 使用LazyColumn/LazyRow
- 避免过度绘制
- 合理使用remember
- 减少重组范围

### 4. 代码优化
- 使用协程合理调度
- 避免主线程阻塞
- 使用Flow代替LiveData
- 优化数据结构

## 持续监控

### 生产环境监控
- Firebase Performance Monitoring
- Crashlytics错误报告
- 用户反馈分析
- Play Console Vitals

### 监控指标
- 崩溃率 < 1%
- ANR率 < 0.5%
- 启动时间 < 2秒
- 帧率 > 55 FPS

## 总结

性能测试是一个持续的过程，需要在开发的每个阶段都进行测试和优化。通过以上测试计划，我们可以确保Android App AI功能在各种设备和网络环境下都能提供良好的用户体验。
