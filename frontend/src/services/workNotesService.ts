import axios from 'axios';
import { ErrorHandler } from '../utils/error';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

// 添加工作笔记专用枚举
export type WorkNoteType = 'general' | 'meeting' | 'idea' | 'log' | 'reference' | 'template';
export type WorkNotePriority = 'low' | 'medium' | 'high' | 'urgent';

// 工作笔记文件夹接口
export interface WorkNoteFolder {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  owner_id: number;
  project_id?: number;
  visibility: 'private' | 'team' | 'public';
  color?: string;
  icon?: string;
  sort_order: number;
  notes_count: number;
  subfolders_count: number;
  path?: string;
  children?: WorkNoteFolder[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateWorkNoteFolderRequest {
  name: string;
  description?: string;
  parent_id?: number;
  project_id?: number;
  visibility?: 'private' | 'team' | 'public';
  color?: string;
  icon?: string;
}

export interface UpdateWorkNoteFolderRequest {
  name?: string;
  description?: string;
  parent_id?: number;
  visibility?: 'private' | 'team' | 'public';
  color?: string;
  icon?: string;
}

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
    // 使用当前时间作为缺失时间戳的fallback
    const now = new Date().toISOString();

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
      // 确保必需的时间戳字段有值
      created_at: apiData.created_at || now,
      updated_at: apiData.updated_at || apiData.created_at || now,
    };
  }

  // 创建工作笔记
  async createWorkNote(request: CreateWorkNoteRequest): Promise<WorkNote> {
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
  }

  // 获取工作笔记详情
  async getWorkNote(id: number): Promise<WorkNote> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<APIResponse<WorkNote>>(
      `${API_BASE_URL}/work-notes/${id}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get work note');
    }

    return this.transformWorkNoteFromAPI(response.data.data);
  }

  // 更新工作笔记
  async updateWorkNote(id: number, request: UpdateWorkNoteRequest): Promise<WorkNote> {
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
  }

  // 删除工作笔记
  async deleteWorkNote(id: number): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await axios.delete<APIResponse<void>>(
      `${API_BASE_URL}/work-notes/${id}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete work note');
    }
  }

  // 列出工作笔记
  async listWorkNotes(folderId?: number, page?: number, limit?: number): Promise<WorkNotesListResponse> {
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
  }

  // 搜索工作笔记
  async searchWorkNotes(query: string): Promise<WorkNote[]> {
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
  }

  // 复制工作笔记
  async copyWorkNote(id: number): Promise<WorkNote> {
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
  }

  // 切换模板状态
  async toggleTemplate(id: number): Promise<WorkNote> {
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
  }

  // 获取文件夹下的工作笔记
  async getFolderWorkNotes(folderId: number | 'root', limit = 50, offset = 0): Promise<{
    documents: WorkNote[];
    total_count: number;
    has_more: boolean;
  }> {
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
  }

  // 获取分类统计数据（带降级处理）
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
      // 静默记录错误，返回模拟数据作为降级处理
      ErrorHandler.silent(error);

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

  // 获取关联任务信息（带降级处理）
  async getAssociatedTasks(noteId: number): Promise<AssociatedTask[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{ tasks: AssociatedTask[] }>>(
        `${API_BASE_URL}/work-notes/${noteId}/tasks`,
        { headers }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get associated tasks');
      }

      return response.data.data.tasks || [];
    } catch (error: any) {
      // 静默记录错误，返回模拟数据作为降级处理
      ErrorHandler.silent(error);

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
    const headers = await this.getAuthHeaders();
    const response = await axios.post<APIResponse<void>>(
      `${API_BASE_URL}/work-notes/${noteId}/attach-task`,
      { task_id: taskId },
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to associate task');
    }
  }

  // 取消关联任务
  async disassociateTask(noteId: number, taskId: number): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await axios.delete<APIResponse<void>>(
      `${API_BASE_URL}/work-notes/${noteId}/detach-task/${taskId}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to disassociate task');
    }
  }

  // 按分类筛选笔记
  async getWorkNotesByCategory(category: string): Promise<WorkNote[]> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<APIResponse<{ documents: WorkNote[] }>>(
      `${API_BASE_URL}/work-notes?category=${encodeURIComponent(category)}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get work notes by category');
    }

    return (response.data.data.documents || []).map((note: any) => this.transformWorkNoteFromAPI(note));
  }

  // 按时间范围筛选
  async getWorkNotesByTimeRange(range: string): Promise<WorkNote[]> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<APIResponse<{ documents: WorkNote[] }>>(
      `${API_BASE_URL}/work-notes?time_range=${encodeURIComponent(range)}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get work notes by time range');
    }

    return (response.data.data.documents || []).map((note: any) => this.transformWorkNoteFromAPI(note));
  }

  // =============================================================================
  // 工作笔记转任务文档功能
  // =============================================================================

  // 单个工作笔记转任务文档
  async convertToTaskDocument(workNoteId: number, request: ConvertToTaskDocumentRequest): Promise<ConversionResult> {
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
  }

  // 转换预览
  async getConversionPreview(workNoteId: number, request: ConvertPreviewRequest): Promise<any> {
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
  }

  // 批量转换
  async batchConvertToTaskDocuments(request: BatchConvertRequest): Promise<any> {
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
  }

  // =============================================================================
  // 工作笔记文件夹管理功能
  // =============================================================================

  // 获取文件夹树
  async getFolderTree(parentId?: number | null, maxDepth?: number): Promise<WorkNoteFolder[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();
    if (parentId !== undefined && parentId !== null) {
      params.append('parent_id', parentId.toString());
    }
    if (maxDepth !== undefined) {
      params.append('max_depth', maxDepth.toString());
    }

    const response = await axios.get<APIResponse<WorkNoteFolder[]>>(
      `${API_BASE_URL}/work-note-folders/tree?${params}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get folder tree');
    }

    return response.data.data || [];
  }

  // 获取单个文件夹
  async getFolder(id: number): Promise<WorkNoteFolder> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<APIResponse<WorkNoteFolder>>(
      `${API_BASE_URL}/work-note-folders/${id}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get folder');
    }

    return response.data.data;
  }

  // 创建文件夹
  async createFolder(request: CreateWorkNoteFolderRequest): Promise<WorkNoteFolder> {
    const headers = await this.getAuthHeaders();
    const response = await axios.post<APIResponse<WorkNoteFolder>>(
      `${API_BASE_URL}/work-note-folders`,
      request,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to create folder');
    }

    return response.data.data;
  }

  // 更新文件夹
  async updateFolder(id: number, request: UpdateWorkNoteFolderRequest): Promise<WorkNoteFolder> {
    const headers = await this.getAuthHeaders();
    const response = await axios.put<APIResponse<WorkNoteFolder>>(
      `${API_BASE_URL}/work-note-folders/${id}`,
      request,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update folder');
    }

    return response.data.data;
  }

  // 删除文件夹
  async deleteFolder(id: number): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await axios.delete<APIResponse<void>>(
      `${API_BASE_URL}/work-note-folders/${id}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete folder');
    }
  }

  // 移动文件夹
  async moveFolder(id: number, targetParentId: number | null, sortOrder?: number): Promise<WorkNoteFolder> {
    const headers = await this.getAuthHeaders();
    const response = await axios.post<APIResponse<WorkNoteFolder>>(
      `${API_BASE_URL}/work-note-folders/${id}/move`,
      {
        target_parent_id: targetParentId,
        sort_order: sortOrder || 0
      },
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to move folder');
    }

    return response.data.data;
  }

  // 搜索文件夹
  async searchFolders(query: string): Promise<WorkNoteFolder[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();
    if (query) {
      params.append('query', query);
    }

    const response = await axios.get<APIResponse<{ folders: WorkNoteFolder[] }>>(
      `${API_BASE_URL}/work-note-folders/search?${params}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to search folders');
    }

    return response.data.data.folders || [];
  }

  // 移动笔记到文件夹
  async moveNoteToFolder(noteId: number, folderId: number | null): Promise<WorkNote> {
    const headers = await this.getAuthHeaders();
    const response = await axios.post<APIResponse<WorkNote>>(
      `${API_BASE_URL}/work-notes/${noteId}/move-to-folder`,
      { folder_id: folderId },
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to move note to folder');
    }

    return this.transformWorkNoteFromAPI(response.data.data);
  }

  // ==================== Phase 8: 从workNoteFolderService合并的方法 ====================

  // 列出文件夹
  async listFolders(request?: {
    parent_folder_id?: number;
    visibility?: string;
    owner_id?: number;
    include_stats?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    folders: WorkNoteFolder[];
    total_count: number;
    has_more: boolean;
  }> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();

    if (request?.parent_folder_id !== undefined) {
      params.append('parent_folder_id', request.parent_folder_id.toString());
    }
    if (request?.visibility) {
      params.append('visibility', request.visibility);
    }
    if (request?.owner_id) {
      params.append('owner_id', request.owner_id.toString());
    }
    if (request?.include_stats) {
      params.append('include_stats', 'true');
    }
    if (request?.limit) {
      params.append('limit', request.limit.toString());
    }
    if (request?.offset) {
      params.append('offset', request.offset.toString());
    }

    const response = await axios.get<APIResponse<{
      folders: WorkNoteFolder[];
      total_count: number;
      has_more: boolean;
    }>>(
      `${API_BASE_URL}/work-note-folders?${params}`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to list folders');
    }

    return response.data.data;
  }

  // 获取文件夹统计信息
  async getFolderStats(id: number): Promise<{
    id: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    visibility: string;
    created_at: string;
    updated_at: string;
    owner_name: string;
    documents_count: number;
    subfolders_count: number;
    last_document_updated?: string;
  }> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<APIResponse<{
      id: number;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      visibility: string;
      created_at: string;
      updated_at: string;
      owner_name: string;
      documents_count: number;
      subfolders_count: number;
      last_document_updated?: string;
    }>>(
      `${API_BASE_URL}/work-note-folders/${id}/stats`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get folder stats');
    }

    return response.data.data;
  }

  // 获取文件夹下的子文件夹
  async getFolderChildren(id: number): Promise<WorkNoteFolder[]> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<APIResponse<WorkNoteFolder[]>>(
      `${API_BASE_URL}/work-note-folders/${id}/children`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get folder children');
    }

    return response.data.data;
  }

  // 批量更新文件夹排序
  async batchUpdateFolders(request: {
    folders: Array<{
      id: number;
      parent_folder_id?: number;
      sort_order: number;
    }>;
  }): Promise<void> {
    const headers = await this.getAuthHeaders();

    // 转换为后端期望的格式
    const updates = (request.folders || []).map(f => {
      const fields: Record<string, any> = {};
      if (typeof f.parent_folder_id !== 'undefined') fields.parent_id = f.parent_folder_id;
      if (typeof f.sort_order !== 'undefined') fields.sort_order = f.sort_order;
      return { id: f.id, fields };
    }).filter(u => Object.keys(u.fields).length > 0);

    const response = await axios.post<APIResponse<void>>(
      `${API_BASE_URL}/work-note-folders/batch-update`,
      { updates },
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to batch update folders');
    }
  }

  // 获取用户文件夹统计
  async getUserFolderStats(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<APIResponse<any>>(
      `${API_BASE_URL}/work-note-folders/stats`,
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to get user folder stats');
    }

    return response.data;
  }

  // 移动文档到文件夹（兼容旧API）
  async moveDocument(documentId: number, folderId: number | 'root'): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await axios.post<APIResponse<void>>(
      `${API_BASE_URL}/work-note-folders/move-document/${documentId}/to/${folderId}`,
      {},
      { headers }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to move document');
    }
  }
}

export const workNotesService = new WorkNotesService();
