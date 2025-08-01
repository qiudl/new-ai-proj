# 计时任务2.0系统设计方案

## 项目概述

**设计目标**: 实现用户隔离的个人计时系统，每个用户拥有独立的计时任务和历史记录
**版本**: 2.0
**日期**: 2025-08-01

## 1. 现有系统分析

### 1.1 当前架构优势
- ✅ 已有完善的时间日志表 `task_time_logs` 支持用户隔离 (user_id字段)
- ✅ 数据一致性机制完善（触发器、约束）
- ✅ 并发安全的计时操作
- ✅ 完整的API接口和响应模型

### 1.2 当前架构限制
- ❌ 用户只能计时项目中被分配的任务 (assignee_id限制)
- ❌ 缺乏个人计时任务创建能力
- ❌ 首页展示所有任务而非个人任务
- ❌ 计时任务与项目任务耦合过紧

## 2. 计时任务2.0数据模型设计

### 2.1 新增核心表：用户个人计时任务

```sql
-- 用户个人计时任务表
CREATE TABLE user_timer_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'personal',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    color VARCHAR(7) DEFAULT '#1890ff', -- 十六进制颜色
    is_favorite BOOLEAN DEFAULT FALSE,
    total_time_seconds INTEGER DEFAULT 0,
    target_time_seconds INTEGER DEFAULT 0, -- 目标时间（可选）
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- 索引优化
    CONSTRAINT user_timer_tasks_user_title_unique UNIQUE(user_id, title) DEFERRABLE INITIALLY DEFERRED
);

-- 用户计时任务索引
CREATE INDEX idx_user_timer_tasks_user_id ON user_timer_tasks(user_id);
CREATE INDEX idx_user_timer_tasks_status ON user_timer_tasks(status);
CREATE INDEX idx_user_timer_tasks_category ON user_timer_tasks(category);
CREATE INDEX idx_user_timer_tasks_created_at ON user_timer_tasks(created_at DESC);
CREATE INDEX idx_user_timer_tasks_total_time ON user_timer_tasks(total_time_seconds DESC);
CREATE INDEX idx_user_timer_tasks_is_favorite ON user_timer_tasks(is_favorite) WHERE is_favorite = TRUE;
```

### 2.2 扩展时间日志表关联

```sql
-- 为task_time_logs表添加用户计时任务关联
ALTER TABLE task_time_logs ADD COLUMN user_timer_task_id INTEGER REFERENCES user_timer_tasks(id) ON DELETE SET NULL;

-- 修改约束，允许计时既可以关联项目任务也可以关联个人任务
ALTER TABLE task_time_logs DROP CONSTRAINT IF EXISTS task_time_logs_task_id_fkey;
ALTER TABLE task_time_logs ALTER COLUMN task_id DROP NOT NULL;

-- 添加检查约束：必须关联项目任务或个人任务之一
ALTER TABLE task_time_logs ADD CONSTRAINT check_timer_task_association 
    CHECK ((task_id IS NOT NULL AND user_timer_task_id IS NULL) OR 
           (task_id IS NULL AND user_timer_task_id IS NOT NULL));

-- 添加索引
CREATE INDEX idx_task_time_logs_user_timer_task_id ON task_time_logs(user_timer_task_id);
```

### 2.3 用户计时状态扩展

```sql
-- 扩展用户表的计时状态字段
ALTER TABLE users ADD COLUMN current_user_timer_task_id INTEGER REFERENCES user_timer_tasks(id) ON DELETE SET NULL;

-- 修改现有约束，支持个人计时任务
-- current_timing_task_id: 项目任务计时
-- current_user_timer_task_id: 个人任务计时
```

## 3. 新增数据模型定义

### 3.1 Go模型定义

```go
// UserTimerTask 用户个人计时任务
type UserTimerTask struct {
    ID                 int             `json:"id" db:"id"`
    UserID             int             `json:"user_id" db:"user_id" validate:"required"`
    Title              string          `json:"title" db:"title" validate:"required,min=1,max=255"`
    Description        string          `json:"description" db:"description"`
    Category           string          `json:"category" db:"category" validate:"oneof=personal work study fitness hobby"`
    Priority           string          `json:"priority" db:"priority" validate:"oneof=low medium high"`
    Status             string          `json:"status" db:"status" validate:"oneof=active paused completed archived"`
    Color              string          `json:"color" db:"color" validate:"hexcolor"`
    IsFavorite         bool            `json:"is_favorite" db:"is_favorite"`
    TotalTimeSeconds   int             `json:"total_time_seconds" db:"total_time_seconds"`
    TargetTimeSeconds  int             `json:"target_time_seconds" db:"target_time_seconds"`
    Tags               []string        `json:"tags" db:"tags"`
    Metadata           CustomFields    `json:"metadata" db:"metadata"`
    CreatedAt          time.Time       `json:"created_at" db:"created_at"`
    UpdatedAt          time.Time       `json:"updated_at" db:"updated_at"`
    DeletedAt          *time.Time      `json:"deleted_at,omitempty" db:"deleted_at"`
}

// UserTimerTaskRequest 创建/更新个人计时任务请求
type UserTimerTaskRequest struct {
    Title             string       `json:"title" validate:"required,min=1,max=255"`
    Description       string       `json:"description"`
    Category          string       `json:"category" validate:"oneof=personal work study fitness hobby"`
    Priority          string       `json:"priority" validate:"oneof=low medium high"`
    Color             string       `json:"color" validate:"hexcolor"`
    IsFavorite        bool         `json:"is_favorite"`
    TargetTimeSeconds int          `json:"target_time_seconds" validate:"min=0"`
    Tags              []string     `json:"tags"`
    Metadata          CustomFields `json:"metadata"`
}

// UserTimerTaskResponse 个人计时任务响应
type UserTimerTaskResponse struct {
    UserTimerTask
    FormattedTotalTime   string  `json:"formatted_total_time"`
    FormattedTargetTime  string  `json:"formatted_target_time"`
    CompletionPercent    float64 `json:"completion_percent"`
    LastTimedAt          *time.Time `json:"last_timed_at,omitempty"`
    TimesCount           int     `json:"times_count"` // 计时次数
    AverageSessionTime   int     `json:"average_session_time"` // 平均每次计时时长
}

// PersonalTimerDashboard 个人计时仪表板
type PersonalTimerDashboard struct {
    // 当前计时状态
    CurrentTimer     *PersonalTimerCurrent    `json:"current_timer"`
    
    // 今日统计
    TodayStats       PersonalTimerTodayStats  `json:"today_stats"`
    
    // 个人计时任务
    TimerTasks       []UserTimerTaskResponse  `json:"timer_tasks"`
    
    // 最近计时历史
    RecentSessions   []PersonalTimerSession   `json:"recent_sessions"`
    
    // 收藏的任务
    FavoriteTasks    []UserTimerTaskResponse  `json:"favorite_tasks"`
}

// PersonalTimerCurrent 当前个人计时状态
type PersonalTimerCurrent struct {
    IsRunning         bool      `json:"is_running"`
    TaskType          string    `json:"task_type"` // "project" | "personal"
    TaskID            *int      `json:"task_id,omitempty"`
    TaskTitle         *string   `json:"task_title,omitempty"`
    TaskColor         *string   `json:"task_color,omitempty"`
    StartTime         *time.Time `json:"start_time,omitempty"`
    ElapsedSeconds    int       `json:"elapsed_seconds"`
    FormattedTime     string    `json:"formatted_time"`
}

// PersonalTimerTodayStats 今日个人计时统计
type PersonalTimerTodayStats struct {
    TotalSeconds       int    `json:"total_seconds"`
    FormattedTime      string `json:"formatted_time"`
    SessionsCount      int    `json:"sessions_count"`
    TasksWorkedOn      int    `json:"tasks_worked_on"`
    MostWorkedTask     string `json:"most_worked_task"`
    ProductiveHours    []int  `json:"productive_hours"` // 每小时的工作时长（24个元素）
}

// PersonalTimerSession 个人计时会话
type PersonalTimerSession struct {
    ID                int       `json:"id"`
    TaskType          string    `json:"task_type"` // "project" | "personal"
    TaskID            *int      `json:"task_id,omitempty"`
    TaskTitle         string    `json:"task_title"`
    TaskColor         string    `json:"task_color"`
    StartTime         time.Time `json:"start_time"`
    EndTime           *time.Time `json:"end_time,omitempty"`
    DurationSeconds   int       `json:"duration_seconds"`
    FormattedTime     string    `json:"formatted_time"`
    Date              string    `json:"date"`
}
```

## 4. API接口设计

### 4.1 个人计时任务管理API

```
POST   /api/v1/user/timer-tasks              # 创建个人计时任务
GET    /api/v1/user/timer-tasks              # 获取个人计时任务列表
GET    /api/v1/user/timer-tasks/:id          # 获取单个个人计时任务
PUT    /api/v1/user/timer-tasks/:id          # 更新个人计时任务
DELETE /api/v1/user/timer-tasks/:id          # 删除个人计时任务
POST   /api/v1/user/timer-tasks/:id/favorite # 切换收藏状态
```

### 4.2 个人计时操作API

```
POST   /api/v1/user/timer/start-personal     # 开始个人任务计时
POST   /api/v1/user/timer/start-project      # 开始项目任务计时
POST   /api/v1/user/timer/stop               # 停止当前计时
POST   /api/v1/user/timer/pause              # 暂停当前计时
POST   /api/v1/user/timer/resume             # 恢复计时
GET    /api/v1/user/timer/current            # 获取当前计时状态
```

### 4.3 个人计时数据API

```
GET    /api/v1/user/timer/dashboard          # 个人计时仪表板
GET    /api/v1/user/timer/history            # 个人计时历史
GET    /api/v1/user/timer/stats              # 个人计时统计
GET    /api/v1/user/timer/analytics          # 个人计时分析报告
```

## 5. 前端界面设计

### 5.1 个人计时首页 (Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 我的计时仪表板                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🎯 当前计时                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [▶️ 正在计时] 深度学习项目 - 已用时: 01:23:45            │ │
│ │ [⏸️ 暂停] [⏹️ 停止]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 📈 今日统计                                                  │
│ ┌───────────┬───────────┬───────────┬───────────────────┐   │
│ │ 总时长    │ 任务数    │ 专注度    │ 最长专注          │   │
│ │ 4h 32m    │ 5个      │ 85%      │ 1h 45m           │   │
│ └───────────┴───────────┴───────────┴───────────────────┘   │
│                                                             │
│ ⭐ 我的计时任务                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟢 深度学习项目    [▶️] 今日: 2h 15m  总计: 45h 30m     │ │
│ │ 🔵 英语学习        [▶️] 今日: 1h 00m  总计: 28h 45m     │ │
│ │ 🟡 健身锻炼        [▶️] 今日: 0h 45m  总计: 15h 20m     │ │
│ │ + 添加新任务                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 📅 最近会话                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 14:30-15:15  深度学习项目     45分钟                     │ │
│ │ 10:00-11:30  英语学习         1小时30分钟                │ │
│ │ 09:15-09:45  健身锻炼         30分钟                     │ │
│ │ [查看更多历史记录]                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 个人计时任务管理

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 我的计时任务                                              │
├─────────────────────────────────────────────────────────────┤
│ [+ 新建任务] [📊 统计分析] [⏳ 计时历史]                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 分类筛选: [全部] [个人] [工作] [学习] [健身] [兴趣]          │
│ 状态筛选: [活跃] [暂停] [完成] [归档]                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⭐ 🟢 深度学习项目                                        │ │
│ │    分类: 学习 | 优先级: 高 | 目标: 50小时                │ │
│ │    进度: ████████████░░░░ 75% (37.5h/50h)              │ │
│ │    [▶️开始] [✏️编辑] [📊统计] [⭐收藏]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔵 英语学习                                              │ │
│ │    分类: 学习 | 优先级: 中 | 目标: 30小时                │ │
│ │    进度: ████████████████░░░░ 80% (24h/30h)            │ │
│ │    [▶️开始] [✏️编辑] [📊统计] [☆收藏]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 健身锻炼                                              │ │
│ │    分类: 健身 | 优先级: 中 | 目标: 20小时                │ │
│ │    进度: ████████░░░░░░░░░░░░ 40% (8h/20h)              │ │
│ │    [▶️开始] [✏️编辑] [📊统计] [☆收藏]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 创建个人计时任务

```
┌─────────────────────────────────────────────────────────────┐
│ ➕ 创建个人计时任务                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 任务标题 *                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 深度学习项目研究                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 任务描述                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 学习深度学习相关理论和实践，包括神经网络、机器学习算法等  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 分类        优先级      任务颜色                              │
│ [学习 ▼]   [高 ▼]     [🟢 ▼]                                │
│                                                             │
│ 目标时间（可选）                                             │
│ ┌─────────┐ 小时 ┌─────────┐ 分钟                          │
│ │   50    │      │    0    │                              │
│ └─────────┘      └─────────┘                              │
│                                                             │
│ 标签                                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #AI #机器学习 #Python                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [⭐ 添加到收藏] [🔔 启用提醒]                                 │
│                                                             │
│                           [取消] [保存]                      │
└─────────────────────────────────────────────────────────────┘
```

## 6. 数据迁移和兼容性方案

### 6.1 平滑迁移策略

```sql
-- 迁移脚本: 007_timer_system_2.0_migration.sql
BEGIN;

-- 1. 创建新表结构
-- (如上述数据模型定义)

-- 2. 数据迁移：为现有用户创建默认个人计时任务
INSERT INTO user_timer_tasks (user_id, title, description, category, status)
SELECT DISTINCT 
    u.id,
    '默认计时任务',
    '系统自动创建的默认个人计时任务',
    'personal',
    'active'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM user_timer_tasks);

-- 3. 保持向后兼容
-- 现有的项目任务计时功能保持不变
-- task_time_logs中的task_id和user_timer_task_id都为空则关联到默认任务

-- 4. 创建迁移视图，确保现有查询继续工作
CREATE OR REPLACE VIEW v_user_timer_dashboard AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(project_time.total_seconds, 0) + COALESCE(personal_time.total_seconds, 0) as total_time_today,
    -- ... 其他计算字段
FROM users u
LEFT JOIN (
    -- 项目任务计时统计
    SELECT user_id, SUM(duration_seconds) as total_seconds
    FROM task_time_logs 
    WHERE task_id IS NOT NULL 
      AND DATE(created_at) = CURRENT_DATE
    GROUP BY user_id
) project_time ON u.id = project_time.user_id
LEFT JOIN (
    -- 个人任务计时统计  
    SELECT user_id, SUM(duration_seconds) as total_seconds
    FROM task_time_logs 
    WHERE user_timer_task_id IS NOT NULL 
      AND DATE(created_at) = CURRENT_DATE
    GROUP BY user_id
) personal_time ON u.id = personal_time.user_id;

COMMIT;
```

### 6.2 功能渐进式启用

1. **阶段1**: 后端数据模型和API开发 (1周)
2. **阶段2**: 前端个人计时界面开发 (1周)
3. **阶段3**: 数据迁移和兼容性测试 (3天)
4. **阶段4**: 灰度发布和用户反馈收集 (1周)
5. **阶段5**: 全量发布和功能优化 (持续)

## 7. 实施计划

### 7.1 开发优先级

**🔥 高优先级 (必须实现)**
- [ ] 个人计时任务数据模型
- [ ] 个人计时任务CRUD API
- [ ] 个人计时操作API (开始/停止/暂停)
- [ ] 个人计时仪表板API
- [ ] 前端个人计时首页
- [ ] 前端个人任务管理页面

**🔶 中优先级 (重要功能)**
- [ ] 计时任务分类和标签系统
- [ ] 计时目标和进度跟踪
- [ ] 计时提醒和通知
- [ ] 计时数据导出功能
- [ ] 计时统计分析报告

**🔸 低优先级 (增强功能)**
- [ ] 计时任务模板系统
- [ ] 番茄工作法集成
- [ ] 计时数据可视化图表
- [ ] 团队计时任务共享
- [ ] 第三方应用集成

### 7.2 技术实施要点

1. **数据库设计**
   - 保持现有表结构不变
   - 新增表使用外键关联确保数据一致性
   - 添加必要的索引优化查询性能

2. **API设计**
   - 遵循RESTful设计原则
   - 保持现有API向后兼容
   - 使用版本化API路径

3. **前端开发**
   - 复用现有组件和样式
   - 响应式设计支持移动端
   - 实时数据更新和同步

4. **性能优化**
   - 数据库查询优化
   - 前端数据缓存策略
   - 实时计时状态同步

## 8. 风险评估和应对策略

### 8.1 技术风险
- **数据迁移风险**: 充分测试迁移脚本，提供回退方案
- **性能影响**: 监控数据库性能，优化索引和查询
- **兼容性问题**: 保持API向后兼容，渐进式发布

### 8.2 业务风险
- **用户接受度**: 提供用户教程，收集反馈快速迭代
- **功能复杂度**: 分阶段发布，核心功能优先

### 8.3 应对措施
- 完整的测试覆盖
- 分阶段发布策略
- 实时监控和告警
- 快速回退机制

---

**总结**: 计时任务2.0将为用户提供完全个人化的计时体验，同时保持与现有项目任务系统的无缝集成。通过渐进式实施策略，确保系统稳定性和用户体验的平滑过渡。