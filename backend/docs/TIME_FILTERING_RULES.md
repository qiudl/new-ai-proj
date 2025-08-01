# 时间筛选规则规范

## 概述
为了确保仪表板和周报功能的数据一致性，需要明确定义任务时间字段的使用规则。

## 时间字段定义

### 1. created_at - 任务创建时间
- **用途**: 跟踪任务何时被创建
- **筛选场景**: 
  - 本周创建的任务统计
  - 任务创建趋势分析
  - 工作量统计

### 2. updated_at - 任务更新时间
- **用途**: 跟踪任务最后修改时间
- **筛选场景**:
  - 最近活动任务
  - 任务状态变更统计
  - 完成任务统计（status变为completed时）

### 3. due_date - 任务截止日期
- **用途**: 跟踪任务的计划完成时间
- **筛选场景**:
  - 逾期任务统计
  - 本周到期任务
  - 任务优先级排序

## 筛选规则

### 周报数据筛选规则
对于周报统计，使用以下逻辑：

#### 1. 任务包含规则
一个任务被包含在周报中，当满足以下任一条件：
- 任务在指定时间范围内创建 (`created_at` 在范围内)
- 任务在指定时间范围内有截止日期 (`due_date` 在范围内)
- 任务在指定时间范围内有重要更新 (`updated_at` 在范围内 AND 状态发生变化)

#### 2. 统计分类规则
- **新建任务**: 使用 `created_at` 筛选
- **完成任务**: 使用 `updated_at` 筛选 + `status = 'completed'`
- **逾期任务**: 使用 `due_date < current_date` + `status != 'completed'`
- **活跃任务**: 使用 `updated_at` 筛选

### 仪表板实时数据筛选规则

#### 1. 实时统计
- **总任务数**: 所有未删除任务 (`deleted_at IS NULL`)
- **今日新建**: `DATE(created_at) = CURRENT_DATE`
- **今日完成**: `DATE(updated_at) = CURRENT_DATE AND status = 'completed'`
- **逾期任务**: `due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')`

#### 2. 趋势分析
- **创建趋势**: GROUP BY `DATE(created_at)`
- **完成趋势**: GROUP BY `DATE(updated_at)` WHERE `status = 'completed'`
- **更新活动**: GROUP BY `DATE(updated_at)`

## 实现指导

### SQL查询模式

#### 周报查询模式
```sql
-- 基础任务筛选
WHERE (
    (t.created_at >= $start_date AND t.created_at <= $end_date) OR
    (t.due_date >= $start_date AND t.due_date <= $end_date) OR
    (t.updated_at >= $start_date AND t.updated_at <= $end_date AND t.status = 'completed')
)
AND t.deleted_at IS NULL

-- 分类统计
-- 新建任务
WHERE DATE(t.created_at) >= $start_date AND DATE(t.created_at) <= $end_date

-- 完成任务  
WHERE DATE(t.updated_at) >= $start_date AND DATE(t.updated_at) <= $end_date 
AND t.status = 'completed'

-- 逾期任务
WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')
```

#### 缓存策略
- **实时数据** (10秒): 当日统计、逾期任务
- **频繁数据** (2分钟): 项目进度、用户工作负载  
- **稳定数据** (15分钟): 周报数据、历史趋势

## 注意事项

1. **时区处理**: 所有时间字段应使用UTC存储，前端显示时转换为用户时区
2. **NULL值处理**: due_date可能为NULL，需要在查询中正确处理
3. **软删除**: 始终添加 `deleted_at IS NULL` 条件
4. **性能优化**: 为时间字段创建适当的复合索引

## 示例场景

### 场景1: 获取本周周报
- 时间范围: 2025-07-28 到 2025-08-03
- 包含任务: 在此期间创建、到期或完成的所有任务
- 统计维度: 按created_at统计新建，按updated_at统计完成

### 场景2: 实时仪表板
- 总任务: 当前所有活跃任务
- 今日活动: 今天创建或更新的任务
- 逾期提醒: 截止日期已过且未完成的任务

### 场景3: 项目进度报告
- 项目任务总数: 按项目分组的所有任务
- 完成进度: 已完成任务 / 总任务数
- 截止日期分布: 按due_date分组的任务分布