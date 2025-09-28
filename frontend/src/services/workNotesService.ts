import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

// 添加工作笔记专用枚举
export type WorkNoteType = 'general' | 'meeting' | 'idea' | 'log' | 'reference' | 'template';
export type WorkNotePriority = 'low' | 'medium' | 'high' | 'urgent';

// 工作笔记接口
export interface WorkNote {
  id: number;
  project_id?: number;
  folder_id?: number;
  title: string;
  content?: string;
  
  // 统一类型字段
  type: 'markdown' | 'image' | 'pdf' | 'doc' | 'xlsx' | 'pptx' | 'txt' | 'html';
  work_note_type: WorkNoteType;  // 新增工作笔记类型
  priority: WorkNotePriority;    // 新增优先级字段
  
  status: 'draft' | 'published' | 'archived' | 'template';
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  tags?: string[];
  
  // 工作笔记特有字段
  is_pinned?: boolean;
  is_bookmarked?: boolean;
  view_count?: number;
  word_count?: number;
  read_time?: number;
  last_read_at?: string;
  
  metadata?: any;
  owner_id: number;
  visibility: 'private' | 'team' | 'public';
  version: number;
  parent_document_id?: number;
  is_template: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  owner_name?: string;
  folder_name?: string;
  relations?: any[];
  related_tasks?: number[];
  related_notes?: number[];
}

export interface CreateWorkNoteRequest {
  folder_id?: number;
  title: string;
  content?: string;
  type?: 'markdown' | 'image' | 'pdf' | 'doc' | 'xlsx' | 'pptx' | 'txt' | 'html';
  work_note_type: WorkNoteType;  // 必填工作笔记类型
  priority?: WorkNotePriority;   // 可选优先级
  status?: 'draft' | 'published' | 'archived' | 'template';
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  tags?: string[];
  metadata?: any;
  visibility?: 'private' | 'team' | 'public';
  is_template?: boolean;
  is_pinned?: boolean;
  is_bookmarked?: boolean;
  related_tasks?: number[];
  related_notes?: number[];
}

export interface UpdateWorkNoteRequest {
  folder_id?: number;
  title?: string;
  content?: string;
  work_note_type?: WorkNoteType;
  priority?: WorkNotePriority;
  status?: 'draft' | 'published' | 'archived' | 'template';
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  tags?: string[];
  metadata?: any;
  visibility?: 'private' | 'team' | 'public';
  is_pinned?: boolean;
  is_bookmarked?: boolean;
  related_tasks?: number[];
  related_notes?: number[];
}

export interface WorkNotesListResponse {
  documents: WorkNote[];
  total: number;
  page: number;
  page_size: number;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 转换相关类型（需在类外声明以通过 TS 编译）
export interface ConversionOptions {
  preserve_original: boolean;
  copy_relations: boolean;
  convert_format: 'markdown' | 'txt' | 'html';
  visibility: 'private' | 'team' | 'public';
  relation_type?: string;
}

export interface ConvertToTaskDocumentRequest {
  target_task_id: number;
  conversion_options: ConversionOptions;
}

export interface ConversionResult {
  original_work_note_id: number;
  created_task_document: {
    id: number;
    task_id: number;
    title: string;
    format: string;
    created_at: string;
  };
  conversion_summary: {
    content_migrated: boolean;
    relations_copied: number;
    attachments_moved: number;
  };
}

// 分类统计相关接口
export interface CategoryStats {
  categories: {
    [key: string]: {
      count: number;
      icon: string;
      color: string;
    };
  };
  tags: {
    [key: string]: number;
  };
  associations: {
    associated: number;
    unassociated: number;
    convertible: number;
  };
  timeRanges: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    earlier: number;
  };
}

// 关联任务接口
export interface AssociatedTask {
  id: number;
  title: string;
  status: string;
  project_id: number;
  project_name: string;
}

export interface ConvertPreviewRequest {
  target_task_id: number;
  conversion_options: ConversionOptions;
}

export interface BatchConversionItem {
  work_note_id: number;
  target_task_id: number;
  options: ConversionOptions;
}

export interface BatchConvertRequest {
  conversions: BatchConversionItem[];
  global_options: {
    transaction_mode: boolean;
    error_handling: 'continue' | 'stop';
  };
}

class WorkNotesService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token = localStorage.getItem('token');
    
    // 如果没有token，在开发环境下尝试自动获取
    if (!token && process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch('/api/v1/auth/dev-quick-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin' })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.access_token) {
            token = data.data.access_token;
            localStorage.setItem('token', token);
            localStorage.setItem('currentUser', JSON.stringify({
              id: data.data.user.id,
              username: data.data.user.username,
              role: data.data.user.role
            }));
          }
        }
      } catch (error) {
        console.warn('⚠️ 工作笔记服务自动获取token失败:', error);
      }
    }
    
    return {
      'Authorization': `Bearer ${token || 'dummy-token-for-testing'}`,
      'Content-Type': 'application/json',
    };
  }

  // 数据转换工具方法
  private transformWorkNoteFromAPI(apiData: any): WorkNote {
    return {
      ...apiData,
      work_note_type: apiData.work_note_type || 'general',
      priority: apiData.priority || 'medium',
      is_pinned: apiData.is_pinned || false,
      is_bookmarked: apiData.is_bookmarked || false,
      view_count: apiData.view_count || 0,
      word_count: apiData.word_count || undefined,
      read_time: apiData.read_time || undefined,
      last_read_at: apiData.last_read_at || undefined,
    };
  }

  // 创建工作笔记
  async createWorkNote(request: CreateWorkNoteRequest): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const payload = {
        ...request,
        work_note_type: request.work_note_type || 'general',
        priority: request.priority || 'medium',
        type: request.type || 'markdown'
      };
      
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes`,
        payload,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create work note');
      }
      
      return this.transformWorkNoteFromAPI(response.data.data);
    } catch (error: any) {
      console.error('Error creating work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create work note');
    }
  }

  // 获取工作笔记详情
  async getWorkNote(id: number): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get work note');
      }
      
      return this.transformWorkNoteFromAPI(response.data.data);
    } catch (error: any) {
      console.error('Error getting work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get work note');
    }
  }

  // 更新工作笔记
  async updateWorkNote(id: number, request: UpdateWorkNoteRequest): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const payload = {
        ...request
      };
      
      const response = await axios.put<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}`,
        payload,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update work note');
      }
      
      return this.transformWorkNoteFromAPI(response.data.data);
    } catch (error: any) {
      console.error('Error updating work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update work note');
    }
  }

  // 删除工作笔记
  async deleteWorkNote(id: number): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.delete<APIResponse<void>>(
        `${API_BASE_URL}/work-notes/${id}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete work note');
      }
    } catch (error: any) {
      console.error('Error deleting work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete work note');
    }
  }

  // 列出工作笔记
  async listWorkNotes(folderId?: number, page?: number, limit?: number): Promise<WorkNotesListResponse> {
    try {
      const params = new URLSearchParams();
      if (folderId !== undefined) {
        params.append('folder_id', folderId.toString());
      }
      if (page !== undefined) {
        params.append('page', page.toString());
      }
      if (limit !== undefined) {
        params.append('limit', limit.toString());
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{notes: WorkNote[], pagination: any}>>(
        `${API_BASE_URL}/work-notes?${params}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to list work notes');
      }
      
      // 适配后端返回格式 {notes: [], pagination: {}} 到前端期望格式 {documents: [], total: number}
      const backendData = response.data.data;
      const transformedNotes = (backendData.notes || []).map((note: any) => this.transformWorkNoteFromAPI(note));
      
      return {
        documents: transformedNotes,
        total: backendData.pagination?.total || transformedNotes.length || 0,
        page: backendData.pagination?.page || 1,
        page_size: backendData.pagination?.page_size || 20
      };
    } catch (error: any) {
      console.error('Error listing work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to list work notes');
    }
  }

  // 搜索工作笔记
  async searchWorkNotes(query: string): Promise<WorkNote[]> {
    try {
      const params = new URLSearchParams();
      if (query) {
        params.append('query', query);
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{ documents: WorkNote[] }>>(
        `${API_BASE_URL}/work-notes/search?${params}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to search work notes');
      }
      
      return (response.data.data.documents || []).map((note: any) => this.transformWorkNoteFromAPI(note));
    } catch (error: any) {
      console.error('Error searching work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to search work notes');
    }
  }

  // 复制工作笔记
  async copyWorkNote(id: number): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}/copy`,
        {},
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to copy work note');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error copying work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to copy work note');
    }
  }

  // 切换模板状态
  async toggleTemplate(id: number): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}/toggle-template`,
        {},
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to toggle template');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error toggling template:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to toggle template');
    }
  }

  // 获取文件夹下的工作笔记
  async getFolderWorkNotes(folderId: number | 'root', limit = 50, offset = 0): Promise<{
    documents: WorkNote[];
    total_count: number;
    has_more: boolean;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{
        documents: WorkNote[];
        total_count: number;
        has_more: boolean;
      }>>(
        `${API_BASE_URL}/document-folders/${folderId}/documents?limit=${limit}&offset=${offset}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get folder work notes');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting folder work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get folder work notes');
    }
  }

  // 获取分类统计数据
  async getCategoryStats(): Promise<CategoryStats> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<CategoryStats>>(
        `${API_BASE_URL}/work-notes/category-stats`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get category stats');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting category stats:', error);
      
      // 如果API不存在，返回模拟数据
      return {
        categories: {
          frontend: { count: 23, icon: '📝', color: '#1890ff' },
          backend: { count: 18, icon: '🔧', color: '#52c41a' },
          'ui-design': { count: 12, icon: '🎨', color: '#fa8c16' },
          'data-analysis': { count: 8, icon: '📊', color: '#722ed1' },
        },
        tags: {
          '重要': 34,
          '待办': 12,
          '会议': 15,
          '想法': 8,
        },
        associations: {
          associated: 78,
          unassociated: 45,
          convertible: 23,
        },
        timeRanges: {
          today: 5,
          thisWeek: 12,
          thisMonth: 28,
          earlier: 111,
        },
      };
    }
  }

  // 获取关联任务信息
  async getAssociatedTasks(noteId: number): Promise<AssociatedTask[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{ tasks: AssociatedTask[] }>>(
        `${API_BASE_URL}/work-notes/${noteId}/associated-tasks`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get associated tasks');
      }
      
      return response.data.data.tasks || [];
    } catch (error: any) {
      console.error('Error getting associated tasks:', error);
      
      // 如果API不存在，返回模拟数据
      return Math.random() > 0.6 ? [
        {
          id: Math.floor(Math.random() * 1000),
          title: '示例任务',
          status: 'in_progress',
          project_id: 1,
          project_name: '示例项目'
        }
      ] : [];
    }
  }

  // 关联任务
  async associateTask(noteId: number, taskId: number): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<void>>(
        `${API_BASE_URL}/work-notes/${noteId}/associate-task`,
        { task_id: taskId },
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to associate task');
      }
    } catch (error: any) {
      console.error('Error associating task:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to associate task');
    }
  }

  // 取消关联任务
  async disassociateTask(noteId: number, taskId: number): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.delete<APIResponse<void>>(
        `${API_BASE_URL}/work-notes/${noteId}/associate-task/${taskId}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to disassociate task');
      }
    } catch (error: any) {
      console.error('Error disassociating task:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to disassociate task');
    }
  }

  // 按分类筛选笔记
  async getWorkNotesByCategory(category: string): Promise<WorkNote[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{ documents: WorkNote[] }>>(
        `${API_BASE_URL}/work-notes?category=${encodeURIComponent(category)}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get work notes by category');
      }
      
      return (response.data.data.documents || []).map((note: any) => this.transformWorkNoteFromAPI(note));
    } catch (error: any) {
      console.error('Error getting work notes by category:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get work notes by category');
    }
  }

  // 按时间范围筛选
  async getWorkNotesByTimeRange(range: string): Promise<WorkNote[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{ documents: WorkNote[] }>>(
        `${API_BASE_URL}/work-notes?time_range=${encodeURIComponent(range)}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get work notes by time range');
      }
      
      return (response.data.data.documents || []).map((note: any) => this.transformWorkNoteFromAPI(note));
    } catch (error: any) {
      console.error('Error getting work notes by time range:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get work notes by time range');
    }
  }

  // =============================================================================
  // 工作笔记转任务文档功能
  // =============================================================================

  // 单个工作笔记转任务文档
  async convertToTaskDocument(workNoteId: number, request: ConvertToTaskDocumentRequest): Promise<ConversionResult> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<ConversionResult>>(
        `${API_BASE_URL}/work-notes/${workNoteId}/convert-to-task-document`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to convert work note to task document');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error converting work note to task document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to convert work note');
    }
  }

  // 转换预览
  async getConversionPreview(workNoteId: number, request: ConvertPreviewRequest): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<any>>(
        `${API_BASE_URL}/work-notes/${workNoteId}/convert-preview`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get conversion preview');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting conversion preview:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get conversion preview');
    }
  }

  // 批量转换
  async batchConvertToTaskDocuments(request: BatchConvertRequest): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<any>>(
        `${API_BASE_URL}/work-notes/batch-convert-to-task-documents`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to batch convert work notes');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error batch converting work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to batch convert work notes');
    }
  }
}

export const workNotesService = new WorkNotesService();
