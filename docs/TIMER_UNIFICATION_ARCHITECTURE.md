# 计时器系统统一架构详细设计文档

> **项目编号:** 任务#240  
> **阶段:** Phase 1 - 架构设计和规划  
> **负责人:** AI助手  
> **创建时间:** 2025-08-03  
> **预估工时:** 12小时  

## 🎯 项目目标

将现有的"任务计时"和"个人计时"两套独立系统合并为一个智能的统一计时器系统，实现：

- **用户体验统一** - 消除认知负担，提供一致的操作体验
- **数据模型统一** - 单一数据源，消除数据孤岛
- **代码架构简化** - 减少重复代码，提升维护性
- **功能扩展性** - 支持未来更多计时类型和功能

## 🏗️ 系统架构设计

### 1. 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    统一计时器前端层                           │
├─────────────────────────────────────────────────────────────┤
│  UniversalTimerWidget  │  TimerDashboard  │  TimerAnalytics  │
│  智能快速启动         │  实时状态显示     │  数据分析视图    │
├─────────────────────────────────────────────────────────────┤
│                    智能推断引擎层                            │
├─────────────────────────────────────────────────────────────┤
│  TypeInferenceEngine  │  ContextAnalyzer  │  UserBehaviorAI  │
│  类型自动推断         │  上下文分析       │  行为模式学习    │
├─────────────────────────────────────────────────────────────┤
│                    统一服务层                               │
├─────────────────────────────────────────────────────────────┤
│  UnifiedTimerService  │  DataMigrationSvc │  NotificationSvc │
│  核心计时逻辑         │  数据迁移服务     │  通知推送服务    │
├─────────────────────────────────────────────────────────────┤
│                    统一数据层                               │
├─────────────────────────────────────────────────────────────┤
│  unified_timer_logs   │  timer_templates  │  user_preferences │
│  统一计时记录表       │  计时模板表       │  用户偏好设置     │
└─────────────────────────────────────────────────────────────┘
```

### 2. 核心组件设计

#### 2.1 UnifiedTimerService 核心服务

```go
// 统一计时器服务接口
type UnifiedTimerService interface {
    // 智能启动计时器
    StartTimer(ctx context.Context, req *StartTimerRequest) (*TimerResponse, error)
    
    // 暂停/恢复计时器
    PauseTimer(ctx context.Context, userID int) (*TimerResponse, error)
    ResumeTimer(ctx context.Context, userID int) (*TimerResponse, error)
    
    // 停止并保存计时器
    StopTimer(ctx context.Context, userID int, notes string) (*TimerResponse, error)
    
    // 获取当前计时器状态
    GetCurrentTimer(ctx context.Context, userID int) (*TimerStatus, error)
    
    // 获取计时历史
    GetTimerHistory(ctx context.Context, userID int, filter *HistoryFilter) (*TimerHistory, error)
}

// 启动计时器请求结构
type StartTimerRequest struct {
    UserID           int                    `json:"user_id"`
    TaskID           *int                   `json:"task_id,omitempty"`
    Title            string                 `json:"title"`
    Category         string                 `json:"category,omitempty"`
    EstimatedMinutes int                    `json:"estimated_minutes,omitempty"`
    Context          string                 `json:"context"` // dashboard, task_detail, quick_start
    Metadata         map[string]interface{} `json:"metadata,omitempty"`
    AutoStopOthers   bool                   `json:"auto_stop_others"`
}

// 计时器响应结构
type TimerResponse struct {
    Success    bool        `json:"success"`
    TimerID    int         `json:"timer_id,omitempty"`
    TimerType  string      `json:"timer_type"` // project_task, personal_task, quick_timer, pomodoro
    Message    string      `json:"message"`
    StartedAt  time.Time   `json:"started_at,omitempty"`
    Data       interface{} `json:"data,omitempty"`
}
```

#### 2.2 TypeInferenceEngine 智能推断引擎

```typescript
interface TimerInferenceContext {
  taskId?: number;
  title?: string;
  projectId?: number;
  context: 'dashboard' | 'task_detail' | 'quick_start' | 'floating';
  userHistory: TimerRecord[];
  currentTime: Date;
  userPreferences: UserTimerPreferences;
}

interface InferredTimerType {
  type: 'project_task' | 'personal_task' | 'quick_timer' | 'pomodoro';
  confidence: number; // 0-1
  reasoning: string[];
  suggestedCategory: string;
  estimatedDuration?: number;
  metadata: Record<string, any>;
}

class TypeInferenceEngine {
  /**
   * 核心推断算法 - 多维度智能分析
   */
  async inferTimerType(context: TimerInferenceContext): Promise<InferredTimerType> {
    const features = this.extractFeatures(context);
    const weights = this.calculateWeights(context.userPreferences);
    
    // 1. 规则引擎推断
    const ruleBasedResult = this.applyRules(features);
    
    // 2. 机器学习模型推断
    const mlResult = await this.mlPredict(features, context.userHistory);
    
    // 3. 上下文权重调整
    const contextResult = this.adjustForContext(ruleBasedResult, mlResult, context.context);
    
    // 4. 综合决策
    return this.combineResults([ruleBasedResult, mlResult, contextResult], weights);
  }

  private extractFeatures(context: TimerInferenceContext): FeatureVector {
    return {
      hasTaskId: !!context.taskId,
      hasProjectId: !!context.projectId,
      titleKeywords: this.extractKeywords(context.title),
      timeOfDay: context.currentTime.getHours(),
      dayOfWeek: context.currentTime.getDay(),
      contextType: context.context,
      recentPatterns: this.analyzeRecentPatterns(context.userHistory),
      userPreferenceScore: this.calculatePreferenceScore(context.userPreferences)
    };
  }

  private applyRules(features: FeatureVector): InferenceResult {
    // 明确的项目任务
    if (features.hasTaskId && features.hasProjectId) {
      return {
        type: 'project_task',
        confidence: 0.95,
        reasoning: ['明确指定了项目任务ID']
      };
    }

    // 番茄钟关键词检测
    if (this.isPomodoroKeywords(features.titleKeywords)) {
      return {
        type: 'pomodoro',
        confidence: 0.90,
        reasoning: ['标题包含番茄钟相关关键词']
      };
    }

    // 工作时间推断
    if (this.isWorkingHours(features.timeOfDay) && this.isWorkday(features.dayOfWeek)) {
      return {
        type: 'project_task',
        confidence: 0.70,
        reasoning: ['工作时间，可能是项目相关任务']
      };
    }

    // 默认个人任务
    return {
      type: 'personal_task',
      confidence: 0.60,
      reasoning: ['默认推断为个人任务']
    };
  }
}
```

#### 2.3 UniversalTimerWidget 通用组件

```typescript
interface UniversalTimerWidgetProps {
  mode: 'compact' | 'normal' | 'expanded';
  context: 'dashboard' | 'floating' | 'task_detail' | 'sidebar';
  theme: 'light' | 'dark' | 'auto';
  features: {
    showQuickActions: boolean;
    showHistory: boolean;
    showAnalytics: boolean;
    showTemplates: boolean;
  };
  onTimerEvent?: (event: TimerEvent) => void;
}

const UniversalTimerWidget: React.FC<UniversalTimerWidgetProps> = ({
  mode = 'normal',
  context = 'dashboard',
  theme = 'auto',
  features,
  onTimerEvent
}) => {
  const { 
    currentTimer, 
    startTimer, 
    stopTimer, 
    pauseTimer,
    resumeTimer 
  } = useUnifiedTimer();

  const [quickStartMode, setQuickStartMode] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<TimerSuggestion[]>([]);

  // 智能建议生成
  useEffect(() => {
    generateSmartSuggestions().then(setSmartSuggestions);
  }, [context, currentTimer]);

  const handleSmartStart = async (suggestion: TimerSuggestion) => {
    const result = await startTimer({
      title: suggestion.title,
      category: suggestion.category,
      estimatedMinutes: suggestion.estimatedDuration,
      context,
      autoStopOthers: true
    });

    if (result.success) {
      notification.success({
        message: '计时器启动成功',
        description: `${suggestion.type === 'project_task' ? '项目任务' : '个人'}计时已开始`,
        duration: 2
      });
      onTimerEvent?.({ type: 'timer_started', data: result });
    }
  };

  const generateSmartSuggestions = async (): Promise<TimerSuggestion[]> => {
    // 基于上下文和历史数据生成智能建议
    const suggestions = [];

    // 最近任务建议
    if (context === 'dashboard') {
      suggestions.push(...await getRecentTaskSuggestions());
    }

    // 上下文相关建议
    if (context === 'task_detail') {
      suggestions.push(...await getContextualSuggestions());
    }

    // 时间模式建议
    suggestions.push(...await getTimeBasedSuggestions());

    return suggestions.slice(0, 5); // 最多5个建议
  };

  return (
    <Card 
      className={`universal-timer-widget ${mode} ${context} ${theme}`}
      style={{ 
        width: mode === 'compact' ? 280 : mode === 'normal' ? 350 : 450,
        minHeight: mode === 'compact' ? 120 : 180 
      }}
    >
      {/* 当前计时器状态显示 */}
      <TimerStatusDisplay 
        timer={currentTimer}
        mode={mode}
        showTargetInfo={context !== 'task_detail'}
      />

      {/* 智能操作区域 */}
      <TimerControlPanel
        timer={currentTimer}
        onStart={() => setQuickStartMode(true)}
        onStop={stopTimer}
        onPause={pauseTimer}
        onResume={resumeTimer}
        mode={mode}
      />

      {/* 快速启动模式 */}
      {quickStartMode && (
        <QuickStartPanel
          suggestions={smartSuggestions}
          onSelect={handleSmartStart}
          onCancel={() => setQuickStartMode(false)}
          context={context}
        />
      )}

      {/* 功能扩展区域 */}
      {features.showHistory && mode !== 'compact' && (
        <TimerHistoryPreview limit={3} />
      )}

      {features.showAnalytics && mode === 'expanded' && (
        <TimerQuickAnalytics timeRange="today" />
      )}
    </Card>
  );
};
```

### 3. 数据模型设计

#### 3.1 统一计时记录表 `unified_timer_logs`

```sql
CREATE TABLE unified_timer_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- 计时目标 (统一字段)
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('project_task', 'personal_task', 'quick_timer', 'pomodoro')),
    target_id INTEGER, -- 可为NULL (用于快速计时)
    target_title VARCHAR(500) NOT NULL,
    target_metadata JSONB DEFAULT '{}',
    
    -- 计时数据
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    actual_work_seconds INTEGER, -- 扣除暂停时间的实际工作时长
    
    -- 计时状态和控制
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
    pause_count INTEGER DEFAULT 0,
    pause_total_seconds INTEGER DEFAULT 0,
    pause_events JSONB DEFAULT '[]', -- 暂停事件记录
    
    -- 分类和标签
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')),
    
    -- 上下文和环境
    description TEXT,
    work_location VARCHAR(200),
    mood VARCHAR(20) CHECK (mood IN ('focused', 'distracted', 'tired', 'energetic', 'neutral')),
    interruption_count INTEGER DEFAULT 0,
    
    -- 关联信息
    project_id INTEGER REFERENCES projects(id),
    parent_task_id INTEGER REFERENCES tasks(id),
    template_id INTEGER REFERENCES timer_templates(id),
    
    -- 智能推断结果
    inference_confidence DECIMAL(3,2), -- 0.00-1.00
    inference_reasoning JSONB,
    user_feedback INTEGER CHECK (user_feedback IN (1, 2, 3, 4, 5)), -- 用户对推断结果的评分
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id),
    
    -- 数据来源和兼容性
    source_type VARCHAR(20) DEFAULT 'unified' CHECK (source_type IN ('unified', 'migrated_task', 'migrated_personal', 'imported')),
    legacy_task_time_log_id INTEGER,
    legacy_personal_timer_id INTEGER,
    
    -- 性能字段
    search_vector tsvector -- 全文搜索向量
);

-- 索引优化
CREATE INDEX idx_unified_timer_user_status ON unified_timer_logs(user_id, status);
CREATE INDEX idx_unified_timer_target ON unified_timer_logs(target_type, target_id);
CREATE INDEX idx_unified_timer_time_range ON unified_timer_logs(user_id, start_time DESC, end_time DESC);
CREATE INDEX idx_unified_timer_category ON unified_timer_logs(user_id, category);
CREATE INDEX idx_unified_timer_project ON unified_timer_logs(project_id) WHERE project_id IS NOT NULL;
CREATE GIN INDEX idx_unified_timer_tags ON unified_timer_logs(tags);
CREATE GIN INDEX idx_unified_timer_metadata ON unified_timer_logs(target_metadata);
CREATE GIN INDEX idx_unified_timer_search ON unified_timer_logs(search_vector);

-- 触发器：更新搜索向量
CREATE OR REPLACE FUNCTION update_timer_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.target_title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('simple', array_to_string(NEW.tags, ' ')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_timer_search_vector 
    BEFORE INSERT OR UPDATE ON unified_timer_logs
    FOR EACH ROW EXECUTE FUNCTION update_timer_search_vector();
```

#### 3.2 计时模板表 `timer_templates`

```sql
CREATE TABLE timer_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- 模板基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('project_task', 'personal_task', 'quick_timer', 'pomodoro')),
    
    -- 模板默认值
    default_title VARCHAR(500),
    default_category VARCHAR(100),
    default_duration_minutes INTEGER,
    default_tags TEXT[] DEFAULT '{}',
    default_metadata JSONB DEFAULT '{}',
    
    -- 模板行为设置
    auto_start BOOLEAN DEFAULT false,
    auto_break_reminder BOOLEAN DEFAULT false,
    break_duration_minutes INTEGER DEFAULT 5,
    daily_limit_hours INTEGER,
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- 元数据
    is_system_template BOOLEAN DEFAULT false, -- 系统预设模板
    is_shared BOOLEAN DEFAULT false, -- 是否可被其他用户使用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统预设模板数据
INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template) VALUES
(1, '番茄工作法', '25分钟专注工作，5分钟休息', 'pomodoro', '番茄钟工作', '专注', 25, true),
(1, '深度工作', '90分钟深度专注工作时间', 'personal_task', '深度工作时间', '专注', 90, true),
(1, '快速任务', '15分钟内完成的小任务', 'quick_timer', '快速任务', '日常', 15, true),
(1, '学习时间', '专门的学习和技能提升时间', 'personal_task', '学习时间', '学习', 60, true),
(1, '会议时间', '各类会议和沟通时间', 'personal_task', '会议', '沟通', 30, true);
```

#### 3.3 用户计时偏好设置表 `user_timer_preferences`

```sql
CREATE TABLE user_timer_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    
    -- 计时行为偏好
    default_category VARCHAR(100) DEFAULT '工作',
    auto_pause_on_idle BOOLEAN DEFAULT true,
    idle_threshold_minutes INTEGER DEFAULT 5,
    auto_stop_on_completion BOOLEAN DEFAULT false,
    
    -- 番茄钟设置
    pomodoro_work_minutes INTEGER DEFAULT 25,
    pomodoro_short_break_minutes INTEGER DEFAULT 5,
    pomodoro_long_break_minutes INTEGER DEFAULT 15,
    pomodoro_cycles_before_long_break INTEGER DEFAULT 4,
    
    -- 通知设置
    notification_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    notification_minutes_before_end INTEGER DEFAULT 5,
    daily_goal_hours DECIMAL(4,2) DEFAULT 8.0,
    weekly_goal_hours DECIMAL(5,2) DEFAULT 40.0,
    
    -- UI偏好
    preferred_timer_view VARCHAR(20) DEFAULT 'normal' CHECK (preferred_timer_view IN ('compact', 'normal', 'expanded')),
    preferred_theme VARCHAR(10) DEFAULT 'auto' CHECK (preferred_theme IN ('light', 'dark', 'auto')),
    show_seconds BOOLEAN DEFAULT true,
    show_progress_bar BOOLEAN DEFAULT true,
    
    -- 智能推断设置
    enable_auto_inference BOOLEAN DEFAULT true,
    inference_feedback_frequency VARCHAR(20) DEFAULT 'sometimes' CHECK (inference_feedback_frequency IN ('always', 'sometimes', 'never')),
    learning_mode BOOLEAN DEFAULT true,
    
    -- 数据和隐私
    share_anonymous_data BOOLEAN DEFAULT false,
    backup_enabled BOOLEAN DEFAULT true,
    data_retention_days INTEGER DEFAULT 365,
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. API设计规范

#### 4.1 RESTful API端点

```
// 核心计时操作
POST   /api/v1/timer/start          启动计时器（智能推断）
POST   /api/v1/timer/pause          暂停当前计时器
POST   /api/v1/timer/resume         恢复当前计时器
POST   /api/v1/timer/stop           停止并保存计时器
GET    /api/v1/timer/current        获取当前计时器状态
DELETE /api/v1/timer/cancel         取消当前计时器

// 计时记录管理
GET    /api/v1/timer/history        获取计时历史记录
GET    /api/v1/timer/history/{id}   获取特定计时记录详情
PUT    /api/v1/timer/history/{id}   更新计时记录
DELETE /api/v1/timer/history/{id}   删除计时记录

// 模板管理
GET    /api/v1/timer/templates      获取计时模板列表
POST   /api/v1/timer/templates      创建新计时模板
PUT    /api/v1/timer/templates/{id} 更新计时模板
DELETE /api/v1/timer/templates/{id} 删除计时模板

// 统计和分析
GET    /api/v1/timer/stats          获取计时统计数据
GET    /api/v1/timer/analytics      获取详细分析数据
GET    /api/v1/timer/suggestions    获取智能推荐

// 用户偏好
GET    /api/v1/timer/preferences    获取用户计时偏好
PUT    /api/v1/timer/preferences    更新用户计时偏好

// 数据管理
POST   /api/v1/timer/import         导入计时数据
POST   /api/v1/timer/export         导出计时数据
POST   /api/v1/timer/migrate        执行数据迁移
```

#### 4.2 WebSocket实时通信

```typescript
// WebSocket事件类型
interface TimerWebSocketEvents {
  // 计时器状态变化
  'timer:started': { timer_id: number; type: string; title: string };
  'timer:paused': { timer_id: number; paused_at: string };
  'timer:resumed': { timer_id: number; resumed_at: string };
  'timer:stopped': { timer_id: number; duration: number; final_status: string };
  
  // 实时更新
  'timer:tick': { timer_id: number; elapsed_seconds: number; status: string };
  'timer:milestone': { timer_id: number; milestone: string; message: string };
  
  // 智能提醒
  'timer:suggestion': { type: string; message: string; action?: string };
  'timer:goal_progress': { daily_progress: number; weekly_progress: number };
  
  // 团队协作（扩展功能）
  'team:timer_shared': { user: string; timer: TimerInfo };
  'team:focus_session': { session_id: string; participants: string[] };
}

// WebSocket连接管理
class TimerWebSocketManager {
  private connection: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId: number, token: string) {
    this.connection = new WebSocket(`wss://api.example.com/timer/ws?user=${userId}&token=${token}`);
    
    this.connection.onopen = () => {
      console.log('Timer WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.connection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleTimerEvent(data);
    };

    this.connection.onclose = () => {
      this.attemptReconnect();
    };
  }

  private handleTimerEvent(event: any) {
    switch (event.type) {
      case 'timer:tick':
        // 更新计时器显示
        this.updateTimerDisplay(event.data);
        break;
      case 'timer:milestone':
        // 显示里程碑通知
        this.showMilestoneNotification(event.data);
        break;
      // ... 其他事件处理
    }
  }
}
```

### 5. 性能优化策略

#### 5.1 数据库优化

```sql
-- 分区表设计（按时间分区）
CREATE TABLE unified_timer_logs_2025_01 PARTITION OF unified_timer_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE unified_timer_logs_2025_02 PARTITION OF unified_timer_logs
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- 物化视图：用户计时统计
CREATE MATERIALIZED VIEW user_timer_stats AS
SELECT 
    user_id,
    DATE_TRUNC('day', start_time) as date,
    target_type,
    COUNT(*) as session_count,
    SUM(duration_seconds) as total_seconds,
    AVG(duration_seconds) as avg_seconds,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
FROM unified_timer_logs 
WHERE start_time >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY user_id, DATE_TRUNC('day', start_time), target_type;

-- 定期刷新物化视图
CREATE OR REPLACE FUNCTION refresh_timer_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_timer_stats;
END;
$$ LANGUAGE plpgsql;

-- 定时任务刷新（每小时）
SELECT cron.schedule('refresh-timer-stats', '0 * * * *', 'SELECT refresh_timer_stats();');
```

#### 5.2 缓存策略

```typescript
// Redis缓存结构设计
interface TimerCacheKeys {
  // 用户当前计时器状态
  currentTimer: `timer:current:${userId}`;
  
  // 用户偏好设置
  preferences: `timer:prefs:${userId}`;
  
  // 智能推荐缓存
  suggestions: `timer:suggestions:${userId}:${contextHash}`;
  
  // 统计数据缓存
  stats: `timer:stats:${userId}:${date}`;
  
  // 模板缓存
  templates: `timer:templates:${userId}`;
}

class TimerCacheManager {
  private redis: Redis;

  async getCurrentTimer(userId: number): Promise<TimerStatus | null> {
    const cached = await this.redis.get(`timer:current:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 从数据库查询并缓存
    const timer = await this.database.getCurrentTimer(userId);
    if (timer) {
      await this.redis.setex(`timer:current:${userId}`, 300, JSON.stringify(timer)); // 5分钟缓存
    }
    return timer;
  }

  async invalidateUserCache(userId: number): Promise<void> {
    const keys = [
      `timer:current:${userId}`,
      `timer:prefs:${userId}`,
      `timer:suggestions:${userId}:*`,
      `timer:stats:${userId}:*`
    ];
    
    for (const pattern of keys) {
      if (pattern.includes('*')) {
        const matchingKeys = await this.redis.keys(pattern);
        if (matchingKeys.length > 0) {
          await this.redis.del(...matchingKeys);
        }
      } else {
        await this.redis.del(pattern);
      }
    }
  }
}
```

### 6. 安全性设计

#### 6.1 数据安全

```go
// 计时器数据访问控制
type TimerSecurityPolicy struct {
    // 数据访问权限
    CanReadTimer    func(userID, timerOwnerID int) bool
    CanUpdateTimer  func(userID, timerOwnerID int) bool
    CanDeleteTimer  func(userID, timerOwnerID int) bool
    
    // 数据敏感度
    SensitiveFields []string // 需要特殊保护的字段
    
    // 审计日志
    AuditLogger     AuditLogger
}

func (p *TimerSecurityPolicy) FilterTimerData(timer *TimerRecord, requestUserID int) *TimerRecord {
    // 检查访问权限
    if !p.CanReadTimer(requestUserID, timer.UserID) {
        return nil
    }
    
    // 过滤敏感字段
    filtered := *timer
    if requestUserID != timer.UserID {
        // 其他用户只能看到基本信息
        filtered.Description = ""
        filtered.Metadata = map[string]interface{}{}
        filtered.WorkLocation = ""
        filtered.Mood = ""
    }
    
    // 记录访问日志
    p.AuditLogger.Log(AuditEvent{
        Type:     "timer_data_access",
        UserID:   requestUserID,
        Resource: fmt.Sprintf("timer:%d", timer.ID),
        Action:   "read",
        Time:     time.Now(),
    })
    
    return &filtered;
}
```

#### 6.2 隐私保护

```typescript
// 数据匿名化处理
interface PrivacyConfig {
  enableDataAnonymization: boolean;
  retentionPeriodDays: number;
  anonymizationFields: string[];
  userConsentRequired: boolean;
}

class PrivacyManager {
  async anonymizeExpiredData(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    await this.database.query(`
      UPDATE unified_timer_logs 
      SET 
        target_title = 'Anonymized Task',
        description = NULL,
        work_location = NULL,
        target_metadata = '{}',
        search_vector = NULL
      WHERE created_at < $1 
        AND target_title != 'Anonymized Task'
    `, [cutoffDate]);
  }

  async exportUserData(userId: number): Promise<UserDataExport> {
    // GDPR合规的数据导出
    const timerData = await this.database.getUserTimerData(userId);
    const preferences = await this.database.getUserPreferences(userId);
    
    return {
      exportDate: new Date(),
      userId,
      data: {
        timerRecords: timerData,
        preferences,
        templates: await this.database.getUserTemplates(userId)
      },
      format: 'json',
      version: '1.0'
    };
  }

  async deleteUserData(userId: number, reason: string): Promise<void> {
    // GDPR合规的数据删除
    const transaction = await this.database.beginTransaction();
    
    try {
      // 软删除用户数据
      await transaction.query('UPDATE unified_timer_logs SET deleted_at = NOW() WHERE user_id = $1', [userId]);
      await transaction.query('DELETE FROM timer_templates WHERE user_id = $1', [userId]);
      await transaction.query('DELETE FROM user_timer_preferences WHERE user_id = $1', [userId]);
      
      // 记录删除审计
      await transaction.query(`
        INSERT INTO data_deletion_audit (user_id, reason, deleted_at, deleted_by)
        VALUES ($1, $2, NOW(), $1)
      `, [userId, reason]);
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

## 📊 性能指标和监控

### 7.1 关键性能指标 (KPI)

```typescript
interface TimerSystemKPIs {
  // 系统性能
  averageResponseTime: number;      // 平均响应时间 < 200ms
  systemUptime: number;             // 系统正常运行时间 > 99.5%
  concurrentUsers: number;          // 并发用户数
  
  // 用户体验
  timerStartSuccessRate: number;    // 计时器启动成功率 > 99%
  inferenceAccuracy: number;        // 类型推断准确率 > 85%
  userSatisfactionScore: number;    // 用户满意度 > 4.0/5.0
  
  // 业务指标
  dailyActiveUsers: number;         // 日活跃用户数
  averageSessionDuration: number;   // 平均会话时长
  featureAdoptionRate: number;      // 新功能采用率
}

class KPIMonitor {
  async collectKPIs(): Promise<TimerSystemKPIs> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      averageResponseTime: await this.getAverageResponseTime(),
      systemUptime: await this.getSystemUptime(),
      concurrentUsers: await this.getConcurrentUsers(),
      timerStartSuccessRate: await this.getTimerStartSuccessRate(dayStart),
      inferenceAccuracy: await this.getInferenceAccuracy(dayStart),
      userSatisfactionScore: await this.getUserSatisfactionScore(),
      dailyActiveUsers: await this.getDailyActiveUsers(dayStart),
      averageSessionDuration: await this.getAverageSessionDuration(dayStart),
      featureAdoptionRate: await this.getFeatureAdoptionRate()
    };
  }
}
```

### 7.2 实时监控和告警

```yaml
# Prometheus监控配置
monitoring:
  metrics:
    - name: timer_start_duration
      type: histogram
      description: "Time taken to start a timer"
      buckets: [0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
      
    - name: timer_inference_accuracy
      type: gauge
      description: "Accuracy of timer type inference"
      
    - name: active_timers_count
      type: gauge
      description: "Number of currently active timers"
      
    - name: timer_errors_total
      type: counter
      description: "Total number of timer-related errors"

  alerts:
    - name: HighTimerStartLatency
      condition: timer_start_duration{quantile="0.95"} > 1.0
      duration: 5m
      severity: warning
      message: "Timer start latency is above 1 second"
      
    - name: LowInferenceAccuracy
      condition: timer_inference_accuracy < 0.8
      duration: 10m
      severity: critical
      message: "Timer type inference accuracy below 80%"
      
    - name: TimerErrorSpike
      condition: rate(timer_errors_total[5m]) > 0.1
      duration: 2m
      severity: warning
      message: "High rate of timer errors detected"
```

## 🚀 部署和发布策略

### 8.1 灰度发布计划

```yaml
deployment:
  strategy: blue-green
  phases:
    - name: Alpha
      percentage: 5%
      duration: 1 week
      criteria:
        - Internal team testing
        - Basic functionality validation
        
    - name: Beta  
      percentage: 20%
      duration: 2 weeks
      criteria:
        - Power user feedback
        - Performance validation
        - Bug fixes
        
    - name: Gamma
      percentage: 50%
      duration: 1 week
      criteria:
        - Stability confirmation
        - Performance optimization
        
    - name: Production
      percentage: 100%
      duration: ongoing
      criteria:
        - All KPIs met
        - User feedback positive
        - System stability confirmed

rollback:
  trigger_conditions:
    - error_rate > 5%
    - response_time > 2s
    - user_complaints > 10/hour
  
  rollback_time: < 5 minutes
  data_consistency: ensured
```

### 8.2 数据迁移策略

```typescript
// 分阶段数据迁移
class DataMigrationOrchestrator {
  async executeFullMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      // Phase 1: 创建新表结构
      await this.createUnifiedSchema();
      
      // Phase 2: 迁移任务计时记录
      const taskTimerResult = await this.migrateTaskTimeLogs();
      result.totalRecords += taskTimerResult.totalRecords;
      result.migratedRecords += taskTimerResult.migratedRecords;
      
      // Phase 3: 迁移个人计时记录
      const personalTimerResult = await this.migratePersonalTimers();
      result.totalRecords += personalTimerResult.totalRecords;
      result.migratedRecords += personalTimerResult.migratedRecords;
      
      // Phase 4: 数据验证和完整性检查
      await this.validateMigratedData();
      
      // Phase 5: 创建索引和优化
      await this.createIndexesAndOptimize();
      
      return result;
    } catch (error) {
      result.errors.push(error.message);
      await this.rollbackMigration();
      throw error;
    }
  }

  private async migrateTaskTimeLogs(): Promise<MigrationBatch> {
    const query = `
      INSERT INTO unified_timer_logs (
        user_id, target_type, target_id, target_title,
        start_time, end_time, duration_seconds,
        status, project_id, created_at, created_by,
        source_type, legacy_task_time_log_id
      )
      SELECT 
        ttl.user_id,
        'project_task'::VARCHAR,
        ttl.task_id,
        COALESCE(t.title, 'Unknown Task'),
        ttl.start_time,
        ttl.end_time,
        ttl.duration_seconds,
        CASE 
          WHEN ttl.end_time IS NOT NULL THEN 'completed'
          ELSE 'cancelled'
        END,
        t.project_id,
        ttl.created_at,
        ttl.created_by,
        'migrated_task',
        ttl.id
      FROM task_time_logs ttl
      LEFT JOIN tasks t ON ttl.task_id = t.id
      WHERE ttl.id NOT IN (
        SELECT legacy_task_time_log_id 
        FROM unified_timer_logs 
        WHERE legacy_task_time_log_id IS NOT NULL
      )
    `;

    const result = await this.database.execute(query);
    return {
      totalRecords: result.rowCount,
      migratedRecords: result.rowCount,
      failedRecords: 0
    };
  }
}
```

## 📈 成功标准和验收标准

### 9.1 功能验收标准

| 功能模块 | 验收标准 | 测试方法 |
|---------|----------|----------|
| 智能推断 | 推断准确率 ≥ 85% | A/B测试，用户反馈评分 |
| 统一启动 | 响应时间 ≤ 200ms | 性能测试，压力测试 |
| 数据迁移 | 数据完整性 100% | 数据对比，一致性检查 |
| 用户界面 | 可用性评分 ≥ 4.0/5.0 | 用户体验测试，满意度调研 |
| 系统稳定性 | 正常运行时间 ≥ 99.5% | 监控数据，错误率统计 |

### 9.2 性能验收标准

```typescript
interface PerformanceAcceptanceCriteria {
  responseTime: {
    startTimer: number;        // ≤ 200ms
    getCurrentStatus: number;  // ≤ 100ms
    getHistory: number;        // ≤ 500ms
    getAnalytics: number;      // ≤ 1000ms
  };
  
  throughput: {
    concurrentTimers: number;      // ≥ 1000
    requestsPerSecond: number;     // ≥ 500
    dailyActiveUsers: number;      // ≥ 5000
  };
  
  reliability: {
    uptime: number;               // ≥ 99.5%
    errorRate: number;            // ≤ 0.1%
    dataConsistency: number;      // 100%
  };
  
  userExperience: {
    inferenceAccuracy: number;    // ≥ 85%
    userSatisfaction: number;     // ≥ 4.0/5.0
    featureAdoption: number;      // ≥ 60%
  };
}
```

## 📝 总结和下一步

### 本阶段完成内容
✅ **架构设计方案**：完成统一计时器系统的整体架构设计  
✅ **核心组件设计**：设计了智能推断引擎、统一服务层、通用UI组件  
✅ **数据模型设计**：设计了统一的数据库表结构和关系  
✅ **API接口规范**：定义了RESTful API和WebSocket通信协议  
✅ **性能优化策略**：制定了缓存、数据库优化和监控方案  
✅ **安全性设计**：设计了数据安全和隐私保护机制  
✅ **部署发布策略**：制定了灰度发布和数据迁移计划  

### 下一步工作计划
🔄 **Phase 2: 后端统一服务实现**（任务ID 242）
- 实现 UnifiedTimerService 核心逻辑
- 开发 TypeInferenceEngine 智能推断算法
- 创建数据迁移工具和脚本
- 构建兼容性API层

---

*第一阶段架构设计工作现已完成，接下来将进入后端服务实现阶段。*