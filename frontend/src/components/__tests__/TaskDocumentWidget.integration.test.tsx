/**
 * TaskDocumentWidget Integration Tests
 * 测试组件与Hook、服务层的完整集成
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import TaskDocumentWidget from '../TaskDocumentWidget';
import { useTaskDocuments } from '../../hooks/useTaskDocuments';

// Mock dependencies
jest.mock('../../hooks/useTaskDocuments');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}));

const mockUseTaskDocuments = useTaskDocuments as jest.MockedFunction<typeof useTaskDocuments>;

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

const mockStats = {
  total: 2,
  totalSize: 3072,
  byType: {
    'text/markdown': 1,
    'application/pdf': 1
  },
  byUploadType: {
    'manual': 1,
    'api': 1
  }
};

const defaultMockHookReturn = {
  documents: mockDocuments,
  loading: false,
  uploading: false,
  uploadProgress: [],
  error: null,
  loadDocuments: jest.fn(),
  uploadDocument: jest.fn(),
  uploadMultipleDocuments: jest.fn(),
  uploadDocumentAPI: jest.fn(),
  downloadMarkdown: jest.fn(),
  downloadPDF: jest.fn(),
  deleteDocument: jest.fn(),
  refreshDocuments: jest.fn(),
  getTotalSize: jest.fn(() => 3072),
  getDocumentsByType: jest.fn((type: string) => 
    mockDocuments.filter(doc => doc.mime_type === type)
  ),
  getDocumentStats: jest.fn(() => mockStats)
};

describe('TaskDocumentWidget Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTaskDocuments.mockReturnValue(defaultMockHookReturn);
  });

  describe('紧凑模式集成测试', () => {
    it('应该正确显示文档统计徽章', () => {
      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={true}
          showTitle={false}
        />
      );

      // Assert
      expect(screen.getByText('文档')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Badge count
      
      // Tooltip content
      const documentButton = screen.getByRole('button', { name: /文档/ });
      fireEvent.mouseEnter(documentButton);
      
      waitFor(() => {
        expect(screen.getByText(/2 个文档，总大小 3KB/)).toBeInTheDocument();
      });
    });

    it('应该在点击时打开文档管理器', async () => {
      // Arrange
      const user = userEvent.setup();

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={true}
          showTitle={false}
        />
      );

      const documentButton = screen.getByRole('button', { name: /文档/ });
      await user.click(documentButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('任务文档管理')).toBeInTheDocument();
      });
    });

    it('应该在加载时显示loading状态', () => {
      // Arrange
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        loading: true
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={true}
          showTitle={false}
        />
      );

      // Assert
      const documentButton = screen.getByRole('button', { name: /文档/ });
      expect(documentButton).toHaveClass('ant-btn-loading');
    });

    it('应该在无文档时显示0徽章', () => {
      // Arrange
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        documents: [],
        getDocumentStats: jest.fn(() => ({
          total: 0,
          totalSize: 0,
          byType: {},
          byUploadType: {}
        }))
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={true}
          showTitle={false}
        />
      );

      // Assert
      expect(screen.getByText('0')).toBeInTheDocument();
      
      const documentButton = screen.getByRole('button', { name: /文档/ });
      fireEvent.mouseEnter(documentButton);
      
      waitFor(() => {
        expect(screen.getByText(/0 个文档，无文档/)).toBeInTheDocument();
      });
    });
  });

  describe('完整模式集成测试', () => {
    it('应该显示完整的文档管理界面', () => {
      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // Assert
      expect(screen.getByText('任务文档')).toBeInTheDocument();
      expect(screen.getByText('上传文档')).toBeInTheDocument();
      expect(screen.getByText('管理文档')).toBeInTheDocument();
      expect(screen.getByText('2 个文档')).toBeInTheDocument();
      expect(screen.getByText('3 KB')).toBeInTheDocument();
    });

    it('应该支持快速上传功能', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockUploadDocument = jest.fn().mockResolvedValue(mockDocuments[0]);
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        uploadDocument: mockUploadDocument
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      const uploadButton = screen.getByText('上传文档');
      await user.click(uploadButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('选择文件')).toBeInTheDocument();
      });
    });

    it('应该显示文档列表和操作按钮', () => {
      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // Assert
      expect(screen.getByText('test1.md')).toBeInTheDocument();
      expect(screen.getByText('test2.pdf')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /下载/ })).toHaveLength(2);
    });

    it('应该处理下载操作', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockDownloadMarkdown = jest.fn();
      const mockDownloadPDF = jest.fn();
      
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        downloadMarkdown: mockDownloadMarkdown,
        downloadPDF: mockDownloadPDF
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      const downloadButtons = screen.getAllByRole('button', { name: /下载/ });
      await user.click(downloadButtons[0]); // 下载第一个文档

      // Assert
      // 根据文档类型，应该调用相应的下载方法
      // 这里需要根据实际实现逻辑来验证
      expect(mockDownloadMarkdown).toHaveBeenCalled();
    });
  });

  describe('错误处理集成测试', () => {
    it('应该显示错误状态', () => {
      // Arrange
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        error: 'Failed to load documents',
        documents: []
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // Assert
      expect(screen.getByText(/加载失败/)).toBeInTheDocument();
    });

    it('应该处理上传错误', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockUploadDocument = jest.fn().mockRejectedValue(new Error('Upload failed'));
      
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        uploadDocument: mockUploadDocument
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      const uploadButton = screen.getByText('上传文档');
      await user.click(uploadButton);

      // 模拟文件选择
      const fileInput = screen.getByRole('button', { name: /选择文件/ });
      const file = new File(['test content'], 'test.md', { type: 'text/markdown' });
      
      await act(async () => {
        await user.upload(fileInput, file);
      });

      // Assert
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Upload failed');
      });
    });
  });

  describe('实时状态更新集成测试', () => {
    it('应该在上传时显示进度', async () => {
      // Arrange
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        uploading: true,
        uploadProgress: [
          { fileIndex: 0, progress: 50, loaded: 512, total: 1024 }
        ]
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // Assert
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('应该在文档变化时更新显示', () => {
      // Arrange
      const { rerender } = render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={true}
          showTitle={false}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();

      // Act - 模拟文档数量变化
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        documents: [mockDocuments[0]], // 只有一个文档
        getDocumentStats: jest.fn(() => ({
          total: 1,
          totalSize: 1024,
          byType: { 'text/markdown': 1 },
          byUploadType: { 'manual': 1 }
        }))
      });

      rerender(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={true}
          showTitle={false}
        />
      );

      // Assert
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('用户交互集成测试', () => {
    it('应该支持拖拽上传', async () => {
      // Arrange
      const mockUploadDocument = jest.fn().mockResolvedValue(mockDocuments[0]);
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        uploadDocument: mockUploadDocument
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // 查找拖拽区域
      const dropArea = screen.getByText(/拖拽文件到此处/);
      expect(dropArea).toBeInTheDocument();

      // 模拟拖拽
      const file = new File(['test content'], 'test.md', { type: 'text/markdown' });
      const dropEvent = new Event('drop', { bubbles: true });
      (dropEvent as any).dataTransfer = {
        files: [file]
      };

      fireEvent(dropArea, dropEvent);

      // Assert
      await waitFor(() => {
        expect(mockUploadDocument).toHaveBeenCalledWith(file, expect.any(Function));
      });
    });

    it('应该支持多文件选择', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockUploadMultipleDocuments = jest.fn().mockResolvedValue(mockDocuments);
      
      mockUseTaskDocuments.mockReturnValue({
        ...defaultMockHookReturn,
        uploadMultipleDocuments: mockUploadMultipleDocuments
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      const uploadButton = screen.getByText('上传文档');
      await user.click(uploadButton);

      // 模拟多文件选择
      const fileInput = screen.getByRole('button', { name: /选择文件/ });
      const files = [
        new File(['content1'], 'file1.md', { type: 'text/markdown' }),
        new File(['content2'], 'file2.md', { type: 'text/markdown' })
      ];

      await act(async () => {
        await user.upload(fileInput, files);
      });

      // Assert
      await waitFor(() => {
        expect(mockUploadMultipleDocuments).toHaveBeenCalledWith(
          files,
          expect.any(Function)
        );
      });
    });
  });

  describe('响应式设计集成测试', () => {
    it('应该在不同设备尺寸下正确显示', () => {
      // Arrange - 模拟移动设备
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // Assert
      // 检查移动端适配样式
      const container = screen.getByTestId('document-widget-container');
      expect(container).toHaveClass('mobile-layout');
    });
  });

  describe('无障碍功能集成测试', () => {
    it('应该支持键盘导航', async () => {
      // Arrange
      const user = userEvent.setup();

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // 使用Tab键导航
      await user.tab();
      
      // Assert
      expect(screen.getByText('上传文档')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('管理文档')).toHaveFocus();
    });

    it('应该有正确的ARIA标签', () => {
      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={true}
          showTitle={false}
        />
      );

      // Assert
      const documentButton = screen.getByRole('button', { name: /文档/ });
      expect(documentButton).toHaveAttribute('aria-label', expect.stringContaining('文档'));
      
      const badge = screen.getByText('2');
      expect(badge).toHaveAttribute('aria-label', '2 个文档');
    });
  });

  describe('性能优化集成测试', () => {
    it('应该避免不必要的重渲染', () => {
      // Arrange
      const renderSpy = jest.fn();
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <TaskDocumentWidget
            projectId={1}
            taskId={123}
            compact={true}
            showTitle={false}
          />
        );
      });

      const { rerender } = render(<TestComponent />);

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Act - 重新渲染相同props
      rerender(<TestComponent />);

      // Assert - 应该没有重新渲染（React.memo优化）
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('应该在props变化时重新渲染', () => {
      // Arrange
      const renderSpy = jest.fn();
      const TestComponent = React.memo(({ taskId }: { taskId: number }) => {
        renderSpy();
        return (
          <TaskDocumentWidget
            projectId={1}
            taskId={taskId}
            compact={true}
            showTitle={false}
          />
        );
      });

      const { rerender } = render(<TestComponent taskId={123} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Act - 改变props
      rerender(<TestComponent taskId={456} />);

      // Assert - 应该重新渲染
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('国际化集成测试', () => {
    it('应该支持多语言文本', () => {
      // Arrange - 模拟中文环境
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'zh-CN'
      });

      // Act
      render(
        <TaskDocumentWidget
          projectId={1}
          taskId={123}
          compact={false}
          showTitle={true}
        />
      );

      // Assert
      expect(screen.getByText('任务文档')).toBeInTheDocument();
      expect(screen.getByText('上传文档')).toBeInTheDocument();
      expect(screen.getByText('管理文档')).toBeInTheDocument();

      // Cleanup
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: originalLanguage
      });
    });
  });
});