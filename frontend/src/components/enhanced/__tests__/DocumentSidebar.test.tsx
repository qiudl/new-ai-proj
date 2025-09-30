import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentSidebar from '../DocumentSidebar';
import { taskDocumentService } from '../../../services/taskDocumentService';

// Mock 服务
jest.mock('../../../services/taskDocumentService');
const mockTaskDocumentService = taskDocumentService as jest.Mocked<typeof taskDocumentService>;

// Mock message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}));

const defaultProps = {
  taskId: 123,
  projectId: 1,
  collapsed: false,
  onDocumentSelect: jest.fn(),
  onDocumentEdit: jest.fn(),
  onDocumentDelete: jest.fn(),
  onCollapsedChange: jest.fn()
};

const mockDocumentResponse = {
  content: '# 测试文档\n\n这是一个测试文档的内容。包含了一些测试数据和说明文档的基本结构。'
};

describe('DocumentSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskDocumentService.getTaskDocument.mockResolvedValue(mockDocumentResponse);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('应该正确渲染文档侧边栏', async () => {
    render(<DocumentSidebar {...defaultProps} />);
    
    expect(screen.getByTestId('document-sidebar')).toBeInTheDocument();
    expect(screen.getByText('文档列表')).toBeInTheDocument();
  });

  it('折叠状态下应该隐藏内容', () => {
    render(<DocumentSidebar {...defaultProps} collapsed={true} />);
    
    const sidebar = screen.getByTestId('document-sidebar');
    expect(sidebar).toHaveClass('collapsed');
  });

  it('应该正确加载和显示文档列表', async () => {
    render(<DocumentSidebar {...defaultProps} />);
    
    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });

    expect(mockTaskDocumentService.getTaskDocument).toHaveBeenCalledWith(123, 1);
    expect(screen.getByText('1')).toBeInTheDocument(); // 文档计数Badge
  });

  it('搜索功能应该正常工作', async () => {
    render(<DocumentSidebar {...defaultProps} />);
    
    // 等待文档加载
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索文档标题、内容或标签...');
    fireEvent.change(searchInput, { target: { value: '主文档' } });
    
    // 防抖后应该能找到匹配的文档
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });
  });

  it('文档卡片点击应该触发选择回调', async () => {
    const mockOnSelect = jest.fn();
    render(
      <DocumentSidebar 
        {...defaultProps} 
        onDocumentSelect={mockOnSelect}
      />
    );
    
    // 等待文档加载
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });

    const documentCard = screen.getByTestId('document-card');
    fireEvent.click(documentCard);
    
    expect(mockOnSelect).toHaveBeenCalledWith('main-doc');
  });

  it('文档编辑功能应该正常工作', async () => {
    const mockOnEdit = jest.fn();
    render(
      <DocumentSidebar 
        {...defaultProps} 
        onDocumentEdit={mockOnEdit}
      />
    );
    
    // 等待文档加载
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });

    const documentCard = screen.getByTestId('document-card');
    
    // 鼠标悬停显示操作按钮
    fireEvent.mouseEnter(documentCard);
    
    await waitFor(() => {
      const editButton = screen.getByTitle('编辑文档');
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalledWith('main-doc');
    });
  });

  it('文档删除功能应该正常工作', async () => {
    const mockOnDelete = jest.fn();
    render(
      <DocumentSidebar 
        {...defaultProps} 
        onDocumentDelete={mockOnDelete}
      />
    );
    
    // 等待文档加载
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });

    const documentCard = screen.getByTestId('document-card');
    
    // 鼠标悬停显示操作按钮
    fireEvent.mouseEnter(documentCard);
    
    await waitFor(() => {
      const deleteButton = screen.getByTitle('删除文档');
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith('main-doc');
    });
  });

  it('加载失败时应该显示错误状态', async () => {
    mockTaskDocumentService.getTaskDocument.mockRejectedValue(new Error('加载失败'));
    
    render(<DocumentSidebar {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/加载文档列表失败/)).toBeInTheDocument();
    });
  });

  it('无文档时应该显示空状态', async () => {
    mockTaskDocumentService.getTaskDocument.mockResolvedValue(null);
    
    render(<DocumentSidebar {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('暂无文档')).toBeInTheDocument();
    });
  });

  it('搜索无结果时应该显示空列表', async () => {
    render(<DocumentSidebar {...defaultProps} />);
    
    // 等待文档加载
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索文档标题、内容或标签...');
    fireEvent.change(searchInput, { target: { value: '不存在的文档' } });
    
    // 等待搜索过滤
    await waitFor(() => {
      expect(screen.queryByText('任务主文档')).not.toBeInTheDocument();
    });
  });

  it('清除搜索应该恢复完整列表', async () => {
    render(<DocumentSidebar {...defaultProps} />);
    
    // 等待文档加载
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索文档标题、内容或标签...');
    
    // 输入搜索词
    fireEvent.change(searchInput, { target: { value: '不存在的文档' } });
    
    await waitFor(() => {
      expect(screen.queryByText('任务主文档')).not.toBeInTheDocument();
    });

    // 清除搜索
    fireEvent.change(searchInput, { target: { value: '' } });
    
    await waitFor(() => {
      expect(screen.getByText('任务主文档')).toBeInTheDocument();
    });
  });

  it('折叠切换应该触发回调', async () => {
    const mockOnCollapsedChange = jest.fn();
    render(
      <DocumentSidebar 
        {...defaultProps} 
        onCollapsedChange={mockOnCollapsedChange}
      />
    );
    
    const collapseButton = screen.getByTitle('折叠侧边栏');
    fireEvent.click(collapseButton);
    
    expect(mockOnCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('应该正确格式化文件大小', async () => {
    // 修改mock返回更大的内容以测试文件大小格式化
    const largeContent = 'x'.repeat(2048); // 2KB内容
    mockTaskDocumentService.getTaskDocument.mockResolvedValue({
      content: largeContent
    });

    render(<DocumentSidebar {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });
  });

  it('应该正确显示文档类型标签', async () => {
    render(<DocumentSidebar {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('MARKDOWN')).toBeInTheDocument();
    });
  });
});