import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentCard from '../DocumentCard';
import { DocumentInfo } from '../DocumentSidebar';

const mockDocument: DocumentInfo = {
  id: 'test-doc-1',
  title: '测试文档.md',
  type: 'markdown',
  size: 1024,
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
  content: '这是测试文档的预览内容，用于验证卡片组件的显示效果...',
  tags: ['测试', '文档', 'Markdown'],
  author: 'test-user'
};

const defaultProps = {
  document: mockDocument,
  isSelected: false,
  isLoading: false,
  onSelect: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onPreview: jest.fn()
};

describe('DocumentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确渲染文档卡片', () => {
    render(<DocumentCard {...defaultProps} />);
    
    expect(screen.getByTestId('document-card')).toBeInTheDocument();
    expect(screen.getByText('测试文档.md')).toBeInTheDocument();
    expect(screen.getByText('MARKDOWN')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    expect(screen.getByText('2小时前更新')).toBeInTheDocument();
    expect(screen.getByText('test-user')).toBeInTheDocument();
  });

  it('应该显示文档内容预览', () => {
    render(<DocumentCard {...defaultProps} />);
    
    expect(screen.getByText(/这是测试文档的预览内容/)).toBeInTheDocument();
  });

  it('应该显示文档标签', () => {
    render(<DocumentCard {...defaultProps} />);
    
    expect(screen.getByText('测试')).toBeInTheDocument();
    expect(screen.getByText('文档')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
  });

  it('选中状态应该正确显示', () => {
    render(<DocumentCard {...defaultProps} isSelected={true} />);
    
    const card = screen.getByTestId('document-card');
    expect(card).toHaveClass('selected');
    
    const statusIndicator = card.querySelector('.status-indicator');
    expect(statusIndicator).toHaveClass('active');
  });

  it('加载状态应该正确显示', () => {
    render(<DocumentCard {...defaultProps} isLoading={true} />);
    
    const loadingBar = screen.getByTestId('document-card').querySelector('.loading-bar');
    expect(loadingBar).toBeInTheDocument();
  });

  it('点击卡片应该触发选择回调', () => {
    const mockOnSelect = jest.fn();
    render(<DocumentCard {...defaultProps} onSelect={mockOnSelect} />);
    
    const card = screen.getByTestId('document-card');
    fireEvent.click(card);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('鼠标悬停应该显示操作按钮', () => {
    render(<DocumentCard {...defaultProps} />);
    
    const card = screen.getByTestId('document-card');
    
    // 鼠标悬停前，操作按钮不应该可见
    expect(card.querySelector('.document-actions')).not.toHaveClass('visible');
    
    // 鼠标悬停
    fireEvent.mouseEnter(card);
    
    // 操作按钮应该变为可见
    expect(card.querySelector('.document-actions')).toHaveClass('visible');
  });

  it('预览按钮应该正常工作', () => {
    const mockOnPreview = jest.fn();
    render(<DocumentCard {...defaultProps} onPreview={mockOnPreview} />);
    
    const card = screen.getByTestId('document-card');
    fireEvent.mouseEnter(card);
    
    const previewButton = screen.getByTitle('快速预览');
    fireEvent.click(previewButton);
    
    expect(mockOnPreview).toHaveBeenCalled();
  });

  it('编辑按钮应该正常工作', () => {
    const mockOnEdit = jest.fn();
    render(<DocumentCard {...defaultProps} onEdit={mockOnEdit} />);
    
    const card = screen.getByTestId('document-card');
    fireEvent.mouseEnter(card);
    
    const editButton = screen.getByTitle('编辑文档');
    fireEvent.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalled();
  });

  it('删除按钮应该正常工作', () => {
    const mockOnDelete = jest.fn();
    render(<DocumentCard {...defaultProps} onDelete={mockOnDelete} />);
    
    const card = screen.getByTestId('document-card');
    fireEvent.mouseEnter(card);
    
    const deleteButton = screen.getByTitle('删除文档');
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('操作按钮点击不应该触发卡片选择', () => {
    const mockOnSelect = jest.fn();
    const mockOnEdit = jest.fn();
    render(
      <DocumentCard 
        {...defaultProps} 
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
      />
    );
    
    const card = screen.getByTestId('document-card');
    fireEvent.mouseEnter(card);
    
    const editButton = screen.getByTitle('编辑文档');
    fireEvent.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalled();
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('应该正确格式化不同的文件大小', () => {
    const testCases = [
      { size: 0, expected: '0 B' },
      { size: 512, expected: '512 B' },
      { size: 1536, expected: '1.5 KB' },
      { size: 1048576, expected: '1.0 MB' },
      { size: 2147483648, expected: '2.0 GB' }
    ];

    testCases.forEach(({ size, expected }) => {
      const { rerender } = render(
        <DocumentCard 
          {...defaultProps} 
          document={{ ...mockDocument, size }}
        />
      );
      
      expect(screen.getByText(expected)).toBeInTheDocument();
      
      rerender(<div />); // 清理
    });
  });

  it('应该正确格式化不同的更新时间', () => {
    const now = new Date();
    const testCases = [
      { 
        time: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30分钟前
        expected: '刚刚更新' 
      },
      { 
        time: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
        expected: '5小时前更新' 
      },
      { 
        time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
        expected: '2天前更新' 
      }
    ];

    testCases.forEach(({ time, expected }) => {
      const { rerender } = render(
        <DocumentCard 
          {...defaultProps} 
          document={{ ...mockDocument, updatedAt: time }}
        />
      );
      
      expect(screen.getByText(expected)).toBeInTheDocument();
      
      rerender(<div />); // 清理
    });
  });

  it('应该正确显示不同文件类型的图标', () => {
    const testCases = [
      { type: 'markdown' as const, iconClass: 'anticon-file-markdown' },
      { type: 'pdf' as const, iconClass: 'anticon-file-pdf' },
      { type: 'text' as const, iconClass: 'anticon-file-text' }
    ];

    testCases.forEach(({ type, iconClass }) => {
      const { rerender } = render(
        <DocumentCard 
          {...defaultProps} 
          document={{ ...mockDocument, type }}
        />
      );
      
      const icon = document.querySelector(`.${iconClass}`);
      expect(icon).toBeInTheDocument();
      
      rerender(<div />); // 清理
    });
  });

  it('超过3个标签时应该显示更多标签指示器', () => {
    const documentWithManyTags = {
      ...mockDocument,
      tags: ['标签1', '标签2', '标签3', '标签4', '标签5']
    };

    render(<DocumentCard {...defaultProps} document={documentWithManyTags} />);
    
    expect(screen.getByText('标签1')).toBeInTheDocument();
    expect(screen.getByText('标签2')).toBeInTheDocument();
    expect(screen.getByText('标签3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument(); // 剩余2个标签
    expect(screen.queryByText('标签4')).not.toBeInTheDocument();
  });

  it('没有可选操作时不应该显示对应按钮', () => {
    render(
      <DocumentCard 
        {...defaultProps} 
        onEdit={undefined}
        onDelete={undefined}
        onPreview={undefined}
      />
    );
    
    const card = screen.getByTestId('document-card');
    fireEvent.mouseEnter(card);
    
    expect(screen.queryByTitle('编辑文档')).not.toBeInTheDocument();
    expect(screen.queryByTitle('删除文档')).not.toBeInTheDocument();
    expect(screen.queryByTitle('快速预览')).not.toBeInTheDocument();
  });
});