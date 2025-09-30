import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FullscreenToolbar from '../FullscreenToolbar';

const defaultProps = {
  viewMode: 'preview' as const,
  sidebarCollapsed: false,
  showOutline: false,
  isCompactMode: false,
  fontSize: 14,
  theme: 'light' as const,
  onViewModeChange: jest.fn(),
  onSidebarToggle: jest.fn(),
  onOutlineToggle: jest.fn(),
  onCompactModeToggle: jest.fn(),
  onThemeChange: jest.fn(),
  onFontSizeChange: jest.fn(),
  onDownload: jest.fn(),
  onPrint: jest.fn(),
  onShare: jest.fn(),
  onSettings: jest.fn(),
  onClose: jest.fn(),
};

describe('FullscreenToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理document事件监听器
    document.removeEventListener('mousemove', jest.fn());
    document.removeEventListener('keydown', jest.fn());
  });

  it('应该正确渲染工具栏', () => {
    render(<FullscreenToolbar {...defaultProps} />);
    expect(screen.getByTestId('fullscreen-toolbar')).toBeInTheDocument();
  });

  it('应该显示正确的按钮', () => {
    render(<FullscreenToolbar {...defaultProps} />);
    
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('edit-mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('close-button')).toBeInTheDocument();
  });

  it('侧边栏切换按钮应该正常工作', () => {
    render(<FullscreenToolbar {...defaultProps} />);
    
    const sidebarToggle = screen.getByTestId('sidebar-toggle');
    fireEvent.click(sidebarToggle);
    
    expect(defaultProps.onSidebarToggle).toHaveBeenCalled();
  });

  it('编辑模式切换应该正常工作', () => {
    render(<FullscreenToolbar {...defaultProps} />);
    
    const editToggle = screen.getByTestId('edit-mode-toggle');
    fireEvent.click(editToggle);
    
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith('edit');
  });

  it('关闭按钮应该正常工作', () => {
    render(<FullscreenToolbar {...defaultProps} />);
    
    const closeButton = screen.getByTestId('close-button');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('快捷键应该正常工作', () => {
    render(<FullscreenToolbar {...defaultProps} />);
    
    // 测试ESC键
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('应该在3秒后自动隐藏', async () => {
    render(<FullscreenToolbar {...defaultProps} autoHide={true} hideDelay={1000} />);
    
    const toolbar = screen.getByTestId('fullscreen-toolbar');
    expect(toolbar).toHaveClass('visible');
    
    // 等待自动隐藏
    await waitFor(() => {
      expect(toolbar).toHaveClass('hidden');
    }, { timeout: 2000 });
  });

  it('鼠标移动时应该显示工具栏', async () => {
    render(<FullscreenToolbar {...defaultProps} autoHide={true} hideDelay={1000} />);
    
    const toolbar = screen.getByTestId('fullscreen-toolbar');
    
    // 等待自动隐藏
    await waitFor(() => {
      expect(toolbar).toHaveClass('hidden');
    }, { timeout: 2000 });

    // 模拟鼠标移动
    fireEvent.mouseMove(document);
    
    expect(toolbar).toHaveClass('visible');
  });

  it('显示标题时应该正确渲染', () => {
    const title = '测试文档标题';
    const subtitle = '项目 1 · 任务 123';
    
    render(
      <FullscreenToolbar 
        {...defaultProps} 
        showTitle={true}
        title={title}
        subtitle={subtitle}
      />
    );
    
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
  });

  it('字体大小控制应该正常工作', () => {
    render(<FullscreenToolbar {...defaultProps} fontSize={16} />);
    
    // 查找字体控制组件
    const fontControl = document.querySelector('.font-size-control');
    expect(fontControl).toBeInTheDocument();
  });

  it('暗色主题应该正确应用', () => {
    render(<FullscreenToolbar {...defaultProps} theme="dark" />);
    
    const toolbar = screen.getByTestId('fullscreen-toolbar');
    expect(toolbar).toHaveClass('dark-theme');
  });
});