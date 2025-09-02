import { BaseClient } from './base-client.js';
import { requiresPermission } from './permission-manager.js';
import { WorkNote, WorkNoteOptions, ApiResponse, SearchOptions } from './types.js';

export class WorkNoteService extends BaseClient {

  // 创建工作笔记
  // @requiresPermission('create_work_note')
  async createWorkNote(
    title: string, 
    content: string, 
    options: WorkNoteOptions = {}
  ): Promise<ApiResponse> {
    try {
      const workNoteData = {
        title: title,
        content: content,
        type: options.type || 'markdown',
        status: options.status || 'draft',
        visibility: options.visibility || 'private',
        tags: options.tags || []
      };

      const response = await this.makeRequest('POST', '/mcp/create-work-note', workNoteData);

      if (response.success) {
        return {
          success: true,
          work_note: response.data,
          title: title,
          content_length: content.length,
          message: `📝 工作笔记 "${title}" 创建成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 列出工作笔记
  async listWorkNotes(options: {
    limit?: number;
    page?: number;
    status?: WorkNote['status'];
    type?: WorkNote['type'];
  } = {}): Promise<ApiResponse> {
    try {
      const params = {
        limit: options.limit || 10,
        page: options.page || 1,
        ...options
      };

      const response = await this.makeRequest('GET', '/mcp/list-work-notes', undefined, params);

      if (response.success) {
        const workNotes = response.data?.work_notes || [];
        return {
          success: true,
          work_notes: workNotes,
          total: response.data?.total || workNotes.length,
          page: params.page,
          limit: params.limit,
          message: `📋 获取到 ${workNotes.length} 个工作笔记`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取工作笔记列表失败: ${error.message || error}`
      };
    }
  }

  // 搜索工作笔记
  async searchWorkNotes(query: string, options: {
    limit?: number;
    tags?: string[];
  } = {}): Promise<ApiResponse> {
    try {
      if (!query.trim()) {
        return { success: false, error: '搜索关键词不能为空' };
      }

      const params = {
        query: query.trim(),
        limit: options.limit || 10,
        tags: options.tags || []
      };

      const response = await this.makeRequest('POST', '/mcp/search-work-notes', params);

      if (response.success) {
        const workNotes = response.data?.work_notes || [];
        return {
          success: true,
          query: query.trim(),
          work_notes: workNotes,
          total: workNotes.length,
          message: `🔍 搜索到 ${workNotes.length} 个匹配的工作笔记`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `搜索工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 获取工作笔记详情
  async getWorkNote(id: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/mcp/get-work-note/${id}`);

      if (response.success) {
        return {
          success: true,
          work_note_id: id,
          work_note: response.data,
          message: `📝 获取工作笔记 "${response.data?.title}" 成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 更新工作笔记
  // @requiresPermission('update_work_note')
  async updateWorkNote(id: number, updates: {
    title?: string;
    content?: string;
    status?: WorkNote['status'];
    type?: WorkNote['type'];
    visibility?: WorkNote['visibility'];
    tags?: string[];
  }): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PUT', `/mcp/update-work-note/${id}`, { updates });

      if (response.success) {
        return {
          success: true,
          work_note_id: id,
          updated_fields: Object.keys(updates),
          work_note: response.data,
          message: `📝 工作笔记 ${id} 更新成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 删除工作笔记
  // @requiresPermission('delete_work_note')
  async deleteWorkNote(id: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('DELETE', `/mcp/delete-work-note/${id}`);

      if (response.success) {
        return {
          success: true,
          work_note_id: id,
          message: `🗑️ 工作笔记 ${id} 已删除`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `删除工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 发布工作笔记
  // @requiresPermission('update_work_note')
  async publishWorkNote(id: number): Promise<ApiResponse> {
    try {
      return await this.updateWorkNote(id, { status: 'published' });
    } catch (error: any) {
      return {
        success: false,
        error: `发布工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 归档工作笔记
  // @requiresPermission('update_work_note')
  async archiveWorkNote(id: number): Promise<ApiResponse> {
    try {
      return await this.updateWorkNote(id, { status: 'archived' });
    } catch (error: any) {
      return {
        success: false,
        error: `归档工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 按标签获取工作笔记
  async getWorkNotesByTags(tags: string[], options: SearchOptions = {}): Promise<ApiResponse> {
    try {
      if (!tags || tags.length === 0) {
        return { success: false, error: '标签列表不能为空' };
      }

      const params = {
        tags: tags,
        limit: options.limit || 10,
        page: options.page || 1
      };

      const response = await this.makeRequest('GET', '/mcp/work-notes-by-tags', undefined, params);

      if (response.success) {
        const workNotes = response.data?.work_notes || [];
        return {
          success: true,
          tags: tags,
          work_notes: workNotes,
          total: response.data?.total || workNotes.length,
          message: `🏷️ 按标签获取到 ${workNotes.length} 个工作笔记`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `按标签获取工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 复制工作笔记
  // @requiresPermission('create_work_note')
  async duplicateWorkNote(id: number, newTitle?: string): Promise<ApiResponse> {
    try {
      // 1. 获取原工作笔记
      const originalResponse = await this.getWorkNote(id);
      if (!originalResponse.success || !originalResponse.work_note) {
        return { success: false, error: `工作笔记 ${id} 不存在` };
      }

      const original = originalResponse.work_note;
      
      // 2. 创建复制版本
      const title = newTitle || `${original.title} (副本)`;
      const copyResponse = await this.createWorkNote(title, original.content, {
        type: original.type,
        status: 'draft', // 副本默认为草稿状态
        visibility: original.visibility,
        tags: [...(original.tags || [])]
      });

      if (copyResponse.success) {
        return {
          success: true,
          original_id: id,
          copied_id: copyResponse.work_note?.id,
          original_title: original.title,
          copied_title: title,
          message: `📋 工作笔记 "${original.title}" 已复制为 "${title}"`
        };
      } else {
        return copyResponse;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `复制工作笔记失败: ${error.message || error}`
      };
    }
  }

  // 批量更新工作笔记标签
  // @requiresPermission('update_work_note')
  async batchUpdateTags(workNoteIds: number[], tags: string[]): Promise<ApiResponse> {
    try {
      if (!workNoteIds || workNoteIds.length === 0) {
        return { success: false, error: '工作笔记ID列表不能为空' };
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const id of workNoteIds) {
        try {
          const result = await this.updateWorkNote(id, { tags });
          results.push({ id, success: result.success, result });
          if (result.success) successCount++;
          else errorCount++;
        } catch (error) {
          results.push({ id, success: false, error: error.message });
          errorCount++;
        }
      }

      return {
        success: errorCount === 0,
        total_processed: workNoteIds.length,
        success_count: successCount,
        error_count: errorCount,
        results: results,
        tags: tags,
        message: `🏷️ 批量更新标签完成: 成功 ${successCount} 个，失败 ${errorCount} 个`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `批量更新标签失败: ${error.message || error}`
      };
    }
  }

  // 获取工作笔记统计信息
  async getWorkNoteStats(): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', '/mcp/work-note-stats');

      if (response.success) {
        return {
          success: true,
          stats: response.data,
          message: `📊 工作笔记统计信息获取成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取工作笔记统计失败: ${error.message || error}`
      };
    }
  }

  // 导出工作笔记
  async exportWorkNote(id: number, format: 'markdown' | 'html' | 'pdf' = 'markdown'): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/mcp/export-work-note/${id}`, undefined, { format });

      if (response.success) {
        return {
          success: true,
          work_note_id: id,
          format: format,
          exported_content: response.data?.content,
          file_name: response.data?.file_name,
          message: `📤 工作笔记 ${id} 已导出为 ${format.toUpperCase()} 格式`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `导出工作笔记失败: ${error.message || error}`
      };
    }
  }
}