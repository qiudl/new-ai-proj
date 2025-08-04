/**
 * Task Document Service Integration Tests
 * 集成测试：验证前端服务与后端API的完整集成功能
 */

import { taskDocumentService } from '../../services/taskDocumentService';
import api from '../../services/api';

// Mock api service
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock data
const mockTaskDocument = {
  content: '# Test Document\n\nThis is a test document content.'
};

const mockAdvancedTaskDocument = {
  id: 1,
  task_id: 123,
  project_id: 1,
  document_id: 1,
  title: 'Test Document',
  content: '# Test Document\n\nAdvanced document content.',
  type: 'markdown',
  status: 'published',
  version: 1,
  metadata: {},
  owner_id: 1,
  created_by: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  task_title: 'Test Task',
  project_name: 'Test Project',
  owner_name: 'Test User',
  creator_name: 'Test Creator',
  document_exists: true,
  can_edit: true,
  can_delete: true,
  relations: [],
  last_modified: '2023-01-02T00:00:00Z'
};

const mockUploadedDocument = {
  id: 1,
  file_name: 'test-document.md',
  original_name: 'test-document.md',
  file_size: 1024,
  mime_type: 'text/markdown',
  upload_type: 'manual' as const,
  uploaded_at: '2023-01-01T00:00:00Z',
  file_path: '/uploads/test-document.md'
};

const mockDocumentList = {
  documents: [mockUploadedDocument],
  total: 1
};

const mockVersionHistory = {
  document_id: 1,
  current_version: 2,
  total_versions: 2,
  versions: [
    {
      id: 1,
      document_id: 1,
      version_number: 1,
      content: '# Version 1',
      content_hash: 'hash1',
      created_at: '2023-01-01T00:00:00Z',
      created_by: 1,
      creator_name: 'Test User',
      change_summary: 'Initial version',
      file_size: 512,
      change_type: 'create' as const,
      metadata: {}
    },
    {
      id: 2,
      document_id: 1,
      version_number: 2,
      content: '# Version 2\n\nUpdated content',
      content_hash: 'hash2',  
      created_at: '2023-01-02T00:00:00Z',
      created_by: 1,
      creator_name: 'Test User',
      change_summary: 'Content update',
      file_size: 1024,
      change_type: 'update' as const,
      metadata: {}
    }
  ],
  document_info: mockUploadedDocument
};

describe('TaskDocumentService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache
    taskDocumentService.clearAllCache();
  });

  describe('基础文档操作集成测试', () => {
    it('应该成功获取任务文档', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ data: mockTaskDocument });

      // Act
      const result = await taskDocumentService.get(1, 123);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith('/projects/1/tasks/123/document');
      expect(result).toEqual(mockTaskDocument);
    });

    it('应该成功获取增强版任务文档', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ data: mockAdvancedTaskDocument });

      // Act
      const result = await taskDocumentService.getAdvanced(1, 123);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith('/projects/1/tasks/123/document/advanced');
      expect(result).toEqual(mockAdvancedTaskDocument);
    });

    it('应该成功保存任务文档', async () => {
      // Arrange
      const content = '# Updated Document\n\nNew content';
      mockApi.put.mockResolvedValue({ data: { content } });

      // Act
      const result = await taskDocumentService.save(1, 123, content);

      // Assert
      expect(mockApi.put).toHaveBeenCalledWith(
        '/projects/1/tasks/123/document',
        { content }
      );
      expect(result).toEqual({ content });
    });

    it('应该成功删除任务文档', async () => {
      // Arrange
      mockApi.delete.mockResolvedValue({});

      // Act
      await taskDocumentService.delete(1, 123);

      // Assert
      expect(mockApi.delete).toHaveBeenCalledWith('/projects/1/tasks/123/document');
    });
  });

  describe('文档上传功能集成测试', () => {
    it('应该成功上传单个文档', async () => {
      // Arrange
      const file = new File(['test content'], 'test.md', { type: 'text/markdown' });
      mockApi.post.mockResolvedValue({
        data: { success: true, data: mockUploadedDocument }
      });

      // Act
      const result = await taskDocumentService.uploadDocument(1, 123, file);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        '/projects/1/tasks/123/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      );
      expect(result).toEqual(mockUploadedDocument);
    });

    it('应该成功通过API上传文档', async () => {
      // Arrange
      const fileName = 'api-test.md';
      const content = 'base64encodedcontent';
      mockApi.post.mockResolvedValue({
        data: { success: true, data: mockUploadedDocument }
      });

      // Act
      const result = await taskDocumentService.uploadDocumentAPI(
        1, 123, fileName, content, 'text/markdown', 'API upload test'
      );

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        '/projects/1/tasks/123/upload-api',
        {
          file_name: fileName,
          content: content,
          mime_type: 'text/markdown',
          description: 'API upload test'
        }
      );
      expect(result).toEqual(mockUploadedDocument);
    });

    it('应该成功获取任务文档列表', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockDocumentList }
      });

      // Act
      const result = await taskDocumentService.getTaskDocuments(1, 123);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith('/projects/1/tasks/123/uploads');
      expect(result).toEqual(mockDocumentList);
    });
  });

  describe('文档下载功能集成测试', () => {
    it('应该成功下载Markdown文档', async () => {
      // Arrange
      const mockBlob = new Blob(['markdown content'], { type: 'text/markdown' });
      mockApi.get.mockResolvedValue({ data: mockBlob });

      // Act
      const result = await taskDocumentService.downloadTaskMarkdown(1, 123);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/1/tasks/123/download/md',
        { responseType: 'blob' }
      );
      expect(result).toEqual(mockBlob);
    });

    it('应该成功下载PDF文档', async () => {
      // Arrange
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      mockApi.get.mockResolvedValue({ data: mockBlob });

      // Act
      const result = await taskDocumentService.downloadTaskPDF(1, 123);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/1/tasks/123/download/pdf',
        { responseType: 'blob' }
      );
      expect(result).toEqual(mockBlob);
    });
  });

  describe('版本历史功能集成测试', () => {
    it('应该成功获取文档版本历史', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockVersionHistory }
      });

      // Act
      const result = await taskDocumentService.getDocumentVersionHistory(1, 123, 1);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/1/tasks/123/documents/1/versions',
        { params: { limit: 20, offset: 0, include_content: false } }
      );
      expect(result).toEqual(mockVersionHistory);
    });

    it('应该成功获取特定版本文档', async () => {
      // Arrange
      const mockVersion = mockVersionHistory.versions[0];
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockVersion }
      });

      // Act
      const result = await taskDocumentService.getDocumentVersion(1, 123, 1, 1);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/1/tasks/123/documents/1/versions/1'
      );
      expect(result).toEqual(mockVersion);
    });

    it('应该成功比较文档版本', async () => {
      // Arrange
      const mockComparison = {
        version1: mockVersionHistory.versions[0],
        version2: mockVersionHistory.versions[1],
        differences: {
          additions: ['New line added'],
          deletions: [],
          modifications: ['Content updated'],
          statistics: {
            added_lines: 1,
            deleted_lines: 0,
            modified_lines: 1,
            unchanged_lines: 3
          }
        }
      };
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockComparison }
      });

      // Act
      const result = await taskDocumentService.compareDocumentVersions(1, 123, 1, 1, 2);

      // Assert
      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/1/tasks/123/documents/1/versions/compare',
        { params: { version1: 1, version2: 2 } }
      );
      expect(result).toEqual(mockComparison);
    });

    it('应该成功恢复文档版本', async () => {
      // Arrange
      const restoreRequest = {
        version_id: 1,
        restore_reason: 'Rollback to stable version'
      };
      const mockRestoreResult = mockVersionHistory.versions[0];
      mockApi.post.mockResolvedValue({
        data: { success: true, data: mockRestoreResult }
      });

      // Act
      const result = await taskDocumentService.restoreDocumentVersion(1, 123, 1, restoreRequest);

      // Assert
      expect(mockApi.post).toHaveBeenCalledWith(
        '/projects/1/tasks/123/documents/1/versions/restore',
        restoreRequest
      );
      expect(result).toEqual(mockRestoreResult);
    });
  });

  describe('增强功能集成测试', () => {
    it('应该使用缓存机制', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ data: mockTaskDocument });

      // Act - 第一次调用
      const result1 = await taskDocumentService.getEnhanced(1, 123, { useCache: true });
      
      // Act - 第二次调用（应该从缓存获取）
      const result2 = await taskDocumentService.getEnhanced(1, 123, { useCache: true });

      // Assert
      expect(mockApi.get).toHaveBeenCalledTimes(1); // 只调用一次API
      expect(result1).toEqual(mockTaskDocument);
      expect(result2).toEqual(mockTaskDocument);
    });

    it('应该执行请求重试', async () => {
      // Arrange
      mockApi.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ data: mockTaskDocument });

      // Act
      const result = await taskDocumentService.getEnhanced(1, 123, { 
        retry: true, 
        maxRetries: 3 
      });

      // Assert
      expect(mockApi.get).toHaveBeenCalledTimes(3); // 重试了2次，第3次成功
      expect(result).toEqual(mockTaskDocument);
    });

    it('应该执行批量操作', async () => {
      // Arrange
      const files = [
        new File(['content1'], 'file1.md', { type: 'text/markdown' }),
        new File(['content2'], 'file2.md', { type: 'text/markdown' })
      ];
      
      mockApi.post.mockResolvedValue({
        data: { success: true, data: mockUploadedDocument }
      });

      // Act
      const results = await taskDocumentService.uploadMultipleDocuments(1, 123, files);

      // Assert
      expect(mockApi.post).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockUploadedDocument);
    });
  });

  describe('错误处理集成测试', () => {
    it('应该处理网络错误', async () => {
      // Arrange
      const networkError = new Error('Network Error');
      (networkError as any).request = {};
      mockApi.get.mockRejectedValue(networkError);

      // Act & Assert
      await expect(taskDocumentService.get(1, 123))
        .rejects
        .toThrow('获取任务文档失败: 网络连接失败，请检查网络设置');
    });

    it('应该处理HTTP错误状态', async () => {
      // Arrange
      const httpError = new Error('HTTP Error');
      (httpError as any).response = {
        status: 404,
        data: { message: 'Document not found' }
      };
      mockApi.get.mockRejectedValue(httpError);

      // Act & Assert
      await expect(taskDocumentService.get(1, 123))
        .rejects
        .toThrow('获取任务文档失败: 资源不存在: Document not found');
    });

    it('应该处理文件大小验证', async () => {
      // Arrange
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.md');

      // Act & Assert
      await expect(taskDocumentService.uploadDocument(1, 123, largeFile))
        .rejects
        .toThrow('超过最大允许大小');
    });

    it('应该处理不支持的文件类型', async () => {
      // Arrange
      const unsupportedFile = new File(['content'], 'test.exe');

      // Act & Assert
      await expect(taskDocumentService.uploadDocument(1, 123, unsupportedFile))
        .rejects
        .toThrow('文件扩展名 .exe 不被允许');
    });
  });

  describe('性能和缓存测试', () => {
    it('应该正确管理缓存大小', async () => {
      // Arrange
      taskDocumentService.configure({ maxCacheSize: 2 });
      mockApi.get.mockResolvedValue({ data: mockTaskDocument });

      // Act - 填满缓存
      await taskDocumentService.getEnhanced(1, 1);
      await taskDocumentService.getEnhanced(1, 2);
      await taskDocumentService.getEnhanced(1, 3); // 应该清理最旧的缓存

      // Assert
      const stats = taskDocumentService.getServiceStats();
      expect(stats.cacheSize).toBe(2);
    });

    it('应该限制并发请求数量', async () => {
      // Arrange
      taskDocumentService.configure({ maxConcurrentRequests: 2 });
      let activeRequests = 0;
      let maxConcurrent = 0;

      mockApi.get.mockImplementation(() => {
        activeRequests++;
        maxConcurrent = Math.max(maxConcurrent, activeRequests);
        
        return new Promise(resolve => {
          setTimeout(() => {
            activeRequests--;
            resolve({ data: mockTaskDocument });
          }, 100);
        });
      });

      // Act
      const promises = [
        taskDocumentService.getEnhanced(1, 1),
        taskDocumentService.getEnhanced(1, 2),
        taskDocumentService.getEnhanced(1, 3),
        taskDocumentService.getEnhanced(1, 4)
      ];

      await Promise.all(promises);

      // Assert
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('应该正确清理缓存', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ data: mockTaskDocument });
      await taskDocumentService.getEnhanced(1, 123);

      // Act
      taskDocumentService.clearAllCache();

      // Assert
      const stats = taskDocumentService.getServiceStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('文件操作工具测试', () => {
    it('应该正确格式化文件大小', () => {
      expect(taskDocumentService.formatFileSize(0)).toBe('0 Bytes');
      expect(taskDocumentService.formatFileSize(1024)).toBe('1 KB');
      expect(taskDocumentService.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(taskDocumentService.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('应该正确识别MIME类型', () => {
      expect(taskDocumentService.getMimeTypeFromFileName('test.md')).toBe('text/markdown');
      expect(taskDocumentService.getMimeTypeFromFileName('test.pdf')).toBe('application/pdf');
      expect(taskDocumentService.getMimeTypeFromFileName('test.txt')).toBe('text/plain');
      expect(taskDocumentService.getMimeTypeFromFileName('test.unknown')).toBe('application/octet-stream');
    });

    it('应该正确转换文件为Base64', async () => {
      // Arrange
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

      // Act
      const base64 = await taskDocumentService.fileToBase64(file);

      // Assert
      expect(base64).toBeTruthy();
      expect(typeof base64).toBe('string');
      // Base64应该不包含data:前缀
      expect(base64).not.toMatch(/^data:/);
    });
  });

  describe('服务健康检查测试', () => {
    it('应该返回健康状态', async () => {
      // Arrange
      mockApi.get.mockResolvedValue({ status: 200 });

      // Act
      const isHealthy = await taskDocumentService.healthCheck();

      // Assert
      expect(isHealthy).toBe(true);
      expect(mockApi.get).toHaveBeenCalledWith('/health', { timeout: 5000 });
    });

    it('应该处理健康检查失败', async () => {
      // Arrange
      mockApi.get.mockRejectedValue(new Error('Service unavailable'));

      // Act
      const isHealthy = await taskDocumentService.healthCheck();

      // Assert
      expect(isHealthy).toBe(false);
    });

    it('应该返回正确的服务统计信息', () => {
      // Act
      const stats = taskDocumentService.getServiceStats();

      // Assert
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('maxCacheSize');
      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('maxConcurrentRequests');
      expect(stats).toHaveProperty('cacheEnabled');
      expect(typeof stats.cacheSize).toBe('number');
    });
  });
});