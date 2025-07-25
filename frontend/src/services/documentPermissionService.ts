import {
  DocumentPermission,
  DocumentShare,
  DocumentComment,
  UserDocumentPermission,
  GrantDocumentPermissionRequest,
  UpdateDocumentPermissionRequest,
  CreateDocumentShareRequest,
  UpdateDocumentShareRequest,
  AddDocumentCommentRequest,
  UpdateDocumentCommentRequest,
  DocumentPermissionResponse,
  DocumentShareResponse,
  DocumentCommentsResponse,
  UserOption
} from '../types/permission';

class DocumentPermissionService {
  private baseURL = '/api/v1';

  // Permission Management
  async grantPermission(request: GrantDocumentPermissionRequest): Promise<DocumentPermission> {
    const response = await fetch(`${this.baseURL}/document-permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to grant permission: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocumentPermissions(documentId: number): Promise<DocumentPermissionResponse> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/permissions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get document permissions: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserPermissions(): Promise<DocumentPermissionResponse> {
    const response = await fetch(`${this.baseURL}/my-permissions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user permissions: ${response.statusText}`);
    }

    return response.json();
  }

  async checkUserPermission(documentId: number, permissionType: string): Promise<boolean> {
    const response = await fetch(
      `${this.baseURL}/documents/${documentId}/check-permission?permission_type=${permissionType}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to check permission: ${response.statusText}`);
    }

    const result = await response.json();
    return result.has_permission;
  }

  async updatePermission(
    permissionId: number, 
    request: UpdateDocumentPermissionRequest
  ): Promise<DocumentPermission> {
    const response = await fetch(`${this.baseURL}/document-permissions/${permissionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to update permission: ${response.statusText}`);
    }

    return response.json();
  }

  async revokePermission(permissionId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/document-permissions/${permissionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke permission: ${response.statusText}`);
    }
  }

  // Share Management
  async createShare(request: CreateDocumentShareRequest): Promise<DocumentShare> {
    const response = await fetch(`${this.baseURL}/document-shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to create share: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocumentShares(documentId: number): Promise<DocumentShareResponse> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/shares`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get document shares: ${response.statusText}`);
    }

    return response.json();
  }

  async getShareByToken(token: string): Promise<DocumentShare> {
    const response = await fetch(`${this.baseURL}/shares/${token}`);

    if (!response.ok) {
      throw new Error(`Failed to get share: ${response.statusText}`);
    }

    return response.json();
  }

  async updateShare(shareId: number, request: UpdateDocumentShareRequest): Promise<DocumentShare> {
    const response = await fetch(`${this.baseURL}/document-shares/${shareId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to update share: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteShare(shareId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/document-shares/${shareId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete share: ${response.statusText}`);
    }
  }

  // Comment Management
  async addComment(request: AddDocumentCommentRequest): Promise<DocumentComment> {
    const response = await fetch(`${this.baseURL}/document-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocumentComments(documentId: number): Promise<DocumentCommentsResponse> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/comments`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get document comments: ${response.statusText}`);
    }

    return response.json();
  }

  async updateComment(
    commentId: number, 
    request: UpdateDocumentCommentRequest
  ): Promise<DocumentComment> {
    const response = await fetch(`${this.baseURL}/document-comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to update comment: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteComment(commentId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/document-comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`);
    }
  }

  // User Search for Permission Management
  async searchUsers(query: string): Promise<UserOption[]> {
    const response = await fetch(`${this.baseURL}/users/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search users: ${response.statusText}`);
    }

    const result = await response.json();
    return result.users || [];
  }

  // Utility functions for mock data (remove when API is ready)
  private getMockPermissions(): DocumentPermission[] {
    return [
      {
        id: 1,
        document_id: 1,
        user_id: 2,
        permission_type: 'write',
        granted_by: 1,
        granted_at: '2024-01-01T00:00:00Z',
        is_active: true,
        document_title: 'API设计规范',
        username: 'dev_user_1',
        user_email: 'dev1@example.com',
        grantor_name: 'admin'
      },
      {
        id: 2,
        document_id: 1,
        user_id: 3,
        permission_type: 'read',
        granted_by: 1,
        granted_at: '2024-01-02T00:00:00Z',
        is_active: true,
        document_title: 'API设计规范',
        username: 'dev_user_2',
        user_email: 'dev2@example.com',
        grantor_name: 'admin'
      }
    ];
  }

  private getMockShares(): DocumentShare[] {
    return [
      {
        id: 1,
        document_id: 1,
        share_token: 'share_token_123',
        share_type: 'link',
        permission_type: 'read',
        created_by: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_active: true,
        access_count: 15,
        require_auth: false,
        allow_download: true,
        document_title: 'API设计规范',
        creator_name: 'admin'
      }
    ];
  }

  private getMockComments(): DocumentComment[] {
    return [
      {
        id: 1,
        document_id: 1,
        user_id: 2,
        content: '这个API设计很不错，结构清晰易懂。',
        is_resolved: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        username: 'dev_user_1',
        user_avatar: '',
        reply_count: 1
      },
      {
        id: 2,
        document_id: 1,
        user_id: 3,
        parent_id: 1,
        content: '同意，这个设计确实很好。建议可以添加更多的错误处理示例。',
        is_resolved: false,
        created_at: '2024-01-01T00:30:00Z',
        updated_at: '2024-01-01T00:30:00Z',
        username: 'dev_user_2',
        user_avatar: ''
      }
    ];
  }

  private getMockUsers(): UserOption[] {
    return [
      { id: 1, username: 'admin', email: 'admin@example.com' },
      { id: 2, username: 'dev_user_1', email: 'dev1@example.com' },
      { id: 3, username: 'dev_user_2', email: 'dev2@example.com' },
      { id: 4, username: 'designer', email: 'designer@example.com' },
      { id: 5, username: 'tester', email: 'tester@example.com' }
    ];
  }

  // Mock API methods (use these until real API is implemented)
  async getMockDocumentPermissions(documentId: number): Promise<DocumentPermissionResponse> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    const permissions = this.getMockPermissions().filter(p => p.document_id === documentId);
    return {
      permissions,
      total_count: permissions.length
    };
  }

  async getMockDocumentShares(documentId: number): Promise<DocumentShareResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const shares = this.getMockShares().filter(s => s.document_id === documentId);
    return {
      shares,
      total_count: shares.length
    };
  }

  async getMockDocumentComments(documentId: number): Promise<DocumentCommentsResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const comments = this.getMockComments().filter(c => c.document_id === documentId);
    return {
      comments,
      total_count: comments.length
    };
  }

  async searchMockUsers(query?: string): Promise<UserOption[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const users = this.getMockUsers();
    if (query) {
      return users.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
    }
    return users;
  }

  async getMockUserPermission(documentId: number): Promise<UserDocumentPermission> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock current user as document owner
    return {
      can_read: true,
      can_write: true,
      can_admin: true,
      can_comment: true,
      can_share: true,
      is_owner: true
    };
  }
}

export default new DocumentPermissionService();