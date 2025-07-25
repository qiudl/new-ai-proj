import {
  DocumentVersion,
  DocumentVersionComparison,
  DocumentVersionBranch,
  DocumentVersionLabel,
  DocumentVersionComment,
  DocumentVersionStats,
  CreateDocumentVersionRequest,
  UpdateDocumentVersionRequest,
  RestoreDocumentVersionRequest,
  CompareVersionsRequest,
  CreateVersionLabelRequest,
  CreateVersionCommentRequest,
  CreateVersionBranchRequest,
  DocumentVersionResponse,
  DocumentVersionHistoryResponse,
  VersionComparisonResponse
} from '../types/version';

class DocumentVersionService {
  private baseURL = '/api/v1';

  // Version Management

  async createVersion(request: CreateDocumentVersionRequest): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseURL}/document-versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to create version: ${response.statusText}`);
    }

    return response.json();
  }

  async getVersion(versionId: number): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseURL}/document-versions/${versionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get version: ${response.statusText}`);
    }

    return response.json();
  }

  async getVersionByNumber(documentId: number, versionNumber: number): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/versions/${versionNumber}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get version: ${response.statusText}`);
    }

    return response.json();
  }

  async getVersionHistory(
    documentId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<DocumentVersionResponse> {
    const response = await fetch(
      `${this.baseURL}/documents/${documentId}/versions?page=${page}&page_size=${pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get version history: ${response.statusText}`);
    }

    return response.json();
  }

  async getFullVersionHistory(documentId: number): Promise<DocumentVersionHistoryResponse> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/version-history`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get full version history: ${response.statusText}`);
    }

    return response.json();
  }

  async updateVersion(
    versionId: number,
    request: UpdateDocumentVersionRequest
  ): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseURL}/document-versions/${versionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to update version: ${response.statusText}`);
    }

    return response.json();
  }

  async restoreVersion(
    documentId: number,
    request: RestoreDocumentVersionRequest
  ): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to restore version: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteVersion(versionId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/document-versions/${versionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete version: ${response.statusText}`);
    }
  }

  // Version Comparison

  async compareVersions(request: CompareVersionsRequest): Promise<VersionComparisonResponse> {
    const response = await fetch(`${this.baseURL}/document-versions/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to compare versions: ${response.statusText}`);
    }

    return response.json();
  }

  // Version Labels

  async createLabel(request: CreateVersionLabelRequest): Promise<DocumentVersionLabel> {
    const response = await fetch(`${this.baseURL}/document-version-labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to create label: ${response.statusText}`);
    }

    return response.json();
  }

  async getVersionLabels(documentId: number, versionNumber: number): Promise<DocumentVersionLabel[]> {
    const response = await fetch(
      `${this.baseURL}/documents/${documentId}/versions/${versionNumber}/labels`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get version labels: ${response.statusText}`);
    }

    const result = await response.json();
    return result.labels || [];
  }

  async deleteLabel(labelId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/document-version-labels/${labelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete label: ${response.statusText}`);
    }
  }

  // Version Comments

  async createComment(request: CreateVersionCommentRequest): Promise<DocumentVersionComment> {
    const response = await fetch(`${this.baseURL}/document-version-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to create comment: ${response.statusText}`);
    }

    return response.json();
  }

  async getVersionComments(documentId: number, versionNumber: number): Promise<DocumentVersionComment[]> {
    const response = await fetch(
      `${this.baseURL}/documents/${documentId}/versions/${versionNumber}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get version comments: ${response.statusText}`);
    }

    const result = await response.json();
    return result.comments || [];
  }

  async updateComment(commentId: number, content: string): Promise<DocumentVersionComment> {
    const response = await fetch(`${this.baseURL}/document-version-comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      throw new Error(`Failed to update comment: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteComment(commentId: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/document-version-comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`);
    }
  }

  // Version Branches

  async createBranch(request: CreateVersionBranchRequest): Promise<DocumentVersionBranch> {
    const response = await fetch(`${this.baseURL}/document-version-branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to create branch: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocumentBranches(documentId: number): Promise<DocumentVersionBranch[]> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/branches`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get document branches: ${response.statusText}`);
    }

    const result = await response.json();
    return result.branches || [];
  }

  // Statistics

  async getVersionStats(documentId: number): Promise<DocumentVersionStats> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/version-stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get version stats: ${response.statusText}`);
    }

    return response.json();
  }

  // Mock Data Methods (for development)

  private getMockVersions(documentId: number): DocumentVersion[] {
    return [
      {
        id: 1,
        document_id: documentId,
        version_number: 3,
        title: 'API接口设计文档 v3.0',
        content: '# API接口设计 v3.0\n\n## 新增功能\n- 支持GraphQL\n- 改进认证机制\n- 新增缓存策略',
        file_size: 15420,
        change_summary: '重大功能更新，添加GraphQL支持',
        created_by: 1,
        created_at: '2024-01-20T14:30:00Z',
        is_major_version: true,
        tags: ['API', 'GraphQL', 'v3.0'],
        metadata: { build_number: '3.0.0', release_notes: 'Major update' },
        document_title: 'API接口设计文档',
        created_by_name: 'Admin',
        created_by_email: 'admin@example.com',
        label_count: 2,
        comment_count: 5
      },
      {
        id: 2,
        document_id: documentId,
        version_number: 2,
        title: 'API接口设计文档 v2.1',
        content: '# API接口设计 v2.1\n\n## 修复\n- 修复分页bug\n- 优化响应时间',
        file_size: 12800,
        change_summary: '修复分页问题和性能优化',
        created_by: 2,
        created_at: '2024-01-15T10:15:00Z',
        is_major_version: false,
        tags: ['API', 'bugfix', '性能优化'],
        metadata: { build_number: '2.1.0' },
        document_title: 'API接口设计文档',
        created_by_name: '张三',
        created_by_email: 'zhangsan@example.com',
        label_count: 1,
        comment_count: 3
      },
      {
        id: 3,
        document_id: documentId,
        version_number: 1,
        title: 'API接口设计文档 v1.0',
        content: '# API接口设计 v1.0\n\n初始版本的API设计文档',
        file_size: 8960,
        change_summary: '初始版本',
        created_by: 1,
        created_at: '2024-01-01T09:00:00Z',
        is_major_version: true,
        tags: ['API', 'initial'],
        metadata: { build_number: '1.0.0' },
        document_title: 'API接口设计文档',
        created_by_name: 'Admin',
        created_by_email: 'admin@example.com',
        label_count: 1,
        comment_count: 2
      }
    ];
  }

  private getMockLabels(): DocumentVersionLabel[] {
    return [
      {
        id: 1,
        document_id: 1,
        version_number: 3,
        label: 'release',
        color: '#52c41a',
        description: '正式发布版本',
        created_by: 1,
        created_at: '2024-01-20T14:35:00Z',
        created_by_name: 'Admin'
      },
      {
        id: 2,
        document_id: 1,
        version_number: 3,
        label: 'stable',
        color: '#1890ff',
        description: '稳定版本',
        created_by: 1,
        created_at: '2024-01-20T14:36:00Z',
        created_by_name: 'Admin'
      }
    ];
  }

  private getMockComments(): DocumentVersionComment[] {
    return [
      {
        id: 1,
        document_id: 1,
        version_number: 3,
        user_id: 2,
        content: '这个版本的GraphQL集成做得很好！',
        created_at: '2024-01-20T15:30:00Z',
        updated_at: '2024-01-20T15:30:00Z',
        is_resolved: false,
        username: '张三',
        replies: [
          {
            id: 2,
            document_id: 1,
            version_number: 3,
            user_id: 1,
            content: '谢谢！我们花了很多时间来优化这个功能。',
            parent_id: 1,
            created_at: '2024-01-20T16:00:00Z',
            updated_at: '2024-01-20T16:00:00Z',
            is_resolved: false,
            username: 'Admin'
          }
        ]
      }
    ];
  }

  private getMockStats(documentId: number): DocumentVersionStats {
    return {
      document_id: documentId,
      document_title: 'API接口设计文档',
      total_versions: 3,
      major_versions: 2,
      first_version_date: '2024-01-01T09:00:00Z',
      latest_version_date: '2024-01-20T14:30:00Z',
      current_version: 3,
      total_size_all_versions: 37180,
      contributors_count: 2
    };
  }

  // Mock API methods
  async getMockVersionHistory(documentId: number): Promise<DocumentVersionResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const versions = this.getMockVersions(documentId);
    return {
      versions,
      total_count: versions.length,
      current_page: 1,
      page_size: 20,
      has_more: false
    };
  }

  async getMockFullVersionHistory(documentId: number): Promise<DocumentVersionHistoryResponse> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      document_id: documentId,
      document_title: 'API接口设计文档',
      versions: this.getMockVersions(documentId),
      stats: this.getMockStats(documentId),
      labels: this.getMockLabels(),
      branches: []
    };
  }

  async getMockVersionComparison(
    fromVersion: number,
    toVersion: number
  ): Promise<VersionComparisonResponse> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      document_id: 1,
      from_version: fromVersion,
      to_version: toVersion,
      diff_content: JSON.stringify({
        additions: ['+ 支持GraphQL查询', '+ 新增缓存机制'],
        deletions: ['- 移除旧的REST端点'],
        modifications: ['~ 更新认证流程']
      }),
      added_lines: 25,
      removed_lines: 8,
      modified_lines: 12,
      similarity_score: 0.75,
      summary: `版本 ${fromVersion} 到 ${toVersion} 的比较：新增25行，删除8行，修改12行`
    };
  }

  async getMockVersionLabels(versionNumber: number): Promise<DocumentVersionLabel[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.getMockLabels().filter(label => label.version_number === versionNumber);
  }

  async getMockVersionComments(versionNumber: number): Promise<DocumentVersionComment[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.getMockComments().filter(comment => comment.version_number === versionNumber);
  }
}

export default new DocumentVersionService();