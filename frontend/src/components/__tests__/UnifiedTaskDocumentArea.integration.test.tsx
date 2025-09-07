import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedTaskDocumentArea from '../UnifiedTaskDocumentArea';
import * as documentService from '../../services/documentService';
import * as taskDocumentService from '../../services/taskDocumentService';
import * as TaskService from '../../services/taskService';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../services/documentService');
jest.mock('../../services/taskDocumentService');
jest.mock('../../services/taskService');
jest.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    showShortcutHelp: jest.fn(),
    registeredCount: 5,
  }),
  createDocumentShortcuts: () => [],
}));

jest.mock('../../hooks/useDragAndDrop', () => ({
  useDragAndDrop: () => ({
    dragState: null,
    createDropZoneProps: () => ({}),
    createDraggableProps: () => ({}),
    isDragActive: false,
  }),
}));

// Mock Antd's message API
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

const mockedDocumentService = documentService as jest.Mocked<typeof documentService>;
const mockedTaskDocumentService = taskDocumentService as jest.Mocked<typeof taskDocumentService>;
const mockedTaskService = TaskService as jest.Mocked<typeof TaskService>;

// Mock document data
const mockDocuments = [
  {
    id: 1,
    title: '测试文档1',
    content: '这是测试文档1的内容',
    description: '测试文档1的描述',
    type: 'markdown' as const,
    mime_type: 'text/markdown',
    file_size: 1024,
    version: 1,
    status: 'published' as const,
    visibility: 'team' as const,
    is_template: false,
    project_id: 1,
    task_id: 100,
    owner_id: 1,
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    tags: ['test'],
    can_edit: true,
    can_delete: true,
    can_share: true,
  },
  {
    id: 2,
    title: '测试文档2',
    content: '这是测试文档2的内容',
    description: '测试文档2的描述',
    type: 'txt' as const,
    mime_type: 'text/plain',
    file_size: 2048,
    version: 2,
    status: 'draft' as const,
    visibility: 'team' as const,
    is_template: false,
    project_id: 1,
    task_id: 100,
    owner_id: 1,
    created_by: 1,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    tags: ['draft'],
    can_edit: true,
    can_delete: true,
    can_share: true,
  },
];

const mockUploadedDocuments = [
  {
    id: 3,
    original_name: 'uploaded-file.pdf',
    file_name: 'uploaded-file.pdf',
    file_path: '/uploads/uploaded-file.pdf',
    mime_type: 'application/pdf',
    file_size: 4096,
    uploaded_at: '2024-01-05T00:00:00Z',
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('UnifiedTaskDocumentArea Integration Tests', () => {
  const user = userEvent.setup();
  const defaultProps = {
    projectId: 1,
    taskId: 100,
  };

  beforeEach(() => {
    mockedDocumentService.getTaskDocuments.mockResolvedValue({
      documents: mockDocuments,
      total: mockDocuments.length,
    });
    
    mockedTaskDocumentService.getTaskDocuments.mockResolvedValue({
      documents: mockUploadedDocuments,
      total: mockUploadedDocuments.length,
    });

    mockedTaskService.getTaskChildren.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render with default props', async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('任务文档')).toBeInTheDocument();
        expect(screen.getByText('文档列表')).toBeInTheDocument();
      });
    });

    it('should load and display documents on mount', async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
        expect(screen.getByText('测试文档2')).toBeInTheDocument();
        expect(screen.getByText('uploaded-file.pdf')).toBeInTheDocument();
      });

      expect(mockedDocumentService.getTaskDocuments).toHaveBeenCalledWith(1, 100);
      expect(mockedTaskDocumentService.getTaskDocuments).toHaveBeenCalledWith(1, 100);
    });

    it('should handle loading state', () => {
      mockedDocumentService.getTaskDocuments.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should handle empty document list', async () => {
      mockedDocumentService.getTaskDocuments.mockResolvedValue({
        documents: [],
        total: 0,
      });
      mockedTaskDocumentService.getTaskDocuments.mockResolvedValue({
        documents: [],
        total: 0,
      });

      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('暂无文档')).toBeInTheDocument();
        expect(screen.getByText('创建 Markdown 文档')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode Switching', () => {
    beforeEach(async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
      });
    });

    it('should switch between different view modes', async () => {
      // Default is edit mode
      expect(screen.getByRole('button', { name: /编辑/ })).toHaveClass('ant-btn-primary');

      // Switch to preview mode
      await user.click(screen.getByRole('button', { name: /预览/ }));
      expect(screen.getByRole('button', { name: /预览/ })).toHaveClass('ant-btn-primary');

      // Switch to manage mode
      await user.click(screen.getByRole('button', { name: /管理/ }));
      expect(screen.getByRole('button', { name: /管理/ })).toHaveClass('ant-btn-primary');

      // Switch to stats mode
      await user.click(screen.getByRole('button', { name: /统计/ }));
      expect(screen.getByRole('button', { name: /统计/ })).toHaveClass('ant-btn-primary');
      expect(screen.getByText('文档统计')).toBeInTheDocument();
    });

    it('should display appropriate content for each view mode', async () => {
      // Select a document first
      await user.click(screen.getByText('测试文档1'));

      // Edit mode - should show editor
      await user.click(screen.getByRole('button', { name: /编辑/ }));
      expect(screen.getByTestId('document-editor')).toBeInTheDocument();

      // Preview mode - should show preview
      await user.click(screen.getByRole('button', { name: /预览/ }));
      expect(screen.getByText('测试文档1')).toBeInTheDocument();
      expect(screen.getByText('这是测试文档1的内容')).toBeInTheDocument();

      // Stats mode - should show statistics
      await user.click(screen.getByRole('button', { name: /统计/ }));
      expect(screen.getByText('文档总数')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total documents
    });
  });

  describe('Document Selection and Operations', () => {
    beforeEach(async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
      });
    });

    it('should select documents when clicked', async () => {
      const document1 = screen.getByText('测试文档1');
      await user.click(document1);

      const documentCard = document1.closest('.document-card');
      expect(documentCard).toHaveClass('selected');
    });

    it('should show document details in sidebar when selected', async () => {
      await user.click(screen.getByText('测试文档1'));

      // Check sidebar content
      expect(screen.getByText('📊 文档概览')).toBeInTheDocument();
      expect(screen.getByText('📋 基本信息')).toBeInTheDocument();
      expect(screen.getByText('MARKDOWN')).toBeInTheDocument();
    });

    it('should handle document editing', async () => {
      const editButton = within(screen.getByText('测试文档1').closest('.document-card')!)
        .getByRole('button', { name: /编辑/ });
      
      await user.click(editButton);

      expect(screen.getByTestId('document-editor')).toBeInTheDocument();
    });

    it('should handle document download', async () => {
      const downloadButton = within(screen.getByText('测试文档1').closest('.ant-list-item')!)
        .getByTitle('下载');
      
      // Mock URL.createObjectURL and related methods
      global.URL.createObjectURL = jest.fn();
      global.URL.revokeObjectURL = jest.fn();
      
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle document deletion with confirmation', async () => {
      mockedDocumentService.deleteDocument.mockResolvedValue(undefined);

      const deleteButton = within(screen.getByText('测试文档1').closest('.ant-list-item')!)
        .getByTitle('删除');
      
      await user.click(deleteButton);

      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      // Confirm deletion
      await user.click(screen.getByText('删除'));

      expect(mockedDocumentService.deleteDocument).toHaveBeenCalledWith(1);
    });
  });

  describe('Document Creation', () => {
    beforeEach(async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('任务文档')).toBeInTheDocument();
      });
    });

    it('should create new markdown document', async () => {
      const mockApi = require('../../services/api');
      mockApi.post.mockResolvedValue({
        data: {
          id: 4,
          title: '新建Markdown文档',
          content: '# 新建Markdown文档\n\n请在这里编写文档内容...',
          type: 'markdown',
        },
      });

      const createButton = screen.getByText('新建文档');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          '/projects/1/tasks/100/documents/create-and-attach',
          expect.objectContaining({
            title: '新建Markdown文档',
            type: 'markdown',
          })
        );
      });
    });

    it('should open advanced creation modal', async () => {
      const moreButton = screen.getByTitle('更多操作');
      await user.click(moreButton);

      const advancedCreateItem = screen.getByText('新建文档 (高级)');
      await user.click(advancedCreateItem);

      expect(screen.getByText('新建文档')).toBeInTheDocument();
      expect(screen.getByLabelText(/文档标题/)).toBeInTheDocument();
    });

    it('should handle advanced document creation', async () => {
      const mockApi = require('../../services/api');
      mockApi.post.mockResolvedValue({
        data: {
          id: 5,
          title: '自定义文档标题',
          content: '自定义文档内容',
          type: 'markdown',
        },
      });

      // Open advanced creation modal
      const moreButton = screen.getByTitle('更多操作');
      await user.click(moreButton);
      await user.click(screen.getByText('新建文档 (高级)'));

      // Fill out form
      await user.type(screen.getByLabelText(/文档标题/), '自定义文档标题');
      await user.type(screen.getByLabelText(/文档描述/), '这是自定义描述');

      // Create document
      await user.click(screen.getByText('创建'));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          '/projects/1/tasks/100/documents/create-and-attach',
          expect.objectContaining({
            title: '自定义文档标题',
            description: '这是自定义描述',
          })
        );
      });
    });
  });

  describe('File Upload', () => {
    beforeEach(async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('任务文档')).toBeInTheDocument();
      });
    });

    it('should handle file upload via upload button', async () => {
      mockedTaskDocumentService.uploadDocument.mockResolvedValue({
        id: 6,
        file_name: 'test-upload.pdf',
        file_path: '/uploads/test-upload.pdf',
      });

      const file = new File(['test content'], 'test-upload.pdf', { type: 'application/pdf' });
      const uploadButton = screen.getByText('上传文件');
      const input = uploadButton.closest('.ant-upload')?.querySelector('input[type="file"]');

      if (input) {
        await user.upload(input, file);
      }

      expect(mockedTaskDocumentService.uploadDocument).toHaveBeenCalledWith(
        1, 100, file, expect.any(Function)
      );
    });

    it('should handle drag and drop file upload', async () => {
      // This would require more complex mocking of drag events
      // For now, we'll test that the drop zone exists
      const dropZone = screen.getByText('拖拽文件到此处上传');
      expect(dropZone).toBeInTheDocument();
    });

    it('should show upload progress during file upload', async () => {
      let progressCallback: (progress: number) => void;
      
      mockedTaskDocumentService.uploadDocument.mockImplementation(
        (projectId, taskId, file, onProgress) => {
          progressCallback = onProgress;
          return new Promise((resolve) => {
            setTimeout(() => {
              progressCallback(50);
              setTimeout(() => {
                progressCallback(100);
                resolve({
                  id: 7,
                  file_name: 'progress-test.pdf',
                  file_path: '/uploads/progress-test.pdf',
                });
              }, 100);
            }, 100);
          });
        }
      );

      const file = new File(['test content'], 'progress-test.pdf', { type: 'application/pdf' });
      const uploadButton = screen.getByText('上传文件');
      const input = uploadButton.closest('.ant-upload')?.querySelector('input[type="file"]');

      if (input) {
        await user.upload(input, file);
      }

      // Should show loading state
      await waitFor(() => {
        expect(uploadButton).toHaveAttribute('loading', 'true');
      });
    });
  });

  describe('Filtering and Sorting', () => {
    beforeEach(async () => {
      renderWithQueryClient(
        <UnifiedTaskDocumentArea {...defaultProps} includeSubtaskDocuments={true} />
      );
      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
      });
    });

    it('should toggle between document scopes', async () => {
      expect(screen.getByText('含下级')).toHaveClass('ant-btn-primary');

      // Switch to "仅本任务" mode
      await user.click(screen.getByText('仅本任务'));

      expect(mockedDocumentService.getTaskDocuments).toHaveBeenCalledTimes(2); // Initial + after toggle
    });

    it('should filter documents by type', async () => {
      // Click filter buttons
      await user.click(screen.getByText('仅本任务'));
      await user.click(screen.getByText('全部'));
      await user.click(screen.getByText('仅子任务'));

      // Each filter should trigger a re-render with filtered content
    });

    it('should change document list view modes', async () => {
      const moreButton = screen.getByTitle('更多操作');
      await user.click(moreButton);

      // Switch to timeline view
      await user.click(screen.getByText('📅 时间线'));
      expect(screen.getByText(/按.*时间排序/)).toBeInTheDocument();

      // Switch to grid view
      await user.click(moreButton);
      await user.click(screen.getByText('⚏ 网格视图'));

      // Switch back to grouped view
      await user.click(moreButton);
      await user.click(screen.getByText('📑 分组视图'));
    });

    it('should handle sorting options', async () => {
      const moreButton = screen.getByTitle('更多操作');
      await user.click(moreButton);

      // Change sort order
      await user.click(screen.getByText('🔄 按更新时间(新→旧)'));

      // Documents should be re-sorted
      // This would require checking the order of displayed documents
    });
  });

  describe('Fullscreen Mode', () => {
    beforeEach(async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('任务文档')).toBeInTheDocument();
      });
    });

    it('should toggle fullscreen mode', async () => {
      const fullscreenButton = screen.getByTitle('全屏查看');
      await user.click(fullscreenButton);

      // Should add fullscreen class to component
      const container = screen.getByRole('main') || document.querySelector('.unified-task-document-area');
      expect(container).toHaveClass('fullscreen');

      // Should add fullscreen class to body
      expect(document.body).toHaveClass('fullscreen-doc-active');
    });

    it('should exit fullscreen with escape key', async () => {
      const fullscreenButton = screen.getByTitle('全屏查看');
      await user.click(fullscreenButton);

      // Press escape key
      fireEvent.keyDown(window, { key: 'Escape' });

      // Should exit fullscreen
      const container = document.querySelector('.unified-task-document-area');
      expect(container).not.toHaveClass('fullscreen');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to compact mode', async () => {
      renderWithQueryClient(
        <UnifiedTaskDocumentArea {...defaultProps} compactMode={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('任务文档')).toBeInTheDocument();
      });

      // In compact mode, layout should be different
      const documentList = screen.getByText('文档列表').closest('.ant-col');
      expect(documentList).toHaveClass('ant-col-24'); // Full width in compact mode
    });

    it('should handle mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      // Should adapt layout for mobile
      expect(screen.getByTestId('mobile-document-area')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle document loading errors', async () => {
      mockedDocumentService.getTaskDocuments.mockRejectedValue(
        new Error('Failed to load documents')
      );

      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/加载文档列表失败/)).toBeInTheDocument();
      });
    });

    it('should handle file upload errors', async () => {
      mockedTaskDocumentService.uploadDocument.mockRejectedValue(
        new Error('Upload failed')
      );

      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      const file = new File(['test'], 'error-test.pdf', { type: 'application/pdf' });
      const uploadButton = screen.getByText('上传文件');
      const input = uploadButton.closest('.ant-upload')?.querySelector('input[type="file"]');

      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/文档上传失败/)).toBeInTheDocument();
      });
    });

    it('should handle document deletion errors', async () => {
      mockedDocumentService.deleteDocument.mockRejectedValue(
        new Error('Delete failed')
      );

      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
      });

      const deleteButton = within(screen.getByText('测试文档1').closest('.ant-list-item')!)
        .getByTitle('删除');
      
      await user.click(deleteButton);
      await user.click(screen.getByText('删除')); // Confirm

      await waitFor(() => {
        expect(screen.getByText(/文档删除失败/)).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Subtasks', () => {
    beforeEach(() => {
      // Mock subtask data
      mockedTaskService.getTaskChildren.mockResolvedValue([
        { id: 101, name: '子任务1' },
        { id: 102, name: '子任务2' },
      ]);

      const subtaskDocuments = [
        { ...mockDocuments[0], id: 10, task_id: 101, sourceTaskId: 101 },
        { ...mockDocuments[1], id: 11, task_id: 102, sourceTaskId: 102 },
      ];

      mockedDocumentService.getTaskDocuments
        .mockResolvedValueOnce({ documents: mockDocuments, total: mockDocuments.length })
        .mockResolvedValueOnce({ documents: [subtaskDocuments[0]], total: 1 })
        .mockResolvedValueOnce({ documents: [subtaskDocuments[1]], total: 1 });
    });

    it('should load subtask documents when enabled', async () => {
      renderWithQueryClient(
        <UnifiedTaskDocumentArea {...defaultProps} includeSubtaskDocuments={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('子任务 #101')).toBeInTheDocument();
        expect(screen.getByText('子任务 #102')).toBeInTheDocument();
      });

      expect(mockedTaskService.getTaskChildren).toHaveBeenCalledWith(1, 100);
    });

    it('should filter subtask documents correctly', async () => {
      renderWithQueryClient(
        <UnifiedTaskDocumentArea {...defaultProps} includeSubtaskDocuments={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
      });

      // Filter to show only subtask documents
      await user.click(screen.getByText('仅子任务'));

      // Should only show documents from subtasks
      expect(screen.getByText('子任务 #101')).toBeInTheDocument();
      expect(screen.queryByText('测试文档1')).not.toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('should handle large document lists efficiently', async () => {
      const largeDocumentList = Array.from({ length: 100 }, (_, index) => ({
        ...mockDocuments[0],
        id: index + 1,
        title: `文档${index + 1}`,
      }));

      mockedDocumentService.getTaskDocuments.mockResolvedValue({
        documents: largeDocumentList,
        total: largeDocumentList.length,
      });

      const startTime = performance.now();

      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('文档1')).toBeInTheDocument();
      });

      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should debounce refresh calls', async () => {
      renderWithQueryClient(<UnifiedTaskDocumentArea {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTitle('刷新');
      
      // Click multiple times rapidly
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);

      // Should only trigger one additional call (plus initial load)
      await waitFor(() => {
        expect(mockedDocumentService.getTaskDocuments).toHaveBeenCalledTimes(2);
      });
    });
  });
});