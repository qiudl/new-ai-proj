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
  const response = await api.post(`/projects/${projectId}/tasks/${taskId}/archive`, {
    reason
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || '归档任务失败');
  }
};

// 取消归档单个任务
export const unarchiveTask = async (
  projectId: number,
  taskId: number
): Promise<void> => {
  const response = await api.post(`/projects/${projectId}/tasks/${taskId}/unarchive`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || '取消归档失败');
  }
};

// 批量归档任务
export const archiveTasks = async (
  projectId: number,
  taskIds: number[],
  reason?: string
): Promise<{ archived_count: number; requested_count: number }> => {
  const response = await api.post(`/projects/${projectId}/tasks/archive/bulk`, {
    task_ids: taskIds,
    reason
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || '批量归档失败');
  }
  
  return response.data.data;
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
  const response = await api.get(`/projects/${projectId}/tasks/archived`, {
    params: { page, pageSize }
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || '获取归档任务失败');
  }
  
  return response.data.data;
};

// 获取归档统计信息
export const getArchiveStatistics = async (
  projectId: number
): Promise<ArchiveStatistics> => {
  const response = await api.get(`/projects/${projectId}/archive/stats`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || '获取归档统计失败');
  }
  
  return response.data.data;
};