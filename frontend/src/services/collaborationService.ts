import api from './api';

export interface Comment {
  id: number;
  document_id: number;
  parent_comment_id?: number;
  user_id: number;
  content: string;
  comment_type: 'general' | 'suggestion' | 'approval' | 'question';
  position_info?: string;
  is_resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  resolved_by_name?: string;
}

export interface Collaborator {
  id: number;
  document_id: number;
  user_id: number;
  permission_level: 'read' | 'comment' | 'edit' | 'admin';
  granted_by: number;
  granted_at: string;
  expires_at?: string;
  last_accessed_at?: string;
  user_name?: string;
  granted_by_name?: string;
}

export interface ChangeRecord {
  id: number;
  document_id: number;
  user_id: number;
  change_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  change_summary?: string;
  created_at: string;
  user_name?: string;
}

export interface ActiveCollaborator {
  user_id: number;
  username: string;
  permission_level: string;
  last_active_at: string;
}

export interface CollaborationStats {
  document_id: number;
  collaborator_count: number;
  comment_count: number;
  unresolved_comments: number;
  change_count: number;
}

export interface UserCollaborationDashboard {
  user_id: number;
  collaborated_documents: number;
  comments_made: number;
  comments_resolved: number;
  documents_edited: number;
}

export interface AddCommentRequest {
  content: string;
  comment_type: 'general' | 'suggestion' | 'approval' | 'question';
  position_info?: string;
  parent_comment_id?: number;
}

export interface AddCollaboratorRequest {
  user_id: number;
  permission_level: 'read' | 'comment' | 'edit' | 'admin';
  expires_at?: string;
}

export interface UpdateCollaboratorRequest {
  permission_level?: 'read' | 'comment' | 'edit' | 'admin';
  expires_at?: string;
}

class CollaborationService {
  // 评论管理
  async addComment(projectId: number, taskId: number, request: AddCommentRequest): Promise<Comment> {
    // 对于任务文档，需要先获取文档ID，这里简化处理
    const documentId = `${projectId}-${taskId}`; // 简化的文档ID映射
    const response = await api.post(`/projects/${projectId}/documents/${documentId}/comments`, request);
    return response;
  }

  async getComments(projectId: number, taskId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    comments: Comment[];
    total: number;
    page: number;
    limit: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  }> {
    const documentId = `${projectId}-${taskId}`;
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const url = `/projects/${projectId}/documents/${documentId}/comments${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response;
  }

  async updateComment(commentId: number, content: string): Promise<Comment> {
    const response = await api.put(`/comments/${commentId}`, { content });
    return response;
  }

  async deleteComment(commentId: number): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  }

  async resolveComment(commentId: number): Promise<Comment> {
    const response = await api.patch(`/comments/${commentId}/resolve`);
    return response;
  }

  // 协作者管理
  async addCollaborator(projectId: number, taskId: number, request: AddCollaboratorRequest): Promise<Collaborator> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.post(`/projects/${projectId}/documents/${documentId}/collaborators`, request);
    return response;
  }

  async getCollaborators(projectId: number, taskId: number): Promise<{
    collaborators: Collaborator[];
    total: number;
  }> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.get(`/projects/${projectId}/documents/${documentId}/collaborators`);
    return response;
  }

  async updateCollaborator(
    projectId: number, 
    taskId: number, 
    userId: number, 
    request: UpdateCollaboratorRequest
  ): Promise<Collaborator> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.put(`/projects/${projectId}/documents/${documentId}/collaborators/${userId}`, request);
    return response;
  }

  async removeCollaborator(projectId: number, taskId: number, userId: number): Promise<void> {
    const documentId = `${projectId}-${taskId}`;
    await api.delete(`/projects/${projectId}/documents/${documentId}/collaborators/${userId}`);
  }

  // 变更历史
  async getChangeHistory(projectId: number, taskId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    changes: ChangeRecord[];
    total: number;
    page: number;
    limit: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  }> {
    const documentId = `${projectId}-${taskId}`;
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const url = `/projects/${projectId}/documents/${documentId}/history${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response;
  }

  // 实时协作
  async startCollaborationSession(projectId: number, taskId: number): Promise<{
    document_id: number;
    user_id: number;
    started_at: string;
    is_active: boolean;
  }> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.post(`/projects/${projectId}/documents/${documentId}/collaboration/start`);
    return response;
  }

  async getActiveCollaborators(projectId: number, taskId: number): Promise<{
    active_collaborators: ActiveCollaborator[];
    count: number;
    timestamp: string;
  }> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.get(`/projects/${projectId}/documents/${documentId}/collaboration/active`);
    return response;
  }

  // 统计信息
  async getStats(projectId: number, taskId: number): Promise<CollaborationStats> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.get(`/projects/${projectId}/documents/${documentId}/collaboration/stats`);
    return response;
  }

  async getUserDashboard(): Promise<UserCollaborationDashboard> {
    const response = await api.get('/collaboration/dashboard');
    return response;
  }

  // 通知和消息
  async getNotifications(): Promise<Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    document_id?: number;
    comment_id?: number;
    created_at: string;
    is_read: boolean;
  }>> {
    const response = await api.get('/collaboration/notifications');
    return response.data.notifications || [];
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await api.patch(`/collaboration/notifications/${notificationId}/read`);
  }

  // 权限检查
  async checkPermission(projectId: number, taskId: number, action: string): Promise<{
    allowed: boolean;
    permission_level?: string;
  }> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.get(`/projects/${projectId}/documents/${documentId}/permissions/check?action=${action}`);
    return response;
  }

  // 批量操作
  async bulkResolveComments(commentIds: number[]): Promise<{ resolved_count: number }> {
    const response = await api.post('/comments/bulk-resolve', { comment_ids: commentIds });
    return response;
  }

  async bulkUpdateCollaborators(
    projectId: number, 
    taskId: number, 
    updates: Array<{
      user_id: number;
      permission_level: string;
    }>
  ): Promise<{ updated_count: number }> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.post(`/projects/${projectId}/documents/${documentId}/collaborators/bulk-update`, {
      updates
    });
    return response;
  }

  // 搜索和过滤
  async searchComments(projectId: number, taskId: number, params: {
    query: string;
    comment_type?: string;
    is_resolved?: boolean;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    comments: Comment[];
    total: number;
  }> {
    const documentId = `${projectId}-${taskId}`;
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/projects/${projectId}/documents/${documentId}/comments/search?${queryParams.toString()}`);
    return response;
  }

  // 导出功能
  async exportComments(projectId: number, taskId: number, format: 'json' | 'csv' | 'pdf'): Promise<Blob> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.get(`/projects/${projectId}/documents/${documentId}/comments/export?format=${format}`, {
      responseType: 'blob'
    });
    return response;
  }

  async exportChangeHistory(projectId: number, taskId: number, format: 'json' | 'csv' | 'pdf'): Promise<Blob> {
    const documentId = `${projectId}-${taskId}`;
    const response = await api.get(`/projects/${projectId}/documents/${documentId}/history/export?format=${format}`, {
      responseType: 'blob'
    });
    return response;
  }
}

export const collaborationService = new CollaborationService();