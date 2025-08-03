/**
 * Gantt Chart and Dependency Visualization Service
 * 
 * This service provides data processing and calculation functions for Gantt chart
 * visualization and dependency relationship display, supporting AI-enhanced
 * task management with smart scheduling and conflict detection.
 */

import { Task } from '../types/task';

// 甘特图任务接口
export interface GanttTask {
  id: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  duration: number; // 工作日数
  progress: number; // 0-100
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  dependencies: number[]; // 依赖的任务ID
  assignee?: string;
  estimatedHours: number;
  actualHours?: number;
  parentId?: number;
  level: number; // 层级深度
  isCollapsed: boolean; // 是否折叠子任务
  isMilestone: boolean; // 是否为里程碑
  color: string; // 显示颜色
  warning?: string; // 警告信息
}

// 依赖关系接口
export interface TaskDependency {
  fromTaskId: number;
  toTaskId: number;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  lag: number; // 延迟天数
  isValid: boolean; // 是否有效
  conflictReason?: string; // 冲突原因
}

// 甘特图配置接口
export interface GanttConfig {
  timeScale: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  workingDays: number[]; // 0-6, 0为周日
  holidays: Date[];
  showDependencies: boolean;
  showCriticalPath: boolean;
  autoSchedule: boolean;
  zoomLevel: number; // 1-5
}

// 关键路径接口
export interface CriticalPath {
  tasks: number[];
  totalDuration: number;
  startDate: Date;
  endDate: Date;
  slack: number; // 总浮动时间
}

// 资源冲突接口
export interface ResourceConflict {
  assigneeId: number;
  assigneeName: string;
  conflictingTasks: number[];
  conflictDates: { start: Date; end: Date }[];
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

// 进度统计接口
export interface ProgressStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  progressPercentage: number;
  scheduleVariance: number; // 进度偏差(天)
}

export class GanttChartService {
  private tasks: Task[] = [];
  private config: GanttConfig = {
    timeScale: 'day',
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天后
    workingDays: [1, 2, 3, 4, 5], // 周一到周五
    holidays: [],
    showDependencies: true,
    showCriticalPath: true,
    autoSchedule: true,
    zoomLevel: 3
  };

  /**
   * 设置任务数据
   */
  setTasks(tasks: Task[]): void {
    this.tasks = tasks;
  }

  /**
   * 更新甘特图配置
   */
  updateConfig(config: Partial<GanttConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 转换任务为甘特图格式
   */
  convertToGanttTasks(): GanttTask[] {
    const ganttTasks: GanttTask[] = [];
    
    this.tasks.forEach(task => {
      const ganttTask = this.convertSingleTask(task);
      ganttTasks.push(ganttTask);
    });

    // 应用自动调度
    if (this.config.autoSchedule) {
      return this.applyAutoScheduling(ganttTasks);
    }

    return ganttTasks;
  }

  /**
   * 转换单个任务
   */
  private convertSingleTask(task: Task): GanttTask {
    const estimatedHours = task.estimated_hours || 8; // 默认8小时
    const duration = Math.max(1, Math.ceil(estimatedHours / 8)); // 转换为工作日
    
    // 计算开始和结束日期
    const startDate = task.due_date ? 
      this.calculateStartDate(new Date(task.due_date), duration) :
      new Date();
    
    const endDate = this.calculateEndDate(startDate, duration);

    // 计算进度
    const progress = this.calculateProgress(task);

    // 确定颜色
    const color = this.determineTaskColor(task);

    // 检查警告
    const warning = this.checkTaskWarnings(task, startDate, endDate);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      startDate,
      endDate,
      duration,
      progress,
      priority: task.priority || 'medium',
      status: task.status,
      dependencies: task.dependencies || [],
      estimatedHours,
      actualHours: task.total_time_seconds ? task.total_time_seconds / 3600 : undefined,
      parentId: task.parent_id,
      level: task.task_level || 0,
      isCollapsed: false,
      isMilestone: this.isMilestone(task),
      color,
      warning
    };
  }

  /**
   * 应用自动调度算法
   */
  private applyAutoScheduling(tasks: GanttTask[]): GanttTask[] {
    const scheduledTasks = [...tasks];
    const taskMap = new Map<number, GanttTask>();
    
    // 创建任务映射
    scheduledTasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    // 拓扑排序处理依赖关系
    const sortedTasks = this.topologicalSort(scheduledTasks);
    
    // 按依赖顺序重新安排时间
    sortedTasks.forEach(task => {
      if (task.dependencies.length > 0) {
        // 找到最晚的依赖任务结束时间
        let latestEndDate = new Date(0);
        
        task.dependencies.forEach(depId => {
          const depTask = taskMap.get(depId);
          if (depTask && depTask.endDate > latestEndDate) {
            latestEndDate = depTask.endDate;
          }
        });

        // 设置开始时间为依赖任务结束后的下一个工作日
        task.startDate = this.getNextWorkingDay(latestEndDate);
        task.endDate = this.calculateEndDate(task.startDate, task.duration);
      }
    });

    return scheduledTasks;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(tasks: GanttTask[]): GanttTask[] {
    const taskMap = new Map<number, GanttTask>();
    const inDegree = new Map<number, number>();
    const adjList = new Map<number, number[]>();

    // 初始化
    tasks.forEach(task => {
      taskMap.set(task.id, task);
      inDegree.set(task.id, 0);
      adjList.set(task.id, []);
    });

    // 构建邻接表和入度表
    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        if (adjList.has(depId)) {
          adjList.get(depId)!.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      });
    });

    // Kahn算法
    const queue: number[] = [];
    const result: GanttTask[] = [];

    // 找到入度为0的节点
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentTask = taskMap.get(currentId)!;
      result.push(currentTask);

      // 处理邻接节点
      (adjList.get(currentId) || []).forEach(neighborId => {
        inDegree.set(neighborId, inDegree.get(neighborId)! - 1);
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      });
    }

    return result;
  }

  /**
   * 生成依赖关系数据
   */
  generateDependencies(): TaskDependency[] {
    const dependencies: TaskDependency[] = [];
    
    this.tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const dependency = this.createDependency(depId, task.id);
          if (dependency) {
            dependencies.push(dependency);
          }
        });
      }
    });

    return dependencies;
  }

  /**
   * 创建依赖关系
   */
  private createDependency(fromTaskId: number, toTaskId: number): TaskDependency | null {
    const fromTask = this.tasks.find(t => t.id === fromTaskId);
    const toTask = this.tasks.find(t => t.id === toTaskId);

    if (!fromTask || !toTask) {
      return null;
    }

    // 检查循环依赖
    const hasCircular = this.checkCircularDependency(fromTaskId, toTaskId);
    
    return {
      fromTaskId,
      toTaskId,
      type: 'finish-to-start', // 默认类型
      lag: 0,
      isValid: !hasCircular,
      conflictReason: hasCircular ? '存在循环依赖' : undefined
    };
  }

  /**
   * 检查循环依赖
   */
  private checkCircularDependency(fromTaskId: number, toTaskId: number): boolean {
    const visited = new Set<number>();
    
    const dfs = (currentId: number): boolean => {
      if (currentId === fromTaskId) {
        return true; // 找到循环
      }
      
      if (visited.has(currentId)) {
        return false;
      }
      
      visited.add(currentId);
      
      const currentTask = this.tasks.find(t => t.id === currentId);
      if (currentTask && currentTask.dependencies) {
        for (const depId of currentTask.dependencies) {
          if (dfs(depId)) {
            return true;
          }
        }
      }
      
      return false;
    };

    return dfs(toTaskId);
  }

  /**
   * 计算关键路径
   */
  calculateCriticalPath(): CriticalPath {
    const ganttTasks = this.convertToGanttTasks();
    const taskMap = new Map<number, GanttTask>();
    
    ganttTasks.forEach(task => {
      taskMap.set(task.id, task);
    });

    // 计算最早开始时间和最晚开始时间
    const earlyStart = new Map<number, Date>();
    const lateStart = new Map<number, Date>();
    const sortedTasks = this.topologicalSort(ganttTasks);

    // 前向计算（最早开始时间）
    sortedTasks.forEach(task => {
      let maxEarlyFinish = new Date(0);
      
      task.dependencies.forEach(depId => {
        const depTask = taskMap.get(depId);
        if (depTask) {
          const depEarlyStart = earlyStart.get(depId) || depTask.startDate;
          const depEarlyFinish = this.calculateEndDate(depEarlyStart, depTask.duration);
          
          if (depEarlyFinish > maxEarlyFinish) {
            maxEarlyFinish = depEarlyFinish;
          }
        }
      });

      const taskEarlyStart = task.dependencies.length > 0 ? 
        this.getNextWorkingDay(maxEarlyFinish) : 
        task.startDate;
      
      earlyStart.set(task.id, taskEarlyStart);
    });

    // 反向计算（最晚开始时间）
    const reversedTasks = [...sortedTasks].reverse();
    
    reversedTasks.forEach(task => {
      // 简化实现：假设项目必须在计划时间内完成
      lateStart.set(task.id, earlyStart.get(task.id) || task.startDate);
    });

    // 找到关键路径（浮动时间为0的任务）
    const criticalTasks: number[] = [];
    
    sortedTasks.forEach(task => {
      const early = earlyStart.get(task.id);
      const late = lateStart.get(task.id);
      
      if (early && late && early.getTime() === late.getTime()) {
        criticalTasks.push(task.id);
      }
    });

    // 计算关键路径统计
    const totalDuration = criticalTasks.reduce((sum, taskId) => {
      const task = taskMap.get(taskId);
      return sum + (task ? task.duration : 0);
    }, 0);

    const startDate = criticalTasks.length > 0 ? 
      earlyStart.get(criticalTasks[0]) || new Date() : 
      new Date();

    const endDate = this.calculateEndDate(startDate, totalDuration);

    return {
      tasks: criticalTasks,
      totalDuration,
      startDate,
      endDate,
      slack: 0 // 关键路径的浮动时间为0
    };
  }

  /**
   * 检测资源冲突
   */
  detectResourceConflicts(): ResourceConflict[] {
    const conflicts: ResourceConflict[] = [];
    const ganttTasks = this.convertToGanttTasks();
    
    // 按分配人分组
    const tasksByAssignee = new Map<number, GanttTask[]>();
    
    ganttTasks.forEach(task => {
      // 假设task中有assignee_id字段
      const assigneeId = (task as unknown).assignee_id;
      if (assigneeId) {
        if (!tasksByAssignee.has(assigneeId)) {
          tasksByAssignee.set(assigneeId, []);
        }
        tasksByAssignee.get(assigneeId)!.push(task);
      }
    });

    // 检查每个人的任务时间冲突
    tasksByAssignee.forEach((tasks, assigneeId) => {
      const sortedTasks = tasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      const conflictingTasks: number[] = [];
      const conflictDates: { start: Date; end: Date }[] = [];

      for (let i = 0; i < sortedTasks.length - 1; i++) {
        const current = sortedTasks[i];
        const next = sortedTasks[i + 1];

        if (current.endDate > next.startDate) {
          // 发现时间冲突
          conflictingTasks.push(current.id, next.id);
          conflictDates.push({
            start: next.startDate,
            end: new Date(Math.min(current.endDate.getTime(), next.endDate.getTime()))
          });
        }
      }

      if (conflictingTasks.length > 0) {
        conflicts.push({
          assigneeId,
          assigneeName: `用户${assigneeId}`, // 应该从用户数据中获取
          conflictingTasks: Array.from(new Set(conflictingTasks)),
          conflictDates,
          severity: conflictingTasks.length > 4 ? 'high' : 
                   conflictingTasks.length > 2 ? 'medium' : 'low',
          suggestion: this.generateConflictSuggestion(conflictingTasks.length)
        });
      }
    });

    return conflicts;
  }

  /**
   * 计算进度统计
   */
  calculateProgressStats(): ProgressStats {
    const ganttTasks = this.convertToGanttTasks();
    
    const totalTasks = ganttTasks.length;
    const completedTasks = ganttTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = ganttTasks.filter(t => t.status === 'in_progress').length;
    
    // 计算逾期任务
    const now = new Date();
    const overdueTasks = ganttTasks.filter(t => 
      t.status !== 'completed' && t.endDate < now
    ).length;

    // 计算工时统计
    const totalEstimatedHours = ganttTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalActualHours = ganttTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    // 计算进度百分比
    const progressPercentage = totalTasks > 0 ? 
      Math.round((completedTasks / totalTasks) * 100) : 0;

    // 计算进度偏差
    const scheduleVariance = this.calculateScheduleVariance(ganttTasks);

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalEstimatedHours,
      totalActualHours,
      progressPercentage,
      scheduleVariance
    };
  }

  // 工具方法

  /**
   * 计算开始日期
   */
  private calculateStartDate(dueDate: Date, duration: number): Date {
    const endDate = new Date(dueDate);
    const startDate = new Date(endDate);
    let daysToSubtract = duration;

    while (daysToSubtract > 0) {
      startDate.setDate(startDate.getDate() - 1);
      
      if (this.isWorkingDay(startDate)) {
        daysToSubtract--;
      }
    }

    return startDate;
  }

  /**
   * 计算结束日期
   */
  private calculateEndDate(startDate: Date, duration: number): Date {
    const endDate = new Date(startDate);
    let daysToAdd = duration;

    while (daysToAdd > 0) {
      endDate.setDate(endDate.getDate() + 1);
      
      if (this.isWorkingDay(endDate)) {
        daysToAdd--;
      }
    }

    return endDate;
  }

  /**
   * 检查是否为工作日
   */
  private isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    
    // 检查是否在工作日配置中
    if (!this.config.workingDays.includes(dayOfWeek)) {
      return false;
    }

    // 检查是否为假期
    return !this.config.holidays.some(holiday => 
      holiday.toDateString() === date.toDateString()
    );
  }

  /**
   * 获取下一个工作日
   */
  private getNextWorkingDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (!this.isWorkingDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  /**
   * 计算任务进度
   */
  private calculateProgress(task: Task): number {
    if (task.status === 'completed') return 100;
    if (task.status === 'cancelled') return 0;
    if (task.status === 'todo') return 0;
    
    // 对于进行中的任务，可以基于实际工时计算进度
    if (task.total_time_seconds && task.estimated_hours) {
      const actualHours = task.total_time_seconds / 3600;
      const estimatedHours = task.estimated_hours;
      return Math.min(90, Math.round((actualHours / estimatedHours) * 100));
    }

    return 30; // 默认进度
  }

  /**
   * 确定任务颜色
   */
  private determineTaskColor(task: Task): string {
    if (task.status === 'completed') return '#52c41a';
    if (task.status === 'cancelled') return '#d9d9d9';
    
    switch (task.priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#1890ff';
      default: return '#722ed1';
    }
  }

  /**
   * 检查任务警告
   */
  private checkTaskWarnings(task: Task, startDate: Date, endDate: Date): string | undefined {
    const now = new Date();
    
    if (task.status !== 'completed' && endDate < now) {
      return '任务已逾期';
    }
    
    if (task.dependencies && task.dependencies.length > 3) {
      return '依赖关系复杂，可能影响进度';
    }
    
    const daysUntilDue = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (task.status === 'todo' && daysUntilDue <= 1) {
      return '即将到期，建议尽快开始';
    }

    return undefined;
  }

  /**
   * 判断是否为里程碑
   */
  private isMilestone(task: Task): boolean {
    // 简化实现：工时为0或标题包含"里程碑"的任务视为里程碑
    return (task.estimated_hours === 0) || 
           /里程碑|milestone|release|版本/i.test(task.title);
  }

  /**
   * 生成冲突建议
   */
  private generateConflictSuggestion(conflictCount: number): string {
    if (conflictCount > 4) {
      return '建议重新分配任务或调整时间安排';
    } else if (conflictCount > 2) {
      return '建议优化任务优先级或延长时间线';
    } else {
      return '建议微调任务时间避免冲突';
    }
  }

  /**
   * 计算进度偏差
   */
  private calculateScheduleVariance(tasks: GanttTask[]): number {
    const now = new Date();
    let totalVariance = 0;
    let taskCount = 0;

    tasks.forEach(task => {
      if (task.status === 'completed') {
        // 对于已完成任务，计算实际完成时间与计划时间的差异
        // 这里简化处理，实际应该记录完成时间
        taskCount++;
      } else if (task.endDate < now) {
        // 逾期任务
        const daysOverdue = Math.ceil((now.getTime() - task.endDate.getTime()) / (1000 * 60 * 60 * 24));
        totalVariance += daysOverdue;
        taskCount++;
      }
    });

    return taskCount > 0 ? Math.round(totalVariance / taskCount) : 0;
  }
}

// 导出单例实例
export const ganttChartService = new GanttChartService();