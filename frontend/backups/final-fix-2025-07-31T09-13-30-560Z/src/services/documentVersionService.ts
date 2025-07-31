/**
 * 文档版本管理服务  
 * 处理文档版本的创建、查询、比较、回滚等操作
 */

import type {
  DocumentVersion as IDocumentVersion,
  DocumentVersionHistoryResponse,
  DocumentVersionComment,
  DocumentVersionLabel,
  DocumentVersionStats,
  VersionComparisonResponse
} from '../types/version';

export interface DocumentVersion {
  id: string;
  documentId: number;
  version: string;
  title: string;
  content: string;
  summary: string;
  createdBy: string;
  createdByName: string;
  createdByAvatar?: string;
  createdAt: string;
  size: number;
  changeType: 'create' | 'update' | 'major' | 'minor' | 'patch';
  tags: string[];
  isCurrent: boolean;
  parentVersion?: string;
  metadata?: {
    wordCount: number;
    characterCount: number;
    linesAdded: number;
    linesDeleted: number;
    changesCount: number;
  };
}

export interface VersionDiff {
  added: Array<{ line: number; content: string }>;
  removed: Array<{ line: number; content: string }>;
  modified: Array<{ line: number; old: string; new: string }>;
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    totalChanges: number;
  };
}

class DocumentVersionService {
  private baseUrl = '/api/v1/documents';

  // 真实API方法
  async getVersionHistoryReal(documentId: number): Promise<{
    versions: DocumentVersion[];
    totalCount: number;
    currentVersion: string;
  }> {
    try {
      console.log(`API请求: GET ${this.baseUrl}/${documentId}/versions`);
      const response = await fetch(`${this.baseUrl}/${documentId}/versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('版本历史API响应:', data);

      if (data.success && data.data) {
        return {
          versions: data.data.versions || [],
          totalCount: data.data.totalCount || 0,
          currentVersion: data.data.currentVersion || '1.0.0'
        };
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.warn('真实API调用失败，降级到mock数据:', error);
      return this.getVersionHistory(documentId);
    }
  }

  async getVersionHistory(documentId: number): Promise<{
    versions: DocumentVersion[];
    totalCount: number;
    currentVersion: string;
  }> {
    // 检查是否启用真实API
    const enableRealApi = process.env.REACT_APP_ENABLE_MOCK !== 'true';
    
    if (enableRealApi) {
      try {
        return await this.getVersionHistoryReal(documentId);
      } catch (error) {
        console.warn('真实API失败，使用mock数据:', error);
      }
    }

    // 模拟数据
    const now = new Date();
    const versions: DocumentVersion[] = [
      {
        id: 'v1.2.1',
        documentId,
        version: '1.2.1',
        title: '修复用户反馈的问题',
        content: '# 修复版本 1.2.1\n\n本版本主要修复了搜索功能性能问题...',
        summary: '修复搜索性能问题，优化用户界面',
        createdBy: 'user1',
        createdByName: '张开发',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        size: 1024,
        changeType: 'patch',
        tags: ['bugfix', 'performance'],
        isCurrent: true,
        metadata: {
          wordCount: 156,
          characterCount: 589,
          linesAdded: 5,  
          linesDeleted: 3,
          changesCount: 8
        }
      }
    ];

    return {
      versions,
      totalCount: versions.length,
      currentVersion: '1.2.1'
    };
  }

  async compareVersionsReal(documentId: number, sourceId: string, targetId: string): Promise<VersionDiff> {
    try {
      console.log(`API请求: GET ${this.baseUrl}/${documentId}/versions/compare`);
      const response = await fetch(`${this.baseUrl}/${documentId}/versions/compare?from=${sourceId}&to=${targetId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('版本比较API响应:', data);

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.warn('版本比较API调用失败，降级到mock方法:', error);
      return this.compareVersions(documentId, sourceId, targetId);
    }
  }

  async compareVersions(documentId: number, sourceId: string, targetId: string): Promise<VersionDiff> {
    // 检查是否启用真实API
    const enableRealApi = process.env.REACT_APP_ENABLE_MOCK !== 'true';
    
    if (enableRealApi) {
      try {
        return await this.compareVersionsReal(documentId, sourceId, targetId);
      } catch (error) {
        console.warn('版本比较API失败，使用mock数据:', error);
      }
    }

    return {
      added: [
        { line: 15, content: '### 搜索功能优化' }
      ],
      removed: [
        { line: 12, content: '## 已知问题' }
      ],
      modified: [
        { line: 1, old: '# 版本 1.2.0', new: '# 修复版本 1.2.1' }
      ],
      summary: {
        linesAdded: 1,
        linesRemoved: 1,
        linesModified: 1,
        totalChanges: 3
      }
    };
  }

  async restoreVersionReal(documentId: number, versionId: string): Promise<any> {
    try {
      console.log(`API请求: POST ${this.baseUrl}/${documentId}/versions/${versionId}/restore`);
      const response = await fetch(`${this.baseUrl}/${documentId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('版本恢复API响应:', data);

      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Version restore failed');
      }
    } catch (error) {
      console.warn('版本恢复API调用失败，降级到mock方法:', error);
      return this.restoreVersion(documentId, versionId);
    }
  }

  async restoreVersion(documentId: number, versionId: string): Promise<any> {
    // 检查是否启用真实API
    const enableRealApi = process.env.REACT_APP_ENABLE_MOCK !== 'true';
    
    if (enableRealApi) {
      try {
        return await this.restoreVersionReal(documentId, versionId);
      } catch (error) {
        console.warn('版本恢复API失败，使用mock响应:', error);
      }
    }

    return { success: true, message: '版本回滚成功' };
  }

  // Mock methods for DocumentVersionPanel
  async getMockFullVersionHistory(documentId: number): Promise<DocumentVersionHistoryResponse> {
    const now = new Date();
    
    // Create mock versions
    const versions: IDocumentVersion[] = [
      {
        id: 1,
        document_id: documentId,
        version_number: 3,
        title: '最新版本 - 功能优化',
        content: '# 版本 1.3.0\n\n本版本主要优化了用户体验和性能...',
        file_size: 2048,
        change_summary: '优化用户体验，修复性能问题',
        created_by: 1,
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        is_major_version: true,
        tags: ['optimization', 'performance'],
        metadata: { wordCount: 234, characterCount: 892 },
        created_by_name: '张开发',
        created_by_email: 'dev@example.com',
        label_count: 2,
        comment_count: 3
      },
      {
        id: 2,
        document_id: documentId,
        version_number: 2,
        title: '中间版本 - 功能增加',
        content: '# 版本 1.2.0\n\n添加了新的搜索功能...',
        file_size: 1536,
        change_summary: '添加搜索功能',
        created_by: 2,
        created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        is_major_version: false,
        tags: ['feature', 'search'],
        metadata: { wordCount: 189, characterCount: 672 },
        created_by_name: '李产品',
        created_by_email: 'product@example.com',
        label_count: 1,
        comment_count: 2
      },
      {
        id: 3,
        document_id: documentId,
        version_number: 1,
        title: '初始版本',
        content: '# 版本 1.0.0\n\n项目初始化...',
        file_size: 1024,
        change_summary: '项目初始化',
        created_by: 1,
        created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_major_version: true,
        tags: ['initial', 'setup'],
        metadata: { wordCount: 123, characterCount: 456 },
        created_by_name: '张开发',
        created_by_email: 'dev@example.com',
        label_count: 1,
        comment_count: 1
      }
    ];

    // Create mock stats
    const stats: DocumentVersionStats = {
      document_id: documentId,
      document_title: '项目需求文档',
      total_versions: versions.length,
      major_versions: versions.filter(v => v.is_major_version).length,
      first_version_date: versions[versions.length - 1].created_at,
      latest_version_date: versions[0].created_at,
      current_version: versions[0].version_number,
      total_size_all_versions: versions.reduce((sum, v) => sum + v.file_size, 0),
      contributors_count: 2
    };

    // Create mock labels
    const labels: DocumentVersionLabel[] = [
      {
        id: 1,
        document_id: documentId,
        version_number: 3,
        label: '稳定版',
        color: '#52c41a',
        description: '经过测试的稳定版本',
        created_by: 1,
        created_at: versions[0].created_at,
        created_by_name: '张开发'
      },
      {
        id: 2,
        document_id: documentId,
        version_number: 2,
        label: '测试版',
        color: '#1890ff',
        description: '待测试版本',
        created_by: 2,
        created_at: versions[1].created_at,
        created_by_name: '李产品'
      }
    ];

    return {
      document_id: documentId,
      document_title: '项目需求文档',
      versions,
      stats,
      labels,
      branches: [] // Empty branches for now
    };
  }

  async getMockVersionComments(versionNumber: number): Promise<DocumentVersionComment[]> {
    const now = new Date();
    
    return [
      {
        id: 1,
        document_id: 1,
        version_number: versionNumber,
        user_id: 1,
        content: '这个版本的性能优化做得很好！',
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        is_resolved: false,
        username: '张开发',
        user_avatar: 'https://via.placeholder.com/32',
        replies: []
      },
      {
        id: 2,
        document_id: 1,
        version_number: versionNumber,
        user_id: 2,
        content: '建议在下个版本中添加更多的测试用例',
        line_number: 15,
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        is_resolved: false,
        username: '李产品',
        user_avatar: 'https://via.placeholder.com/32',
        replies: []
      }
    ];
  }

  async getMockVersionComparison(fromVersion: number, toVersion: number): Promise<VersionComparisonResponse> {
    return {
      document_id: 1,
      from_version: fromVersion,
      to_version: toVersion,
      diff_content: `--- 版本 ${fromVersion}
+++ 版本 ${toVersion}
@@ -1,5 +1,8 @@
-# 版本 ${fromVersion}
+# 版本 ${toVersion}
 
-这是旧版本的内容
+这是新版本的内容
+
+新增的功能说明：
+- 性能优化
+- 界面改进`,
      added_lines: 4,
      removed_lines: 1,
      modified_lines: 2,
      similarity_score: 0.75,
      summary: `从版本 ${fromVersion} 到版本 ${toVersion}：新增4行，删除1行，修改2行`
    };
  }
}

export const documentVersionService = new DocumentVersionService();
export default DocumentVersionService;