# 🎨 甘特图UI优化开发Prompts - 任务#186

> **任务ID**: 186  
> **父任务**: 184 (31周-05：报告报表优化)  
> **创建时间**: 2025-08-03  
> **预估工时**: 15小时

---

## 📋 项目背景Prompt

```
作为AI项目管理平台的前端UI/UX专家，我需要优化TaskGanttChart组件的设计，解决当前样式与系统风格不协调的问题。

现状分析：
- 当前甘特图功能正常，但视觉效果粗糙
- 色彩搭配与Ant Design风格不匹配
- 用户反馈样式比较差，与现有系统风格不搭

技术环境：React 18 + TypeScript + Ant Design 5.x
目标：创建专业、美观、与系统风格一致的甘特图界面

请提供专业的UI优化方案和最佳实践。
```

---

## 🎯 Phase 1: 设计系统集成

### Prompt 1.1: Ant Design Token系统应用

```
请重新设计TaskGanttChart组件，严格遵循Ant Design 5.x的设计Token系统：

设计要求：
1. 色彩系统：
   - 主色调：使用antd的primary color (#1677ff)
   - 状态色：success (#52c41a), warning (#faad14), error (#ff4d4f)
   - 中性色：使用antd的gray color palette
   - 背景色：遵循antd的surface colors

2. 间距系统：
   - 使用antd的spacing tokens (4px基准)
   - 组件内边距：16px, 24px
   - 元素间距：8px, 12px, 16px

3. 字体系统：
   - 标题：Typography.Title (level 4, 5)
   - 正文：Typography.Text
   - 标签：Tag组件标准字体

4. 阴影和圆角：
   - 卡片阴影：使用antd的box-shadow tokens
   - 圆角：6px (antd标准)
   - 任务条圆角：4px

请提供完整的样式重构方案，包括：
- CSS-in-JS样式对象
- Token变量使用方式
- 主题适配代码
```

### Prompt 1.2: 组件架构重构

```
重构TaskGanttChart组件架构，提高可维护性和复用性：

组件拆分策略：
1. GanttHeader - 甘特图头部（时间轴、控制器）
2. GanttTaskRow - 单个任务行组件
3. GanttTimeline - 时间线容器
4. GanttTaskBar - 任务条组件
5. GanttStatistics - 统计数据面板
6. GanttEmptyState - 空状态组件
7. GanttLoadingState - 加载状态组件

TypeScript接口设计：
```typescript
interface GanttTheme {
  colors: {
    primary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontSize: Record<string, number>;
    fontWeight: Record<string, number>;
  };
}

interface GanttTaskBarProps {
  task: GanttTask;
  theme: GanttTheme;
  timeline: TimelineConfig;
  onClick: (taskId: number) => void;
  isSelected: boolean;
}
```

请提供完整的组件重构方案。
```

---

## 🎨 Phase 2: 视觉设计优化

### Prompt 2.1: 任务条和时间轴设计

```
设计现代化的甘特图任务条和时间轴界面：

任务条设计规范：
1. 基础样式：
   - 高度：28px（更紧凑）
   - 圆角：6px
   - 边框：1px solid rgba(0,0,0,0.06)
   - 阴影：0 1px 2px rgba(0,0,0,0.04)

2. 状态色彩方案：
   ```css
   .task-todo {
     background: linear-gradient(90deg, #e6f4ff 0%, #bae0ff 100%);
     border-color: #91caff;
   }
   
   .task-in-progress {
     background: linear-gradient(90deg, #fff7e6 0%, #ffd591 100%);
     border-color: #ffb553;
   }
   
   .task-completed {
     background: linear-gradient(90deg, #f6ffed 0%, #b7eb8f 100%);
     border-color: #95de64;
   }
   ```

3. 优先级指示器：
   - 高优先级：左侧红色竖条（4px宽）
   - 中优先级：左侧橙色竖条（3px宽）
   - 低优先级：左侧蓝色竖条（2px宽）

4. 进度指示：
   - 半透明覆盖层显示进度
   - 平滑的动画过渡效果
   - 进度文字居中显示

时间轴设计：
1. 刻度线：1px solid #f0f0f0
2. 时间标签：12px, color: #8c8c8c
3. 背景：#fafafa
4. 今日线：2px solid #1677ff

请提供完整的CSS样式和React组件代码。
```

### Prompt 2.2: 统计面板和布局优化

```
重新设计甘特图的统计面板和整体布局：

统计面板设计（使用Ant Design组件）：
1. 使用Row + Col布局，响应式设计
2. 每个统计项使用Statistic组件
3. 图标使用antd icons
4. 数值动画效果

```typescript
const StatisticsPanel: React.FC<{stats: GanttStats}> = ({stats}) => (
  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
    <Col xs={12} sm={6}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <Statistic
          title="总任务"
          value={stats.totalTasks}
          prefix={<FolderOutlined style={{ color: '#1677ff' }} />}
          valueStyle={{ color: '#1677ff', fontSize: '24px', fontWeight: 600 }}
        />
      </Card>
    </Col>
    <Col xs={12} sm={6}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <Statistic
          title="完成率"
          value={stats.completionRate}
          suffix="%"
          prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 600 }}
        />
      </Card>
    </Col>
    {/* 更多统计项... */}
  </Row>
);
```

整体布局优化：
1. 顶部：统计面板（紧凑布局）
2. 中部：甘特图主体（固定头部，滚动内容）
3. 底部：图例和操作按钮

响应式断点：
- xs: <576px - 移动端竖屏
- sm: ≥576px - 移动端横屏
- md: ≥768px - 平板
- lg: ≥992px - 桌面端

请提供完整的响应式布局方案。
```

---

## 📱 Phase 3: 响应式和交互优化

### Prompt 3.1: 移动端适配设计

```
为甘特图设计移动端友好的界面和交互：

移动端设计策略：
1. 布局调整：
   - 任务名称区域：100%宽度，上方显示
   - 时间轴：下方显示，支持水平滚动
   - 统计面板：网格布局，2列显示

2. 触控交互：
   - 任务条点击区域：最小44px高度
   - 支持手势滚动和缩放
   - 长按显示详细信息

3. 视觉优化：
   - 增大字体和图标尺寸
   - 简化信息密度
   - 使用底部抽屉显示详情

移动端组件设计：
```typescript
interface MobileGanttProps {
  tasks: GanttTask[];
  isMobile: boolean;
  onTaskClick: (taskId: number) => void;
}

const MobileGanttView: React.FC<MobileGanttProps> = () => (
  <div className="mobile-gantt">
    <div className="mobile-stats-grid">
      {/* 2x2网格布局 */}
    </div>
    <div className="mobile-task-list">
      {tasks.map(task => (
        <Card 
          key={task.id}
          size="small"
          className="mobile-task-card"
          onClick={() => onTaskClick(task.id)}
        >
          <div className="task-header">
            <Typography.Text strong>{task.title}</Typography.Text>
            <Tag color={getPriorityColor(task.priority)}>
              {task.priority}
            </Tag>
          </div>
          <div className="task-timeline">
            <div 
              className="task-bar-mobile"
              style={{
                width: `${task.progress}%`,
                background: getStatusGradient(task.status)
              }}
            />
          </div>
          <div className="task-meta">
            <Text type="secondary">
              {dayjs(task.startDate).format('MM/DD')} - 
              {dayjs(task.endDate).format('MM/DD')}
            </Text>
          </div>
        </Card>
      ))}
    </div>
  </div>
);
```

请提供完整的移动端适配方案。
```

### Prompt 3.2: 高级交互和动画

```
为甘特图添加流畅的动画和高级交互功能：

动画设计：
1. 进场动画：
   - 统计数字滚动效果（CountUp.js）
   - 任务条从左到右滑入
   - 统计面板淡入效果

2. 交互动画：
   - 任务条hover放大效果（scale: 1.02）
   - 选中状态阴影加深
   - 加载状态骨架屏动画

3. 状态变化动画：
   - 进度条平滑过渡
   - 颜色渐变切换
   - 布局调整动画

CSS动画实现：
```css
.gantt-task-bar {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0); /* 硬件加速 */
}

.gantt-task-bar:hover {
  transform: scale(1.02) translateZ(0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gantt-task-bar.selected {
  transform: scale(1.05) translateZ(0);
  box-shadow: 0 6px 16px rgba(22, 119, 255, 0.3);
}

/* 进度条动画 */
.task-progress {
  transition: width 0.6s ease-in-out;
}

/* 骨架屏动画 */
@keyframes skeleton-loading {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
```

React Spring动画集成：
```typescript
import { useSpring, animated, useTransition } from '@react-spring/web';

const AnimatedTaskBar: React.FC<TaskBarProps> = ({ task, isVisible }) => {
  const slideIn = useSpring({
    transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
    opacity: isVisible ? 1 : 0,
    config: { tension: 280, friction: 60 }
  });

  const progressSpring = useSpring({
    width: `${task.progress}%`,
    config: { duration: 800 }
  });

  return (
    <animated.div style={slideIn} className="gantt-task-bar">
      <animated.div 
        style={progressSpring} 
        className="task-progress"
      />
    </animated.div>
  );
};
```

高级交互功能：
1. 任务条拖拽调整时间
2. 时间轴缩放（时间粒度切换）
3. 任务依赖关系连线
4. 批量选择和操作
5. 右键菜单功能

请提供完整的动画和交互实现方案。
```

---

## 🔧 Phase 4: 性能和可访问性优化

### Prompt 4.1: 性能优化策略

```
优化甘特图组件的渲染性能，支持大数据量显示：

性能优化方案：
1. 虚拟滚动实现：
   - 使用react-virtual或自实现
   - 只渲染可视区域的任务
   - 预渲染buffer区域

2. 内存优化：
   - useMemo缓存计算结果
   - useCallback优化事件处理
   - 避免不必要的重渲染

3. 渲染优化：
   - React.memo包装子组件
   - 懒加载非关键组件
   - CSS contain优化

虚拟滚动实现：
```typescript
import { FixedSizeList as List } from 'react-window';

const VirtualizedGantt: React.FC<GanttProps> = ({ tasks }) => {
  const ITEM_HEIGHT = 50;
  
  const TaskRow = memo(({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <GanttTaskRow task={tasks[index]} />
    </div>
  ));

  return (
    <div className="gantt-container">
      <GanttHeader />
      <List
        height={600}
        itemCount={tasks.length}
        itemSize={ITEM_HEIGHT}
        width="100%"
      >
        {TaskRow}
      </List>
    </div>
  );
};
```

计算优化：
```typescript
const GanttChart: React.FC = ({ tasks, config }) => {
  // 缓存时间线计算
  const timeline = useMemo(() => 
    calculateTimeline(tasks, config), 
    [tasks, config.startDate, config.endDate]
  );

  // 缓存任务位置计算
  const taskPositions = useMemo(() => 
    tasks.map(task => calculateTaskPosition(task, timeline)),
    [tasks, timeline]
  );

  // 缓存统计数据
  const statistics = useMemo(() => 
    calculateStatistics(tasks),
    [tasks]
  );

  return (
    <GanttProvider value={{ timeline, taskPositions, statistics }}>
      {/* 组件内容 */}
    </GanttProvider>
  );
};
```

请提供完整的性能优化实现。
```

### Prompt 4.2: 可访问性和用户体验

```
为甘特图实现完整的可访问性支持和优秀的用户体验：

可访问性要求：
1. 键盘导航：
   - Tab键切换任务焦点
   - Arrow键移动选择
   - Enter键打开任务详情
   - Escape键取消选择

2. 屏幕阅读器支持：
   - ARIA标签和角色定义
   - 任务状态语音播报
   - 进度信息无障碍描述

3. 视觉辅助：
   - 高对比度模式支持
   - 焦点指示器清晰可见
   - 色盲友好的颜色方案

ARIA实现：
```typescript
const AccessibleTaskBar: React.FC<TaskProps> = ({ task }) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`任务: ${task.title}, 状态: ${task.status}, 进度: ${task.progress}%`}
    aria-describedby={`task-${task.id}-details`}
    aria-pressed={task.isSelected}
    className="gantt-task-bar"
    onKeyDown={handleKeyDown}
    onClick={handleClick}
  >
    <div 
      className="task-progress"
      aria-hidden="true"
      style={{ width: `${task.progress}%` }}
    />
    <span id={`task-${task.id}-details`} className="sr-only">
      开始时间: {formatDate(task.startDate)}, 
      结束时间: {formatDate(task.endDate)},
      优先级: {task.priority}
    </span>
  </div>
);
```

键盘导航实现：
```typescript
const useKeyboardNavigation = (tasks: GanttTask[]) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, tasks.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleTaskSelection(tasks[focusedIndex].id);
        break;
      case 'Escape':
        setSelectedTasks(new Set());
        break;
    }
  }, [tasks, focusedIndex]);

  return { focusedIndex, selectedTasks, handleKeyDown };
};
```

用户体验优化：
1. 错误状态处理
2. 网络失败重试
3. 数据校验和提示
4. 操作确认对话框
5. 快捷键提示
6. 帮助文档集成

请提供完整的可访问性和UX优化方案。
```

---

## 🚀 Phase 5: 集成测试和部署

### Prompt 5.1: 组件测试策略

```
为优化后的甘特图组件编写全面的测试：

测试策略：
1. 单元测试（Jest + React Testing Library）：
   - 组件渲染测试
   - 用户交互测试
   - 数据计算逻辑测试
   - 可访问性测试

2. 视觉回归测试（Storybook + Chromatic）：
   - 不同状态的UI快照
   - 响应式布局测试
   - 主题切换测试

3. 性能测试：
   - 大数据量渲染测试
   - 内存泄漏检测
   - 渲染性能基准测试

单元测试示例：
```typescript
describe('GanttChart Component', () => {
  const mockTasks: GanttTask[] = [
    {
      id: 1,
      title: 'Test Task',
      status: 'in_progress',
      priority: 'high',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-08-05'),
      progress: 60
    }
  ];

  test('renders task bars correctly', () => {
    render(<GanttChart tasks={mockTasks} />);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByLabelText(/任务: Test Task/)).toBeInTheDocument();
  });

  test('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<GanttChart tasks={mockTasks} />);
    
    const taskBar = screen.getByRole('button', { name: /Test Task/ });
    await user.tab();
    
    expect(taskBar).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(taskBar).toHaveAttribute('aria-pressed', 'true');
  });

  test('calculates timeline positions correctly', () => {
    const { timeline, positions } = calculateGanttLayout(mockTasks, {
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-08-10')
    });
    
    expect(positions[0].left).toBe(0);
    expect(positions[0].width).toBeCloseTo(50); // 5天 / 10天总长度
  });
});
```

Storybook故事编写：
```typescript
export default {
  title: 'Components/GanttChart',
  component: GanttChart,
  parameters: {
    layout: 'fullscreen',
  },
} as Meta;

export const Default: Story = {
  args: {
    tasks: mockTaskData,
    height: 600,
  },
};

export const WithManyTasks: Story = {
  args: {
    tasks: generateMockTasks(100),
    height: 800,
  },
};

export const MobileView: Story = {
  args: {
    tasks: mockTaskData,
    height: 600,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const DarkTheme: Story = {
  args: {
    tasks: mockTaskData,
  },
  decorators: [
    (Story) => (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <Story />
      </ConfigProvider>
    ),
  ],
};
```

请提供完整的测试实现方案。
```

### Prompt 5.2: 文档和部署

```
为优化后的甘特图组件编写文档和部署指南：

文档结构：
1. 组件API文档
2. 使用示例和最佳实践
3. 主题定制指南
4. 性能优化建议
5. 故障排除指南

API文档（TypeDoc格式）：
```typescript
/**
 * 甘特图组件 - 用于显示项目任务的时间线视图
 * 
 * @example
 * ```tsx
 * <GanttChart
 *   tasks={taskList}
 *   height={600}
 *   onTaskClick={(taskId) => console.log(taskId)}
 *   theme="light"
 * />
 * ```
 */
export interface GanttChartProps {
  /** 任务数据列表 */
  tasks: GanttTask[];
  
  /** 甘特图高度，默认600px */
  height?: number;
  
  /** 任务点击回调函数 */
  onTaskClick?: (taskId: number) => void;
  
  /** 主题模式 */
  theme?: 'light' | 'dark';
  
  /** 是否显示统计面板 */
  showStatistics?: boolean;
  
  /** 自定义样式 */
  style?: React.CSSProperties;
  
  /** 自定义类名 */
  className?: string;
}

/**
 * 甘特图任务数据结构
 */
export interface GanttTask {
  /** 任务唯一标识 */
  id: number;
  
  /** 任务标题 */
  title: string;
  
  /** 任务状态 */
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  
  /** 任务优先级 */
  priority: 'low' | 'medium' | 'high';
  
  /** 开始时间 */
  startDate: Date;
  
  /** 结束时间 */
  endDate: Date;
  
  /** 完成进度 (0-100) */
  progress: number;
  
  /** 预估工时 */
  estimatedHours?: number;
  
  /** 任务描述 */
  description?: string;
  
  /** 负责人 */
  assignee?: string;
}
```

使用示例文档：
```markdown
# GanttChart 使用指南

## 基础用法

```tsx
import { GanttChart } from '@/components';

const MyProject = () => {
  const tasks = [
    {
      id: 1,
      title: '需求分析',
      status: 'completed',
      priority: 'high',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-08-03'),
      progress: 100
    },
    // ... 更多任务
  ];

  return (
    <GanttChart
      tasks={tasks}
      onTaskClick={(taskId) => {
        console.log('点击任务:', taskId);
      }}
    />
  );
};
```

## 主题定制

```tsx
import { ConfigProvider } from 'antd';

const customTheme = {
  token: {
    colorPrimary: '#722ed1',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
  },
  components: {
    Card: {
      borderRadius: 8,
    },
  },
};

<ConfigProvider theme={customTheme}>
  <GanttChart tasks={tasks} />
</ConfigProvider>
```

## 响应式配置

```tsx
const ResponsiveGantt = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <GanttChart
      tasks={tasks}
      height={isMobile ? 400 : 600}
      showStatistics={!isMobile}
    />
  );
};
```
```

部署清单：
1. 代码review检查表
2. 性能基准测试
3. 浏览器兼容性测试
4. 可访问性审核
5. 文档完整性检查

请提供完整的文档和部署方案。
```

---

## 📝 快速开发指令

```bash
# 1. 创建新的分支
git checkout -b feature/gantt-ui-optimization

# 2. 安装相关依赖
npm install @react-spring/web react-window react-window-infinite-loader

# 3. 启动开发环境
npm run dev

# 4. 运行Storybook（可选）
npm run storybook

# 5. 运行测试
npm run test -- --watch

# 6. 性能测试
npm run test:performance

# 7. 可访问性测试
npm run test:a11y

# 8. 构建检查
npm run build && npm run type-check
```

---

## 🎯 验收标准检查清单

- [ ] 视觉设计与Ant Design风格完全一致
- [ ] 响应式设计在所有设备上正常工作  
- [ ] 支持键盘导航和屏幕阅读器
- [ ] 大数据量渲染性能良好（>1000任务）
- [ ] 动画流畅自然，无卡顿
- [ ] 单元测试覆盖率 >90%
- [ ] 视觉回归测试通过
- [ ] 文档完整且示例可运行
- [ ] 代码通过ESLint和TypeScript检查
- [ ] 浏览器兼容性测试通过

---

**🔗 相关链接:**
- 任务详情: http://localhost:3000/projects/1/tasks/186
- 设计规范: [Ant Design Guidelines](https://ant.design/docs/spec/introduce)
- 当前甘特图: http://localhost:3000/projects/1/tasks/165?tab=gantt

**⏰ 预计完成时间:** 2025年8月10日
**👥 协作方式:** 使用MCP任务系统跟踪进度，定期更新任务状态

---

*这些prompts将帮助您系统性地优化甘特图界面，创造出专业、美观、易用的用户体验。每个phase都可以独立开发，建议按顺序实施以确保最佳效果。*