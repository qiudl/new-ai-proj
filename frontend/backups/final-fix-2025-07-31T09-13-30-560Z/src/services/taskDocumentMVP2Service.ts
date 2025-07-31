import api from './api';
import { APIResponse } from '../types/task';

// MVP 2.0 任务文档相关类型定义
export interface TaskDocumentVersion {
  id: number;
  version_number: number;
  title: string;
  change_summary: string;
  created_at: string;
  is_major_version: boolean;
  created_by_name?: string;
}

export interface TaskDocumentWithVersions {
  id: number;
  task_id: number;
  project_id: number;
  document_id: number;
  title: string;
  content?: string;
  type: string;
  status: string;
  version: number;
  owner_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  document_exists: boolean;
  versions: TaskDocumentVersion[];
}

export interface DocumentTemplate {
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
}

export interface ProjectDocumentConfig {
  project_id: number;
  auto_create_enabled: boolean;
  template_name: string;
  directory_structure: 'project_task' | 'flat' | 'custom';
  file_naming_pattern: string;
  custom_path_pattern?: string;
}

export interface TaskCreationResponse {
  task: any; // 原有任务对象
  document_created: boolean;
  document_id?: number;
  document_path?: string;
}

export class TaskDocumentMVP2Service {
  /**
   * 手动触发任务文档自动创建
   */
  static async autoCreateTaskDocument(
    projectId: number,
    taskId: number
  ): Promise<{ document_created: boolean; document?: any }> {
    try {
      const response: APIResponse<any> = await api.post(
        `/projects/${projectId}/tasks/${taskId}/document/auto-create`
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to auto-create task document');
      }

      return response.data || { document_created: false };
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.autoCreateTaskDocument error:', error);
      throw error;
    }
  }

  /**
   * 获取任务文档及版本历史
   */
  static async getTaskDocumentWithVersions(
    projectId: number,
    taskId: number
  ): Promise<TaskDocumentWithVersions> {
    try {
      const response: APIResponse<TaskDocumentWithVersions> = await api.get(
        `/projects/${projectId}/tasks/${taskId}/document/versions`
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get task document');
      }

      return response.data!;
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.getTaskDocumentWithVersions error:', error);
      throw error;
    }
  }

  /**
   * 回滚文档到指定版本
   */
  static async rollbackToVersion(
    projectId: number,
    taskId: number,
    versionId: number
  ): Promise<void> {
    try {
      const response: APIResponse<void> = await api.post(
        `/projects/${projectId}/tasks/${taskId}/document/rollback/${versionId}`
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to rollback document');
      }
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.rollbackToVersion error:', error);
      throw error;
    }
  }

  /**
   * 获取任务文档存储路径
   */
  static async getTaskDocumentPath(
    projectId: number,
    taskId: number
  ): Promise<{ document_path: string; directory: string }> {
    try {
      const response: APIResponse<any> = await api.get(
        `/projects/${projectId}/tasks/${taskId}/document/path`
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get document path');
      }

      return response.data!;
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.getTaskDocumentPath error:', error);
      throw error;
    }
  }

  /**
   * 获取项目文档配置
   */
  static async getProjectDocumentConfig(projectId: number): Promise<ProjectDocumentConfig> {
    try {
      const response: APIResponse<ProjectDocumentConfig> = await api.get(
        `/projects/${projectId}/document-config`
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get project document config');
      }

      return response.data!;
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.getProjectDocumentConfig error:', error);
      throw error;
    }
  }

  /**
   * 更新项目文档配置
   */
  static async updateProjectDocumentConfig(
    projectId: number,
    config: Partial<Omit<ProjectDocumentConfig, 'project_id'>>
  ): Promise<void> {
    try {
      const response: APIResponse<void> = await api.put(
        `/projects/${projectId}/document-config`,
        config
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update project document config');
      }
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.updateProjectDocumentConfig error:', error);
      throw error;
    }
  }

  /**
   * 列出可用的文档模板
   */
  static async listDocumentTemplates(): Promise<DocumentTemplate[]> {
    try {
      const response: APIResponse<DocumentTemplate[]> = await api.get('/document-templates');

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to list document templates');
      }

      return response.data!;
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.listDocumentTemplates error:', error);
      throw error;
    }
  }

  /**
   * 创建新的文档模板
   */
  static async createDocumentTemplate(template: {
    name: string;
    display_name: string;
    description: string;
    content: string;
  }): Promise<void> {
    try {
      const response: APIResponse<void> = await api.post('/document-templates', template);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create document template');
      }
    } catch (error: any) {
      console.error('TaskDocumentMVP2Service.createDocumentTemplate error:', error);
      throw error;
    }
  }

  /**
   * 检查任务创建响应中的文档信息
   */
  static extractDocumentInfoFromTaskResponse(response: any): {
    documentCreated: boolean;
    documentId?: number;
    documentPath?: string;
  } {
    if (response.data && typeof response.data === 'object') {
      return {
        documentCreated: response.data.document_created || false,
        documentId: response.data.document_id,
        documentPath: response.data.document_path};
    }

    return { documentCreated: false };
  }
}