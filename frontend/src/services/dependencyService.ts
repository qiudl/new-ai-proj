// 任务依赖关系服务
import axios from 'axios';
import {
  TaskDependency,
  CreateDependencyRequest,
  UpdateDependencyRequest,
  BatchCreateDependenciesRequest,
  DependencyValidation,
  CriticalPathAnalysis,
  AutoScheduleRequest,
  AutoScheduleResponse,
  DependencyStatistics,
  DependencyFilter,
  DependencyExportOptions
} from '../types/dependency';

class DependencyService {
  private baseURL = '/api/v1';

  /**
   * 获取项目的所有依赖关系
   */
  static async getDependencies(projectId: number, filter?: DependencyFilter): Promise<TaskDependency[]> {
    try {
      const params = new URLSearchParams();
      if (filter) {
        if (filter.taskIds) params.append('task_ids', filter.taskIds.join(','));
        if (filter.types) params.append('types', filter.types.join(','));
        if (filter.strengths) params.append('strengths', filter.strengths.join(','));
        if (filter.onlyCriticalPath) params.append('critical_path_only', 'true');
        if (filter.dateRange) {
          params.append('start_date', filter.dateRange.start.toISOString());
          params.append('end_date', filter.dateRange.end.toISOString());
        }
      }

      const response = await axios.get(`/api/v1/projects/${projectId}/dependencies?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('获取依赖关系失败:', error);
      throw new Error('获取依赖关系失败');
    }
  }

  /**
   * 获取特定任务的依赖关系
   */
  static async getTaskDependencies(projectId: number, taskId: number): Promise<{
    predecessors: TaskDependency[];
    successors: TaskDependency[];
  }> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/tasks/${taskId}/dependencies`);
      return response.data;
    } catch (error) {
      console.error('获取任务依赖关系失败:', error);
      throw new Error('获取任务依赖关系失败');
    }
  }

  /**
   * 创建单个依赖关系
   */
  static async createDependency(projectId: number, dependency: CreateDependencyRequest): Promise<TaskDependency> {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/dependencies`, dependency);
      return response.data;
    } catch (error) {
      console.error('创建依赖关系失败:', error);
      throw new Error('创建依赖关系失败');
    }
  }

  /**
   * 批量创建依赖关系
   */
  static async createDependenciesBatch(
    projectId: number, 
    request: BatchCreateDependenciesRequest
  ): Promise<{
    created: TaskDependency[];
    failed: Array<{ dependency: CreateDependencyRequest; error: string }>;
  }> {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/dependencies/batch`, request);
      return response.data;
    } catch (error) {
      console.error('批量创建依赖关系失败:', error);
      throw new Error('批量创建依赖关系失败');
    }
  }

  /**
   * 更新依赖关系
   */
  static async updateDependency(
    projectId: number,
    dependencyId: number,
    updates: UpdateDependencyRequest
  ): Promise<TaskDependency> {
    try {
      const response = await axios.put(`/api/v1/projects/${projectId}/dependencies/${dependencyId}`, updates);
      return response.data;
    } catch (error) {
      console.error('更新依赖关系失败:', error);
      throw new Error('更新依赖关系失败');
    }
  }

  /**
   * 删除依赖关系
   */
  static async deleteDependency(projectId: number, dependencyId: number): Promise<void> {
    try {
      await axios.delete(`/api/v1/projects/${projectId}/dependencies/${dependencyId}`);
    } catch (error) {
      console.error('删除依赖关系失败:', error);
      throw new Error('删除依赖关系失败');
    }
  }

  /**
   * 批量删除依赖关系
   */
  static async deleteDependenciesBatch(projectId: number, dependencyIds: number[]): Promise<{
    deleted: number[];
    failed: Array<{ id: number; error: string }>;
  }> {
    try {
      const response = await axios.delete(`/api/v1/projects/${projectId}/dependencies/batch`, {
        data: { dependency_ids: dependencyIds }
      });
      return response.data;
    } catch (error) {
      console.error('批量删除依赖关系失败:', error);
      throw new Error('批量删除依赖关系失败');
    }
  }

  /**
   * 验证依赖关系
   */
  static async validateDependencies(
    projectId: number,
    dependencies: CreateDependencyRequest[]
  ): Promise<DependencyValidation> {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/dependencies/validate`, {
        dependencies
      });
      return response.data;
    } catch (error) {
      console.error('验证依赖关系失败:', error);
      throw new Error('验证依赖关系失败');
    }
  }

  /**
   * 检测循环依赖
   */
  static async detectCircularDependencies(projectId: number): Promise<{
    hasCircular: boolean;
    cycles: Array<{
      path: number[];
      description: string;
    }>;
  }> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/dependencies/circular-check`);
      return response.data;
    } catch (error) {
      console.error('检测循环依赖失败:', error);
      throw new Error('检测循环依赖失败');
    }
  }

  /**
   * 计算关键路径
   */
  static async calculateCriticalPath(projectId: number): Promise<CriticalPathAnalysis> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/dependencies/critical-path`);
      return response.data;
    } catch (error) {
      console.error('计算关键路径失败:', error);
      throw new Error('计算关键路径失败');
    }
  }

  /**
   * 自动调度任务
   */
  static async autoScheduleTasks(
    projectId: number,
    request: AutoScheduleRequest
  ): Promise<AutoScheduleResponse> {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/dependencies/auto-schedule`, request);
      return response.data;
    } catch (error) {
      console.error('自动调度失败:', error);
      throw new Error('自动调度失败');
    }
  }

  /**
   * 获取依赖关系统计信息
   */
  static async getDependencyStatistics(projectId: number): Promise<DependencyStatistics> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/dependencies/statistics`);
      return response.data;
    } catch (error) {
      console.error('获取依赖统计失败:', error);
      throw new Error('获取依赖统计失败');
    }
  }

  /**
   * 获取依赖关系图数据
   */
  static async getDependencyGraph(projectId: number): Promise<{
    nodes: Array<{
      id: number;
      taskId: number;
      title: string;
      startDate: Date;
      endDate: Date;
      status: string;
      priority?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      level: number;
      isCritical: boolean;
    }>;
    edges: Array<{
      id: number;
      dependencyId: number;
      source: number;
      target: number;
      type: string;
      strength: string;
      points: Array<{ x: number; y: number }>;
      isCritical: boolean;
    }>;
    criticalPath: number[];
    projectDuration: number;
  }> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/dependencies/graph`);
      return response.data;
    } catch (error) {
      console.error('获取依赖关系图失败:', error);
      throw new Error('获取依赖关系图失败');
    }
  }

  /**
   * 导出依赖关系数据
   */
  static async exportDependencies(
    projectId: number,
    options: DependencyExportOptions
  ): Promise<Blob> {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/dependencies/export`, options, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('导出依赖关系失败:', error);
      throw new Error('导出依赖关系失败');
    }
  }

  /**
   * 获取任务的可能前置任务列表（排除会造成循环依赖的任务）
   */
  static async getPossiblePredecessors(
    projectId: number,
    taskId: number
  ): Promise<Array<{
    id: number;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string;
    canConnect: boolean;
    reason?: string;
  }>> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/tasks/${taskId}/possible-predecessors`);
      return response.data;
    } catch (error) {
      console.error('获取可能前置任务失败:', error);
      throw new Error('获取可能前置任务失败');
    }
  }

  /**
   * 获取任务的可能后续任务列表
   */
  static async getPossibleSuccessors(
    projectId: number,
    taskId: number
  ): Promise<Array<{
    id: number;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string;
    canConnect: boolean;
    reason?: string;
  }>> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/tasks/${taskId}/possible-successors`);
      return response.data;
    } catch (error) {
      console.error('获取可能后续任务失败:', error);
      throw new Error('获取可能后续任务失败');
    }
  }

  /**
   * 预览依赖关系创建的影响
   */
  static async previewDependencyImpact(
    projectId: number,
    dependency: CreateDependencyRequest
  ): Promise<{
    affectedTasks: Array<{
      taskId: number;
      title: string;
      currentStartDate: Date;
      newStartDate: Date;
      currentEndDate: Date;
      newEndDate: Date;
      adjustmentReason: string;
    }>;
    criticalPathChanges: {
      before: number[];
      after: number[];
      added: number[];
      removed: number[];
    };
    warnings: string[];
  }> {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/dependencies/preview-impact`, dependency);
      return response.data;
    } catch (error) {
      console.error('预览依赖影响失败:', error);
      throw new Error('预览依赖影响失败');
    }
  }

  /**
   * 查找任务间的最短依赖路径
   */
  static async findDependencyPath(
    projectId: number,
    fromTaskId: number,
    toTaskId: number
  ): Promise<{
    path: Array<{
      taskId: number;
      title: string;
      dependencyType: string;
    }>;
    totalDistance: number;
    exists: boolean;
  }> {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}/dependencies/path/${fromTaskId}/${toTaskId}`);
      return response.data;
    } catch (error) {
      console.error('查找依赖路径失败:', error);
      throw new Error('查找依赖路径失败');
    }
  }

  /**
   * 优化依赖关系（清理冗余依赖）
   */
  static async optimizeDependencies(projectId: number): Promise<{
    removedDependencies: Array<{
      id: number;
      reason: string;
      predecessorTitle: string;
      successorTitle: string;
    }>;
    optimizationSummary: {
      totalReviewed: number;
      redundantRemoved: number;
      conflictsResolved: number;
    };
  }> {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/dependencies/optimize`);
      return response.data;
    } catch (error) {
      console.error('优化依赖关系失败:', error);
      throw new Error('优化依赖关系失败');
    }
  }

  /**
   * 复制依赖关系模板
   */
  static async copyDependencyTemplate(
    sourceProjectId: number,
    targetProjectId: number,
    taskMapping: Record<number, number>
  ): Promise<{
    copiedDependencies: TaskDependency[];
    skippedDependencies: Array<{
      reason: string;
      sourceTaskId: number;
      targetTaskId: number;
    }>;
  }> {
    try {
      const response = await axios.post(`/api/v1/projects/${targetProjectId}/dependencies/copy-template`, {
        source_project_id: sourceProjectId,
        task_mapping: taskMapping
      });
      return response.data;
    } catch (error) {
      console.error('复制依赖模板失败:', error);
      throw new Error('复制依赖模板失败');
    }
  }
}

export default DependencyService;