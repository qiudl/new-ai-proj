import api from './api';

export interface ArchivedTask {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: string;
  assignee_id?: number;
  due_date?: string;
  custom_fields?: any;
  created_at: string;
  archived_at: string;
  archived_by?: number;
  archived_by_username?: string;
  archive_reason?: string;
  project_name: string;
}

export interface ArchiveStatistics {
  project_id: number;
  project_name: string;
  active_tasks: number;
  archived_tasks: number;
  total_tasks: number;
}

// 归档单个任务
export const archiveTask = async (
  projectId: number, 
  taskId: number, 
  reason?: string
): Promise<void> => {
  await api.post(`/projects/${projectId}/tasks/${taskId}/archive`, {
    reason
  });
  // API 拦截器已自动解包 { success, data } 为 data，无需再检查 success
};

// 取消归档单个任务
export const unarchiveTask = async (
  projectId: number,
  taskId: number
): Promise<void> => {
  await api.post(`/projects/${projectId}/tasks/${taskId}/unarchive`);
  // API 拦截器已自动解包 { success, data } 为 data
};

// 批量归档任务
export const archiveTasks = async (
  projectId: number,
  taskIds: number[],
  reason?: string
): Promise<{ archived_count: number; requested_count: number }> => {
  if (!projectId || projectId <= 0) {
    // 全局模式：使用已注册的批量操作归档端点
    const data = await api.post(`/batch/operations/archive`, {
      task_ids: taskIds,
      archive_children: false,
      reason
    });
    return data; // API 拦截器已解包
  }

  // 项目模式：使用项目作用域的归档接口
  const data = await api.post(`/projects/${projectId}/tasks/archive/bulk`, {
    task_ids: taskIds,
    reason
  });
  
  return data; // API 拦截器已解包
};

// 获取归档任务列表
export const getArchivedTasks = async (
  projectId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  tasks: ArchivedTask[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}> => {
  return await api.get(`/projects/${projectId}/tasks/archived`, {
    params: { page, pageSize }
  });
  // API 拦截器已自动解包 { success, data } 为 data
};

// 获取归档统计信息
export const getArchiveStatistics = async (
  projectId: number
): Promise<ArchiveStatistics> => {
  return await api.get(`/projects/${projectId}/archive/stats`);
  // API 拦截器已自动解包 { success, data } 为 data
};
