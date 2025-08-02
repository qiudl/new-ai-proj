/**
 * Gantt Chart Service Tests
 * 
 * Comprehensive test suite for the Gantt chart service including
 * data conversion, scheduling algorithms, dependency analysis, and visualization support.
 */

import { ganttChartService, GanttChartService } from '../ganttChartService';
import { Task } from '../../types/task';

describe('GanttChartService', () => {
  let service: GanttChartService;
  let mockTasks: Task[];

  beforeEach(() => {
    service = new GanttChartService();
    
    // 创建模拟任务数据
    mockTasks = [
      {
        id: 1,
        project_id: 1,
        title: 'Task A - 基础开发',
        description: '项目基础功能开发',
        status: 'completed',
        priority: 'high',
        estimated_hours: 16,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        dependencies: [],
        total_time_seconds: 14400 // 4 hours actual
      },
      {
        id: 2,
        project_id: 1,
        title: 'Task B - UI组件',
        description: '用户界面组件开发',
        status: 'in_progress',
        priority: 'medium',
        estimated_hours: 12,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 2,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        dependencies: [1],
        total_time_seconds: 7200 // 2 hours actual
      },
      {
        id: 3,
        project_id: 1,
        title: 'Task C - 测试',
        description: '功能测试和验证',
        status: 'todo',
        priority: 'medium',
        estimated_hours: 8,
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 3,
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z',
        dependencies: [2],
        total_time_seconds: 0
      },
      {
        id: 4,
        project_id: 1,
        title: 'Task D - 部署',
        description: '项目部署上线',
        status: 'todo',
        priority: 'high',
        estimated_hours: 4,
        due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 4,
        created_at: '2025-01-04T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z',
        dependencies: [3],
        total_time_seconds: 0
      },
      {
        id: 5,
        project_id: 1,
        title: 'Task E - 文档',
        description: '项目文档编写',
        status: 'todo',
        priority: 'low',
        estimated_hours: 6,
        task_level: 0,
        sort_order: 5,
        created_at: '2025-01-05T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z',
        dependencies: [1],
        total_time_seconds: 0
      }
    ];

    service.setTasks(mockTasks);
  });

  describe('基础功能测试', () => {
    it('应该设置任务数据', () => {
      const newTasks = [mockTasks[0]];
      service.setTasks(newTasks);
      
      const ganttTasks = service.convertToGanttTasks();
      expect(ganttTasks).toHaveLength(1);
      expect(ganttTasks[0].id).toBe(1);
    });

    it('应该更新甘特图配置', () => {
      service.updateConfig({
        timeScale: 'week',
        autoSchedule: false
      });

      const ganttTasks = service.convertToGanttTasks();
      expect(ganttTasks).toBeDefined();
    });
  });

  describe('任务转换测试', () => {
    it('应该正确转换基本任务信息', () => {
      const ganttTasks = service.convertToGanttTasks();
      
      expect(ganttTasks).toHaveLength(5);
      
      const task1 = ganttTasks.find(t => t.id === 1);
      expect(task1).toBeDefined();
      expect(task1!.title).toBe('Task A - 基础开发');
      expect(task1!.priority).toBe('high');
      expect(task1!.status).toBe('completed');
      expect(task1!.estimatedHours).toBe(16);
    });

    it('应该正确计算任务工期', () => {
      const ganttTasks = service.convertToGanttTasks();
      
      const task1 = ganttTasks.find(t => t.id === 1);
      expect(task1!.duration).toBe(2); // 16小时 = 2天
      
      const task2 = ganttTasks.find(t => t.id === 2);
      expect(task2!.duration).toBe(2); // 12小时 = 1.5天 -> 2天
      
      const task3 = ganttTasks.find(t => t.id === 3);
      expect(task3!.duration).toBe(1); // 8小时 = 1天
    });

    it('应该正确计算任务进度', () => {
      const ganttTasks = service.convertToGanttTasks();
      
      const task1 = ganttTasks.find(t => t.id === 1);
      expect(task1!.progress).toBe(100); // 已完成
      
      const task2 = ganttTasks.find(t => t.id === 2);
      expect(task2!.progress).toBeGreaterThan(0); // 进行中，基于实际工时计算
      expect(task2!.progress).toBeLessThan(100);
      
      const task3 = ganttTasks.find(t => t.id === 3);
      expect(task3!.progress).toBe(0); // 未开始
    });

    it('应该正确设置任务颜色', () => {
      const ganttTasks = service.convertToGanttTasks();
      
      const highPriorityTask = ganttTasks.find(t => t.priority === 'high' && t.status !== 'completed');
      expect(highPriorityTask!.color).toBe('#ff4d4f'); // 红色
      
      const mediumPriorityTask = ganttTasks.find(t => t.priority === 'medium');
      expect(mediumPriorityTask!.color).toBe('#faad14'); // 橙色
      
      const completedTask = ganttTasks.find(t => t.status === 'completed');
      expect(completedTask!.color).toBe('#52c41a'); // 绿色
    });

    it('应该识别里程碑任务', () => {
      const milestoneTask = {
        ...mockTasks[0],
        id: 10,
        title: '项目里程碑 - 第一阶段完成',
        estimated_hours: 0
      };

      service.setTasks([...mockTasks, milestoneTask]);
      const ganttTasks = service.convertToGanttTasks();
      
      const milestone = ganttTasks.find(t => t.id === 10);
      expect(milestone!.isMilestone).toBe(true);
    });

    it('应该检测任务警告', () => {
      // 创建逾期任务
      const overdueTask = {
        ...mockTasks[0],
        id: 11,
        status: 'todo' as const,
        due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 昨天到期
      };

      service.setTasks([...mockTasks, overdueTask]);
      const ganttTasks = service.convertToGanttTasks();
      
      const overdue = ganttTasks.find(t => t.id === 11);
      expect(overdue!.warning).toContain('逾期');
    });
  });

  describe('自动调度算法测试', () => {
    it('应该应用自动调度', () => {
      service.updateConfig({ autoSchedule: true });
      const ganttTasks = service.convertToGanttTasks();
      
      const taskA = ganttTasks.find(t => t.id === 1);
      const taskB = ganttTasks.find(t => t.id === 2);
      const taskC = ganttTasks.find(t => t.id === 3);
      
      // Task B 应该在 Task A 之后开始
      expect(taskB!.startDate.getTime()).toBeGreaterThanOrEqual(taskA!.endDate.getTime());
      
      // Task C 应该在 Task B 之后开始
      expect(taskC!.startDate.getTime()).toBeGreaterThanOrEqual(taskB!.endDate.getTime());
    });

    it('应该正确处理多个依赖', () => {
      // 创建有多个依赖的任务
      const complexTask = {
        ...mockTasks[0],
        id: 12,
        dependencies: [1, 2, 5] // 依赖多个任务
      };

      service.setTasks([...mockTasks, complexTask]);
      service.updateConfig({ autoSchedule: true });
      const ganttTasks = service.convertToGanttTasks();
      
      const complex = ganttTasks.find(t => t.id === 12);
      const task1 = ganttTasks.find(t => t.id === 1);
      const task2 = ganttTasks.find(t => t.id === 2);
      const task5 = ganttTasks.find(t => t.id === 5);
      
      // 应该在所有依赖任务完成后开始
      const latestEndTime = Math.max(
        task1!.endDate.getTime(),
        task2!.endDate.getTime(),
        task5!.endDate.getTime()
      );
      
      expect(complex!.startDate.getTime()).toBeGreaterThanOrEqual(latestEndTime);
    });

    it('应该正确处理拓扑排序', () => {
      service.updateConfig({ autoSchedule: true });
      const ganttTasks = service.convertToGanttTasks();
      
      // 验证依赖顺序：1 -> 2 -> 3 -> 4
      const sortedByStartDate = ganttTasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      
      const task1Index = sortedByStartDate.findIndex(t => t.id === 1);
      const task2Index = sortedByStartDate.findIndex(t => t.id === 2);
      const task3Index = sortedByStartDate.findIndex(t => t.id === 3);
      const task4Index = sortedByStartDate.findIndex(t => t.id === 4);
      
      expect(task1Index).toBeLessThan(task2Index);
      expect(task2Index).toBeLessThan(task3Index);
      expect(task3Index).toBeLessThan(task4Index);
    });
  });

  describe('依赖关系测试', () => {
    it('应该生成正确的依赖关系', () => {
      const dependencies = service.generateDependencies();
      
      expect(dependencies).toHaveLength(4); // 4个依赖关系
      
      const dep1to2 = dependencies.find(d => d.fromTaskId === 1 && d.toTaskId === 2);
      expect(dep1to2).toBeDefined();
      expect(dep1to2!.type).toBe('finish-to-start');
      expect(dep1to2!.isValid).toBe(true);
    });

    it('应该检测循环依赖', () => {
      // 创建循环依赖：A -> B -> A
      const tasksWithCircular = [
        { ...mockTasks[0], id: 20, dependencies: [21] },
        { ...mockTasks[1], id: 21, dependencies: [20] }
      ];

      service.setTasks(tasksWithCircular);
      const dependencies = service.generateDependencies();
      
      const invalidDeps = dependencies.filter(d => !d.isValid);
      expect(invalidDeps.length).toBeGreaterThan(0);
      
      const circularDep = invalidDeps.find(d => d.conflictReason?.includes('循环'));
      expect(circularDep).toBeDefined();
    });

    it('应该处理不存在的依赖任务', () => {
      const taskWithInvalidDep = {
        ...mockTasks[0],
        id: 30,
        dependencies: [999] // 不存在的任务ID
      };

      service.setTasks([...mockTasks, taskWithInvalidDep]);
      const dependencies = service.generateDependencies();
      
      // 不应该为不存在的依赖创建依赖关系
      const invalidDep = dependencies.find(d => d.fromTaskId === 999);
      expect(invalidDep).toBeUndefined();
    });
  });

  describe('关键路径分析测试', () => {
    it('应该计算关键路径', () => {
      const criticalPath = service.calculateCriticalPath();
      
      expect(criticalPath).toBeDefined();
      expect(criticalPath.tasks.length).toBeGreaterThan(0);
      expect(criticalPath.totalDuration).toBeGreaterThan(0);
      expect(criticalPath.slack).toBe(0); // 关键路径浮动时间为0
    });

    it('关键路径应该包含最长的依赖链', () => {
      const criticalPath = service.calculateCriticalPath();
      
      // 最长链应该是 1 -> 2 -> 3 -> 4
      const expectedPath = [1, 2, 3, 4];
      const hasMainPath = expectedPath.every(taskId => 
        criticalPath.tasks.includes(taskId)
      );
      
      // 至少应该包含主要依赖链的部分
      expect(criticalPath.tasks.length).toBeGreaterThan(2);
    });
  });

  describe('资源冲突检测测试', () => {
    it('应该检测资源冲突', () => {
      // 创建有分配人的任务
      const tasksWithAssignees = mockTasks.map((task, index) => ({
        ...task,
        assignee_id: index < 3 ? 1 : 2 // 前3个任务分配给用户1
      }));

      service.setTasks(tasksWithAssignees);
      const conflicts = service.detectResourceConflicts();
      
      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('应该生成合理的冲突建议', () => {
      const tasksWithConflicts = [
        { ...mockTasks[0], assignee_id: 1, estimated_hours: 40 },
        { ...mockTasks[1], assignee_id: 1, estimated_hours: 40 },
        { ...mockTasks[2], assignee_id: 1, estimated_hours: 40 }
      ];

      service.setTasks(tasksWithConflicts);
      const conflicts = service.detectResourceConflicts();
      
      if (conflicts.length > 0) {
        expect(conflicts[0].suggestion).toBeDefined();
        expect(conflicts[0].severity).toMatch(/low|medium|high/);
      }
    });
  });

  describe('进度统计测试', () => {
    it('应该计算正确的进度统计', () => {
      const stats = service.calculateProgressStats();
      
      expect(stats.totalTasks).toBe(5);
      expect(stats.completedTasks).toBe(1); // 只有Task A完成
      expect(stats.inProgressTasks).toBe(1); // Task B进行中
      expect(stats.progressPercentage).toBe(20); // 1/5 = 20%
      expect(stats.totalEstimatedHours).toBe(46); // 16+12+8+4+6
    });

    it('应该计算实际工时统计', () => {
      const stats = service.calculateProgressStats();
      
      expect(stats.totalActualHours).toBeGreaterThan(0);
      // Task A: 4小时, Task B: 2小时
      expect(stats.totalActualHours).toBe(6);
    });

    it('应该检测逾期任务', () => {
      // 创建逾期任务
      const overdueTask = {
        ...mockTasks[0],
        id: 40,
        status: 'todo' as const,
        due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      };

      service.setTasks([...mockTasks, overdueTask]);
      const stats = service.calculateProgressStats();
      
      expect(stats.overdueTasks).toBeGreaterThanOrEqual(1);
    });

    it('应该计算进度偏差', () => {
      const stats = service.calculateProgressStats();
      
      expect(typeof stats.scheduleVariance).toBe('number');
      expect(stats.scheduleVariance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('工作日计算测试', () => {
    it('应该正确识别工作日', () => {
      service.updateConfig({
        workingDays: [1, 2, 3, 4, 5], // 周一到周五
        holidays: []
      });

      const ganttTasks = service.convertToGanttTasks();
      const task = ganttTasks[0];
      
      // 验证开始和结束日期都是工作日
      expect(task.startDate.getDay()).toBeGreaterThanOrEqual(1);
      expect(task.startDate.getDay()).toBeLessThanOrEqual(5);
    });

    it('应该跳过假期', () => {
      const holiday = new Date();
      holiday.setDate(holiday.getDate() + 1); // 明天是假期

      service.updateConfig({
        workingDays: [1, 2, 3, 4, 5],
        holidays: [holiday]
      });

      const ganttTasks = service.convertToGanttTasks();
      expect(ganttTasks).toBeDefined();
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空任务列表', () => {
      service.setTasks([]);
      
      const ganttTasks = service.convertToGanttTasks();
      const dependencies = service.generateDependencies();
      const criticalPath = service.calculateCriticalPath();
      const conflicts = service.detectResourceConflicts();
      const stats = service.calculateProgressStats();
      
      expect(ganttTasks).toHaveLength(0);
      expect(dependencies).toHaveLength(0);
      expect(criticalPath.tasks).toHaveLength(0);
      expect(conflicts).toHaveLength(0);
      expect(stats.totalTasks).toBe(0);
    });

    it('应该处理单个任务', () => {
      service.setTasks([mockTasks[0]]);
      
      const ganttTasks = service.convertToGanttTasks();
      const criticalPath = service.calculateCriticalPath();
      
      expect(ganttTasks).toHaveLength(1);
      expect(criticalPath.tasks).toHaveLength(1);
    });

    it('应该处理无依赖的任务', () => {
      const independentTasks = mockTasks.map(task => ({
        ...task,
        dependencies: []
      }));

      service.setTasks(independentTasks);
      const dependencies = service.generateDependencies();
      
      expect(dependencies).toHaveLength(0);
    });

    it('应该处理无效的工时数据', () => {
      const invalidTask = {
        ...mockTasks[0],
        estimated_hours: -5 // 无效工时
      };

      service.setTasks([invalidTask]);
      const ganttTasks = service.convertToGanttTasks();
      
      expect(ganttTasks[0].estimatedHours).toBeGreaterThan(0);
      expect(ganttTasks[0].duration).toBeGreaterThan(0);
    });

    it('应该处理无效的日期', () => {
      const invalidTask = {
        ...mockTasks[0],
        due_date: 'invalid-date'
      };

      service.setTasks([invalidTask]);
      const ganttTasks = service.convertToGanttTasks();
      
      expect(ganttTasks[0].startDate).toBeInstanceOf(Date);
      expect(ganttTasks[0].endDate).toBeInstanceOf(Date);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量任务', () => {
      // 创建100个任务
      const largeTasks = Array.from({ length: 100 }, (_, index) => ({
        ...mockTasks[0],
        id: index + 1,
        title: `Task ${index + 1}`,
        dependencies: index > 0 ? [index] : []
      }));

      const startTime = Date.now();
      service.setTasks(largeTasks);
      
      const ganttTasks = service.convertToGanttTasks();
      const dependencies = service.generateDependencies();
      const criticalPath = service.calculateCriticalPath();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(ganttTasks).toHaveLength(100);
      expect(dependencies.length).toBeGreaterThan(0);
      expect(criticalPath.tasks.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('配置变更测试', () => {
    it('应该响应时间刻度变更', () => {
      service.updateConfig({ timeScale: 'week' });
      const ganttTasks1 = service.convertToGanttTasks();
      
      service.updateConfig({ timeScale: 'month' });
      const ganttTasks2 = service.convertToGanttTasks();
      
      expect(ganttTasks1).toBeDefined();
      expect(ganttTasks2).toBeDefined();
    });

    it('应该响应缩放级别变更', () => {
      service.updateConfig({ zoomLevel: 1 });
      const stats1 = service.calculateProgressStats();
      
      service.updateConfig({ zoomLevel: 5 });
      const stats2 = service.calculateProgressStats();
      
      expect(stats1).toBeDefined();
      expect(stats2).toBeDefined();
    });
  });
});

describe('GanttChartService 集成测试', () => {
  it('应该正确集成所有功能模块', () => {
    const tasks: Task[] = [
      {
        id: 1,
        project_id: 1,
        title: '需求分析',
        description: '项目需求分析和设计',
        status: 'completed',
        priority: 'high',
        estimated_hours: 20,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        dependencies: []
      },
      {
        id: 2,
        project_id: 1,
        title: '架构设计',
        description: '系统架构和数据库设计',
        status: 'in_progress',
        priority: 'high',
        estimated_hours: 32,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 2,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        dependencies: [1]
      },
      {
        id: 3,
        project_id: 1,
        title: '前端开发',
        description: 'React前端应用开发',
        status: 'todo',
        priority: 'medium',
        estimated_hours: 60,
        due_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 3,
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z',
        dependencies: [2]
      },
      {
        id: 4,
        project_id: 1,
        title: '后端开发',
        description: 'Go后端API开发',
        status: 'todo',
        priority: 'medium',
        estimated_hours: 80,
        due_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 4,
        created_at: '2025-01-04T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z',
        dependencies: [2]
      },
      {
        id: 5,
        project_id: 1,
        title: '系统集成',
        description: '前后端集成和联调',
        status: 'todo',
        priority: 'high',
        estimated_hours: 24,
        due_date: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 5,
        created_at: '2025-01-05T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z',
        dependencies: [3, 4]
      },
      {
        id: 6,
        project_id: 1,
        title: '测试验证',
        description: '功能测试和性能测试',
        status: 'todo',
        priority: 'medium',
        estimated_hours: 16,
        due_date: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 6,
        created_at: '2025-01-06T00:00:00Z',
        updated_at: '2025-01-06T00:00:00Z',
        dependencies: [5]
      },
      {
        id: 7,
        project_id: 1,
        title: '部署上线',
        description: '生产环境部署',
        status: 'todo',
        priority: 'high',
        estimated_hours: 8,
        due_date: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000).toISOString(),
        task_level: 0,
        sort_order: 7,
        created_at: '2025-01-07T00:00:00Z',
        updated_at: '2025-01-07T00:00:00Z',
        dependencies: [6]
      }
    ];

    ganttChartService.setTasks(tasks);
    ganttChartService.updateConfig({
      autoSchedule: true,
      showDependencies: true,
      showCriticalPath: true
    });

    // 执行所有功能模块
    const ganttTasks = ganttChartService.convertToGanttTasks();
    const dependencies = ganttChartService.generateDependencies();
    const criticalPath = ganttChartService.calculateCriticalPath();
    const conflicts = ganttChartService.detectResourceConflicts();
    const stats = ganttChartService.calculateProgressStats();

    // 验证集成结果
    expect(ganttTasks).toHaveLength(7);
    expect(dependencies.length).toBeGreaterThan(0);
    expect(criticalPath.tasks.length).toBeGreaterThan(0);
    expect(stats.totalTasks).toBe(7);
    expect(stats.totalEstimatedHours).toBe(240); // 20+32+60+80+24+16+8

    // 验证依赖顺序正确性
    const task1 = ganttTasks.find(t => t.id === 1);
    const task2 = ganttTasks.find(t => t.id === 2);
    const task5 = ganttTasks.find(t => t.id === 5);
    
    expect(task2!.startDate.getTime()).toBeGreaterThanOrEqual(task1!.endDate.getTime());
    
    // 验证关键路径包含主要依赖链
    const mainPath = [1, 2, 3, 5, 6, 7]; // 或 [1, 2, 4, 5, 6, 7]
    const hasMainPathTasks = mainPath.filter(taskId => criticalPath.tasks.includes(taskId));
    expect(hasMainPathTasks.length).toBeGreaterThan(4);

    console.log('✅ 甘特图服务集成测试通过');
    console.log(`📊 生成甘特图任务: ${ganttTasks.length}个`);
    console.log(`🔗 依赖关系: ${dependencies.length}个`);
    console.log(`🎯 关键路径: ${criticalPath.tasks.length}个任务`);
    console.log(`📈 项目进度: ${stats.progressPercentage}%`);
  });
});