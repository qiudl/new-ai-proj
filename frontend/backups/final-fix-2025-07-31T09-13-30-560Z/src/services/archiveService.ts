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
  try {
    const response = await api.post(`/projects/${projectId}/tasks/${taskId}/archive`, {
      reason
    });
    
    // 检查响应是否成功
    if (response.data && response.data.success === false) {
      throw new Error(response.data.message || '归档任务失败');
    }
    
    // 如果没有明确的success字段，认为请求成功（状态码2xx）
    // Task archived successfully (log removed for production)
  } catch (error: any) {
    // Handle specific HTTP errors
    const status = error.response?.status || error.status;
    const errorMessage = error.response?.data?.message || error.message;
    
    if (status === 404) {
      console.warn('Archive API endpoint not found');
      throw new Error('归档功能暂未实现，请联系开发团队。该功能需要后端API支持。');
    }
    
    if (status === 400) {
      console.warn('Bad request to archive API:', errorMessage);
      throw new Error(errorMessage || '归档请求参数错误');
    }
    
    if (status === 500) {
      console.error('Server error during archive:', errorMessage);
      throw new Error('服务器内部错误，请稍后重试');
    }
    
    console.error('archiveService.archiveTask error:', error);
    throw new Error(errorMessage || '归档任务失败，请稍后重试');
  }
};

// 取消归档单个任务
export const unarchiveTask = async (
  projectId: number,
  taskId: number
): Promise<void> => {
  try {
    const response = await api.post(`/projects/${projectId}/tasks/${taskId}/unarchive`);
    
    // 检查响应是否成功
    if (response.data && response.data.success === false) {
      throw new Error(response.data.message || '取消归档失败');
    }
    
    console.log('Task unarchived successfully:', response.data);
  } catch (error: any) {
    // Handle specific HTTP errors
    const status = error.response?.status || error.status;
    const errorMessage = error.response?.data?.message || error.message;
    
    if (status === 404) {
      console.warn('Unarchive API endpoint not found');
      throw new Error('取消归档功能暂未实现，请联系开发团队。该功能需要后端API支持。');
    }
    
    console.error('archiveService.unarchiveTask error:', error);
    throw new Error(errorMessage || '取消归档失败，请稍后重试');
  }
};

// 批量归档任务
export const archiveTasks = async (
  projectId: number,
  taskIds: number[],
  reason?: string
): Promise<{ archived_count: number; requested_count: number }> => {
  try {
    const response = await api.post(`/projects/${projectId}/tasks/archive/bulk`, {
      task_ids: taskIds,
      reason
    });
    
    // 检查响应是否成功
    if (response.data && response.data.success === false) {
      throw new Error(response.data.message || '批量归档失败');
    }
    
    // 从响应中提取归档结果数据
    const data = response.data.data || response.data;
    console.log('Tasks archived successfully:', data);
    
    return {
      archived_count: data.archived_count || 0,
      requested_count: taskIds.length
    };
  } catch (error: any) {
    // Handle specific HTTP errors
    const status = error.response?.status || error.status;
    const errorMessage = error.response?.data?.message || error.message;
    
    if (status === 404) {
      console.warn('Bulk archive API endpoint not found');
      throw new Error('批量归档功能暂未实现，请联系开发团队。该功能需要后端API支持。');
    }
    
    console.error('archiveService.archiveTasks error:', error);
    throw new Error(errorMessage || '批量归档失败，请稍后重试');
  }
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
  try {
    const response = await api.get(`/projects/${projectId}/tasks/archived`, {
      params: { page, pageSize }
    });
    
    // 检查响应是否成功
    if (response.data.success === false) {
      throw new Error(response.data.message || '获取归档任务失败');
    }
    
    return response.data.data;
  } catch (error: any) {
    // Handle 404 errors gracefully for missing backend APIs
    if (error.status === 404 || error.message?.includes('404') || error.code === 'ERR_BAD_REQUEST') {
      console.warn('Archived tasks API not implemented yet, returning empty data');
      return {
        tasks: [],
        total: 0,
        page,
        page_size: pageSize,
        total_pages: 0
      };
    }
    
    console.error('archiveService.getArchivedTasks error:', error);
    // Return empty data for other errors to prevent UI crashes
    return {
      tasks: [],
      total: 0,
      page,
      page_size: pageSize,
      total_pages: 0
    };
  }
};

// 获取归档统计信息
export const getArchiveStatistics = async (
  projectId: number
): Promise<ArchiveStatistics> => {
  try {
    const response = await api.get(`/projects/${projectId}/archive/stats`);
    
    // 检查响应是否成功 
    if (response.data.success === false) {
      throw new Error(response.data.message || '获取归档统计失败');
    }
    
    return response.data.data;
  } catch (error: any) {
    // Handle 404 errors gracefully for missing backend APIs
    if (error.status === 404 || error.message?.includes('404') || error.code === 'ERR_BAD_REQUEST') {
      console.warn('Archive statistics API not implemented yet, returning default stats');
      return {
        project_id: projectId,
        project_name: '项目',
        active_tasks: 0,
        archived_tasks: 0,
        total_tasks: 0
      };
    }
    
    console.error('archiveService.getArchiveStatistics error:', error);
    // Return default stats for other errors
    return {
      project_id: projectId,
      project_name: '项目',
      active_tasks: 0,
      archived_tasks: 0,
      total_tasks: 0
    };
  }
};