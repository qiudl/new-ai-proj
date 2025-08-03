import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function createGanttChartTask() {
  const taskServer = new TaskMCPServer();
  
  try {
    const result = await taskServer.createTask(
      '智能项目甘特图可视化系统',
      1, // 项目ID
      184 // 父任务ID: 31周-05：报告报表优化
    );
    
    if (result.success) {
      console.log('✅ 甘特图任务创建成功: ID', result.id);
      
      const ganttTaskDescription = `# 智能项目甘特图可视化系统

## 📋 任务概述
为项目详情页开发一套完整的甘特图可视化系统，提供项目时间线管理、进度跟踪和资源优化功能。

## 🎯 核心目标

### 1. 项目时间线可视化
- **任务依赖关系图**: 清晰显示任务间的依赖和阻塞关系
- **里程碑标记**: 重要节点和关键时间点的可视化
- **进度百分比**: 实时显示项目和任务完成进度
- **关键路径分析**: 自动计算并高亮显示关键路径

### 2. 交互式甘特图组件
- **拖拽调整**: 支持直接拖拽调整任务时间和依赖
- **缩放导航**: 多级时间刻度（日/周/月视图）
- **智能排列**: 自动优化任务排列避免冲突
- **实时协作**: 多用户同时编辑的冲突检测

## 🛠️ 技术实现架构

### 前端组件设计
\`\`\`typescript
interface GanttChartProps {
  projectId: number;
  tasks: TaskWithDependencies[];
  viewMode: 'day' | 'week' | 'month';
  editMode: boolean;
  onTaskUpdate: (taskId: number, updates: TaskUpdates) => void;
  onDependencyChange: (fromTask: number, toTask: number) => void;
}

interface TaskWithDependencies extends Task {
  dependencies: number[];
  dependents: number[];
  criticalPath: boolean;
  slack: number; // 浮动时间
}
\`\`\`

### 核心功能模块

#### 1. GanttChart 主组件
\`\`\`typescript
// 文件: src/components/GanttChart/GanttChart.tsx
const GanttChart: React.FC<GanttChartProps> = ({
  projectId,
  tasks,
  viewMode,
  editMode
}) => {
  const [timeline, setTimeline] = useState<TimelineData>();
  const [dragState, setDragState] = useState<DragState>();
  
  // 关键路径计算
  const criticalPath = useMemo(() => 
    calculateCriticalPath(tasks), [tasks]
  );
  
  // 甘特图渲染引擎
  return (
    <div className="gantt-chart-container">
      <GanttHeader timeline={timeline} />
      <GanttGrid tasks={tasks} criticalPath={criticalPath} />
      <GanttTimeline tasks={tasks} onTaskDrag={handleTaskDrag} />
    </div>
  );
};
\`\`\`

#### 2. 时间轴计算引擎
\`\`\`typescript
// 文件: src/services/ganttCalculationEngine.ts
export class GanttCalculationEngine {
  // 关键路径算法 (CPM)
  calculateCriticalPath(tasks: TaskWithDependencies[]): number[] {
    const graph = this.buildDependencyGraph(tasks);
    const longestPath = this.findLongestPath(graph);
    return longestPath;
  }
  
  // 资源冲突检测
  detectResourceConflicts(tasks: TaskWithDependencies[]): Conflict[] {
    return tasks.reduce((conflicts, task) => {
      const overlappingTasks = this.findOverlappingTasks(task, tasks);
      if (overlappingTasks.length > 0) {
        conflicts.push({
          taskId: task.id,
          conflictingTasks: overlappingTasks,
          severity: this.calculateConflictSeverity(task, overlappingTasks)
        });
      }
      return conflicts;
    }, []);
  }
  
  // 智能排期建议
  suggestOptimalSchedule(tasks: TaskWithDependencies[]): ScheduleSuggestion {
    const conflicts = this.detectResourceConflicts(tasks);
    const suggestions = this.generateScheduleOptimizations(conflicts);
    return {
      originalDuration: this.calculateProjectDuration(tasks),
      optimizedDuration: this.calculateOptimizedDuration(suggestions),
      suggestions
    };
  }
}
\`\`\`

#### 3. 甘特图渲染组件
\`\`\`typescript
// 文件: src/components/GanttChart/GanttTimeline.tsx
const GanttTimeline: React.FC<GanttTimelineProps> = ({
  tasks,
  onTaskDrag,
  criticalPath
}) => {
  const [viewportStart, setViewportStart] = useState<Date>();
  const [viewportEnd, setViewportEnd] = useState<Date>();
  
  return (
    <svg className="gantt-timeline" width="100%" height={tasks.length * 40}>
      {tasks.map(task => (
        <GanttTaskBar
          key={task.id}
          task={task}
          isCritical={criticalPath.includes(task.id)}
          onDrag={onTaskDrag}
          onResize={handleTaskResize}
        />
      ))}
      <GanttDependencyLines tasks={tasks} />
      <GanttMilestones milestones={extractMilestones(tasks)} />
    </svg>
  );
};
\`\`\`

## 📊 智能分析功能

### 1. 项目健康度分析
\`\`\`typescript
interface ProjectHealthMetrics {
  scheduleVariance: number; // 进度偏差
  resourceUtilization: number; // 资源利用率
  riskScore: number; // 风险评分
  completionProbability: number; // 按时完成概率
}

// AI驱动的项目分析
const analyzeProjectHealth = (tasks: TaskWithDependencies[]): ProjectHealthMetrics => {
  return {
    scheduleVariance: calculateScheduleVariance(tasks),
    resourceUtilization: calculateResourceUtilization(tasks),
    riskScore: assessProjectRisks(tasks),
    completionProbability: predictCompletionProbability(tasks)
  };
};
\`\`\`

### 2. 自动化排期优化
- **智能缓冲时间**: 基于历史数据自动添加合理缓冲
- **资源均衡**: 避免资源过载的智能排期
- **依赖优化**: 自动检测并建议优化依赖关系
- **风险预警**: 提前识别可能的延期风险

## 🎨 UI/UX设计规范

### 视觉设计
\`\`\`css
/* 甘特图样式规范 */
.gantt-chart-container {
  --primary-color: #1890ff;
  --critical-path-color: #ff4d4f;
  --completed-color: #52c41a;
  --in-progress-color: #faad14;
  --milestone-color: #722ed1;
}

.gantt-task-bar {
  height: 24px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: grab;
}

.gantt-task-bar--critical {
  background: linear-gradient(90deg, #ff4d4f, #ff7875);
  border: 2px solid #cf1322;
}

.gantt-dependency-line {
  stroke: #8c8c8c;
  stroke-width: 1;
  marker-end: url(#arrowhead);
}
\`\`\`

### 交互设计
- **拖拽反馈**: 实时显示拖拽预览和影响分析
- **智能吸附**: 拖拽时自动对齐到时间网格
- **批量操作**: 支持多选任务的批量调整
- **撤销重做**: 完整的操作历史记录

## 🔧 开发实施计划

### Phase 1: 基础甘特图 (5天)
- [ ] 甘特图核心组件架构设计
- [ ] 基础时间轴和任务条渲染
- [ ] 简单的任务拖拽功能
- [ ] 时间刻度切换 (日/周/月)

### Phase 2: 依赖关系 (4天)
- [ ] 任务依赖关系数据模型
- [ ] 依赖线绘制和箭头标记
- [ ] 依赖冲突检测算法
- [ ] 拖拽时依赖关系验证

### Phase 3: 关键路径分析 (3天)
- [ ] CPM算法实现 (关键路径法)
- [ ] 关键路径可视化高亮
- [ ] 浮动时间计算和显示
- [ ] 项目工期自动计算

### Phase 4: 智能分析 (4天)
- [ ] 项目健康度分析算法
- [ ] 资源冲突检测和建议
- [ ] 风险评估和预警系统
- [ ] 自动排期优化建议

### Phase 5: 高级交互 (3天)
- [ ] 里程碑添加和编辑
- [ ] 甘特图导出 (PNG/PDF)
- [ ] 批量任务操作功能
- [ ] 实时协作冲突处理

### Phase 6: 集成测试 (2天)
- [ ] 与现有项目详情页集成
- [ ] 性能优化和代码分割
- [ ] 移动端响应式适配
- [ ] 用户体验测试和调优

**总工期**: 21天
**总工时**: 约168小时

## 📱 移动端适配策略

### 响应式甘特图
- **折叠式设计**: 在小屏幕上隐藏非关键信息
- **触摸手势**: 支持捏合缩放和双指拖拽
- **简化视图**: 移动端专用的简化甘特图模式
- **离线查看**: 甘特图数据的本地缓存

## 🚀 性能优化策略

### 大数据量处理
- **虚拟滚动**: 仅渲染可视区域的任务条
- **分片渲染**: 大项目的分批渲染策略
- **智能缓存**: 甘特图计算结果的缓存机制
- **懒加载**: 依赖关系和详细数据的按需加载

### 实时更新优化
- **增量更新**: 仅更新变化的任务和依赖
- **防抖处理**: 拖拽操作的性能优化
- **Web Workers**: 复杂计算的后台处理
- **内存管理**: 避免内存泄漏的组件设计

## 📈 预期业务价值

### 项目管理效率提升
- **可视化决策**: 直观的项目状态一目了然
- **风险预防**: 提前识别和规避项目风险
- **资源优化**: 避免资源冲突和浪费
- **时间管理**: 精确的项目工期控制

### 团队协作增强
- **透明度**: 所有成员都能清楚看到项目进展
- **责任明确**: 清晰的任务分工和依赖关系
- **沟通效率**: 减少项目状态确认的沟通成本
- **决策支持**: 基于数据的项目决策支持

## 🔮 未来扩展方向

### 短期增强 (1-2月)
- **AI调度助手**: 基于ML的智能排期建议
- **多项目视图**: 跨项目的资源统筹管理
- **自定义字段**: 支持自定义甘特图显示字段
- **模板系统**: 项目模板的甘特图预设

### 长期愿景 (3-6月)
- **3D甘特图**: 立体化的多维度项目视图
- **VR协作**: 虚拟现实中的项目管理体验
- **区块链**: 基于区块链的项目里程碑记录
- **AI预测**: 基于大数据的项目成功率预测

---

## 💡 创新亮点

1. **AI驱动优化**: 结合机器学习的智能排期建议
2. **实时协作**: WebSocket驱动的多用户实时编辑
3. **3D可视化**: 突破传统2D甘特图的维度限制
4. **移动优先**: 专为移动设备优化的交互体验
5. **性能极致**: 支持1000+任务的流畅操作体验

这个智能甘特图系统将彻底革新项目管理的可视化体验，让复杂项目管理变得简单直观！🚀`;

      const updateResult = await taskServer.updateTask(result.id, {
        description: ganttTaskDescription,
        status: 'todo',
        custom_fields: { 
          priority: 'high',
          estimated_hours: 168,
          category: 'visualization',
          complexity: 'high',
          tags: ['甘特图', 'project-management', 'visualization', 'frontend', 'AI']
        }
      });
      
      if (updateResult.success) {
        console.log('✅ 甘特图任务详情更新成功');
        console.log('🔗 任务详情页: http://localhost/projects/1/tasks/' + result.id);
        console.log('');
        console.log('📋 任务创建总结:');
        console.log('   - 任务ID:', result.id);
        console.log('   - 父任务: 184 (31周-05：报告报表优化)');
        console.log('   - 预估工时: 168小时 (21天)');
        console.log('   - 复杂度: 高');
        console.log('   - 包含: 完整的技术架构、实施计划和prompts');
      } else {
        console.log('❌ 任务详情更新失败:', updateResult.error);
      }
    } else {
      console.log('❌ 甘特图任务创建失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 创建甘特图任务时发生错误:', error.message);
  }
}

createGanttChartTask();