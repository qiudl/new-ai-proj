import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function createGanttSubtasks() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🎯 创建甘特图开发子任务 (父任务: #226)');
    console.log('=====================================');
    
    // 6个Phase的子任务定义
    const subtasks = [
      {
        title: 'Phase 1: 甘特图基础架构设计',
        description: `# Phase 1: 甘特图基础架构设计

## 🎯 开发目标
建立甘特图组件的核心架构和基础渲染功能

## 📋 开发任务

### 1. 组件架构设计
- [ ] 创建 \`GanttChart\` 主组件
- [ ] 设计 \`GanttChartProps\` 接口
- [ ] 实现 \`TaskWithDependencies\` 数据模型
- [ ] 建立甘特图状态管理架构

### 2. 基础时间轴渲染
- [ ] 实现 \`GanttHeader\` 时间标尺组件
- [ ] 创建 \`GanttGrid\` 网格背景组件
- [ ] 开发时间刻度切换功能 (日/周/月)
- [ ] 实现响应式时间轴缩放

### 3. 任务条渲染
- [ ] 创建 \`GanttTaskBar\` 任务条组件
- [ ] 实现任务进度可视化
- [ ] 支持任务状态颜色编码
- [ ] 添加任务信息悬浮提示

### 4. 基础交互功能
- [ ] 实现任务条的鼠标悬停效果
- [ ] 添加任务点击事件处理
- [ ] 实现基础的拖拽准备工作
- [ ] 创建甘特图容器和滚动处理

## 🛠️ 技术提示

### 组件文件结构
\`\`\`
src/components/GanttChart/
├── GanttChart.tsx        # 主组件
├── GanttHeader.tsx       # 时间标尺
├── GanttGrid.tsx         # 网格背景
├── GanttTaskBar.tsx      # 任务条
├── GanttContainer.tsx    # 容器组件
└── index.ts             # 导出文件
\`\`\`

### 核心类型定义
\`\`\`typescript
interface GanttChartProps {
  projectId: number;
  tasks: TaskWithDependencies[];
  viewMode: 'day' | 'week' | 'month';
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: TaskWithDependencies) => void;
}

interface TimelineConfig {
  viewMode: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  pixelsPerDay: number;
}
\`\`\`

### CSS样式框架
\`\`\`css
.gantt-chart {
  --timeline-height: 60px;
  --task-height: 32px;
  --row-height: 40px;
  --grid-color: #e8e8e8;
  --primary-color: #1890ff;
}
\`\`\`

## ⏰ 预估工时
**5天 (40小时)**

## 🎉 交付标准
- 甘特图主组件可以正常渲染
- 时间轴显示正确的日期刻度
- 任务条按照时间正确定位
- 支持日/周/月视图切换`,
        estimatedHours: 40,
        priority: 'high'
      },
      {
        title: 'Phase 2: 任务依赖关系系统',
        description: `# Phase 2: 任务依赖关系系统

## 🎯 开发目标
实现任务间依赖关系的可视化和交互功能

## 📋 开发任务

### 1. 依赖关系数据模型
- [ ] 扩展 \`TaskWithDependencies\` 接口
- [ ] 实现依赖关系的存储结构
- [ ] 创建依赖类型定义 (FS, SS, FF, SF)
- [ ] 建立依赖验证规则

### 2. 依赖线绘制系统
- [ ] 创建 \`GanttDependencyLines\` 组件
- [ ] 实现 SVG 路径计算算法
- [ ] 添加箭头标记和线条样式
- [ ] 支持不同依赖类型的视觉区分

### 3. 依赖冲突检测
- [ ] 开发循环依赖检测算法
- [ ] 实现时间冲突验证
- [ ] 创建冲突警告显示
- [ ] 建立自动修复建议机制

### 4. 依赖交互功能
- [ ] 支持点击依赖线查看详情
- [ ] 实现依赖关系的添加/删除
- [ ] 添加依赖编辑模态框
- [ ] 创建依赖关系工具栏

## 🛠️ 技术提示

### 依赖线计算算法
\`\`\`typescript
interface DependencyLine {
  id: string;
  fromTask: number;
  toTask: number;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  path: string; // SVG path
  conflicts: boolean;
}

class DependencyCalculator {
  calculatePath(
    fromTask: TaskWithDependencies,
    toTask: TaskWithDependencies,
    type: DependencyType
  ): string {
    // 计算连接路径的算法
  }
  
  detectConflicts(dependencies: DependencyLine[]): ConflictInfo[] {
    // 冲突检测逻辑
  }
}
\`\`\`

### SVG渲染优化
\`\`\`typescript
const GanttDependencyLines: React.FC = ({ dependencies }) => {
  const pathElements = useMemo(() => 
    dependencies.map(dep => (
      <path
        key={dep.id}
        d={dep.path}
        stroke={dep.conflicts ? '#ff4d4f' : '#8c8c8c'}
        strokeWidth={2}
        fill="none"
        markerEnd="url(#arrowhead)"
      />
    )), [dependencies]
  );
  
  return <g className="dependency-lines">{pathElements}</g>;
};
\`\`\`

## ⏰ 预估工时
**4天 (32小时)**

## 🎉 交付标准
- 依赖线正确连接相关任务
- 支持4种标准依赖类型
- 能检测并警告循环依赖
- 依赖关系可以交互编辑`,
        estimatedHours: 32,
        priority: 'high'
      },
      {
        title: 'Phase 3: 关键路径分析算法',
        description: `# Phase 3: 关键路径分析算法

## 🎯 开发目标
实现CPM (关键路径法) 算法和项目工期计算

## 📋 开发任务

### 1. CPM算法实现
- [ ] 创建 \`CriticalPathCalculator\` 类
- [ ] 实现前推计算 (Forward Pass)
- [ ] 实现后推计算 (Backward Pass)
- [ ] 计算总浮动时间 (Total Float)

### 2. 关键路径可视化
- [ ] 高亮显示关键路径任务
- [ ] 创建关键路径图例说明
- [ ] 实现路径追踪动画效果
- [ ] 添加关键路径统计信息

### 3. 浮动时间分析
- [ ] 计算自由浮动时间 (Free Float)
- [ ] 显示任务的时间缓冲信息
- [ ] 创建浮动时间可视化组件
- [ ] 实现风险等级评估

### 4. 项目工期管理
- [ ] 自动计算项目最早完成时间
- [ ] 实现里程碑自动设置
- [ ] 创建工期优化建议
- [ ] 添加进度跟踪功能

## 🛠️ 技术提示

### CPM算法核心
\`\`\`typescript
interface CPMNode {
  taskId: number;
  earliestStart: Date;
  earliestFinish: Date;
  latestStart: Date;
  latestFinish: Date;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
}

class CriticalPathCalculator {
  // 前推计算最早开始/完成时间
  forwardPass(tasks: TaskWithDependencies[]): Map<number, CPMNode> {
    const nodes = new Map<number, CPMNode>();
    const sorted = this.topologicalSort(tasks);
    
    for (const task of sorted) {
      const node = this.calculateEarliestTimes(task, nodes);
      nodes.set(task.id, node);
    }
    
    return nodes;
  }
  
  // 后推计算最晚开始/完成时间
  backwardPass(tasks: TaskWithDependencies[], nodes: Map<number, CPMNode>): void {
    const sorted = this.topologicalSort(tasks).reverse();
    
    for (const task of sorted) {
      this.calculateLatestTimes(task, nodes);
    }
  }
  
  // 识别关键路径
  findCriticalPath(nodes: Map<number, CPMNode>): number[] {
    return Array.from(nodes.values())
      .filter(node => node.totalFloat === 0)
      .map(node => node.taskId);
  }
}
\`\`\`

### 可视化组件
\`\`\`typescript
const CriticalPathVisualization: React.FC<{
  criticalPath: number[];
  nodes: Map<number, CPMNode>;
}> = ({ criticalPath, nodes }) => {
  return (
    <div className="critical-path-analysis">
      <div className="path-legend">
        <span className="critical-indicator">● 关键路径</span>
        <span className="float-indicator">● 有浮动时间</span>
      </div>
      
      <div className="project-metrics">
        <Statistic title="项目工期" value={calculateProjectDuration(nodes)} suffix="天" />
        <Statistic title="关键任务" value={criticalPath.length} suffix="个" />
        <Statistic title="总浮动时间" value={calculateTotalFloat(nodes)} suffix="天" />
      </div>
    </div>
  );
};
\`\`\`

## ⏰ 预估工时
**3天 (24小时)**

## 🎉 交付标准
- CPM算法计算结果准确
- 关键路径高亮显示清晰
- 浮动时间信息完整
- 项目工期自动计算正确`,
        estimatedHours: 24,
        priority: 'high'
      },
      {
        title: 'Phase 4: 智能分析和优化系统',
        description: `# Phase 4: 智能分析和优化系统

## 🎯 开发目标
实现AI驱动的项目分析和自动优化建议功能

## 📋 开发任务

### 1. 项目健康度分析
- [ ] 创建 \`ProjectHealthAnalyzer\` 类
- [ ] 实现进度偏差计算算法
- [ ] 开发资源利用率分析
- [ ] 建立风险评分模型

### 2. 资源冲突检测
- [ ] 实现资源过载检测算法
- [ ] 创建资源均衡建议
- [ ] 开发冲突可视化组件
- [ ] 添加自动调度建议

### 3. 风险预警系统
- [ ] 建立延期风险评估模型
- [ ] 实现早期预警机制
- [ ] 创建风险缓解建议
- [ ] 添加风险趋势分析

### 4. 自动优化建议
- [ ] 开发智能排期算法
- [ ] 实现缓冲时间优化
- [ ] 创建依赖关系优化建议
- [ ] 添加资源分配优化

## 🛠️ 技术提示

### 智能分析引擎
\`\`\`typescript
interface ProjectHealthMetrics {
  scheduleVariance: number;      // 进度偏差 (-1 to 1)
  resourceUtilization: number;   // 资源利用率 (0 to 1)
  riskScore: number;             // 风险评分 (0 to 10)
  completionProbability: number; // 按时完成概率 (0 to 1)
  criticalPathHealth: number;    // 关键路径健康度
}

class ProjectHealthAnalyzer {
  analyzeProject(tasks: TaskWithDependencies[]): ProjectHealthMetrics {
    return {
      scheduleVariance: this.calculateScheduleVariance(tasks),
      resourceUtilization: this.calculateResourceUtilization(tasks),
      riskScore: this.assessProjectRisks(tasks),
      completionProbability: this.predictCompletionProbability(tasks),
      criticalPathHealth: this.analyzeCriticalPathHealth(tasks)
    };
  }
  
  generateOptimizationSuggestions(
    tasks: TaskWithDependencies[],
    metrics: ProjectHealthMetrics
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (metrics.resourceUtilization > 0.8) {
      suggestions.push({
        type: 'resource_rebalance',
        priority: 'high',
        description: '检测到资源过载，建议重新分配任务',
        impact: 'high',
        implementation: this.generateResourceRebalanceActions(tasks)
      });
    }
    
    return suggestions;
  }
}
\`\`\`

### AI优化算法
\`\`\`typescript
interface OptimizationSuggestion {
  type: 'schedule' | 'resource' | 'dependency' | 'buffer';
  priority: 'low' | 'medium' | 'high';
  description: string;
  impact: 'low' | 'medium' | 'high';
  implementation: OptimizationAction[];
  expectedBenefit: {
    timeReduction?: number;
    riskReduction?: number;
    costReduction?: number;
  };
}

class SmartScheduleOptimizer {
  optimizeSchedule(
    tasks: TaskWithDependencies[],
    constraints: ScheduleConstraints
  ): OptimizationResult {
    // 遗传算法或模拟退火算法优化排期
    const optimizedTasks = this.runOptimizationAlgorithm(tasks, constraints);
    
    return {
      originalDuration: this.calculateProjectDuration(tasks),
      optimizedDuration: this.calculateProjectDuration(optimizedTasks),
      optimizedTasks,
      suggestions: this.generateImplementationSteps(tasks, optimizedTasks)
    };
  }
}
\`\`\`

## ⏰ 预估工时
**4天 (32小时)**

## 🎉 交付标准
- 项目健康度分析准确
- 能识别和预警潜在风险
- 优化建议具体可执行
- AI算法性能良好`,
        estimatedHours: 32,
        priority: 'medium'
      },
      {
        title: 'Phase 5: 高级交互和协作功能',
        description: `# Phase 5: 高级交互和协作功能

## 🎯 开发目标
实现甘特图的高级交互功能和多用户协作支持

## 📋 开发任务

### 1. 高级拖拽交互
- [ ] 实现任务条的拖拽调整
- [ ] 支持任务时间范围拖拽调整
- [ ] 添加拖拽时的实时预览
- [ ] 实现智能吸附和对齐

### 2. 里程碑管理
- [ ] 创建 \`GanttMilestones\` 组件
- [ ] 实现里程碑的添加/编辑/删除
- [ ] 支持里程碑的拖拽调整
- [ ] 添加里程碑依赖关系

### 3. 批量操作功能
- [ ] 实现多任务选择功能
- [ ] 支持批量状态更新
- [ ] 添加批量时间调整
- [ ] 创建批量操作工具栏

### 4. 导出和分享功能
- [ ] 实现甘特图PNG导出
- [ ] 支持PDF格式导出
- [ ] 添加甘特图分享链接
- [ ] 创建打印友好的样式

## 🛠️ 技术提示

### 拖拽系统
\`\`\`typescript
interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'resize-start' | 'resize-end';
  taskId: number;
  startPosition: { x: number; y: number };
  originalDates: { start: Date; end: Date };
  previewDates: { start: Date; end: Date };
}

const useDragAndDrop = (
  tasks: TaskWithDependencies[],
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void
) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  const handleDragStart = useCallback((taskId: number, dragType: DragType) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setDragState({
      isDragging: true,
      dragType,
      taskId,
      startPosition: { x: 0, y: 0 },
      originalDates: { start: task.start_date, end: task.due_date },
      previewDates: { start: task.start_date, end: task.due_date }
    });
  }, [tasks]);
  
  return { dragState, handleDragStart, handleDragMove, handleDragEnd };
};
\`\`\`

### 里程碑组件
\`\`\`typescript
interface Milestone {
  id: number;
  title: string;
  date: Date;
  type: 'start' | 'finish' | 'deliverable' | 'review';
  status: 'pending' | 'completed' | 'delayed';
  dependencies: number[];
}

const GanttMilestones: React.FC<{
  milestones: Milestone[];
  onMilestoneUpdate: (milestone: Milestone) => void;
}> = ({ milestones, onMilestoneUpdate }) => {
  return (
    <g className="gantt-milestones">
      {milestones.map(milestone => (
        <MilestoneMarker
          key={milestone.id}
          milestone={milestone}
          onUpdate={onMilestoneUpdate}
        />
      ))}
    </g>
  );
};
\`\`\`

### 导出功能
\`\`\`typescript
class GanttExportService {
  exportToPNG(ganttElement: HTMLElement): Promise<string> {
    return html2canvas(ganttElement).then(canvas => {
      return canvas.toDataURL('image/png');
    });
  }
  
  exportToPDF(ganttElement: HTMLElement): Promise<Blob> {
    return this.exportToPNG(ganttElement).then(imageData => {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      pdf.addImage(imageData, 'PNG', 10, 10, 277, 190);
      return pdf.output('blob');
    });
  }
  
  generateShareableLink(projectId: number, viewConfig: ViewConfig): string {
    const params = new URLSearchParams({
      project: projectId.toString(),
      view: viewConfig.mode,
      start: viewConfig.startDate.toISOString(),
      end: viewConfig.endDate.toISOString()
    });
    
    return \`\${window.location.origin}/gantt/share?\${params.toString()}\`;
  }
}
\`\`\`

## ⏰ 预估工时
**3天 (24小时)**

## 🎉 交付标准
- 拖拽操作流畅准确
- 里程碑功能完整可用
- 批量操作高效便捷
- 导出功能格式正确`,
        estimatedHours: 24,
        priority: 'medium'
      },
      {
        title: 'Phase 6: 集成测试和性能优化',
        description: `# Phase 6: 集成测试和性能优化

## 🎯 开发目标
完成甘特图系统的集成测试、性能优化和最终部署

## 📋 开发任务

### 1. 与项目详情页集成
- [ ] 集成甘特图到 \`ProjectDetailPage\`
- [ ] 实现甘特图标签页切换
- [ ] 连接现有任务管理API
- [ ] 添加甘特图数据同步机制

### 2. 性能优化
- [ ] 实现虚拟滚动优化
- [ ] 添加甘特图数据缓存机制
- [ ] 优化SVG渲染性能
- [ ] 实现代码分割和懒加载

### 3. 移动端适配
- [ ] 创建响应式甘特图组件
- [ ] 实现触摸手势支持
- [ ] 添加移动端专用UI
- [ ] 优化移动端性能

### 4. 测试和文档
- [ ] 编写单元测试用例
- [ ] 创建集成测试场景
- [ ] 编写用户使用文档
- [ ] 进行用户体验测试

## 🛠️ 技术提示

### 项目详情页集成
\`\`\`typescript
// ProjectDetailPage.tsx 中添加甘特图标签
const ProjectDetailPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  
  const tabItems = [
    { key: 'tasks', label: '任务列表', children: <TaskList /> },
    { key: 'gantt', label: '甘特图', children: <GanttChart projectId={projectId} /> },
    { key: 'reports', label: '报告', children: <Reports /> }
  ];
  
  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
  );
};
\`\`\`

### 虚拟滚动优化
\`\`\`typescript
const VirtualizedGanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
  const [viewportStart, setViewportStart] = useState(0);
  const [viewportEnd, setViewportEnd] = useState(100);
  
  const visibleTasks = useMemo(() => {
    return tasks.slice(viewportStart, viewportEnd);
  }, [tasks, viewportStart, viewportEnd]);
  
  const handleScroll = useCallback((scrollTop: number) => {
    const itemHeight = 40;
    const start = Math.floor(scrollTop / itemHeight);
    const end = start + Math.ceil(window.innerHeight / itemHeight);
    
    setViewportStart(start);
    setViewportEnd(end);
  }, []);
  
  return (
    <VirtualList
      height={600}
      itemCount={tasks.length}
      itemSize={40}
      onScroll={handleScroll}
    >
      {({ index, style }) => (
        <div style={style}>
          <GanttTaskRow task={visibleTasks[index]} />
        </div>
      )}
    </VirtualList>
  );
};
\`\`\`

### 移动端适配
\`\`\`typescript
const ResponsiveGanttChart: React.FC = (props) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    return <MobileGanttChart {...props} />;
  }
  
  return <DesktopGanttChart {...props} />;
};

const MobileGanttChart: React.FC = ({ tasks }) => {
  return (
    <div className="mobile-gantt">
      <GanttTimelineView tasks={tasks} />
      <GanttTaskCards tasks={tasks} />
    </div>
  );
};
\`\`\`

### 性能监控
\`\`\`typescript
const GanttPerformanceMonitor: React.FC = ({ children }) => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('gantt')) {
          console.log(\`Gantt Chart Performance: \${entry.name} - \${entry.duration}ms\`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => observer.disconnect();
  }, []);
  
  return <>{children}</>;
};
\`\`\`

## ⏰ 预估工时
**2天 (16小时)**

## 🎉 交付标准
- 甘特图成功集成到项目详情页
- 大数据量下性能良好 (1000+ 任务)
- 移动端体验流畅
- 测试覆盖率 >80%
- 用户文档完整

## 🚀 最终验收标准
- [ ] 甘特图功能完整可用
- [ ] 性能测试通过
- [ ] 跨浏览器兼容性测试通过
- [ ] 用户体验测试满意度 >85%
- [ ] 代码质量检查通过`
        ,
        estimatedHours: 16,
        priority: 'medium'
      }
    ];
    
    console.log(`\n📋 将创建 ${subtasks.length} 个开发子任务...\n`);
    
    let successCount = 0;
    const taskIds = [];
    
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      
      console.log(`${i + 1}. 创建子任务: ${subtask.title}`);
      
      try {
        const result = await taskServer.createTask(
          subtask.title,
          1, // 项目ID
          226 // 父任务ID: 智能项目甘特图可视化系统
        );
        
        if (result.success) {
          console.log(`   ✅ 创建成功: ID ${result.id}`);
          
          // 更新任务详情
          const updateResult = await taskServer.updateTask(result.id, {
            description: subtask.description,
            status: 'todo',
            custom_fields: {
              priority: subtask.priority,
              estimated_hours: subtask.estimatedHours,
              category: 'gantt-development',
              complexity: 'high',
              tags: ['甘特图', 'development', `phase-${i + 1}`, 'frontend'],
              phase: i + 1,
              phase_name: subtask.title.split(':')[0].trim()
            }
          });
          
          if (updateResult.success) {
            console.log(`   ✅ 详情更新成功`);
            successCount++;
            taskIds.push(result.id);
          } else {
            console.log(`   ❌ 详情更新失败: ${updateResult.error}`);
          }
        } else {
          console.log(`   ❌ 创建失败: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ 创建过程出错: ${error.message}`);
      }
      
      console.log(''); // 空行分隔
    }
    
    console.log('🎉 甘特图开发子任务创建完成!');
    console.log('=====================================');
    console.log(`📊 创建统计:`);
    console.log(`   - 计划创建: ${subtasks.length} 个子任务`);
    console.log(`   - 成功创建: ${successCount} 个子任务`);
    console.log(`   - 失败数量: ${subtasks.length - successCount} 个子任务`);
    console.log(`   - 总预估工时: ${subtasks.reduce((sum, task) => sum + task.estimatedHours, 0)} 小时`);
    console.log('');
    console.log('📋 创建的子任务ID: ' + taskIds.join(', '));
    console.log('');
    console.log('🔗 可以在以下链接查看任务详情:');
    taskIds.forEach((id, index) => {
      console.log(`   ${index + 1}. http://localhost/projects/1/tasks/${id}`);
    });
    console.log('');
    console.log('🎯 下一步: 开发团队可以按照Phase顺序开始甘特图功能开发!');
    
  } catch (error) {
    console.error('❌ 创建甘特图子任务时发生错误:', error.message);
  }
}

createGanttSubtasks();