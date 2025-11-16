import { BaseClient } from './base-client.js';
import { requiresPermission } from './permission-manager.js';
import { Document, DocumentOptions, ApiResponse, BatchOptions } from './types.js';

export class DocumentService extends BaseClient {

  // 创建或更新任务文档
  // // @requiresPermission('create_document')
  async createOrUpdateTaskDocument(taskId: number, content: string, projectId: number = 1): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('POST', `/projects/${projectId}/tasks/${taskId}/documents`, {
        content: content,
        auto_create: true
      });

      if (response.success) {
        return {
          success: true,
          task_id: taskId,
          project_id: projectId,
          content_length: content.length,
          message: `📄 任务 ${taskId} 的文档已创建/更新 (${content.length} 字符)`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建/更新任务文档失败: ${error.message || error}`
      };
    }
  }

  // 创建并关联任务文档
  // @requiresPermission('create_document')
  async createAndAttachTaskDocument(taskId: number, content: string, projectId: number = 1, title?: string): Promise<ApiResponse> {
    try {
      // 先检查任务是否已有文档
      const checkResult = await this.makeRequest('GET', `/mcp/task-document/${taskId}`);

      if (checkResult.success && checkResult.data) {
        // 任务已有文档，执行更新操作
        console.log(`[MCP] 任务 ${taskId} 已有文档，执行更新操作`);
        const updates: any = { content };
        if (title) {
          updates.title = title;
        }

        const updateResponse = await this.makeRequest('PUT', `/mcp/task-document/${taskId}`, updates);

        if (updateResponse.success) {
          return {
            success: true,
            task_id: taskId,
            project_id: projectId,
            title: title,
            document_id: updateResponse.data?.id,
            content_length: content.length,
            version: updateResponse.data?.version,
            message: `✅ 任务文档已更新 ${taskId}${title ? ` (标题: ${title})` : ''} - 版本: ${updateResponse.data?.version}`
          };
        } else {
          return updateResponse;
        }
      } else {
        // 任务没有文档，执行创建操作
        console.log(`[MCP] 任务 ${taskId} 没有文档，执行创建操作`);
        const payload: any = {
          taskId: taskId,
          content: content
        };

        if (projectId && projectId !== 1) {
          payload.projectId = projectId;
        }

        if (title) {
          payload.title = title;
        }

        const response = await this.makeRequest('POST', '/mcp/create-and-attach', payload);

        if (response.success) {
          return {
            success: true,
            task_id: taskId,
            project_id: projectId,
            title: title,
            document_id: response.data?.document_id,
            content_length: content.length,
            message: `✅ 任务文档已创建并关联到任务 ${taskId}${title ? ` (标题: ${title})` : ''}`
          };
        } else {
          return response;
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建/更新任务文档失败: ${error.message || error}`
      };
    }
  }

  // 创建并关联工作笔记
  // @requiresPermission('create_work_note')
  async createAndAttachWorkNote(taskId: number, content: string, title?: string): Promise<ApiResponse> {
    try {
      const payload: any = {
        taskId: taskId,
        content: content
      };
      
      if (title) {
        payload.title = title;
      }

      const response = await this.makeRequest('POST', '/mcp/create-and-attach-work-note', payload);

      if (response.success) {
        return {
          success: true,
          task_id: taskId,
          title: title,
          work_note_id: response.data?.work_note_id,
          content_length: content.length,
          message: `📝 工作笔记已创建并关联到任务 ${taskId}${title ? ` (标题: ${title})` : ''}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建并关联工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 获取任务文档（使用MCP路由，自动查询projectId）
  async getTaskDocument(taskId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/mcp/task-document/${taskId}`);

      if (response.success) {
        // 确保返回的数据是数组格式
        const documents = Array.isArray(response.data) ? response.data : [response.data];
        return {
          success: true,
          task_id: taskId,
          documents: documents,
          message: `📄 获取任务 ${taskId} 的文档成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取任务文档失败: ${error.message || error}`
      };
    }
  }

  // 检查任务是否有文档（使用MCP路由，自动查询projectId）
  async hasTaskDocument(taskId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/mcp/task-document/${taskId}/exists`);

      if (response.success) {
        return {
          success: true,
          task_id: taskId,
          has_document: response.data?.has_document || response.data || false,
          message: (response.data?.has_document || response.data)
            ? `✅ 任务 ${taskId} 已有关联文档`
            : `📄 任务 ${taskId} 暂无关联文档`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `检查任务文档失败: ${error.message || error}`
      };
    }
  }

  // 删除任务文档（使用MCP路由，自动查询projectId）
  // @requiresPermission('delete_document')
  async deleteTaskDocument(taskId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('DELETE', `/mcp/task-document/${taskId}`);

      if (response.success) {
        return {
          success: true,
          task_id: taskId,
          message: `🗑️ 任务 ${taskId} 的文档已删除`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `删除任务文档失败: ${error.message || error}`
      };
    }
  }

  // 批量创建文档
  // @requiresPermission('create_document')
  async createBatchDocuments(documents: Array<any>): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('POST', '/mcp/create-batch-documents', {
        documents: documents
      });

      if (response.success) {
        return {
          success: true,
          created_count: documents.length,
          documents: response.data,
          message: `📚 批量创建 ${documents.length} 个文档成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `批量创建文档失败: ${error.message || error}`
      };
    }
  }

  // 获取文档内容（通用方法）
  async getDocument(documentId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/documents/${documentId}`);

      if (response.success) {
        return {
          success: true,
          document_id: documentId,
          document: response.data,
          message: `📄 获取文档 ${documentId} 成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取文档失败: ${error.message || error}`
      };
    }
  }

  // 更新文档
  // @requiresPermission('update_document')
  async updateDocument(documentId: number, updates: Partial<Document>): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PUT', `/documents/${documentId}`, updates);

      if (response.success) {
        return {
          success: true,
          document_id: documentId,
          updated_fields: Object.keys(updates),
          document: response.data,
          message: `📝 文档 ${documentId} 更新成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新文档失败: ${error.message || error}`
      };
    }
  }

  /**
   * 通过任务ID更新任务文档（完全更新）
   * @param taskId 任务ID
   * @param updates 更新内容（通常包含content, title等）
   * @returns Promise<ApiResponse>
   */
  async updateTaskDocument(taskId: number, updates: Partial<Document>): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PUT', `/mcp/task-document/${taskId}`, updates);

      if (response.success) {
        return {
          success: true,
          task_id: taskId,
          document_id: response.data?.id,
          version: response.data?.version,
          updated_at: response.data?.updated_at,
          updated_fields: Object.keys(updates),
          message: `✅ 任务 ${taskId} 的文档已更新 (版本: ${response.data?.version})`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新任务文档失败: ${error.message || error}`
      };
    }
  }

  /**
   * 通过任务ID部分更新任务文档
   * @param taskId 任务ID
   * @param updates 部分更新内容（只更新指定字段）
   * @returns Promise<ApiResponse>
   */
  async patchTaskDocument(taskId: number, updates: Partial<Document>): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PATCH', `/mcp/task-document/${taskId}`, updates);

      if (response.success) {
        return {
          success: true,
          task_id: taskId,
          document_id: response.data?.id,
          version: response.data?.version,
          updated_at: response.data?.updated_at,
          fields_updated: Object.keys(updates),
          message: `✅ 任务 ${taskId} 的文档已部分更新 (字段: ${Object.keys(updates).join(', ')}, 版本: ${response.data?.version})`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `部分更新任务文档失败: ${error.message || error}`
      };
    }
  }

  // 删除文档
  // @requiresPermission('delete_document')
  async deleteDocument(documentId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('DELETE', `/documents/${documentId}`);

      if (response.success) {
        return {
          success: true,
          document_id: documentId,
          message: `🗑️ 文档 ${documentId} 已删除`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `删除文档失败: ${error.message || error}`
      };
    }
  }

  // 搜索文档
  async searchDocuments(query: string, options: {
    project_id?: number;
    task_id?: number;
    type?: string;
    status?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse> {
    try {
      const params = {
        q: query,
        limit: options.limit || 10,
        offset: options.offset || 0,
        ...options
      };

      const response = await this.makeRequest('GET', '/documents/search', undefined, params);

      if (response.success) {
        const documents = response.data?.documents || [];
        return {
          success: true,
          query: query,
          documents: documents,
          total: response.data?.total || documents.length,
          options: options,
          message: `🔍 搜索到 ${documents.length} 个文档`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `搜索文档失败: ${error.message || error}`
      };
    }
  }

  // 向文档追加内容（MCP专用接口）
  // @requiresPermission('update_document')
  async appendDocumentContent(taskId: number, documentId: number, content: string, projectId?: number): Promise<ApiResponse> {
    try {
      console.error(`[APPEND_DOCUMENT] Starting append for task ${taskId}, doc ${documentId}`);
      console.error(`[APPEND_DOCUMENT] Current authToken: ${(this as any).authToken ? `${(this as any).authToken.substring(0, 50)}... (${(this as any).authToken.length} chars)` : 'NULL'}`);

      const payload: any = {
        taskId: taskId,
        documentId: documentId,
        content: content
      };

      if (projectId && projectId !== 1) {
        payload.projectId = projectId;
      }

      console.error(`[APPEND_DOCUMENT] Calling makeRequest with payload:`, JSON.stringify(payload, null, 2));
      const response = await this.makeRequest('POST', '/mcp/documents/append', payload);

      if (response.success) {
        const document = response.data?.document || response.data;
        return {
          success: true,
          task_id: taskId,
          document_id: documentId,
          version: document?.version,
          content_length: document?.content_length,
          append_length: content.length,
          message: `✅ 文档内容已追加 - 版本: ${document?.version}, 新增: ${content.length} 字符, 总长度: ${document?.content_length} 字符`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `追加文档内容失败: ${error.message || error}`
      };
    }
  }
}