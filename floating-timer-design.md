# 全局浮动定时器功能设计方案

## 📋 用户需求分析
1. **排他性计时**: 启动某个任务的定时器后，其他任务无法启动定时器
2. **全局可见性**: 在任何页面都能看到当前正在计时的任务
3. **浮动显示**: 浮动图标显示计时任务名称和计时时间
4. **快速控制**: 能够快速暂停/恢复定时器

## 🎯 设计目标
- ✅ 提供全局定时器状态管理
- ✅ 跨页面浮动定时器组件
- ✅ 一键暂停/恢复功能
- ✅ 优雅的UI设计和交互
- ✅ 与现有定时器功能无缝集成

## 🏗️ 架构设计

### 1. 全局状态管理
创建定时器上下文管理器：

```typescript
// contexts/TimerContext.tsx
interface TimerContextType {
  currentTimer: TimerState | null;
  isRunning: boolean;
  startTimer: (taskId: number, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
}
```

### 2. 浮动定时器组件
创建固定位置的浮动定时器：

```typescript
// components/FloatingTimer.tsx
interface FloatingTimerProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  minimizable?: boolean;
}
```

### 3. 定时器管理服务增强
扩展现有TimerService：

```typescript
// services/timerService.ts
class TimerService {
  // 新增功能
  static async pauseTimer(): Promise<TimerPauseResponse>;
  static async resumeTimer(): Promise<TimerResumeResponse>;
  static subscribeToUpdates(callback: (timer: TimerState) => void): () => void;
}
```

## 📱 UI/UX 设计

### 浮动定时器组件设计

#### 收起状态 (最小化)
```
┌─────────────────┐
│ 🕐 00:15:42    │
│ React开发任务   │
└─────────────────┘
```

#### 展开状态
```
┌─────────────────────────┐
│ 🕐 React开发任务        │
│ ⏱️  00:15:42           │
│ [⏸️ 暂停] [⏹️ 停止]   │
│ [📝 备注] [📊 详情]   │
└─────────────────────────┘
```

#### 交互特性
- **双击**: 最小化/展开
- **单击**: 显示快速操作
- **悬停**: 显示详细信息
- **拖拽**: 改变位置
- **右键**: 上下文菜单

### 颜色和状态设计

```css
/* 运行状态 */
.floating-timer--running {
  background: linear-gradient(135deg, #52c41a, #73d13d);
  border: 2px solid #52c41a;
}

/* 暂停状态 */
.floating-timer--paused {
  background: linear-gradient(135deg, #faad14, #ffc53d);
  border: 2px solid #faad14;
}

/* 警告状态 (长时间运行) */
.floating-timer--warning {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  border: 2px solid #ff4d4f;
  animation: pulse 2s infinite;
}
```

## 🔧 技术实现计划

### Phase 1: 基础架构 (优先级: 高)

#### 1.1 创建定时器上下文
```typescript
// contexts/TimerContext.tsx
export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTimer, setCurrentTimer] = useState<TimerState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 定时器状态管理逻辑
  // 自动同步服务器状态
  // WebSocket或轮询更新
  
  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
```

#### 1.2 全局状态集成
在App.tsx中集成定时器上下文：
```typescript
function App() {
  return (
    <TimerProvider>
      <BrowserRouter>
        {/* 现有路由 */}
        <FloatingTimer />
      </BrowserRouter>
    </TimerProvider>
  );
}
```

### Phase 2: 浮动定时器组件 (优先级: 高)

#### 2.1 基础浮动组件
```typescript
// components/FloatingTimer/index.tsx
const FloatingTimer: React.FC = () => {
  const { currentTimer, isRunning } = useTimer();
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isMinimized, setIsMinimized] = useState(false);
  
  if (!currentTimer || !isRunning) {
    return null;
  }
  
  return (
    <Draggable
      position={position}
      onStop={(e, data) => setPosition({ x: data.x, y: data.y })}
    >
      <div className="floating-timer">
        {isMinimized ? <MinimizedView /> : <ExpandedView />}
      </div>
    </Draggable>
  );
};
```

#### 2.2 动画和交互
```css
.floating-timer {
  position: fixed;
  z-index: 9999;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  cursor: move;
}

.floating-timer:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}
```

### Phase 3: 后端API增强 (优先级: 中)

#### 3.1 暂停/恢复API
```go
// handlers/timer_handlers.go
func (h *TimerHandler) PauseTimer(c *gin.Context) {
    // 实现暂停逻辑
    // 记录暂停时间
    // 更新用户状态
}

func (h *TimerHandler) ResumeTimer(c *gin.Context) {
    // 实现恢复逻辑
    // 计算暂停时长
    // 调整开始时间
}
```

#### 3.2 实时更新机制
```go
// 可选: WebSocket支持
func (h *TimerHandler) StreamTimerUpdates(c *gin.Context) {
    // WebSocket连接
    // 实时推送定时器状态变化
}
```

### Phase 4: 高级功能 (优先级: 低)

#### 4.1 智能提醒
- 25分钟提醒 (番茄钟技术)
- 长时间工作警告 (2小时+)
- 休息建议

#### 4.2 数据统计
- 日/周/月工作时长统计
- 任务完成效率分析
- 专注时间热力图

#### 4.3 多设备同步
- 浏览器标签页间同步
- 可选的多设备状态同步

## 📊 实现优先级

### 立即实现 (本周)
1. ✅ 修复现有定时器API问题 (已完成)
2. 🔄 创建全局定时器上下文
3. 🔄 实现基础浮动定时器组件
4. 🔄 集成到现有应用中

### 短期实现 (下周)
1. 📱 优化浮动定时器UI/UX
2. 🎛️ 添加暂停/恢复功能
3. 🔧 后端API增强
4. 🧪 全面测试和调试

### 长期实现 (未来)
1. 📊 数据统计和分析
2. 🔔 智能提醒系统
3. 🌐 多设备同步
4. 📱 移动端适配

## 🎨 设计规范

### 颜色方案
- **主色调**: Ant Design蓝色系 (#1890ff)
- **成功状态**: 绿色系 (#52c41a)
- **警告状态**: 橙色系 (#faad14)
- **错误状态**: 红色系 (#ff4d4f)

### 字体规范
- **主要文字**: 14px, Medium
- **时间显示**: 16px, Monospace, Bold
- **辅助文字**: 12px, Regular

### 间距规范
- **组件内边距**: 12px
- **元素间距**: 8px
- **按钮高度**: 32px
- **圆角**: 8px

## 🧪 测试策略

### 单元测试
- TimerContext状态管理
- 浮动组件渲染
- API调用正确性

### 集成测试
- 跨页面状态保持
- 浮动组件交互
- 后端API集成

### 用户体验测试
- 不同屏幕尺寸适配
- 性能影响评估
- 可用性测试

## 📋 验收标准

### 功能要求
- ✅ 任务定时器排他性
- ✅ 全局浮动定时器显示
- ✅ 跨页面状态保持
- ✅ 暂停/恢复功能
- ✅ 优雅的UI交互

### 性能要求
- 页面加载时间增加 < 500ms
- 内存占用增加 < 10MB
- CPU使用率增加 < 5%

### 兼容性要求
- 支持主流浏览器 (Chrome, Firefox, Safari, Edge)
- 响应式设计适配移动端
- 无障碍功能支持

---

*该设计方案将显著提升用户的工作效率和体验，通过全局可见的定时器帮助用户更好地管理时间和专注工作。*