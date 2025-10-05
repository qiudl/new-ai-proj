# Android App 层级任务管理 UI 设计方案（MVP）

## 📋 产品目标

为Android App设计一个支持层级展开的任务管理界面，让用户能够：
- 快速查看任务的父子关系
- 展开/收起子任务
- 清晰看到任务层级结构
- 高效管理复杂项目

---

## 🎯 MVP 核心功能

### 1. 层级可视化
- **缩进显示**：子任务向右缩进，最多支持3层
- **层级指示器**：使用视觉元素（线条/色块）表示层级
- **计数徽章**：显示子任务数量

### 2. 展开/收起交互
- **单击展开按钮**：展开/收起子任务
- **动画过渡**：平滑的展开/收起动画
- **状态保持**：记住用户的展开状态

### 3. 任务状态标识
- **完成度指示**：显示子任务完成比例
- **状态图标**：待办/进行中/已完成
- **优先级标记**：高/中/低优先级颜色

---

## 🎨 线框图设计

### 主界面布局
```
┌─────────────────────────────────────────┐
│  ← 任务列表                    [+] [⋮]  │
├─────────────────────────────────────────┤
│  🔍 搜索任务...           [筛选] [排序] │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ▼ [●] 开发用户管理模块      3/5  │ │
│  │     🕐 今天 14:30   👤 张三      │ │
│  ├───────────────────────────────────┤ │
│  │   │ [○] 设计数据库表结构         │ │
│  │   │   🕐 今天 10:00             │ │
│  ├───────────────────────────────────┤ │
│  │   │ [●] 实现用户登录API          │ │
│  │   │   🕐 昨天 16:30             │ │
│  ├───────────────────────────────────┤ │
│  │   │ [●] 编写单元测试             │ │
│  │   │   🕐 昨天 18:00             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ▶ [○] 优化前端性能           0/3  │ │
│  │     🕐 明天 09:00   👤 李四      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   [○] 修复登录页面BUG            │ │
│  │       🕐 今天 15:00   🔴 高优先级│ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 任务卡片组件详细设计

#### 父任务卡片（已展开）
```
┌─────────────────────────────────────────┐
│ ▼ [●] 开发用户管理模块            3/5   │
│     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│     60% 完成                            │
│     🕐 今天 14:30  👤 张三  🔴 高优先级 │
└─────────────────────────────────────────┘
```

#### 父任务卡片（已收起）
```
┌─────────────────────────────────────────┐
│ ▶ [○] 优化前端性能                 0/3  │
│     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│     0% 完成                             │
│     🕐 明天 09:00  👤 李四  🟡 中优先级 │
└─────────────────────────────────────────┘
```

#### 子任务卡片（1级缩进）
```
┌─────────────────────────────────────────┐
│   │ [○] 设计数据库表结构                │
│   │   🕐 今天 10:00  📎 有附件          │
└─────────────────────────────────────────┘
```

#### 叶子任务卡片（无子任务）
```
┌─────────────────────────────────────────┐
│   [○] 修复登录页面BUG                   │
│       🕐 今天 15:00  🔴 高优先级        │
└─────────────────────────────────────────┘
```

---

## 🔄 交互逻辑流程

### 1. 展开/收起流程
```
用户点击展开按钮 (▶)
    ↓
检查是否已加载子任务
    ├─ 是 → 直接展开，播放动画
    └─ 否 → 显示加载中
              ↓
         调用API获取子任务
              ↓
         ├─ 成功 → 渲染子任务，播放展开动画
         └─ 失败 → 显示错误提示
```

### 2. 任务状态切换流程
```
用户点击任务复选框
    ↓
更新本地UI状态（乐观更新）
    ↓
调用API更新任务状态
    ↓
├─ 成功 → 更新完成进度徽章
│          └─ 如果有父任务 → 更新父任务进度
└─ 失败 → 回滚UI状态，显示错误提示
```

### 3. 任务点击流程
```
用户点击任务卡片（非按钮区域）
    ↓
导航到任务详情页
    ↓
显示完整任务信息
    ├─ 基本信息（标题、描述、状态）
    ├─ 时间信息（创建、截止、更新时间）
    ├─ 协作信息（负责人、参与者）
    └─ 子任务列表（支持快速操作）
```

### 4. 长按操作流程
```
用户长按任务卡片
    ↓
显示快捷操作菜单
    ├─ 📝 编辑任务
    ├─ ➕ 添加子任务
    ├─ 🔗 复制链接
    ├─ ⭐ 标记重要
    ├─ 📅 设置提醒
    └─ 🗑️ 删除任务
```

---

## 🎨 视觉设计规范

### 颜色系统
```kotlin
// 优先级颜色
val PriorityHigh = Color(0xFFEF5350)    // 红色
val PriorityMedium = Color(0xFFFFA726)  // 橙色
val PriorityLow = Color(0xFF66BB6A)     // 绿色

// 状态颜色
val StatusTodo = Color(0xFF90A4AE)      // 灰色
val StatusInProgress = Color(0xFF42A5F5) // 蓝色
val StatusCompleted = Color(0xFF66BB6A) // 绿色

// 层级缩进颜色
val LevelIndicator1 = Color(0xFF1976D2)  // 深蓝
val LevelIndicator2 = Color(0xFF0288D1)  // 中蓝
val LevelIndicator3 = Color(0xFF0277BD)  // 浅蓝
```

### 尺寸规范
```kotlin
// 卡片间距
val CardSpacing = 8.dp
val CardPadding = 16.dp
val CardElevation = 2.dp

// 缩进尺寸
val IndentLevel1 = 24.dp
val IndentLevel2 = 48.dp
val IndentLevel3 = 72.dp

// 图标尺寸
val IconSizeSmall = 16.dp
val IconSizeMedium = 20.dp
val IconSizeLarge = 24.dp

// 字体大小
val FontSizeTitle = 16.sp
val FontSizeSubtitle = 14.sp
val FontSizeCaption = 12.sp
```

### 动画参数
```kotlin
// 展开/收起动画
val ExpandDuration = 300.milliseconds
val ExpandEasing = FastOutSlowInEasing

// 状态切换动画
val StateChangeDuration = 200.milliseconds
val StateChangeEasing = LinearOutSlowInEasing

// 列表项动画
val ItemEnterDuration = 250.milliseconds
val ItemExitDuration = 200.milliseconds
```

---

## 📱 核心组件设计

### 1. HierarchicalTaskItem 组件
```kotlin
@Composable
fun HierarchicalTaskItem(
    task: Task,
    level: Int,
    isExpanded: Boolean,
    onExpandClick: () -> Unit,
    onTaskClick: () -> Unit,
    onStatusChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = (level * IndentLevel1))
            .clickable { onTaskClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = CardElevation)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(CardPadding),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 展开按钮（仅父任务）
            if (task.hasChildren) {
                IconButton(onClick = onExpandClick) {
                    Icon(
                        imageVector = if (isExpanded)
                            Icons.Default.ExpandMore
                        else
                            Icons.Default.ChevronRight,
                        contentDescription = if (isExpanded) "收起" else "展开"
                    )
                }
            } else {
                Spacer(modifier = Modifier.width(48.dp))
            }

            // 状态复选框
            Checkbox(
                checked = task.status == TaskStatus.COMPLETED,
                onCheckedChange = onStatusChange
            )

            // 层级指示器
            if (level > 0) {
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height(24.dp)
                        .background(getLevelColor(level))
                )
                Spacer(modifier = Modifier.width(8.dp))
            }

            // 任务信息
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = task.title,
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    // 子任务计数徽章
                    if (task.hasChildren) {
                        Spacer(modifier = Modifier.width(8.dp))
                        SubtaskBadge(
                            completed = task.completedSubtasks,
                            total = task.totalSubtasks
                        )
                    }
                }

                // 元信息行
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 时间
                    if (task.dueDate != null) {
                        TaskMetaInfo(
                            icon = Icons.Default.Schedule,
                            text = formatDueDate(task.dueDate)
                        )
                    }

                    // 负责人
                    if (task.assignee != null) {
                        TaskMetaInfo(
                            icon = Icons.Default.Person,
                            text = task.assignee.name
                        )
                    }

                    // 优先级
                    PriorityIndicator(priority = task.priority)
                }

                // 进度条（仅父任务）
                if (task.hasChildren) {
                    LinearProgressIndicator(
                        progress = task.completionProgress,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        color = StatusInProgress
                    )
                }
            }
        }
    }
}
```

### 2. HierarchicalTaskList 组件
```kotlin
@Composable
fun HierarchicalTaskList(
    tasks: List<Task>,
    expandedTaskIds: Set<Int>,
    onTaskExpand: (taskId: Int) -> Unit,
    onTaskClick: (task: Task) -> Unit,
    onTaskStatusChange: (task: Task, completed: Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = tasks,
            key = { it.id }
        ) { task ->
            AnimatedVisibility(
                visible = true,
                enter = expandVertically(
                    animationSpec = tween(
                        durationMillis = ItemEnterDuration.inWholeMilliseconds.toInt(),
                        easing = FastOutSlowInEasing
                    )
                ) + fadeIn(),
                exit = shrinkVertically(
                    animationSpec = tween(
                        durationMillis = ItemExitDuration.inWholeMilliseconds.toInt()
                    )
                ) + fadeOut()
            ) {
                Column {
                    HierarchicalTaskItem(
                        task = task,
                        level = task.level,
                        isExpanded = task.id in expandedTaskIds,
                        onExpandClick = { onTaskExpand(task.id) },
                        onTaskClick = { onTaskClick(task) },
                        onStatusChange = { completed ->
                            onTaskStatusChange(task, completed)
                        }
                    )

                    // 渲染子任务
                    if (task.id in expandedTaskIds && task.children.isNotEmpty()) {
                        task.children.forEach { childTask ->
                            HierarchicalTaskItem(
                                task = childTask,
                                level = childTask.level,
                                isExpanded = childTask.id in expandedTaskIds,
                                onExpandClick = { onTaskExpand(childTask.id) },
                                onTaskClick = { onTaskClick(childTask) },
                                onStatusChange = { completed ->
                                    onTaskStatusChange(childTask, completed)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
```

---

## 🔧 数据模型

### Task 数据类扩展
```kotlin
data class Task(
    val id: Int,
    val title: String,
    val description: String?,
    val status: TaskStatus,
    val priority: TaskPriority,
    val assignee: User?,
    val dueDate: LocalDateTime?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,

    // 层级相关字段
    val parentId: Int?,
    val level: Int,
    val hasChildren: Boolean,
    val children: List<Task> = emptyList(),

    // 子任务统计
    val totalSubtasks: Int = 0,
    val completedSubtasks: Int = 0,
    val completionProgress: Float = 0f,

    // UI状态
    val isExpanded: Boolean = false
)

enum class TaskStatus {
    TODO,
    IN_PROGRESS,
    COMPLETED,
    BLOCKED,
    CANCELLED
}

enum class TaskPriority {
    LOW,
    MEDIUM,
    HIGH
}
```

### ViewModel 状态管理
```kotlin
data class TaskListUiState(
    val tasks: List<Task> = emptyList(),
    val expandedTaskIds: Set<Int> = emptySet(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val filterConfig: TaskFilterConfig = TaskFilterConfig(),
    val sortConfig: TaskSortConfig = TaskSortConfig()
)

class TaskListViewModel @Inject constructor(
    private val taskRepository: TaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TaskListUiState())
    val uiState: StateFlow<TaskListUiState> = _uiState.asStateFlow()

    fun toggleTaskExpansion(taskId: Int) {
        _uiState.update { currentState ->
            val newExpandedIds = if (taskId in currentState.expandedTaskIds) {
                currentState.expandedTaskIds - taskId
            } else {
                currentState.expandedTaskIds + taskId
            }
            currentState.copy(expandedTaskIds = newExpandedIds)
        }

        // 如果未加载子任务，则加载
        val task = _uiState.value.tasks.find { it.id == taskId }
        if (task != null && task.hasChildren && task.children.isEmpty()) {
            loadSubtasks(taskId)
        }
    }

    private fun loadSubtasks(parentId: Int) {
        viewModelScope.launch {
            try {
                val subtasks = taskRepository.getSubtasks(parentId)
                _uiState.update { state ->
                    val updatedTasks = state.tasks.map { task ->
                        if (task.id == parentId) {
                            task.copy(children = subtasks)
                        } else task
                    }
                    state.copy(tasks = updatedTasks)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun updateTaskStatus(task: Task, completed: Boolean) {
        viewModelScope.launch {
            try {
                val newStatus = if (completed) TaskStatus.COMPLETED else TaskStatus.TODO
                taskRepository.updateTaskStatus(task.id, newStatus)

                // 乐观更新UI
                _uiState.update { state ->
                    val updatedTasks = updateTaskInList(state.tasks, task.id, newStatus)
                    state.copy(tasks = updatedTasks)
                }

                // 更新父任务进度
                if (task.parentId != null) {
                    refreshParentTaskProgress(task.parentId)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
}
```

---

## 🚀 MVP 开发计划

### Phase 1: 基础层级展示（2小时）
- [ ] 创建 HierarchicalTaskItem 组件
- [ ] 实现缩进视觉效果
- [ ] 添加层级指示器
- [ ] 基础数据绑定

### Phase 2: 展开/收起交互（2小时）
- [ ] 实现展开/收起逻辑
- [ ] 添加展开动画
- [ ] 状态持久化
- [ ] 懒加载子任务

### Phase 3: 任务操作功能（2小时）
- [ ] 任务状态切换
- [ ] 完成度计算
- [ ] 父任务进度更新
- [ ] 错误处理和重试

### Phase 4: 视觉优化（1小时）
- [ ] 完善动画效果
- [ ] 优化颜色和间距
- [ ] 添加加载状态
- [ ] 空状态处理

### Phase 5: 测试和优化（1小时）
- [ ] 性能测试
- [ ] 边界情况处理
- [ ] 用户体验优化
- [ ] Bug修复

**总计：8小时（AI效率）**

---

## 🎯 成功指标

1. **功能完整性**
   - ✅ 支持3层任务层级
   - ✅ 流畅的展开/收起动画
   - ✅ 准确的完成度计算

2. **性能指标**
   - 列表滚动FPS ≥ 60
   - 展开动画延迟 < 50ms
   - 大列表（100+项）流畅滚动

3. **用户体验**
   - 操作响应时间 < 100ms
   - 视觉层级清晰
   - 交互符合直觉

---

## 📚 后续迭代方向

### V2 功能增强
- 拖拽排序和调整层级
- 批量操作（批量完成、批量移动）
- 任务搜索高亮
- 快捷键支持

### V3 高级功能
- 甘特图视图
- 看板视图切换
- 自定义视图配置
- 离线编辑支持

### V4 协作功能
- 实时协作编辑
- 任务评论和讨论
- 变更历史追踪
- 通知和提醒

---

**设计时间**: 2025-10-05
**设计者**: AI Product Manager
**版本**: MVP v1.0
