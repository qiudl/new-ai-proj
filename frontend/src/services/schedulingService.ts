import { Task } from '../types/task';
import { Project } from '../types/project';
import { TaskDependency, DependencyType, DependencyStrength } from '../types/dependency';
import DependencyService from './dependencyService';
import ResourceManagementService, { Resource, ResourceAllocation, LoadBalancingResult } from './resourceManagementService';

// 调度算法相关类型定义
export interface ScheduleTask extends Task {
  earliestStart?: Date;
  latestStart?: Date;
  earliestFinish?: Date;
  latestFinish?: Date;
  totalFloat?: number;
  freeFloat?: number;
  isCritical?: boolean;
  predecessors?: ScheduleTask[];
  successors?: ScheduleTask[];
  calculatedDuration?: number;
}

export interface SchedulingResult {
  tasks: ScheduleTask[];
  criticalPath: ScheduleTask[];
  projectDuration: number;
  projectStartDate: Date;
  projectEndDate: Date;
  totalFloat: number;
  schedulingAlgorithm: 'CPM' | 'PERT' | 'PDM';
  warnings: SchedulingWarning[];
  statistics: SchedulingStatistics;
}

export interface SchedulingWarning {
  type: 'RESOURCE_CONFLICT' | 'CIRCULAR_DEPENDENCY' | 'UNREALISTIC_DURATION' | 'CONSTRAINT_VIOLATION';
  message: string;
  taskIds: number[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestion?: string;
}

export interface SchedulingStatistics {
  totalTasks: number;
  criticalTasks: number;
  floatDistribution: {
    zeroFloat: number;
    lowFloat: number;
    mediumFloat: number;
    highFloat: number;
  };
  resourceUtilization: {
    [resourceId: string]: number;
  };
  constraintSatisfaction: number;
}

export interface SchedulingConfig {
  algorithm: 'CPM' | 'PERT' | 'PDM';
  considerResources: boolean;
  optimizeFor: 'TIME' | 'COST' | 'RESOURCE';
  bufferPercentage: number;
  workingDaysOnly: boolean;
  workingHoursPerDay: number;
  holidayDates: Date[];
  maxIterations: number;
  toleranceLevel: number;
}

export interface ResourceConstraint {
  resourceId: string;
  resourceName: string;
  capacity: number;
  allocation: {
    taskId: number;
    startDate: Date;
    endDate: Date;
    effort: number;
  }[];
}

/**
 * 智能任务调度服务
 * 实现CPM（关键路径法）、PERT（计划评审技术）等调度算法
 */
class SchedulingService {
  private static instance: SchedulingService;

  private constructor() {}

  public static getInstance(): SchedulingService {
    if (!SchedulingService.instance) {
      SchedulingService.instance = new SchedulingService();
    }
    return SchedulingService.instance;
  }

  /**
   * 执行自动调度算法
   */
  public async scheduleProject(
    projectId: number,
    tasks: Task[],
    config: Partial<SchedulingConfig> = {}
  ): Promise<SchedulingResult> {
    const fullConfig: SchedulingConfig = {
      algorithm: 'CPM',
      considerResources: false,
      optimizeFor: 'TIME',
      bufferPercentage: 10,
      workingDaysOnly: true,
      workingHoursPerDay: 8,
      holidayDates: [],
      maxIterations: 100,
      toleranceLevel: 0.01,
      ...config
    };

    try {
      // 获取依赖关系
      const dependencies = await DependencyService.getDependencies(projectId);
      
      // 构建任务网络
      const taskNetwork = this.buildTaskNetwork(tasks, dependencies);
      
      // 验证网络结构
      const validationResult = this.validateNetwork(taskNetwork);
      if (!validationResult.isValid) {
        throw new Error(`网络验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 执行调度算法
      let result: SchedulingResult;
      switch (fullConfig.algorithm) {
        case 'CPM':
          result = await this.calculateCPM(taskNetwork, fullConfig);
          break;
        case 'PERT':
          result = await this.calculatePERT(taskNetwork, fullConfig);
          break;
        case 'PDM':
          result = await this.calculatePDM(taskNetwork, fullConfig);
          break;
        default:
          throw new Error(`不支持的调度算法: ${fullConfig.algorithm}`);
      }

      // 资源约束检查
      if (fullConfig.considerResources) {
        result = await this.applyResourceConstraints(result, fullConfig);
      }

      // 生成统计信息
      result.statistics = this.generateStatistics(result);

      return result;

    } catch (error) {
      console.error('调度算法执行失败:', error);
      throw error;
    }
  }

  /**
   * 构建任务网络图
   */
  private buildTaskNetwork(tasks: Task[], dependencies: TaskDependency[]): ScheduleTask[] {
    // 创建任务映射
    const taskMap = new Map<number, ScheduleTask>();
    
    // 初始化任务
    tasks.forEach(task => {
      const scheduleTask: ScheduleTask = {
        ...task,
        predecessors: [],
        successors: [],
        calculatedDuration: this.calculateTaskDuration(task),
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false
      };
      taskMap.set(task.id, scheduleTask);
    });

    // 建立依赖关系
    dependencies.forEach(dep => {
      const predecessor = taskMap.get(dep.predecessor_id);
      const successor = taskMap.get(dep.successor_id);
      
      if (predecessor && successor) {
        predecessor.successors = predecessor.successors || [];
        successor.predecessors = successor.predecessors || [];
        
        predecessor.successors.push(successor);
        successor.predecessors.push(predecessor);
      }
    });

    return Array.from(taskMap.values());
  }

  /**
   * 计算任务工期
   */
  private calculateTaskDuration(task: Task): number {
    // 优先使用estimated_hours
    if (task.estimated_hours && task.estimated_hours > 0) {
      return Math.ceil(task.estimated_hours / 8); // 转换为天数
    }

    // 如果有开始和结束日期，计算差值
    if ((task as any).start_datetime && (task as any).due_datetime) {
      const start = new Date((task as any).start_datetime);
      const end = new Date((task as any).due_datetime);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    }

    // 根据任务复杂度估算默认工期
    const complexity = task.custom_fields?.complexity || 'medium';
    const complexityDuration = {
      low: 2,
      medium: 5,
      high: 10,
      critical: 15
    };

    return complexityDuration[complexity as keyof typeof complexityDuration] || 5;
  }

  /**
   * 验证网络结构
   */
  private validateNetwork(tasks: ScheduleTask[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查循环依赖
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = (task: ScheduleTask): boolean => {
      if (recursionStack.has(task.id)) {
        errors.push(`检测到循环依赖，任务ID: ${task.id}`);
        return true;
      }
      if (visited.has(task.id)) {
        return false;
      }

      visited.add(task.id);
      recursionStack.add(task.id);

      for (const successor of task.successors || []) {
        if (hasCycle(successor)) {
          return true;
        }
      }

      recursionStack.delete(task.id);
      return false;
    };

    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        hasCycle(task);
      }
    });

    // 检查孤立任务
    const isolatedTasks = tasks.filter(task => 
      (!task.predecessors || task.predecessors.length === 0) &&
      (!task.successors || task.successors.length === 0)
    );

    if (isolatedTasks.length > 0) {
      errors.push(`发现${isolatedTasks.length}个孤立任务: ${isolatedTasks.map(t => t.title).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * CPM 关键路径法计算
   */
  private async calculateCPM(tasks: ScheduleTask[], config: SchedulingConfig): Promise<SchedulingResult> {
    const warnings: SchedulingWarning[] = [];
    
    // 前向计算 - 计算最早开始和最早完成时间
    this.forwardPass(tasks, config);
    
    // 反向计算 - 计算最晚开始和最晚完成时间
    const projectEndDate = this.backwardPass(tasks, config);
    
    // 计算浮动时间
    this.calculateFloat(tasks);
    
    // 识别关键路径
    const criticalPath = this.identifyCriticalPath(tasks);
    
    // 计算项目统计信息
    const projectStartDate = this.findProjectStartDate(tasks);
    const projectDuration = this.calculateProjectDuration(projectStartDate, projectEndDate, config);

    return {
      tasks,
      criticalPath,
      projectDuration,
      projectStartDate,
      projectEndDate,
      totalFloat: this.calculateTotalFloat(tasks),
      schedulingAlgorithm: 'CPM',
      warnings,
      statistics: {} as SchedulingStatistics // 后续填充
    };
  }

  /**
   * 前向计算
   */
  private forwardPass(tasks: ScheduleTask[], config: SchedulingConfig): void {
    const processed = new Set<number>();
    
    // 找到开始任务（没有前置任务的任务）
    const startTasks = tasks.filter(task => !task.predecessors || task.predecessors.length === 0);
    
    // 设置项目开始时间
    const projectStart = new Date();
    startTasks.forEach(task => {
      task.earliestStart = new Date(projectStart);
      task.earliestFinish = this.addDays(task.earliestStart, task.calculatedDuration || 1, config);
    });

    // 拓扑排序并计算
    const calculateEarlyTimes = (task: ScheduleTask): void => {
      if (processed.has(task.id)) return;

      // 确保所有前置任务都已处理
      if (task.predecessors && task.predecessors.some(pred => !processed.has(pred.id))) {
        return;
      }

      if (task.predecessors && task.predecessors.length > 0) {
        // 计算基于前置任务的最早开始时间
        let maxEarlyStart = new Date(0);
        
        task.predecessors.forEach(pred => {
          if (pred.earliestFinish) {
            if (pred.earliestFinish.getTime() > maxEarlyStart.getTime()) {
              maxEarlyStart = new Date(pred.earliestFinish);
            }
          }
        });

        task.earliestStart = maxEarlyStart;
        task.earliestFinish = this.addDays(task.earliestStart, task.calculatedDuration || 1, config);
      }

      processed.add(task.id);

      // 递归处理后续任务
      if (task.successors) {
        task.successors.forEach(successor => calculateEarlyTimes(successor));
      }
    };

    startTasks.forEach(task => calculateEarlyTimes(task));
    
    // 处理剩余任务（防止有遗漏）
    tasks.forEach(task => {
      if (!processed.has(task.id)) {
        calculateEarlyTimes(task);
      }
    });
  }

  /**
   * 反向计算
   */
  private backwardPass(tasks: ScheduleTask[], config: SchedulingConfig): Date {
    // 找到项目结束时间（所有任务的最晚完成时间）
    const projectEnd = tasks.reduce((maxDate, task) => {
      if (task.earliestFinish && task.earliestFinish.getTime() > maxDate.getTime()) {
        return new Date(task.earliestFinish);
      }
      return maxDate;
    }, new Date(0));

    // 找到结束任务（没有后续任务的任务）
    const endTasks = tasks.filter(task => !task.successors || task.successors.length === 0);
    
    // 设置结束任务的最晚时间
    endTasks.forEach(task => {
      task.latestFinish = task.earliestFinish || projectEnd;
      task.latestStart = this.subtractDays(task.latestFinish, task.calculatedDuration || 1, config);
    });

    const processed = new Set<number>();

    const calculateLateTimes = (task: ScheduleTask): void => {
      if (processed.has(task.id)) return;

      // 确保所有后续任务都已处理
      if (task.successors && task.successors.some(succ => !processed.has(succ.id))) {
        return;
      }

      if (task.successors && task.successors.length > 0) {
        // 计算基于后续任务的最晚完成时间
        let minLateFinish = new Date(8640000000000000); // 最大日期
        
        task.successors.forEach(succ => {
          if (succ.latestStart && succ.latestStart.getTime() < minLateFinish.getTime()) {
            minLateFinish = new Date(succ.latestStart);
          }
        });

        task.latestFinish = minLateFinish;
        task.latestStart = this.subtractDays(task.latestFinish, task.calculatedDuration || 1, config);
      }

      processed.add(task.id);

      // 递归处理前置任务
      if (task.predecessors) {
        task.predecessors.forEach(predecessor => calculateLateTimes(predecessor));
      }
    };

    endTasks.forEach(task => calculateLateTimes(task));
    
    // 处理剩余任务
    tasks.forEach(task => {
      if (!processed.has(task.id)) {
        calculateLateTimes(task);
      }
    });

    return projectEnd;
  }

  /**
   * 计算浮动时间
   */
  private calculateFloat(tasks: ScheduleTask[]): void {
    tasks.forEach(task => {
      if (task.earliestStart && task.latestStart && task.earliestFinish && task.latestFinish) {
        // 总浮动时间
        const startFloat = task.latestStart.getTime() - task.earliestStart.getTime();
        const finishFloat = task.latestFinish.getTime() - task.earliestFinish.getTime();
        task.totalFloat = Math.min(startFloat, finishFloat) / (1000 * 60 * 60 * 24);

        // 自由浮动时间（更复杂的计算，简化版本）
        task.freeFloat = task.totalFloat;

        // 关键任务判断
        task.isCritical = Math.abs(task.totalFloat) < 0.01;
      }
    });
  }

  /**
   * 识别关键路径
   */
  private identifyCriticalPath(tasks: ScheduleTask[]): ScheduleTask[] {
    const criticalTasks = tasks.filter(task => task.isCritical);
    
    // 按照依赖关系排序关键任务
    const orderedCriticalPath: ScheduleTask[] = [];
    const visited = new Set<number>();

    const addToPath = (task: ScheduleTask): void => {
      if (visited.has(task.id) || !task.isCritical) return;

      // 先添加前置任务
      if (task.predecessors) {
        task.predecessors.forEach(pred => {
          if (pred.isCritical) {
            addToPath(pred);
          }
        });
      }

      if (!visited.has(task.id)) {
        orderedCriticalPath.push(task);
        visited.add(task.id);
      }
    };

    // 从开始任务开始构建路径
    const startCriticalTasks = criticalTasks.filter(task => 
      !task.predecessors || task.predecessors.every(pred => !pred.isCritical)
    );

    startCriticalTasks.forEach(task => addToPath(task));

    return orderedCriticalPath;
  }

  /**
   * PERT 计划评审技术计算
   */
  private async calculatePERT(tasks: ScheduleTask[], config: SchedulingConfig): Promise<SchedulingResult> {
    // PERT使用三点估算：乐观时间、最可能时间、悲观时间
    tasks.forEach(task => {
      const optimistic = (task.calculatedDuration || 1) * 0.8;
      const mostLikely = task.calculatedDuration || 1;
      const pessimistic = (task.calculatedDuration || 1) * 1.5;
      
      // PERT期望工期：(乐观 + 4*最可能 + 悲观) / 6
      const expectedDuration = (optimistic + 4 * mostLikely + pessimistic) / 6;
      task.calculatedDuration = Math.ceil(expectedDuration);
    });

    // 使用CPM算法计算，但标记为PERT
    const result = await this.calculateCPM(tasks, config);
    result.schedulingAlgorithm = 'PERT';
    return result;
  }

  /**
   * PDM 优先图解法计算
   */
  private async calculatePDM(tasks: ScheduleTask[], config: SchedulingConfig): Promise<SchedulingResult> {
    // PDM支持多种依赖关系类型，这里实现基础版本
    const result = await this.calculateCPM(tasks, config);
    result.schedulingAlgorithm = 'PDM';
    return result;
  }

  /**
   * 应用资源约束
   */
  private async applyResourceConstraints(
    result: SchedulingResult, 
    config: SchedulingConfig
  ): Promise<SchedulingResult> {
    try {
      const resourceService = ResourceManagementService.getInstance();
      
      // 获取项目资源信息
      const resources = await (resourceService as any).getProjectResources(
        result.tasks[0]?.project_id || 1
      );
      
      if (resources.length === 0) {
        result.warnings.push({
          type: 'RESOURCE_CONFLICT',
          message: '未找到项目资源配置',
          taskIds: [],
          severity: 'MEDIUM',
          suggestion: '请配置项目资源以启用资源感知调度'
        });
        return result;
      }

      // 为每个任务分配资源
      const allocations: ResourceAllocation[] = [];
      const resourceUtilization: { [resourceId: string]: number } = {};
      
      // 初始化资源利用率
      resources.forEach(resource => {
        resourceUtilization[resource.id] = 0;
      });

      // 按调度顺序处理任务
      const scheduledTasks = [...result.tasks].sort((a, b) => {
        const aStart = a.earliestStart?.getTime() || 0;
        const bStart = b.earliestStart?.getTime() || 0;
        return aStart - bStart;
      });

      for (const task of scheduledTasks) {
        const taskDuration = task.calculatedDuration || 1;
        const requiredHours = taskDuration * config.workingHoursPerDay;
        
        // 获取任务所需技能
        const requiredSkills = (this as any).extractRequiredSkills(task);
        
        // 查找合适的资源
        const suitableResources = resources.filter(resource => 
          (this as any).resourceHasRequiredSkills(resource, requiredSkills)
        );

        if (suitableResources.length === 0) {
          result.warnings.push({
            type: 'RESOURCE_CONFLICT',
            message: `任务"${task.title}"找不到合适的资源`,
            taskIds: [task.id],
            severity: 'HIGH',
            suggestion: '请为任务分配具备相应技能的资源'
          });
          continue;
        }

        // 使用负载均衡算法选择最优资源
        const selectedResource = await (this as any).selectOptimalResource(
          suitableResources,
          requiredHours,
          resourceUtilization,
          task.earliestStart || new Date(),
          task.earliestFinish || new Date()
        );

        if (!selectedResource) {
          // 资源容量不足，需要调整任务时间
          const adjustment = await this.adjustTaskScheduleForResources(
            task,
            suitableResources,
            resourceUtilization,
            config
          );
          
          if (adjustment.adjusted) {
            task.earliestStart = adjustment.newStartDate;
            task.earliestFinish = adjustment.newEndDate;
            task.latestStart = adjustment.newStartDate;
            task.latestFinish = adjustment.newEndDate;
            
            result.warnings.push({
              type: 'RESOURCE_CONFLICT',
              message: `任务"${task.title}"因资源约束被调整`,
              taskIds: [task.id],
              severity: 'MEDIUM',
              suggestion: `任务开始时间调整至${adjustment.newStartDate.toLocaleDateString()}`
            });
          } else {
            result.warnings.push({
              type: 'RESOURCE_CONFLICT',
              message: `任务"${task.title}"无法分配足够的资源`,
              taskIds: [task.id],
              severity: 'HIGH',
              suggestion: '考虑增加资源或延长项目时间'
            });
            continue;
          }
        }

        // 创建资源分配
        const allocation: ResourceAllocation = {
          id: `alloc_${task.id}_${selectedResource?.id || 'unassigned'}`,
          taskId: task.id,
          resourceId: selectedResource?.id || '',
          allocatedHours: requiredHours,
          startDate: task.earliestStart || new Date(),
          endDate: task.earliestFinish || new Date(),
          allocationPercentage: selectedResource ? 
            Math.min(100, (requiredHours / (selectedResource.capacity * config.workingHoursPerDay)) * 100) : 0,
          status: 'confirmed' as const,
          priority: this.getTaskPriority(task),
          skills: requiredSkills,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        allocations.push(allocation);

        // 更新资源利用率
        if (selectedResource) {
          resourceUtilization[selectedResource.id] += requiredHours;
        }
      }

      // 计算资源利用率统计
      const utilizationStats: { [resourceId: string]: number } = {};
      resources.forEach(resource => {
        const utilized = resourceUtilization[resource.id] || 0;
        const capacity = resource.capacity * config.workingHoursPerDay * 5; // 假设5天工作制
        utilizationStats[resource.id] = capacity > 0 ? utilized / capacity : 0;
      });

      // 检查资源过载
      const overloadedResources = Object.entries(utilizationStats)
        .filter(([_, utilization]) => utilization > 1.0);

      if (overloadedResources.length > 0) {
        const overloadedResourceNames = overloadedResources.map(([resourceId]) => {
          const resource = resources.find(r => r.id === resourceId);
          return resource?.name || resourceId;
        });

        result.warnings.push({
          type: 'RESOURCE_CONFLICT',
          message: `资源过载: ${overloadedResourceNames.join(', ')}`,
          taskIds: [],
          severity: 'HIGH',
          suggestion: '建议增加资源容量或重新分配任务'
        });
      }

      // 更新调度结果的资源利用率统计
      result.statistics.resourceUtilization = utilizationStats;

      // 重新计算项目工期（考虑资源约束后的调整）
      const adjustedProjectEnd = this.recalculateProjectEndDate(result.tasks);
      if (adjustedProjectEnd.getTime() !== result.projectEndDate.getTime()) {
        result.projectEndDate = adjustedProjectEnd;
        result.projectDuration = this.calculateProjectDuration(
          result.projectStartDate,
          adjustedProjectEnd,
          config
        );

        result.warnings.push({
          type: 'CONSTRAINT_VIOLATION',
          message: '项目工期因资源约束延长',
          taskIds: [],
          severity: 'MEDIUM',
          suggestion: `项目完成时间调整至${adjustedProjectEnd.toLocaleDateString()}`
        });
      }

      // 存储资源分配信息（如果需要）
      if (allocations.length > 0) {
        await resourceService.batchCreateAllocations(allocations);
      }

      return result;

    } catch (error) {
      console.error('应用资源约束失败:', error);
      result.warnings.push({
        type: 'RESOURCE_CONFLICT',
        message: '资源约束处理失败',
        taskIds: [],
        severity: 'HIGH',
        suggestion: '请检查资源配置或联系管理员'
      });
      return result;
    }
  }

  /**
   * 生成调度统计信息
   */
  private generateStatistics(result: SchedulingResult): SchedulingStatistics {
    const criticalTasks = result.tasks.filter(task => task.isCritical).length;
    const totalTasks = result.tasks.length;

    // 浮动时间分布
    const floatDistribution = {
      zeroFloat: 0,
      lowFloat: 0,
      mediumFloat: 0,
      highFloat: 0
    };

    result.tasks.forEach(task => {
      const floatDays = task.totalFloat || 0;
      if (floatDays === 0) {
        floatDistribution.zeroFloat++;
      } else if (floatDays <= 2) {
        floatDistribution.lowFloat++;
      } else if (floatDays <= 7) {
        floatDistribution.mediumFloat++;
      } else {
        floatDistribution.highFloat++;
      }
    });

    return {
      totalTasks,
      criticalTasks,
      floatDistribution,
      resourceUtilization: {}, // 暂时为空，后续实现
      constraintSatisfaction: totalTasks > 0 ? (totalTasks - result.warnings.length) / totalTasks : 1
    };
  }

  /**
   * 辅助方法 - 添加工作日
   */
  private addDays(date: Date, days: number, config: SchedulingConfig): Date {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      
      if (config.workingDaysOnly) {
        // 跳过周末
        if (result.getDay() !== 0 && result.getDay() !== 6) {
          // 检查是否是假期
          const isHoliday = config.holidayDates.some(holiday => 
            holiday.toDateString() === result.toDateString()
          );
          
          if (!isHoliday) {
            addedDays++;
          }
        }
      } else {
        addedDays++;
      }
    }

    return result;
  }

  /**
   * 辅助方法 - 减去工作日
   */
  private subtractDays(date: Date, days: number, config: SchedulingConfig): Date {
    const result = new Date(date);
    let subtractedDays = 0;

    while (subtractedDays < days) {
      result.setDate(result.getDate() - 1);
      
      if (config.workingDaysOnly) {
        if (result.getDay() !== 0 && result.getDay() !== 6) {
          const isHoliday = config.holidayDates.some(holiday => 
            holiday.toDateString() === result.toDateString()
          );
          
          if (!isHoliday) {
            subtractedDays++;
          }
        }
      } else {
        subtractedDays++;
      }
    }

    return result;
  }

  /**
   * 查找项目开始日期
   */
  private findProjectStartDate(tasks: ScheduleTask[]): Date {
    return tasks.reduce((minDate, task) => {
      if (task.earliestStart && task.earliestStart.getTime() < minDate.getTime()) {
        return new Date(task.earliestStart);
      }
      return minDate;
    }, new Date());
  }

  /**
   * 计算项目工期
   */
  private calculateProjectDuration(startDate: Date, endDate: Date, config: SchedulingConfig): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (config.workingDaysOnly) {
      // 简化的工作日计算，实际应该考虑假期
      return Math.ceil(diffDays * 5 / 7);
    }
    
    return diffDays;
  }

  /**
   * 计算总浮动时间
   */
  private calculateTotalFloat(tasks: ScheduleTask[]): number {
    return tasks.reduce((total, task) => total + (task.totalFloat || 0), 0);
  }

  /**
   * 优化调度结果
   */
  public async optimizeSchedule(
    result: SchedulingResult,
    optimization: 'TIME' | 'COST' | 'RESOURCE'
  ): Promise<SchedulingResult> {
    const optimizedResult = { ...result };

    switch (optimization) {
      case 'TIME':
        // 时间优化：压缩关键路径
        optimizedResult.tasks = this.compressCriticalPath(result.tasks);
        break;
      case 'COST':
        // 成本优化：平衡时间和成本
        optimizedResult.warnings.push({
          type: 'CONSTRAINT_VIOLATION',
          message: '成本优化功能还在开发中',
          taskIds: [],
          severity: 'LOW'
        });
        break;
      case 'RESOURCE':
        // 资源优化：平衡资源使用
        optimizedResult.warnings.push({
          type: 'RESOURCE_CONFLICT',
          message: '资源优化功能还在开发中',
          taskIds: [],
          severity: 'LOW'
        });
        break;
    }

    return optimizedResult;
  }

  /**
   * 压缩关键路径
   */
  private compressCriticalPath(tasks: ScheduleTask[]): ScheduleTask[] {
    const optimizedTasks = tasks.map(task => ({ ...task }));
    
    // 对关键任务尝试压缩10%的工期
    optimizedTasks.forEach(task => {
      if (task.isCritical && task.calculatedDuration) {
        const compressed = Math.max(1, Math.ceil(task.calculatedDuration * 0.9));
        task.calculatedDuration = compressed;
      }
    });

    return optimizedTasks;
  }

  /**
   * 导出调度结果
   */
  public exportScheduleResult(
    result: SchedulingResult, 
    format: 'JSON' | 'CSV' | 'PDF'
  ): Promise<Blob> {
    return new Promise((resolve) => {
      let content: string;
      
      switch (format) {
        case 'JSON':
          content = JSON.stringify(result, null, 2);
          resolve(new Blob([content], { type: 'application/json' }));
          break;
        case 'CSV':
          content = this.convertToCSV(result);
          resolve(new Blob([content], { type: 'text/csv' }));
          break;
        case 'PDF':
          // PDF导出需要额外的库支持，这里返回JSON格式
          content = JSON.stringify(result, null, 2);
          resolve(new Blob([content], { type: 'application/json' }));
          break;
        default:
          content = JSON.stringify(result, null, 2);
          resolve(new Blob([content], { type: 'application/json' }));
      }
    });
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(result: SchedulingResult): string {
    const headers = [
      'Task ID', 'Task Title', 'Duration', 'Earliest Start', 'Earliest Finish',
      'Latest Start', 'Latest Finish', 'Total Float', 'Is Critical'
    ];

    const rows = result.tasks.map(task => [
      task.id,
      `"${task.title}"`,
      task.calculatedDuration || 0,
      task.earliestStart?.toISOString() || '',
      task.earliestFinish?.toISOString() || '',
      task.latestStart?.toISOString() || '',
      task.latestFinish?.toISOString() || '',
      task.totalFloat || 0,
      task.isCritical ? 'Yes' : 'No'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export default SchedulingService;