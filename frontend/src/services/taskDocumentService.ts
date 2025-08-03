import api from './api';

interface TaskDocumentResponse {
  content: string;
}

interface AdvancedTaskDocumentResponse {
  id: number;
  task_id: number;
  project_id: number;
  document_id: number;
  title: string;
  content: string;
  type: string;
  status: string;
  version: number;
  metadata: Record<string, any>;
  owner_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  task_title: string;
  project_name: string;
  owner_name: string;
  creator_name: string;
  document_exists: boolean;
  can_edit: boolean;
  can_delete: boolean;
  relations: unknown[];
  last_modified?: string;
}

interface DocumentRequest {
  content: string;
}

export const taskDocumentService = {
  // 获取任务文档内容
  async get(projectId: number, taskId: number): Promise<TaskDocumentResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
      return response.data;
    } catch (error) {
      console.error('获取任务文档失败:', error);
      throw error;
    }
  },

  // 获取增强版任务文档
  async getAdvanced(projectId: number, taskId: number): Promise<AdvancedTaskDocumentResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/advanced`);
      return response.data;
    } catch (error) {
      console.error('获取增强版任务文档失败:', error);
      throw error;
    }
  },

  // 保存任务文档内容
  async save(projectId: number, taskId: number, content: string): Promise<TaskDocumentResponse> {
    try {
      const requestData: DocumentRequest = { content };
      const response = await api.put(`/projects/${projectId}/tasks/${taskId}/document`, requestData);
      return response.data;
    } catch (error) {
      console.error('保存任务文档失败:', error);
      throw error;
    }
  },

  // 更新增强版任务文档
  async updateAdvanced(projectId: number, taskId: number, data: Partial<{ content: string }>): Promise<AdvancedTaskDocumentResponse> {
    try {
      const response = await api.patch(`/projects/${projectId}/tasks/${taskId}/document/advanced`, data);
      return response.data;
    } catch (error) {
      console.error('更新增强版任务文档失败:', error);
      throw error;
    }
  },

  // 删除任务文档
  async delete(projectId: number, taskId: number): Promise<void> {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}/document`);
    } catch (error) {
      console.error('删除任务文档失败:', error);
      throw error;
    }
  }
};

export default taskDocumentService;