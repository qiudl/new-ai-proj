# 时间管理首页"今日任务统计"计算公式设计

## 概述

时间管理首页的"今日任务统计"模块通过多维度数据分析，为用户提供全面的工作效率洞察。本文档详细说明了各项统计指标的计算逻辑和公式。

## 1. 数据获取范围

### 1.1 今日相关任务筛选规则

**筛选条件（OR逻辑）：**
- 今日到期的任务: `due_date = TODAY`
- 今日创建的任务: `created_at = TODAY`
- 今日更新的任务: `updated_at = TODAY AND updated_at != created_at`
- 正在进行中的任务: `status = 'in_progress'`（不限日期）
- 逾期未完成的任务: `due_date < TODAY AND status != 'completed'`

**排除条件：**
- 已取消的任务: `status != 'cancelled'`

## 2. 基础统计指标

### 2.1 任务数量统计

```typescript
// 总任务数
totalTasks = todayTasks.length

// 按状态分类
completedTasks = todayTasks.filter(task => task.status === 'completed').length
inProgressTasks = todayTasks.filter(task => task.status === 'in_progress').length
todoTasks = todayTasks.filter(task => task.status === 'todo').length

// 逾期任务数
overdueTasks = todayTasks.filter(task => {
  return task.due_date && 
         task.status !== 'completed' && 
         dayjs(task.due_date).isBefore(dayjs(), 'day')
}).length
```

### 2.2 完成率计算

```typescript
// 基础完成率
completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

// 按时完成率（在截止日期前完成的任务占比）
onTimeCompletedTasks = todayTasks.filter(task => {
  if (task.status !== 'completed' || !task.due_date || !task.updated_at) return false
  const dueDate = dayjs(task.due_date).endOf('day')
  const completedDate = dayjs(task.updated_at)
  return completedDate.isSameOrBefore(dueDate)
}).length

tasksWithDueDate = todayTasks.filter(task => 
  task.due_date && task.status === 'completed'
).length

onTimeCompletionRate = tasksWithDueDate > 0 ? 
  Math.round((onTimeCompletedTasks / tasksWithDueDate) * 100) : 100
```

## 3. 时间统计指标

### 3.1 时间数据来源

**数据优先级：**
1. `total_time_seconds` - 计时器记录的实际工作时间
2. `actual_hours` - 手动录入的实际工时
3. `estimated_hours` 或 `custom_fields.estimated_hours` - 预估工时

### 3.2 时间计算公式

```typescript
// 计划时间统计（分钟）
totalPlannedTime = todayTasks.reduce((sum, task) => {
  const estimatedHours = task.estimated_hours || task.custom_fields?.estimated_hours || 0
  const plannedMinutes = (typeof estimatedHours === 'number' ? estimatedHours : 0) * 60
  return sum + plannedMinutes
}, 0)

// 实际时间统计（分钟）
totalActualTime = todayTasks.reduce((sum, task) => {
  let actualMinutes = 0
  
  // 优先使用计时器时间
  if (task.total_time_seconds) {
    actualMinutes += Math.round(task.total_time_seconds / 60)
  }
  
  // 补充手动录入的工时
  if (task.actual_hours) {
    actualMinutes += (typeof task.actual_hours === 'number' ? task.actual_hours : 0) * 60
  }
  
  return sum + actualMinutes
}, 0)

// 剩余工作时间（仅未完成任务）
totalRemainingTime = todayTasks
  .filter(task => task.status !== 'completed')
  .reduce((sum, task) => {
    const estimatedHours = task.estimated_hours || task.custom_fields?.estimated_hours || 0
    const plannedMinutes = (typeof estimatedHours === 'number' ? estimatedHours : 0) * 60
    return sum + plannedMinutes
  }, 0)
```

### 3.3 时间效率计算

```typescript
// 时间效率 = 实际时间 / 计划时间 * 100%
timeEfficiency = totalPlannedTime > 0 ? 
  Math.round((totalActualTime / totalPlannedTime) * 100) : 0

// 效率评级
function getEfficiencyLevel(efficiency: number) {
  if (efficiency <= 80) return { level: '高效', color: '#52c41a' }     // 比预期快20%以上
  if (efficiency <= 110) return { level: '正常', color: '#1890ff' }    // 在预期范围内
  if (efficiency <= 150) return { level: '偏慢', color: '#fa8c16' }    // 比预期慢50%以内
  return { level: '需改进', color: '#ff4d4f' }                         // 比预期慢50%以上
}

// 预估剩余工作量（小时，保留一位小数）
estimatedWorkload = Math.round(totalRemainingTime / 60 * 10) / 10

// 平均任务时长（分钟）
completedTasksCount = todayTasks.filter(task => task.status === 'completed').length
avgTaskDuration = completedTasksCount > 0 ? 
  Math.round(totalActualTime / completedTasksCount) : 0
```

## 4. 优先级分布统计

```typescript
priorityDistribution = {
  urgent: 0,
  high: 0,
  medium: 0,
  low: 0,
  unset: 0
}

todayTasks.forEach(task => {
  const priority = task.custom_fields?.priority || task.priority || 'unset'
  if (priority in priorityDistribution) {
    priorityDistribution[priority]++
  } else {
    priorityDistribution.unset++
  }
})
```

## 5. 趋势对比分析

### 5.1 昨日对比

```typescript
// 昨日完成任务数
const yesterday = dayjs().subtract(1, 'day')
yesterdayCompleted = allTasks.filter(task => {
  if (task.status !== 'completed' || !task.updated_at) return false
  const completedDate = dayjs(task.updated_at)
  return completedDate.isSame(yesterday, 'day')
}).length

// 完成任务趋势
completionTrend = todayStats.completedTasks - yesterdayCompleted
```

### 5.2 本周平均完成率

```typescript
// 计算本周每日完成率的平均值
const weekStart = dayjs().startOf('week')
const weekDays = []

for (let i = 0; i < 7; i++) {
  const day = weekStart.add(i, 'day')
  if (day.isAfter(dayjs())) break // 不计算未来日期
  
  const dayTasks = allTasks.filter(task => {
    if (!task.due_date) return false
    return dayjs(task.due_date).isSame(day, 'day')
  })
  
  const dayCompleted = dayTasks.filter(task => task.status === 'completed').length
  const dayTotal = dayTasks.length
  const dayRate = dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0
  
  weekDays.push(dayRate)
}

weeklyTrend = weekDays.length > 0 ? 
  Math.round(weekDays.reduce((sum, rate) => sum + rate, 0) / weekDays.length) : 0
```

## 6. 特殊任务识别

### 6.1 紧急任务筛选

```typescript
urgentTasks = allTasks.filter(task => {
  if (task.status === 'completed' || task.status === 'cancelled') return false
  const priority = task.custom_fields?.priority || task.priority
  return priority === 'urgent' || priority === 'high'
}).slice(0, 10) // 最多显示10个
```

### 6.2 即将到期任务

```typescript
const tomorrow = dayjs().add(1, 'day')
upcomingDeadlines = allTasks.filter(task => {
  if (task.status === 'completed' || task.status === 'cancelled' || !task.due_date) return false
  const dueDate = dayjs(task.due_date)
  return dueDate.isSame(tomorrow, 'day')
}).slice(0, 5) // 最多显示5个
```

## 7. 工作负载评估

### 7.1 工作负载等级

```typescript
function getWorkloadLevel(estimatedWorkload: number) {
  if (estimatedWorkload > 8) return 'heavy'    // 重度工作负载
  if (estimatedWorkload > 4) return 'normal'   // 正常工作负载
  return 'light'                               // 轻度工作负载
}
```

### 7.2 智能提醒逻辑

```typescript
// 生成效率小贴士
function generateProductivityTips(stats: TodayTaskStats) {
  const tips = []
  
  // 工作量过大提醒
  if (stats.estimatedWorkload > 8) {
    tips.push({
      type: 'info',
      message: '今日工作量较大，建议合理安排休息时间，保持工作效率。'
    })
  }
  
  // 完成率偏低提醒
  if (stats.completionRate < 50 && stats.totalTasks > 3) {
    tips.push({
      type: 'warning',
      message: '完成率偏低，建议检查任务安排是否合理，或调整优先级。'
    })
  }
  
  // 时间效率过高提醒
  if (stats.timeEfficiency > 120) {
    tips.push({
      type: 'success',
      message: '时间效率很高！但要注意任务质量，避免为了速度而忽略细节。'
    })
  }
  
  // 按时完成率偏低提醒
  if (stats.onTimeCompletionRate < 70 && stats.completedTasks > 2) {
    tips.push({
      type: 'warning',
      message: '按时完成率偏低，建议重新评估任务的时间预估。'
    })
  }
  
  return tips
}
```

## 8. 性能优化策略

### 8.1 数据缓存机制

```typescript
// 使用 useCache Hook 缓存统计数据
const {
  data: todayStats,
  loading: statsLoading,
  error: statsError,
  refresh: refreshStats
} = useCache<TodayTaskStats>(
  'today-task-stats',
  async () => TimeManagementService.getTodayTaskStats(),
  { ttl: 2 * 60 * 1000 } // 2分钟缓存
)

// 定时刷新机制
useEffect(() => {
  const interval = setInterval(() => {
    refreshStats()
  }, 5 * 60 * 1000) // 每5分钟刷新一次

  return () => clearInterval(interval)
}, [refreshStats])
```

### 8.2 快速统计API

```typescript
// 提供轻量级快速统计接口
static async getQuickStats(): Promise<{
  totalTasks: number
  completedTasks: number
  completionRate: number
  inProgressTasks: number
}> {
  // 只计算最基础的统计数据，减少计算复杂度
}
```

## 9. 错误处理与降级策略

### 9.1 数据获取失败处理

```typescript
// 各级降级策略
try {
  const stats = await TimeManagementService.getTodayTaskStats()
  return stats
} catch (error) {
  console.error('获取今日任务统计失败:', error)
  
  // 返回空统计作为降级
  return {
    totalTasks: 0,
    completedTasks: 0,
    // ... 其他默认值
  }
}
```

### 9.2 部分数据缺失处理

```typescript
// 安全的数据访问
const estimatedHours = task.estimated_hours || task.custom_fields?.estimated_hours || 0
const actualMinutes = (typeof estimatedHours === 'number' ? estimatedHours : 0) * 60

// 避免除零错误
const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
```

## 10. 数据验证与质量保证

### 10.1 数据一致性检查

```typescript
// 验证统计数据的合理性
function validateStats(stats: TodayTaskStats): boolean {
  // 检查任务数量一致性
  const statusSum = stats.completedTasks + stats.inProgressTasks + stats.todoTasks
  if (statusSum > stats.totalTasks) {
    console.warn('任务状态统计数据不一致')
    return false
  }
  
  // 检查时间数据合理性
  if (stats.timeEfficiency < 0 || stats.timeEfficiency > 1000) {
    console.warn('时间效率数据异常')
    return false
  }
  
  return true
}
```

### 10.2 异常数据标记

```typescript
// 标记可能的异常数据
function detectAnomalies(stats: TodayTaskStats): string[] {
  const anomalies = []
  
  if (stats.timeEfficiency > 300) {
    anomalies.push('时间效率异常高，可能存在数据录入错误')
  }
  
  if (stats.avgTaskDuration > 480) { // 超过8小时
    anomalies.push('平均任务时长过长，建议检查时间记录')
  }
  
  return anomalies
}
```

## 11. 扩展功能设计

### 11.1 历史趋势分析

```typescript
// 获取历史数据进行趋势分析
static async getHistoricalTrends(days: number = 7): Promise<{
  dailyCompletion: Array<{ date: string; completed: number; total: number }>
  weeklyEfficiency: Array<{ week: string; efficiency: number }>
  monthlyProgress: Array<{ month: string; completionRate: number }>
}> {
  // 实现历史数据分析逻辑
}
```

### 11.2 个性化指标

```typescript
// 根据用户偏好自定义统计指标
interface UserPreferences {
  focusMetrics: string[]        // 用户关注的指标
  alertThresholds: {            // 自定义提醒阈值
    completionRate: number
    timeEfficiency: number
    workloadLimit: number
  }
  displayOptions: {             // 显示选项
    showTrends: boolean
    showPredictions: boolean
    compactMode: boolean
  }
}
```

## 12. 总结

本统计系统通过以下核心特性为用户提供价值：

1. **全面性**: 涵盖任务数量、完成率、时间效率、优先级分布等多个维度
2. **实时性**: 每2-5分钟自动刷新，保证数据时效性
3. **智能性**: 提供趋势分析、异常检测和个性化建议
4. **可靠性**: 完善的错误处理和降级策略
5. **性能**: 优化的缓存机制和轻量级快速查询接口

通过这些计算公式和设计原则，时间管理首页能够为用户提供准确、有用的工作效率洞察，帮助用户更好地管理时间和任务。