import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import TaskDetailPageNew from '../../pages/TaskDetailPageNew';
import * as documentService from '../../services/documentService';
import * as taskDocumentService from '../../services/taskDocumentService';
import * as TaskService from '../../services/taskService';
import '@testing-library/jest-dom';

// Mock services
jest.mock('../../services/documentService');
jest.mock('../../services/taskDocumentService');
jest.mock('../../services/taskService');

// Mock API
jest.mock('../../services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

const mockedDocumentService = documentService as jest.Mocked<typeof documentService>;
const mockedTaskDocumentService = taskDocumentService as jest.Mocked<typeof taskDocumentService>;
const mockedTaskService = TaskService as jest.Mocked<typeof TaskService>;
const mockedApi = require('../../services/api');

// Mock Antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock task data
const mockTask = {
  id: 100,
  title: '任务文档管理测试',
  description: '测试任务文档管理功能的任务',
  status: 'in_progress',
  project_id: 1,
  parent_id: null,
  assignee_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

// Mock document data
const mockDocuments = [
  {
    id: 1,
    title: '需求分析文档',
    content: '# 需求分析\n\n这是需求分析的详细内容...',
    description: '项目需求分析文档',
    type: 'markdown' as const,
    mime_type: 'text/markdown',
    file_size: 2048,
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
    tags: ['requirement', 'analysis'],
    can_edit: true,
    can_delete: true,
    can_share: true,
  },
  {
    id: 2,
    title: '设计文档',
    content: '# 系统设计\n\n系统架构设计说明...',
    description: '系统设计文档',
    type: 'markdown' as const,
    mime_type: 'text/markdown',
    file_size: 3072,
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
    tags: ['design', 'architecture'],
    can_edit: true,
    can_delete: true,
    can_share: true,
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

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Task Document Management User Flow E2E Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Mock task service
    mockedTaskService.getTaskById.mockResolvedValue(mockTask);
    mockedTaskService.getTaskChildren.mockResolvedValue([]);
    
    // Mock document services
    mockedDocumentService.getTaskDocuments.mockResolvedValue({
      documents: mockDocuments,
      total: mockDocuments.length,
    });
    
    mockedTaskDocumentService.getTaskDocuments.mockResolvedValue({
      documents: [],
      total: 0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Document Creation and Editing Flow', () => {
    it('should allow user to create and edit a document from start to finish', async () => {
      const newDocument = {
        id: 3,
        title: '新创建的文档',
        content: '# 新创建的文档\n\n这是新创建的文档内容',
        type: 'markdown',
        status: 'draft',
      };

      mockedApi.post.mockResolvedValue({ data: newDocument });

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      // Wait for task and documents to load
      await waitFor(() => {
        expect(screen.getByText('任务文档管理测试')).toBeInTheDocument();
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Step 1: Click "新建文档" button
      const createButton = screen.getByText('新建文档');
      await user.click(createButton);

      // Step 2: Verify document is created and editor opens
      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          '/projects/1/tasks/100/documents/create-and-attach',
          expect.objectContaining({
            title: '新建Markdown文档',
            type: 'markdown',
            status: 'draft',
          })
        );
      });

      // Step 3: Switch to edit mode
      await user.click(screen.getByRole('button', { name: /编辑/ }));

      // Step 4: Edit the document content
      const editor = screen.getByTestId('document-editor');
      const titleInput = within(editor).getByDisplayValue(/新建Markdown文档/);
      
      await user.clear(titleInput);
      await user.type(titleInput, '新创建的文档');

      const contentTextarea = within(editor).getByDisplayValue(/请在这里编写文档内容/);
      await user.clear(contentTextarea);
      await user.type(contentTextarea, '这是新创建的文档内容，包含详细说明。');

      // Step 5: Save the document
      const saveButton = within(editor).getByText('保存');
      await user.click(saveButton);

      // Step 6: Verify save API call
      await waitFor(() => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          `/documents/${newDocument.id}`,
          expect.objectContaining({
            title: '新创建的文档',
            content: expect.stringContaining('这是新创建的文档内容'),
          })
        );
      });

      // Step 7: Verify success message
      expect(screen.getByText('文档保存成功')).toBeInTheDocument();

      // Step 8: Switch to preview mode to verify changes
      await user.click(screen.getByRole('button', { name: /预览/ }));
      expect(screen.getByText('新创建的文档')).toBeInTheDocument();
      expect(screen.getByText('这是新创建的文档内容')).toBeInTheDocument();
    });

    it('should handle advanced document creation with custom options', async () => {
      const customDocument = {
        id: 4,
        title: '自定义配置文档',
        content: '自定义内容',
        type: 'text',
        description: '这是自定义描述',
      };

      mockedApi.post.mockResolvedValue({ data: customDocument });

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('任务文档')).toBeInTheDocument();
      });

      // Step 1: Open advanced creation modal
      const moreButton = screen.getByTitle('更多操作');
      await user.click(moreButton);
      await user.click(screen.getByText('新建文档 (高级)'));

      // Step 2: Fill out advanced form
      await user.type(screen.getByLabelText(/文档标题/), '自定义配置文档');
      await user.type(screen.getByLabelText(/文档描述/), '这是自定义描述');

      // Select text type instead of markdown
      await user.click(screen.getByText('纯文本'));

      // Step 3: Create the document
      await user.click(screen.getByText('创建'));

      // Step 4: Verify API call with custom options
      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith(
          '/projects/1/tasks/100/documents/create-and-attach',
          expect.objectContaining({
            title: '自定义配置文档',
            description: '这是自定义描述',
            type: 'text',
          })
        );
      });

      // Step 5: Verify modal closes and document appears
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complete File Upload and Management Flow', () => {
    it('should allow user to upload files and manage them', async () => {
      const uploadedFile = {
        id: 5,
        original_name: 'project-spec.pdf',
        file_name: 'project-spec.pdf',
        file_path: '/uploads/project-spec.pdf',
        mime_type: 'application/pdf',
        file_size: 1024000, // 1MB
        uploaded_at: new Date().toISOString(),
      };

      mockedTaskDocumentService.uploadDocument.mockResolvedValue(uploadedFile);

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Step 1: Upload a file via upload button
      const file = new File(['PDF content'], 'project-spec.pdf', { type: 'application/pdf' });
      const uploadButton = screen.getByText('上传文件');
      const fileInput = uploadButton.closest('.ant-upload')?.querySelector('input[type="file"]');

      if (fileInput) {
        await user.upload(fileInput, file);
      }

      // Step 2: Verify upload API call
      await waitFor(() => {
        expect(mockedTaskDocumentService.uploadDocument).toHaveBeenCalledWith(
          1, 100, file, expect.any(Function)
        );
      });

      // Step 3: Verify success message and file appears in list
      expect(screen.getByText('文档上传成功')).toBeInTheDocument();
      expect(screen.getByText('project-spec.pdf')).toBeInTheDocument();

      // Step 4: Test file viewing
      const viewButton = within(screen.getByText('project-spec.pdf').closest('.ant-list-item')!)
        .getByTitle('查看PDF');
      
      // Mock window.open
      const mockWindowOpen = jest.fn();
      global.window.open = mockWindowOpen;

      await user.click(viewButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/files/view?path='),
        '_blank'
      );

      // Step 5: Test file download
      mockedTaskDocumentService.downloadFile.mockResolvedValue(undefined);
      
      const downloadButton = within(screen.getByText('project-spec.pdf').closest('.ant-list-item')!)
        .getByTitle('下载');
      
      await user.click(downloadButton);

      expect(mockedTaskDocumentService.downloadFile).toHaveBeenCalledWith(
        '/uploads/project-spec.pdf',
        'project-spec.pdf'
      );
    });

    it('should handle multiple file uploads with progress tracking', async () => {
      const files = [
        new File(['Doc 1'], 'doc1.pdf', { type: 'application/pdf' }),
        new File(['Doc 2'], 'doc2.pdf', { type: 'application/pdf' }),
        new File(['Image 1'], 'img1.jpg', { type: 'image/jpeg' }),
      ];

      // Mock progress tracking
      mockedTaskDocumentService.uploadDocument.mockImplementation(
        (projectId, taskId, file, onProgress) => {
          return new Promise((resolve) => {
            setTimeout(() => onProgress(50), 100);
            setTimeout(() => onProgress(100), 200);
            setTimeout(() => resolve({
              id: Math.random(),
              original_name: file.name,
              file_name: file.name,
              file_path: `/uploads/${file.name}`,
              mime_type: file.type,
              file_size: file.size,
              uploaded_at: new Date().toISOString(),
            }), 300);
          });
        }
      );

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('上传文件')).toBeInTheDocument();
      });

      // Upload multiple files
      const uploadButton = screen.getByText('上传文件');
      const fileInput = uploadButton.closest('.ant-upload')?.querySelector('input[type="file"]');

      if (fileInput) {
        await user.upload(fileInput, files);
      }

      // Should show upload progress and complete
      await waitFor(() => {
        expect(screen.getByText('成功上传 3 个文件')).toBeInTheDocument();
      }, { timeout: 5000 });

      // All files should appear in the list
      expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
      expect(screen.getByText('doc2.pdf')).toBeInTheDocument();
      expect(screen.getByText('img1.jpg')).toBeInTheDocument();
    });
  });

  describe('Document List Management Flow', () => {
    it('should allow user to switch between different list views', async () => {
      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Default is grouped view
      expect(screen.getByText('MARKDOWN (2)')).toBeInTheDocument();

      // Step 1: Switch to timeline view
      const moreButton = screen.getByTitle('更多操作');
      await user.click(moreButton);
      await user.click(screen.getByText('📅 时间线'));

      expect(screen.getByText(/按.*时间排序/)).toBeInTheDocument();

      // Step 2: Switch to grid view
      await user.click(moreButton);
      await user.click(screen.getByText('⚏ 网格视图'));

      // Documents should be displayed in grid format
      const gridContainer = screen.getByTestId('grid-view-container');
      expect(gridContainer).toBeInTheDocument();

      // Step 3: Switch to list view
      await user.click(moreButton);
      await user.click(screen.getByText('📋 列表视图'));

      // Should show detailed list format
      expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      expect(screen.getByText('设计文档')).toBeInTheDocument();
    });

    it('should handle sorting and filtering documents', async () => {
      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('设计文档')).toBeInTheDocument();
      });

      // Step 1: Change sort order
      const moreButton = screen.getByTitle('更多操作');
      await user.click(moreButton);
      await user.click(screen.getByText('🔄 按更新时间(新→旧)'));

      // Documents should be re-ordered (设计文档 is newer)
      const documentItems = screen.getAllByText(/文档/);
      expect(documentItems[0]).toHaveTextContent('设计文档');

      // Step 2: Filter by document scope if subtasks exist
      // First enable subtask inclusion
      await user.click(screen.getByText('仅本任务'));
      await user.click(screen.getByText('含下级'));

      // Then test filtering
      await user.click(screen.getByText('仅本任务'));
      
      // Should only show documents from current task
      expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      expect(screen.getByText('设计文档')).toBeInTheDocument();
    });
  });

  describe('Document Operations Flow', () => {
    it('should handle document deletion with confirmation', async () => {
      mockedDocumentService.deleteDocument.mockResolvedValue(undefined);

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Step 1: Right-click on document to open context menu
      const documentItem = screen.getByText('需求分析文档').closest('.ant-list-item');
      fireEvent.contextMenu(documentItem!);

      // Step 2: Click delete from context menu
      await waitFor(() => {
        expect(screen.getByText('删除文档')).toBeInTheDocument();
      });

      await user.click(screen.getByText('删除文档'));

      // Step 3: Verify confirmation modal appears
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
        expect(screen.getByText(/确定要删除文档.*需求分析文档.*吗/)).toBeInTheDocument();
      });

      // Step 4: Confirm deletion
      await user.click(screen.getByText('删除'));

      // Step 5: Verify API call and success message
      await waitFor(() => {
        expect(mockedDocumentService.deleteDocument).toHaveBeenCalledWith(1);
        expect(screen.getByText('文档删除成功')).toBeInTheDocument();
      });

      // Step 6: Document should be removed from list
      expect(screen.queryByText('需求分析文档')).not.toBeInTheDocument();
    });

    it('should handle document sharing via link copy', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Right-click to open context menu
      const documentItem = screen.getByText('需求分析文档').closest('.ant-list-item');
      fireEvent.contextMenu(documentItem!);

      // Click copy link
      await user.click(screen.getByText('复制链接'));

      // Verify clipboard operation
      expect(mockWriteText).toHaveBeenCalledWith('/projects/1/tasks/100/documents/1');
      expect(screen.getByText('文档链接已复制')).toBeInTheDocument();
    });

    it('should handle document template creation', async () => {
      mockedApi.put.mockResolvedValue({ data: { ...mockDocuments[0], is_template: true } });

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Select document and access template options
      await user.click(screen.getByText('需求分析文档'));
      
      // Right-click for context menu
      fireEvent.contextMenu(screen.getByText('需求分析文档').closest('.ant-list-item')!);

      await user.click(screen.getByText('设为模板'));

      // Verify template creation
      await waitFor(() => {
        expect(mockedApi.put).toHaveBeenCalledWith(
          '/documents/1',
          expect.objectContaining({ is_template: true })
        );
      });

      expect(screen.getByText('文档已设为模板')).toBeInTheDocument();
    });
  });

  describe('Document Collaboration Flow', () => {
    it('should handle real-time document updates', async () => {
      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Select document and enter edit mode
      await user.click(screen.getByText('需求分析文档'));
      await user.click(screen.getByRole('button', { name: /编辑/ }));

      // Simulate concurrent edit (another user modifies the document)
      const updatedDocument = {
        ...mockDocuments[0],
        content: '# 需求分析 (已更新)\n\n其他用户已修改此文档',
        updated_at: new Date().toISOString(),
        version: 2,
      };

      // Mock document refresh showing the update
      mockedDocumentService.getTaskDocuments.mockResolvedValue({
        documents: [updatedDocument, mockDocuments[1]],
        total: 2,
      });

      // Trigger refresh (simulating real-time update)
      const refreshButton = screen.getByTitle('刷新');
      await user.click(refreshButton);

      // Should show updated content
      await waitFor(() => {
        expect(screen.getByText(/已更新/)).toBeInTheDocument();
      });

      // Should prompt user about concurrent changes
      expect(screen.getByText(/文档已被其他用户修改/)).toBeInTheDocument();
    });

    it('should handle version conflicts during save', async () => {
      mockedApi.put.mockRejectedValue(new Error('版本冲突：文档已被其他用户修改'));

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Edit and try to save
      await user.click(screen.getByText('需求分析文档'));
      await user.click(screen.getByRole('button', { name: /编辑/ }));

      const editor = screen.getByTestId('document-editor');
      const contentTextarea = within(editor).getByRole('textbox');
      await user.type(contentTextarea, '添加新内容');

      const saveButton = within(editor).getByText('保存');
      await user.click(saveButton);

      // Should show conflict resolution dialog
      await waitFor(() => {
        expect(screen.getByText('版本冲突')).toBeInTheDocument();
        expect(screen.getByText('覆盖保存')).toBeInTheDocument();
        expect(screen.getByText('放弃更改')).toBeInTheDocument();
        expect(screen.getByText('手动合并')).toBeInTheDocument();
      });
    });
  });

  describe('Fullscreen Document Editing Flow', () => {
    it('should provide distraction-free editing experience', async () => {
      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Enter fullscreen mode
      await user.click(screen.getByTitle('全屏查看'));

      // Should enter fullscreen mode
      const container = document.querySelector('.unified-task-document-area');
      expect(container).toHaveClass('fullscreen');
      expect(document.body).toHaveClass('fullscreen-doc-active');

      // Should hide other page elements
      expect(screen.queryByText('任务详情')).not.toBeInTheDocument();

      // Select document and edit in fullscreen
      await user.click(screen.getByText('需求分析文档'));
      await user.click(screen.getByRole('button', { name: /编辑/ }));

      // Should have full editor interface
      const editor = screen.getByTestId('document-editor');
      expect(editor).toBeInTheDocument();

      // Exit fullscreen with Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(container).not.toHaveClass('fullscreen');
        expect(document.body).not.toHaveClass('fullscreen-doc-active');
      });
    });
  });

  describe('Document Statistics and Analytics Flow', () => {
    it('should display comprehensive document statistics', async () => {
      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Switch to statistics view
      await user.click(screen.getByRole('button', { name: /统计/ }));

      // Should show document statistics
      expect(screen.getByText('文档统计')).toBeInTheDocument();
      expect(screen.getByText('文档总数')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total documents
      
      // Should show size statistics
      expect(screen.getByText('总大小')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // 5KB total

      // Should show type distribution
      expect(screen.getByText('文档类型分布')).toBeInTheDocument();
      expect(screen.getByText('MARKDOWN: 2')).toBeInTheDocument();
    });

    it('should show detailed analytics for selected document', async () => {
      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Select a document to view its details
      await user.click(screen.getByText('需求分析文档'));

      // Should show document overview in sidebar
      expect(screen.getByText('📊 文档概览')).toBeInTheDocument();
      expect(screen.getByText('📋 基本信息')).toBeInTheDocument();
      
      // Should show file details
      expect(screen.getByText('2KB')).toBeInTheDocument(); // File size
      expect(screen.getByText('v1')).toBeInTheDocument(); // Version
      expect(screen.getByText('已发布')).toBeInTheDocument(); // Status
      
      // Should show tags
      expect(screen.getByText('🏷️ 标签分类')).toBeInTheDocument();
      expect(screen.getByText('requirement')).toBeInTheDocument();
      expect(screen.getByText('analysis')).toBeInTheDocument();

      // Should show quick actions
      expect(screen.getByText('⚡ 快速操作')).toBeInTheDocument();
      expect(screen.getByText('编辑文档')).toBeInTheDocument();
      expect(screen.getByText('下载文档')).toBeInTheDocument();
      expect(screen.getByText('分享链接')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Edge Cases Flow', () => {
    it('should handle document loading failures gracefully', async () => {
      mockedDocumentService.getTaskDocuments.mockRejectedValue(
        new Error('文档服务暂不可用')
      );

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('加载文档列表失败')).toBeInTheDocument();
        expect(screen.getByText('重试')).toBeInTheDocument();
      });

      // Test retry functionality
      mockedDocumentService.getTaskDocuments.mockResolvedValue({
        documents: mockDocuments,
        total: mockDocuments.length,
      });

      await user.click(screen.getByText('重试'));

      // Should recover and show documents
      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
        expect(screen.queryByText('加载文档列表失败')).not.toBeInTheDocument();
      });
    });

    it('should handle large file uploads with proper feedback', async () => {
      const largeFile = new File(
        [new ArrayBuffer(50 * 1024 * 1024)], // 50MB file
        'large-document.pdf',
        { type: 'application/pdf' }
      );

      mockedTaskDocumentService.uploadDocument.mockRejectedValue(
        new Error('文件大小超出限制')
      );

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('上传文件')).toBeInTheDocument();
      });

      // Try to upload large file
      const uploadButton = screen.getByText('上传文件');
      const fileInput = uploadButton.closest('.ant-upload')?.querySelector('input[type="file"]');

      if (fileInput) {
        await user.upload(fileInput, largeFile);
      }

      // Should show appropriate error message
      await waitFor(() => {
        expect(screen.getByText('文档上传失败')).toBeInTheDocument();
        expect(screen.getByText(/文件大小超出限制/)).toBeInTheDocument();
      });
    });

    it('should handle corrupted document data gracefully', async () => {
      const corruptedDocument = {
        ...mockDocuments[0],
        content: null, // Corrupted content
        title: undefined, // Missing title
      };

      mockedDocumentService.getTaskDocuments.mockResolvedValue({
        documents: [corruptedDocument, mockDocuments[1]],
        total: 2,
      });

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      // Should handle corrupted data without crashing
      await waitFor(() => {
        expect(screen.getByText('设计文档')).toBeInTheDocument(); // Good document still shows
      });

      // Should show error indicator for corrupted document
      expect(screen.getByText('无标题文档')).toBeInTheDocument();
      expect(screen.getByText('数据损坏')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsive Flow', () => {
    it('should adapt document management for mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      // Should render mobile-optimized interface
      expect(screen.getByTestId('mobile-document-area')).toBeInTheDocument();

      // Should adapt layout for touch interface
      expect(screen.getByTestId('mobile-document-list')).toBeInTheDocument();

      // Action buttons should be appropriately sized
      const actionButtons = screen.getAllByRole('button');
      actionButtons.forEach(button => {
        const style = window.getComputedStyle(button);
        expect(parseInt(style.minHeight)).toBeGreaterThanOrEqual(44); // Touch target size
      });
    });

    it('should handle mobile gestures for document operations', async () => {
      // Mock touch events
      const mockTouchStart = jest.fn();
      const mockTouchEnd = jest.fn();

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<TaskDetailPageNew taskId={100} />);

      await waitFor(() => {
        expect(screen.getByText('需求分析文档')).toBeInTheDocument();
      });

      // Test swipe gesture on document item
      const documentItem = screen.getByText('需求分析文档').closest('.ant-list-item');
      
      fireEvent.touchStart(documentItem!, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(documentItem!, {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      });

      // Should reveal action buttons or trigger action
      expect(screen.getByTestId('mobile-action-panel')).toBeInTheDocument();
    });
  });
});