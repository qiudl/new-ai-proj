import api from './api';

// ==================== 类型定义 ====================

export interface TaskBrief {
  id: number;
  title: string;
}

export interface WeekPreview {
  week_number: number;
  week_range: string;
  parent_id: number | null;
  task_count: number;
  task_ids: number[];
  tasks: TaskBrief[];
}

export interface OrphanScanResult {
  total_orphans: number;
  organizable: number;
  archived: number;
  preview: WeekPreview[];
}

export interface OrganizeRequest {
  task_ids: number[];
  auto_create_weeks: boolean;
}

export interface OrganizeDetail {
  task_id: number;
  task_title?: string;
  success: boolean;
  message: string;
  parent_id?: number;
}

export interface OrganizeResult {
  organized: number;
  skipped: number;
  failed: number;
  details: OrganizeDetail[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ==================== 服务类 ====================

class TaskOrganizationService {
  /**
   * 扫描项目中的孤立任务
   * @param projectId 项目ID
   * @returns 扫描结果
   */
  async scanOrphanTasks(projectId: number): Promise<OrphanScanResult> {
    // api.ts 的响应拦截器会自动解包后端的 {success, data, message} 格式
    // 拦截器返回的 body.data 会直接替换整个 response 对象
    // 所以 response 本身就是解包后的数据，而不是 response.data
    const result = await api.post<OrphanScanResult>(
      `/projects/${projectId}/tasks/scan-orphans`
    );

    // result 本身就是 OrphanScanResult，不需要访问 .data
    return result as unknown as OrphanScanResult;
  }

  /**
   * 批量组织任务到周汇总
   * @param projectId 项目ID
   * @param request 组织请求
   * @returns 组织结果
   */
  async organizeTasksToWeeks(
    projectId: number,
    request: OrganizeRequest
  ): Promise<OrganizeResult> {
    // api.ts 的响应拦截器会自动解包后端的 {success, data, message} 格式
    // 拦截器返回的 body.data 会直接替换整个 response 对象
    const result = await api.post<OrganizeResult>(
      `/projects/${projectId}/tasks/organize-to-weeks`,
      request
    );

    // result 本身就是 OrganizeResult，不需要访问 .data
    return result as unknown as OrganizeResult;
  }

  /**
   * 便捷方法：扫描并组织所有可组织的任务
   * @param projectId 项目ID
   * @param autoCreateWeeks 是否自动创建周汇总任务
   * @returns 组织结果
   */
  async scanAndOrganizeAll(
    projectId: number,
    autoCreateWeeks: boolean = true
  ): Promise<{ scanResult: OrphanScanResult; organizeResult: OrganizeResult }> {
    // 先扫描
    const scanResult = await this.scanOrphanTasks(projectId);

    // 如果没有可组织的任务，直接返回
    if (scanResult.organizable === 0) {
      return {
        scanResult,
        organizeResult: {
          organized: 0,
          skipped: 0,
          failed: 0,
          details: [],
        },
      };
    }

    // 收集所有可组织的任务ID
    const taskIds = scanResult.preview.flatMap((week) => week.task_ids);

    // 执行组织
    const organizeResult = await this.organizeTasksToWeeks(projectId, {
      task_ids: taskIds,
      auto_create_weeks: autoCreateWeeks,
    });

    return { scanResult, organizeResult };
  }

  /**
   * 组织指定周次的任务
   * @param projectId 项目ID
   * @param weekNumber 周次
   * @param taskIds 任务ID列表
   * @param autoCreateWeeks 是否自动创建周汇总
   * @returns 组织结果
   */
  async organizeWeek(
    projectId: number,
    weekNumber: number,
    taskIds: number[],
    autoCreateWeeks: boolean = true
  ): Promise<OrganizeResult> {
    return this.organizeTasksToWeeks(projectId, {
      task_ids: taskIds,
      auto_create_weeks: autoCreateWeeks,
    });
  }
}

// 导出单例实例
export default new TaskOrganizationService();
