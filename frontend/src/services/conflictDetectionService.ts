import { Task, Project } from '../types/task';
import { TaskDependency, DependencyType, DependencyStrength } from '../types/dependency';
import DependencyService from './dependencyService';
import SchedulingService, { ScheduleTask } from './schedulingService';

// 冲突检测相关类型定义
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: DependencyConflict[];
  warnings: DependencyWarning[];
  suggestions: ConflictResolution[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedTasks: number[];
}

export interface DependencyConflict {
  id: string;
  type: ConflictType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  affectedDependencies: number[];
  affectedTasks: number[];
  conflictDetails: {
    source: string;
    target: string;
    reason: string;
    impact: string;
  };
  detectedAt: Date;
}

export interface DependencyWarning {
  id: string;
  type: WarningType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  taskIds: number[];
  dependencyIds: number[];
  suggestion?: string;
}

export interface ConflictResolution {
  conflictId: string;
  type: ResolutionType;
  title: string;
  description: string;
  actions: ResolutionAction[];
  estimatedEffort: number; // 预估修复工作量（小时）
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  autoApplicable: boolean;
}

export interface ResolutionAction {
  type: 'UPDATE_DEPENDENCY' | 'DELETE_DEPENDENCY' | 'CREATE_DEPENDENCY' | 'UPDATE_TASK' | 'RESCHEDULE';
  target: 'dependency' | 'task' | 'schedule';
  targetId: number;
  changes: Record<string, any>;
  description: string;
}

export enum ConflictType {
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  TEMPORAL_CONFLICT = 'TEMPORAL_CONFLICT',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  LOGICAL_INCONSISTENCY = 'LOGICAL_INCONSISTENCY',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  REDUNDANT_DEPENDENCY = 'REDUNDANT_DEPENDENCY',
  IMPOSSIBLE_SCHEDULE = 'IMPOSSIBLE_SCHEDULE'
}

export enum WarningType {
  COMPLEX_DEPENDENCY_CHAIN = 'COMPLEX_DEPENDENCY_CHAIN',
  WEAK_DEPENDENCY_LINK = 'WEAK_DEPENDENCY_LINK',
  EXCESSIVE_LAG_TIME = 'EXCESSIVE_LAG_TIME',
  ISOLATED_TASK = 'ISOLATED_TASK',
  CRITICAL_PATH_BOTTLENECK = 'CRITICAL_PATH_BOTTLENECK'
}

export enum ResolutionType {
  REMOVE_DEPENDENCY = 'REMOVE_DEPENDENCY',
  MODIFY_DEPENDENCY = 'MODIFY_DEPENDENCY',
  RESCHEDULE_TASKS = 'RESCHEDULE_TASKS',
  SPLIT_TASK = 'SPLIT_TASK',
  MERGE_TASKS = 'MERGE_TASKS',
  ADJUST_RESOURCES = 'ADJUST_RESOURCES'
}

export interface ConflictDetectionConfig {
  enableCircularDetection: boolean;
  enableTemporalValidation: boolean;
  enableResourceValidation: boolean;
  enableLogicalValidation: boolean;
  maxDependencyChainLength: number;
  maxLagDays: number;
  criticalPathThreshold: number;
}

/**
 * 依赖冲突检测服务
 * 实现全面的依赖关系冲突检测、分析和解决方案推荐
 */
class ConflictDetectionService {
  private static instance: ConflictDetectionService;

  private constructor() {}

  public static getInstance(): ConflictDetectionService {
    if (!ConflictDetectionService.instance) {
      ConflictDetectionService.instance = new ConflictDetectionService();
    }
    return ConflictDetectionService.instance;
  }

  /**
   * 执行全面的依赖冲突检测
   */
  public async detectConflicts(
    projectId: number,
    tasks: Task[],
    dependencies: TaskDependency[],
    config: Partial<ConflictDetectionConfig> = {}
  ): Promise<ConflictDetectionResult> {
    const fullConfig: ConflictDetectionConfig = {
      enableCircularDetection: true,
      enableTemporalValidation: true,
      enableResourceValidation: false,
      enableLogicalValidation: true,
      maxDependencyChainLength: 10,
      maxLagDays: 30,
      criticalPathThreshold: 0.8,
      ...config
    };

    const conflicts: DependencyConflict[] = [];
    const warnings: DependencyWarning[] = [];
    const suggestions: ConflictResolution[] = [];
    const affectedTasks = new Set<number>();

    try {
      // 1. 循环依赖检测
      if (fullConfig.enableCircularDetection) {
        const circularConflicts = await this.detectCircularDependencies(tasks, dependencies);
        conflicts.push(...circularConflicts);
        circularConflicts.forEach(conflict => {
          conflict.affectedTasks.forEach(taskId => affectedTasks.add(taskId));
        });
      }

      // 2. 时间逻辑冲突检测
      if (fullConfig.enableTemporalValidation) {
        const temporalConflicts = await this.detectTemporalConflicts(tasks, dependencies);
        conflicts.push(...temporalConflicts);
        temporalConflicts.forEach(conflict => {
          conflict.affectedTasks.forEach(taskId => affectedTasks.add(taskId));
        });
      }

      // 3. 逻辑一致性检测
      if (fullConfig.enableLogicalValidation) {
        const logicalConflicts = await this.detectLogicalInconsistencies(tasks, dependencies);
        conflicts.push(...logicalConflicts);
        logicalConflicts.forEach(conflict => {
          conflict.affectedTasks.forEach(taskId => affectedTasks.add(taskId));
        });
      }

      // 4. 约束违反检测
      const constraintViolations = await this.detectConstraintViolations(tasks, dependencies, fullConfig);
      conflicts.push(...constraintViolations);
      constraintViolations.forEach(conflict => {
        conflict.affectedTasks.forEach(taskId => affectedTasks.add(taskId));
      });

      // 5. 冗余依赖检测
      const redundantDependencies = await this.detectRedundantDependencies(tasks, dependencies);
      warnings.push(...redundantDependencies);

      // 6. 复杂依赖链警告
      const complexChains = await this.detectComplexDependencyChains(tasks, dependencies, fullConfig);
      warnings.push(...complexChains);

      // 生成解决方案
      for (const conflict of conflicts) {
        const resolutions = await this.generateResolutions(conflict, tasks, dependencies);
        suggestions.push(...resolutions);
      }

      // 计算整体严重程度
      const severity = this.calculateOverallSeverity(conflicts);

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        warnings,
        suggestions,
        severity,
        affectedTasks: Array.from(affectedTasks)
      };

    } catch (error) {
      console.error('依赖冲突检测失败:', error);
      throw error;
    }
  }

  /**
   * 检测循环依赖
   */
  private async detectCircularDependencies(
    tasks: Task[],
    dependencies: TaskDependency[]
  ): Promise<DependencyConflict[]> {
    const conflicts: DependencyConflict[] = [];
    const graph = this.buildDependencyGraph(tasks, dependencies);
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    const cyclePaths: number[][] = [];

    const detectCycle = (taskId: number, path: number[] = []): boolean => {
      if (recursionStack.has(taskId)) {
        // 找到循环
        const cycleStart = path.indexOf(taskId);
        const cyclePath = path.slice(cycleStart).concat([taskId]);
        cyclePaths.push(cyclePath);
        return true;
      }

      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const successors = graph.get(taskId) || [];
      for (const successorId of successors) {
        if (detectCycle(successorId, [...path])) {
          // 继续查找其他循环
        }
      }

      recursionStack.delete(taskId);
      path.pop();
      return false;
    };

    // 检测所有可能的循环
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        detectCycle(task.id);
      }
    }

    // 为每个循环创建冲突记录
    cyclePaths.forEach((cyclePath, index) => {
      const involvedDependencies = this.findDependenciesInPath(cyclePath, dependencies);
      const taskTitles = cyclePath.map(id => {
        const task = tasks.find(t => t.id === id);
        return task ? task.title : `任务${id}`;
      });

      conflicts.push({
        id: `circular_${index}`,
        type: ConflictType.CIRCULAR_DEPENDENCY,
        severity: 'CRITICAL',
        title: '检测到循环依赖',
        description: `任务链 ${taskTitles.join(' → ')} 形成了循环依赖，这将导致项目无法正常调度。`,
        affectedDependencies: involvedDependencies.map(d => d.id),
        affectedTasks: cyclePath,
        conflictDetails: {
          source: taskTitles.join(' → '),
          target: '整个循环链',
          reason: '任务之间形成闭环依赖关系',
          impact: '项目无法进行有效的时间调度，可能导致死锁'
        },
        detectedAt: new Date()
      });
    });

    return conflicts;
  }

  /**
   * 检测时间逻辑冲突
   */
  private async detectTemporalConflicts(
    tasks: Task[],
    dependencies: TaskDependency[]
  ): Promise<DependencyConflict[]> {
    const conflicts: DependencyConflict[] = [];

    for (const dependency of dependencies) {
      const predecessor = tasks.find(t => t.id === dependency.predecessor_id);
      const successor = tasks.find(t => t.id === dependency.successor_id);

      if (!predecessor || !successor) continue;

      // 检查时间逻辑是否合理
      if (predecessor.start_date && successor.start_date && predecessor.due_date && successor.due_date) {
        const predStart = new Date(predecessor.start_date);
        const predEnd = new Date(predecessor.due_date);
        const succStart = new Date(successor.start_date);
        const succEnd = new Date(successor.due_date);

        let hasConflict = false;
        let conflictReason = '';

        switch (dependency.type) {
          case DependencyType.FINISH_TO_START:
            if (predEnd.getTime() > succStart.getTime() + (dependency.lag_days || 0) * 24 * 60 * 60 * 1000) {
              hasConflict = true;
              conflictReason = '前置任务完成时间晚于后续任务开始时间';
            }
            break;
          case DependencyType.START_TO_START:
            if (Math.abs(predStart.getTime() - succStart.getTime()) > (dependency.lag_days || 0) * 24 * 60 * 60 * 1000) {
              hasConflict = true;
              conflictReason = '两个任务的开始时间不符合依赖约束';
            }
            break;
          case DependencyType.FINISH_TO_FINISH:
            if (Math.abs(predEnd.getTime() - succEnd.getTime()) > (dependency.lag_days || 0) * 24 * 60 * 60 * 1000) {
              hasConflict = true;
              conflictReason = '两个任务的完成时间不符合依赖约束';
            }
            break;
          case DependencyType.START_TO_FINISH:
            if (predStart.getTime() > succEnd.getTime() + (dependency.lag_days || 0) * 24 * 60 * 60 * 1000) {
              hasConflict = true;
              conflictReason = '前置任务开始时间晚于后续任务完成时间';
            }
            break;
        }

        if (hasConflict) {
          conflicts.push({
            id: `temporal_${dependency.id}`,
            type: ConflictType.TEMPORAL_CONFLICT,
            severity: 'HIGH',
            title: '时间逻辑冲突',
            description: `任务"${predecessor.title}"与"${successor.title}"之间的时间安排与依赖关系存在冲突。`,
            affectedDependencies: [dependency.id],
            affectedTasks: [predecessor.id, successor.id],
            conflictDetails: {
              source: predecessor.title,
              target: successor.title,
              reason: conflictReason,
              impact: '可能导致项目延期或资源浪费'
            },
            detectedAt: new Date()
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 检测逻辑一致性问题
   */
  private async detectLogicalInconsistencies(
    tasks: Task[],
    dependencies: TaskDependency[]
  ): Promise<DependencyConflict[]> {
    const conflicts: DependencyConflict[] = [];

    for (const dependency of dependencies) {
      const predecessor = tasks.find(t => t.id === dependency.predecessor_id);
      const successor = tasks.find(t => t.id === dependency.successor_id);

      if (!predecessor || !successor) continue;

      // 检查状态逻辑一致性
      if (predecessor.status === 'todo' && successor.status === 'completed') {
        conflicts.push({
          id: `logical_${dependency.id}`,
          type: ConflictType.LOGICAL_INCONSISTENCY,
          severity: 'MEDIUM',
          title: '状态逻辑不一致',
          description: `前置任务"${predecessor.title}"尚未开始，但后续任务"${successor.title}"已经完成。`,
          affectedDependencies: [dependency.id],
          affectedTasks: [predecessor.id, successor.id],
          conflictDetails: {
            source: predecessor.title,
            target: successor.title,
            reason: `前置任务状态为${predecessor.status}，后续任务状态为${successor.status}`,
            impact: '可能表示依赖关系设置错误或任务状态更新不及时'
          },
          detectedAt: new Date()
        });
      }

      // 检查优先级逻辑
      const predPriority = predecessor.custom_fields?.priority || 'medium';
      const succPriority = successor.custom_fields?.priority || 'medium';
      const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };

      if (priorityOrder[predPriority as keyof typeof priorityOrder] < 
          priorityOrder[succPriority as keyof typeof priorityOrder] - 1) {
        conflicts.push({
          id: `priority_${dependency.id}`,
          type: ConflictType.LOGICAL_INCONSISTENCY,
          severity: 'LOW',
          title: '优先级逻辑异常',
          description: `前置任务"${predecessor.title}"优先级(${predPriority})明显低于后续任务"${successor.title}"优先级(${succPriority})。`,
          affectedDependencies: [dependency.id],
          affectedTasks: [predecessor.id, successor.id],
          conflictDetails: {
            source: predecessor.title,
            target: successor.title,
            reason: `优先级差异过大：${predPriority} vs ${succPriority}`,
            impact: '可能影响资源分配和执行顺序的合理性'
          },
          detectedAt: new Date()
        });
      }
    }

    return conflicts;
  }

  /**
   * 检测约束违反
   */
  private async detectConstraintViolations(
    tasks: Task[],
    dependencies: TaskDependency[],
    config: ConflictDetectionConfig
  ): Promise<DependencyConflict[]> {
    const conflicts: DependencyConflict[] = [];

    // 检查滞后时间超限
    for (const dependency of dependencies) {
      if (Math.abs(dependency.lag_days || 0) > config.maxLagDays) {
        const predecessor = tasks.find(t => t.id === dependency.predecessor_id);
        const successor = tasks.find(t => t.id === dependency.successor_id);

        if (predecessor && successor) {
          conflicts.push({
            id: `lag_violation_${dependency.id}`,
            type: ConflictType.CONSTRAINT_VIOLATION,
            severity: 'MEDIUM',
            title: '滞后时间超限',
            description: `依赖关系滞后时间(${dependency.lag_days}天)超过了系统限制(${config.maxLagDays}天)。`,
            affectedDependencies: [dependency.id],
            affectedTasks: [predecessor.id, successor.id],
            conflictDetails: {
              source: predecessor.title,
              target: successor.title,
              reason: `滞后时间${dependency.lag_days}天超过限制${config.maxLagDays}天`,
              impact: '可能导致项目时间线不合理或调度困难'
            },
            detectedAt: new Date()
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 检测冗余依赖
   */
  private async detectRedundantDependencies(
    tasks: Task[],
    dependencies: TaskDependency[]
  ): Promise<DependencyWarning[]> {
    const warnings: DependencyWarning[] = [];
    const graph = this.buildDependencyGraph(tasks, dependencies);

    // 检查是否存在可以通过传递性推导出的依赖关系
    for (const dependency of dependencies) {
      const hasIndirectPath = this.hasIndirectPath(
        dependency.predecessor_id,
        dependency.successor_id,
        graph,
        new Set([dependency.id])
      );

      if (hasIndirectPath) {
        const predecessor = tasks.find(t => t.id === dependency.predecessor_id);
        const successor = tasks.find(t => t.id === dependency.successor_id);

        if (predecessor && successor) {
          warnings.push({
            id: `redundant_${dependency.id}`,
            type: WarningType.WEAK_DEPENDENCY_LINK,
            severity: 'LOW',
            message: `依赖关系"${predecessor.title}" → "${successor.title}"可能是冗余的，因为存在间接路径。`,
            taskIds: [predecessor.id, successor.id],
            dependencyIds: [dependency.id],
            suggestion: '考虑移除此冗余依赖以简化项目结构'
          });
        }
      }
    }

    return warnings;
  }

  /**
   * 检测复杂依赖链
   */
  private async detectComplexDependencyChains(
    tasks: Task[],
    dependencies: TaskDependency[],
    config: ConflictDetectionConfig
  ): Promise<DependencyWarning[]> {
    const warnings: DependencyWarning[] = [];
    const graph = this.buildDependencyGraph(tasks, dependencies);

    // 查找超长依赖链
    for (const task of tasks) {
      const chainLength = this.calculateMaxChainLength(task.id, graph);
      if (chainLength > config.maxDependencyChainLength) {
        warnings.push({
          id: `complex_chain_${task.id}`,
          type: WarningType.COMPLEX_DEPENDENCY_CHAIN,
          severity: 'MEDIUM',
          message: `任务"${task.title}"所在的依赖链长度(${chainLength})超过建议值(${config.maxDependencyChainLength})。`,
          taskIds: [task.id],
          dependencyIds: [],
          suggestion: '考虑将长依赖链分解为多个并行子项目'
        });
      }
    }

    return warnings;
  }

  /**
   * 生成冲突解决方案
   */
  private async generateResolutions(
    conflict: DependencyConflict,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    switch (conflict.type) {
      case ConflictType.CIRCULAR_DEPENDENCY:
        resolutions.push(...this.generateCircularDependencyResolutions(conflict, tasks, dependencies));
        break;
      case ConflictType.TEMPORAL_CONFLICT:
        resolutions.push(...this.generateTemporalConflictResolutions(conflict, tasks, dependencies));
        break;
      case ConflictType.LOGICAL_INCONSISTENCY:
        resolutions.push(...this.generateLogicalInconsistencyResolutions(conflict, tasks, dependencies));
        break;
      case ConflictType.CONSTRAINT_VIOLATION:
        resolutions.push(...this.generateConstraintViolationResolutions(conflict, tasks, dependencies));
        break;
    }

    return resolutions;
  }

  /**
   * 生成循环依赖解决方案
   */
  private generateCircularDependencyResolutions(
    conflict: DependencyConflict,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    // 方案1：删除最弱的依赖关系
    const weakestDependency = this.findWeakestDependencyInConflict(conflict, dependencies);
    if (weakestDependency) {
      resolutions.push({
        conflictId: conflict.id,
        type: ResolutionType.REMOVE_DEPENDENCY,
        title: '删除最弱依赖关系',
        description: '删除循环中最弱的依赖关系以打破循环',
        actions: [{
          type: 'DELETE_DEPENDENCY',
          target: 'dependency',
          targetId: weakestDependency.id,
          changes: {},
          description: `删除依赖关系: ${weakestDependency.id}`
        }],
        estimatedEffort: 0.5,
        priority: 'HIGH',
        autoApplicable: true
      });
    }

    // 方案2：修改依赖类型
    resolutions.push({
      conflictId: conflict.id,
      type: ResolutionType.MODIFY_DEPENDENCY,
      title: '调整依赖类型',
      description: '将部分依赖关系改为可选或首选类型',
      actions: conflict.affectedDependencies.map(depId => ({
        type: 'UPDATE_DEPENDENCY' as const,
        target: 'dependency' as const,
        targetId: depId,
        changes: { strength: 'PREFERRED' },
        description: `将依赖关系${depId}改为首选类型`
      })),
      estimatedEffort: 1,
      priority: 'MEDIUM',
      autoApplicable: false
    });

    return resolutions;
  }

  /**
   * 生成时间冲突解决方案
   */
  private generateTemporalConflictResolutions(
    conflict: DependencyConflict,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    // 方案1：重新调度任务
    resolutions.push({
      conflictId: conflict.id,
      type: ResolutionType.RESCHEDULE_TASKS,
      title: '重新调度任务时间',
      description: '自动调整任务的开始和结束时间以符合依赖约束',
      actions: conflict.affectedTasks.map(taskId => ({
        type: 'RESCHEDULE' as const,
        target: 'schedule' as const,
        targetId: taskId,
        changes: { autoSchedule: true },
        description: `重新调度任务${taskId}`
      })),
      estimatedEffort: 2,
      priority: 'HIGH',
      autoApplicable: true
    });

    // 方案2：调整滞后时间
    resolutions.push({
      conflictId: conflict.id,
      type: ResolutionType.MODIFY_DEPENDENCY,
      title: '调整滞后时间',
      description: '修改依赖关系的滞后时间以解决时间冲突',
      actions: conflict.affectedDependencies.map(depId => ({
        type: 'UPDATE_DEPENDENCY' as const,
        target: 'dependency' as const,
        targetId: depId,
        changes: { lag_days: 0 },
        description: `重置依赖关系${depId}的滞后时间`
      })),
      estimatedEffort: 0.5,
      priority: 'MEDIUM',
      autoApplicable: true
    });

    return resolutions;
  }

  /**
   * 生成逻辑不一致解决方案
   */
  private generateLogicalInconsistencyResolutions(
    conflict: DependencyConflict,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    // 状态同步方案
    resolutions.push({
      conflictId: conflict.id,
      type: ResolutionType.RESCHEDULE_TASKS,
      title: '同步任务状态',
      description: '更新任务状态以保持逻辑一致性',
      actions: conflict.affectedTasks.map(taskId => ({
        type: 'UPDATE_TASK' as const,
        target: 'task' as const,
        targetId: taskId,
        changes: { syncStatus: true },
        description: `同步任务${taskId}的状态`
      })),
      estimatedEffort: 0.5,
      priority: 'MEDIUM',
      autoApplicable: false
    });

    return resolutions;
  }

  /**
   * 生成约束违反解决方案
   */
  private generateConstraintViolationResolutions(
    conflict: DependencyConflict,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    // 调整约束参数
    resolutions.push({
      conflictId: conflict.id,
      type: ResolutionType.MODIFY_DEPENDENCY,
      title: '调整约束参数',
      description: '修改违反约束的参数值',
      actions: conflict.affectedDependencies.map(depId => ({
        type: 'UPDATE_DEPENDENCY' as const,
        target: 'dependency' as const,
        targetId: depId,
        changes: { lag_days: 0 },
        description: `调整依赖关系${depId}的参数`
      })),
      estimatedEffort: 0.25,
      priority: 'LOW',
      autoApplicable: true
    });

    return resolutions;
  }

  /**
   * 辅助方法 - 构建依赖图
   */
  private buildDependencyGraph(tasks: Task[], dependencies: TaskDependency[]): Map<number, number[]> {
    const graph = new Map<number, number[]>();
    
    // 初始化所有任务节点
    tasks.forEach(task => {
      graph.set(task.id, []);
    });

    // 添加依赖关系边
    dependencies.forEach(dep => {
      const successors = graph.get(dep.predecessor_id) || [];
      successors.push(dep.successor_id);
      graph.set(dep.predecessor_id, successors);
    });

    return graph;
  }

  /**
   * 辅助方法 - 查找路径中的依赖关系
   */
  private findDependenciesInPath(path: number[], dependencies: TaskDependency[]): TaskDependency[] {
    const pathDependencies: TaskDependency[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const dependency = dependencies.find(
        d => d.predecessor_id === path[i] && d.successor_id === path[i + 1]
      );
      if (dependency) {
        pathDependencies.push(dependency);
      }
    }

    return pathDependencies;
  }

  /**
   * 辅助方法 - 检查是否存在间接路径
   */
  private hasIndirectPath(
    sourceId: number,
    targetId: number,
    graph: Map<number, number[]>,
    excludeDependencies: Set<number>
  ): boolean {
    const visited = new Set<number>();
    
    const dfs = (currentId: number): boolean => {
      if (currentId === targetId) {
        return true;
      }
      
      if (visited.has(currentId)) {
        return false;
      }
      
      visited.add(currentId);
      
      const successors = graph.get(currentId) || [];
      for (const successorId of successors) {
        if (dfs(successorId)) {
          return true;
        }
      }
      
      return false;
    };

    return dfs(sourceId);
  }

  /**
   * 辅助方法 - 计算最大链长度
   */
  private calculateMaxChainLength(taskId: number, graph: Map<number, number[]>): number {
    const visited = new Set<number>();
    
    const dfs = (currentId: number): number => {
      if (visited.has(currentId)) {
        return 0;
      }
      
      visited.add(currentId);
      
      const successors = graph.get(currentId) || [];
      if (successors.length === 0) {
        return 1;
      }
      
      let maxLength = 0;
      for (const successorId of successors) {
        maxLength = Math.max(maxLength, dfs(successorId));
      }
      
      return maxLength + 1;
    };

    return dfs(taskId);
  }

  /**
   * 辅助方法 - 查找冲突中最弱的依赖关系
   */
  private findWeakestDependencyInConflict(
    conflict: DependencyConflict,
    dependencies: TaskDependency[]
  ): TaskDependency | null {
    const conflictDependencies = dependencies.filter(
      d => conflict.affectedDependencies.includes(d.id)
    );

    // 优先选择可选类型的依赖
    const optionalDep = conflictDependencies.find(
      d => d.strength === DependencyStrength.OPTIONAL
    );
    if (optionalDep) return optionalDep;

    // 其次选择首选类型的依赖
    const preferredDep = conflictDependencies.find(
      d => d.strength === DependencyStrength.PREFERRED
    );
    if (preferredDep) return preferredDep;

    // 最后返回第一个强制依赖
    return conflictDependencies[0] || null;
  }

  /**
   * 辅助方法 - 计算整体严重程度
   */
  private calculateOverallSeverity(conflicts: DependencyConflict[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (conflicts.some(c => c.severity === 'CRITICAL')) return 'CRITICAL';
    if (conflicts.some(c => c.severity === 'HIGH')) return 'HIGH';
    if (conflicts.some(c => c.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 应用解决方案
   */
  public async applyResolution(
    projectId: number,
    resolution: ConflictResolution
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      for (const action of resolution.actions) {
        switch (action.type) {
          case 'DELETE_DEPENDENCY':
            await DependencyService.deleteDependency(projectId, action.targetId);
            break;
          case 'UPDATE_DEPENDENCY':
            await DependencyService.updateDependency(projectId, action.targetId, action.changes);
            break;
          case 'RESCHEDULE':
            // 这里需要集成调度服务
            break;
        }
      }

      return {
        success: true,
        message: `解决方案"${resolution.title}"应用成功`
      };
    } catch (error) {
      return {
        success: false,
        message: `解决方案应用失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
}

export default ConflictDetectionService;