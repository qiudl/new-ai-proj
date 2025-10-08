# Android App 性能优化指南

## 已实现的性能优化

### 1. UI性能优化

#### LazyColumn/LazyRow
- 所有列表使用 LazyColumn 实现（任务列表、项目列表、看板视图）
- 仅渲染可见项，自动回收不可见项
- 支持大数据量列表展示

#### Compose最佳实践
- 使用 remember 缓存昂贵计算
- 使用 derivedStateOf 优化派生状态
- 避免不必要的重组

### 2. 数据加载优化

#### 并行加载
```kotlin
coroutineScope {
    val statsDeferred = async { getDashboardStats() }
    val tasksDeferred = async { getTasks() }
    val projectsDeferred = async { getProjects() }

    // 并行执行，减少总耗时
}
```

#### 双层缓存
- 内存缓存：Map实现，快速访问
- 持久化缓存：DataStore，数据持久保存

### 3. 网络优化

#### OkHttp配置
- 连接超时：30秒
- 读取超时：30秒
- 写入超时：30秒
- HTTP日志拦截器（仅Debug模式）

#### JWT Token缓存
- 使用DataStore缓存token
- 避免重复登录请求

### 4. 内存管理

#### ViewModel生命周期
- 所有ViewModel使用Hilt注入
- 自动管理生命周期，避免内存泄漏
- viewModelScope自动取消协程

#### 图片加载
- 使用Coil库异步加载图片
- 自动内存缓存
- 磁盘缓存支持

## 性能监控建议

### 1. 使用Profiler
- Android Studio Profiler监控CPU、内存、网络
- LeakCanary检测内存泄漏

### 2. 性能指标
- 启动时间 < 2秒
- 列表滚动帧率 > 60fps
- 内存占用 < 200MB

### 3. 优化工具
- R8代码压缩和混淆
- ProGuard规则配置
- 启用Baseline Profile

## 进一步优化建议

### 1. 数据库优化
- 使用Room数据库本地缓存
- 实现离线优先策略

### 2. 图片优化
- WebP格式图片
- 图片压缩
- 占位符和渐进式加载

### 3. 代码优化
- 使用Kotlin协程替代回调
- 避免主线程阻塞
- 使用Flow进行响应式编程
