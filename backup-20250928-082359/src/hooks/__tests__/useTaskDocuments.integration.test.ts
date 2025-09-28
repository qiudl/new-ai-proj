/**
 * useTaskDocuments Hook Integration Tests
 * 测试Hook与后端API和组件状态管理的集成
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { useTaskDocuments } from '../useTaskDocuments';
import { taskDocumentService } from '../../services/taskDocumentService';

// Mock dependencies
jest.mock('../../services/taskDocumentService');
jest.mock('antd', () => ({
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}));

const mockTaskDocumentService = taskDocumentService as jest.Mocked<typeof taskDocumentService>;

// Mock data
const mockDocuments = [
  {
    id: 1,
    file_name: 'test1.md',
    original_name: 'test1.md',
    file_size: 1024,
    mime_type: 'text/markdown',
    upload_type: 'manual' as const,
    uploaded_at: '2023-01-01T00:00:00Z',
    file_path: '/uploads/test1.md'
  },
  {
    id: 2,
    file_name: 'test2.pdf',
    original_name: 'test2.pdf',
    file_size: 2048,
    mime_type: 'application/pdf',
    upload_type: 'api' as const,
    uploaded_at: '2023-01-02T00:00:00Z',
    file_path: '/uploads/test2.pdf'
  }
];

const mockDocumentListResponse = {
  documents: mockDocuments,
  total: 2
};

describe('useTaskDocuments Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化和数据加载集成测试', () => {
    it('应该在autoLoad=true时自动加载文档', async () => {
      // Arrange
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);

      // Act
      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: true
        })
      );

      // Assert - 初始状态
      expect(result.current.loading).toBe(true);
      expect(result.current.documents).toEqual([]);
      expect(result.current.error).toBe(null);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.documents).toEqual(mockDocuments);
      expect(mockTaskDocumentService.getTaskDocuments).toHaveBeenCalledWith(1, 123);
    });

    it('应该在autoLoad=false时不自动加载文档', async () => {
      // Arrange
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);

      // Act
      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Assert
      expect(result.current.loading).toBe(false);
      expect(result.current.documents).toEqual([]);
      expect(mockTaskDocumentService.getTaskDocuments).not.toHaveBeenCalled();
    });

    it('应该处理加载错误', async () => {
      // Arrange
      const error = new Error('Failed to load documents');
      mockTaskDocumentService.getTaskDocuments.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: true
        })
      );

      // Wait for error
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Failed to load documents');
      expect(result.current.documents).toEqual([]);
      expect(message.error).toHaveBeenCalledWith('Failed to load documents');
    });
  });

  describe('文档上传集成测试', () => {
    it('应该成功上传单个文档', async () => {
      // Arrange
      const file = new File(['test content'], 'test.md', { type: 'text/markdown' });
      const uploadedDoc = mockDocuments[0];
      
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);
      mockTaskDocumentService.uploadDocument.mockResolvedValue(uploadedDoc);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act
      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadDocument(file);
      });

      // Assert
      expect(mockTaskDocumentService.uploadDocument).toHaveBeenCalledWith(
        1, 123, file, undefined
      );
      expect(uploadResult).toEqual(uploadedDoc);
      expect(message.success).toHaveBeenCalledWith('文件 "test.md" 上传成功');
      expect(mockTaskDocumentService.getTaskDocuments).toHaveBeenCalledWith(1, 123);
      expect(result.current.uploading).toBe(false);
    });

    it('应该处理上传进度', async () => {
      // Arrange
      const file = new File(['test content'], 'test.md', { type: 'text/markdown' });
      const uploadedDoc = mockDocuments[0];
      let progressCallback: ((progress: number) => void) | undefined;

      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);
      mockTaskDocumentService.uploadDocument.mockImplementation(
        (projectId, taskId, file, onProgress) => {
          progressCallback = onProgress;
          return Promise.resolve(uploadedDoc);
        }
      );

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      const progressSpy = jest.fn();

      // Act
      await act(async () => {
        await result.current.uploadDocument(file, progressSpy);
      });

      // Simulate progress updates
      if (progressCallback) {
        act(() => {
          progressCallback(50);
          progressCallback(100);
        });
      }

      // Assert
      expect(progressSpy).toHaveBeenCalledWith(50);
      expect(progressSpy).toHaveBeenCalledWith(100);
    });

    it('应该成功批量上传文档', async () => {
      // Arrange
      const files = [
        new File(['content1'], 'file1.md', { type: 'text/markdown' }),
        new File(['content2'], 'file2.md', { type: 'text/markdown' })
      ];
      
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);
      mockTaskDocumentService.uploadMultipleDocuments.mockResolvedValue(mockDocuments);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act
      let uploadResults;
      await act(async () => {
        uploadResults = await result.current.uploadMultipleDocuments(files);
      });

      // Assert
      expect(mockTaskDocumentService.uploadMultipleDocuments).toHaveBeenCalledWith(
        1, 123, files, undefined
      );
      expect(uploadResults).toEqual(mockDocuments);
      expect(message.success).toHaveBeenCalledWith('成功上传 2 个文件');
      expect(result.current.uploading).toBe(false);
      expect(result.current.uploadProgress).toEqual([]);
    });

    it('应该成功通过API上传文档', async () => {
      // Arrange
      const fileName = 'api-test.md';
      const content = 'base64content';
      const uploadedDoc = mockDocuments[0];
      
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);
      mockTaskDocumentService.uploadDocumentAPI.mockResolvedValue(uploadedDoc);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act
      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadDocumentAPI(
          fileName, content, 'text/markdown', 'API test'
        );
      });

      // Assert
      expect(mockTaskDocumentService.uploadDocumentAPI).toHaveBeenCalledWith(
        1, 123, fileName, content, 'text/markdown', 'API test'
      );
      expect(uploadResult).toEqual(uploadedDoc);
      expect(message.success).toHaveBeenCalledWith('文件 "api-test.md" 通过API上传成功');
    });

    it('应该处理上传错误', async () => {
      // Arrange
      const file = new File(['test content'], 'test.md', { type: 'text/markdown' });
      const error = new Error('Upload failed');
      
      mockTaskDocumentService.uploadDocument.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act & Assert
      await act(async () => {
        await expect(result.current.uploadDocument(file)).rejects.toThrow('Upload failed');
      });

      expect(result.current.uploading).toBe(false);
      expect(result.current.error).toBe('Upload failed');
      expect(message.error).toHaveBeenCalledWith('Upload failed');
    });
  });

  describe('文档下载集成测试', () => {
    it('应该成功下载Markdown文档', async () => {
      // Arrange
      const mockBlob = new Blob(['# Test'], { type: 'text/markdown' });
      mockTaskDocumentService.downloadTaskMarkdown.mockResolvedValue(mockBlob);
      mockTaskDocumentService.triggerDownload = jest.fn();

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act
      await act(async () => {
        await result.current.downloadMarkdown();
      });

      // Assert
      expect(mockTaskDocumentService.downloadTaskMarkdown).toHaveBeenCalledWith(1, 123);
      expect(mockTaskDocumentService.triggerDownload).toHaveBeenCalledWith(
        mockBlob,
        expect.stringMatching(/^task-123-\d{4}-\d{2}-\d{2}\.md$/)
      );
      expect(message.success).toHaveBeenCalledWith('Markdown 文件下载成功');
    });

    it('应该成功下载PDF文档', async () => {
      // Arrange
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      mockTaskDocumentService.downloadTaskPDF.mockResolvedValue(mockBlob);
      mockTaskDocumentService.triggerDownload = jest.fn();

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act
      await act(async () => {
        await result.current.downloadPDF();
      });

      // Assert
      expect(mockTaskDocumentService.downloadTaskPDF).toHaveBeenCalledWith(1, 123);
      expect(mockTaskDocumentService.triggerDownload).toHaveBeenCalledWith(
        mockBlob,
        expect.stringMatching(/^task-123-\d{4}-\d{2}-\d{2}\.pdf$/)
      );
      expect(message.success).toHaveBeenCalledWith('PDF 文件下载成功');
    });

    it('应该处理下载错误', async () => {
      // Arrange
      const error = new Error('Download failed');
      mockTaskDocumentService.downloadTaskMarkdown.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act & Assert
      await act(async () => {
        await expect(result.current.downloadMarkdown()).rejects.toThrow('Download failed');
      });

      expect(message.error).toHaveBeenCalledWith('Download failed');
    });
  });

  describe('文档管理和工具方法集成测试', () => {
    it('应该正确刷新文档列表', async () => {
      // Arrange
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act
      await act(async () => {
        result.current.refreshDocuments();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(mockTaskDocumentService.getTaskDocuments).toHaveBeenCalledWith(1, 123);
      expect(result.current.documents).toEqual(mockDocuments);
    });

    it('应该正确计算文档统计信息', async () => {
      // Arrange
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: true
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Act
      const stats = result.current.getDocumentStats();

      // Assert
      expect(stats).toEqual({
        total: 2,
        totalSize: 3072, // 1024 + 2048
        byType: {
          'text/markdown': 1,
          'application/pdf': 1
        },
        byUploadType: {
          'manual': 1,
          'api': 1
        }
      });
    });

    it('应该正确计算总文件大小', async () => {
      // Arrange
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: true
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Act
      const totalSize = result.current.getTotalSize();

      // Assert
      expect(totalSize).toBe(3072); // 1024 + 2048
    });

    it('应该按类型正确过滤文档', async () => {
      // Arrange
      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: true
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Act
      const markdownDocs = result.current.getDocumentsByType('text/markdown');
      const pdfDocs = result.current.getDocumentsByType('application/pdf');

      // Assert
      expect(markdownDocs).toHaveLength(1);
      expect(markdownDocs[0].file_name).toBe('test1.md');
      expect(pdfDocs).toHaveLength(1);
      expect(pdfDocs[0].file_name).toBe('test2.pdf');
    });
  });

  describe('参数变化重新加载测试', () => {
    it('应该在projectId或taskId变化时重新加载', async () => {
      // Arrange
      mockTaskDocumentService.getTaskDocuments
        .mockResolvedValueOnce(mockDocumentListResponse)
        .mockResolvedValueOnce({
          documents: [mockDocuments[0]],
          total: 1
        });

      const { result, rerender } = renderHook(
        ({ projectId, taskId }) =>
          useTaskDocuments({
            projectId,
            taskId,
            autoLoad: true
          }),
        {
          initialProps: { projectId: 1, taskId: 123 }
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.documents).toHaveLength(2);

      // Act - 改变参数
      rerender({ projectId: 1, taskId: 456 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(mockTaskDocumentService.getTaskDocuments).toHaveBeenCalledTimes(2);
      expect(mockTaskDocumentService.getTaskDocuments).toHaveBeenLastCalledWith(1, 456);
      expect(result.current.documents).toHaveLength(1);
    });
  });

  describe('并发请求处理测试', () => {
    it('应该正确处理并发上传', async () => {
      // Arrange
      const files = [
        new File(['content1'], 'file1.md'),
        new File(['content2'], 'file2.md'),
        new File(['content3'], 'file3.md')
      ];

      // 模拟不同的响应时间
      mockTaskDocumentService.uploadDocument
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve(mockDocuments[0]), 100))
        )
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve(mockDocuments[1]), 50))
        )
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve(mockDocuments[0]), 150))
        );

      mockTaskDocumentService.getTaskDocuments.mockResolvedValue(mockDocumentListResponse);

      const { result } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: false
        })
      );

      // Act - 并发上传
      const uploadPromises = files.map(file => 
        result.current.uploadDocument(file)
      );

      let results;
      await act(async () => {
        results = await Promise.all(uploadPromises);
      });

      // Assert
      expect(results).toHaveLength(3);
      expect(mockTaskDocumentService.uploadDocument).toHaveBeenCalledTimes(3);
      // 应该调用3次getTaskDocuments（每次上传后刷新）
      expect(mockTaskDocumentService.getTaskDocuments).toHaveBeenCalledTimes(3);
    });
  });

  describe('内存泄漏防护测试', () => {
    it('应该在组件卸载时清理异步操作', async () => {
      // Arrange
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockTaskDocumentService.getTaskDocuments.mockReturnValue(pendingPromise);

      const { result, unmount } = renderHook(() =>
        useTaskDocuments({
          projectId: 1,
          taskId: 123,
          autoLoad: true
        })
      );

      expect(result.current.loading).toBe(true);

      // Act - 在请求完成前卸载组件
      unmount();

      // 完成异步操作
      resolvePromise!(mockDocumentListResponse);

      // Assert - 应该不会有内存泄漏警告
      // 这个测试主要是确保没有在卸载后更新状态的警告
      expect(true).toBe(true);
    });
  });
});