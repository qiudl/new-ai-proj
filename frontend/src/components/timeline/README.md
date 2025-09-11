# Timeline Component Library v2.0

一个功能完整的时间线组件库，支持实时更新、高级搜索、性能优化和智能事件处理。

## 🚀 快速开始

```tsx
import { EnhancedTaskTimelineV2 } from './components/timeline';

function App() {
  return (
    <EnhancedTaskTimelineV2
      events={timelineEvents}
      showFilters={true}
      enableSearch={true}
      enableAdvancedSearch={true}
      enableGrouping={true}
    />
  );
}
```

## 📦 组件概览

### 核心组件

#### 1. TaskTimeline
基础时间线组件，适用于简单的事件展示。

```tsx
import { TaskTimeline } from './components/timeline';

<TaskTimeline events={events} />
```

#### 2. EnhancedTaskTimelineV2 ⭐️ 推荐
功能最完整的时间线组件，支持高级搜索、智能分组、过滤等。

```tsx
import { EnhancedTaskTimelineV2 } from './components/timeline';

<EnhancedTaskTimelineV2
  events={events}
  showFilters={true}
  enableGrouping={true}
  enableSearch={true}
  enableAdvancedSearch={true}
  showEventCount={true}
  compactMode={false}
  onEventClick={(event) => console.log(event)}
/>
```

**主要特性：**
- 🔍 基础和高级搜索
- 📊 智能事件分组
- 🏷️ 多维度过滤
- 🎨 专业事件渲染
- 📱 响应式设计

#### 3. VirtualizedTimeline
高性能虚拟滚动时间线，适用于大量数据场景。

```tsx
import { VirtualizedTimeline } from './components/timeline';

<VirtualizedTimeline
  events={largeEventArray}
  height={600}
  itemHeight={100}
  overscanCount={10}
/>
```

**适用场景：**
- 📊 10K+ 事件数据
- 💾 内存使用优化
- ⚡ 流畅滚动体验

#### 4. RealTimeTimeline
实时时间线组件，支持WebSocket实时更新。

```tsx
import { RealTimeTimeline } from './components/timeline';

<RealTimeTimeline
  taskId={123}
  websocketUrl="ws://localhost:8081/ws/timeline"
  enableSound={true}
  enableNotifications={true}
  maxEvents={1000}
  autoScroll={true}
/>
```

**实时功能：**
- 🔄 WebSocket实时通信
- 🔊 音效通知
- 🔔 桌面通知
- 🔁 自动重连

### 演示组件

#### TimelineDemo
基础功能演示，展示事件渲染器和分组功能。

#### AdvancedSearchDemo
高级搜索功能演示，展示复杂过滤和模式识别。

#### PerformanceTestDemo
性能测试演示，对比虚拟化和常规渲染的性能差异。

#### RealTimeDemo
实时功能演示，包含模拟WebSocket服务器。

## 🎨 事件渲染系统

### 事件类型支持

组件库支持26种不同的事件类型，每种都有专门的渲染器：

```tsx
// 支持的事件类型
type TaskTimelineEventType = 
  | 'created' | 'updated' | 'deleted' | 'restored'
  | 'completed' | 'started' | 'paused' | 'cancelled'
  | 'assigned' | 'status_changed' | 'priority_changed'
  | 'deadline_changed' | 'comment_added' | 'time_logged'
  | 'tag_added' | 'tag_removed' | 'bulk_updated'
  | 'error_occurred' | 'milestone_reached' | 'approval_requested'
  | 'approval_granted' | 'approval_rejected' | 'notification_sent'
  | 'reminder_triggered' | 'workflow_triggered' | 'exported';
```

### 自定义事件渲染器

```tsx
import { EventRendererFactory } from './components/timeline';

// 注册自定义渲染器
EventRendererFactory.registerRenderer('custom_event', () => ({
  getIcon: () => '🎉',
  getColor: () => '#ff6b35',
  getTitle: (event) => `自定义事件: ${event.description}`,
  getDescription: (event) => event.description,
  getBackgroundColor: () => '#fff5f5',
  getMetadataDisplay: (event) => event.metadata
}));
```

## 🔍 搜索和过滤

### 基础搜索

```tsx
// 简单文本搜索
<EnhancedTaskTimelineV2
  events={events}
  enableSearch={true}
/>
```

### 高级搜索

```tsx
import { AdvancedSearch, AdvancedSearchFilter } from './components/timeline';

const [filter, setFilter] = useState<AdvancedSearchFilter>({
  searchTerm: 'bug fix',
  dateRange: [startDate, endDate],
  eventTypes: ['created', 'updated'],
  severities: ['error', 'warning'],
  patternType: 'error_clusters'
});

<AdvancedSearch
  events={events}
  onFilterChange={setFilter}
  showPresets={true}
  allowSaveFilters={true}
/>
```

### 搜索模式

- **文本搜索**: 支持普通、精确匹配和正则表达式
- **时间范围**: 绝对日期和相对时间范围
- **模式识别**: 错误聚集、完成连击、活动激增等
- **保存过滤**: 支持保存和重用搜索条件

## 📊 智能分组

### 分组策略

```tsx
import { GroupingStrategy } from './components/timeline';

<EnhancedTaskTimelineV2
  events={events}
  enableGrouping={true}
  groupingStrategy={GroupingStrategy.INTELLIGENT}
/>
```

**可用策略：**
- `BY_DATE`: 按日期分组
- `BY_USER`: 按用户分组
- `BY_EVENT_TYPE`: 按事件类型分组
- `BY_CATEGORY`: 按分类分组
- `BY_SEVERITY`: 按严重性分组
- `BY_TASK`: 按任务分组
- `BY_SESSION`: 按会话分组
- `BY_BATCH`: 按批次分组
- `INTELLIGENT`: 智能分组

## 🔄 实时更新

### WebSocket连接

```tsx
import { TimelineWebSocketManager } from './components/timeline';

const wsManager = new TimelineWebSocketManager(
  'ws://localhost:8081/ws/timeline',
  taskId
);

wsManager.setEventHandlers({
  onNewEvent: (event) => console.log('New event:', event),
  onEventUpdated: (event) => console.log('Updated event:', event),
  onEventDeleted: (id) => console.log('Deleted event:', id),
  onBulkUpdate: (events) => console.log('Bulk update:', events)
});

await wsManager.connect();
```

### 消息格式

```tsx
// WebSocket消息格式
interface WebSocketMessage {
  type: 'timeline_event' | 'timeline_update' | 'connection' | 'error';
  data?: any;
  timestamp: string;
  source?: string;
}

// 时间线事件格式
interface TimelineWebSocketEvent {
  type: 'new_event' | 'event_updated' | 'event_deleted' | 'bulk_update';
  event?: TaskTimelineEvent;
  events?: TaskTimelineEvent[];
  eventId?: number;
  taskId?: number;
}
```

## ⚡ 性能优化

### 虚拟滚动

```tsx
import { VirtualizedTimeline } from './components/timeline';

<VirtualizedTimeline
  events={largeDataSet}
  height={600}
  itemHeight={100}
  overscanCount={10}
/>
```

### 性能工具

```tsx
import { TimelinePerformanceUtils } from './components/timeline';

// 缓存管理
TimelinePerformanceUtils.setCache('events_123', processedEvents);
const cached = TimelinePerformanceUtils.getCache('events_123');

// 防抖和节流
const debouncedUpdate = TimelinePerformanceUtils.debounce(updateEvents, 200);
const throttledScroll = TimelinePerformanceUtils.throttle(handleScroll, 100);

// 批处理
const results = TimelinePerformanceUtils.batchProcess(
  largeArray,
  (batch) => processBatch(batch),
  100
);

// 性能监控
const stats = TimelinePerformanceUtils.getPerformanceStats();
console.log('Cache hit rate:', stats.cache.hitRate);
```

## 🛠️ 开发工具

### 模拟WebSocket服务器

```tsx
import { getMockWebSocketServer } from './components/timeline';

const mockServer = getMockWebSocketServer(8081);
mockServer.start();

// 手动触发事件
mockServer.triggerEvent('created', 5);
```

### 性能测试

```tsx
import { PerformanceTestDemo } from './components/timeline';

// 渲染性能测试组件
<PerformanceTestDemo />
```

## 📱 响应式设计

所有组件都支持响应式设计，自动适配不同屏幕尺寸：

```tsx
// 紧凑模式
<EnhancedTaskTimelineV2
  events={events}
  compactMode={true}
  maxHeight={400}
/>
```

## 🎨 主题定制

### CSS变量

```css
:root {
  --timeline-primary-color: #1890ff;
  --timeline-success-color: #52c41a;
  --timeline-warning-color: #faad14;
  --timeline-error-color: #ff4d4f;
  --timeline-background: #ffffff;
  --timeline-border-color: #f0f0f0;
}
```

## 🔧 配置选项

### 环境变量

```env
# WebSocket服务器地址
REACT_APP_WEBSOCKET_URL=ws://localhost:8081/ws/timeline

# 性能配置
REACT_APP_TIMELINE_MAX_EVENTS=1000
REACT_APP_TIMELINE_CACHE_DURATION=300000
```

## 📚 API参考

### 核心Props

#### EnhancedTaskTimelineV2

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| events | TaskTimelineEvent[] | [] | 时间线事件数据 |
| loading | boolean | false | 加载状态 |
| showFilters | boolean | true | 显示过滤器 |
| enableGrouping | boolean | true | 启用分组 |
| enableSearch | boolean | true | 启用基础搜索 |
| enableAdvancedSearch | boolean | true | 启用高级搜索 |
| compactMode | boolean | false | 紧凑模式 |
| maxHeight | number | 600 | 最大高度 |
| onEventClick | (event) => void | - | 事件点击回调 |
| onRefresh | () => void | - | 刷新回调 |

#### RealTimeTimeline

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| taskId | number | - | 任务ID过滤 |
| websocketUrl | string | - | WebSocket服务器地址 |
| enableSound | boolean | true | 启用音效通知 |
| enableNotifications | boolean | false | 启用桌面通知 |
| maxEvents | number | 1000 | 最大事件数量 |
| autoScroll | boolean | true | 自动滚动到新事件 |

## 🐛 故障排除

### 常见问题

**Q: WebSocket连接失败**
A: 检查服务器地址和端口，确保WebSocket服务正常运行。

**Q: 大量数据渲染卡顿**
A: 使用`VirtualizedTimeline`组件或启用`compactMode`。

**Q: 搜索结果不准确**
A: 检查搜索条件和事件数据结构，确保字段名称正确。

**Q: 事件图标不显示**
A: 确保事件类型在支持列表中，或注册自定义渲染器。

### 调试模式

```tsx
// 启用调试日志
localStorage.setItem('TIMELINE_DEBUG', 'true');

// 查看性能统计
import { TimelinePerformanceUtils } from './components/timeline';
console.log(TimelinePerformanceUtils.getPerformanceStats());
```

## 🚀 更新日志

### v2.0.0
- ✨ 新增实时WebSocket支持
- ✨ 新增虚拟滚动组件
- ✨ 新增高级搜索功能
- ✨ 新增智能事件分组
- ✨ 新增性能优化工具
- ✨ 新增26种事件类型支持
- 🐛 修复了多个渲染和性能问题

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

**AI Project Timeline Components v2.0** - 由AI辅助开发的高质量时间线组件库。