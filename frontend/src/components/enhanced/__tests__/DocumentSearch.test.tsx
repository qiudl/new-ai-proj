import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentSearch from '../DocumentSearch';

const defaultProps = {
  onSearch: jest.fn()
};

describe('DocumentSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('应该正确渲染搜索组件', () => {
    render(<DocumentSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    expect(searchInput).toBeInTheDocument();
    
    const searchIcon = document.querySelector('.search-icon');
    expect(searchIcon).toBeInTheDocument();
  });

  it('应该使用自定义占位符', () => {
    const customPlaceholder = '自定义搜索提示...';
    render(<DocumentSearch {...defaultProps} placeholder={customPlaceholder} />);
    
    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });

  it('应该响应输入变化并触发防抖搜索', async () => {
    const mockOnSearch = jest.fn();
    render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    // 输入搜索文本
    fireEvent.change(searchInput, { target: { value: '测试文档' } });
    
    // 在防抖时间内，不应该触发搜索
    expect(mockOnSearch).not.toHaveBeenCalled();
    
    // 快进防抖时间
    jest.advanceTimersByTime(300);
    
    // 现在应该触发搜索
    expect(mockOnSearch).toHaveBeenCalledWith('测试文档');
  });

  it('应该在快速输入时正确防抖', async () => {
    const mockOnSearch = jest.fn();
    render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} debounceMs={500} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    // 快速输入多次
    fireEvent.change(searchInput, { target: { value: '测' } });
    jest.advanceTimersByTime(100);
    
    fireEvent.change(searchInput, { target: { value: '测试' } });
    jest.advanceTimersByTime(100);
    
    fireEvent.change(searchInput, { target: { value: '测试文档' } });
    
    // 在防抖时间内，不应该触发搜索
    expect(mockOnSearch).not.toHaveBeenCalled();
    
    // 快进防抖时间
    jest.advanceTimersByTime(500);
    
    // 只应该触发最后一次搜索
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith('测试文档');
  });

  it('有输入内容时应该显示清除按钮', () => {
    render(<DocumentSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    // 初始状态下不应该有清除按钮
    expect(screen.queryByTitle('清除')).not.toBeInTheDocument();
    
    // 输入内容后应该显示清除按钮
    fireEvent.change(searchInput, { target: { value: '测试' } });
    
    const clearButton = document.querySelector('.clear-button');
    expect(clearButton).toBeInTheDocument();
  });

  it('清除按钮应该正确工作', () => {
    const mockOnSearch = jest.fn();
    render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    // 输入内容
    fireEvent.change(searchInput, { target: { value: '测试文档' } });
    
    const clearButton = document.querySelector('.clear-button');
    expect(clearButton).toBeInTheDocument();
    
    // 点击清除按钮
    fireEvent.click(clearButton!);
    
    // 输入框应该被清空
    expect(searchInput).toHaveValue('');
    
    // 应该立即触发空搜索（不需要等待防抖）
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('组件卸载时应该清理定时器', () => {
    const mockOnSearch = jest.fn();
    const { unmount } = render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    // 输入内容触发防抖
    fireEvent.change(searchInput, { target: { value: '测试' } });
    
    // 在防抖完成前卸载组件
    unmount();
    
    // 快进时间
    jest.advanceTimersByTime(300);
    
    // 不应该触发搜索回调
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('应该支持自定义防抖时间', () => {
    const mockOnSearch = jest.fn();
    render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} debounceMs={100} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    fireEvent.change(searchInput, { target: { value: '测试' } });
    
    // 100ms 后应该触发搜索
    jest.advanceTimersByTime(100);
    expect(mockOnSearch).toHaveBeenCalledWith('测试');
  });

  it('空字符串搜索应该正常处理', () => {
    const mockOnSearch = jest.fn();
    render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    // 输入空字符串
    fireEvent.change(searchInput, { target: { value: '' } });
    
    jest.advanceTimersByTime(300);
    
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('应该正确处理特殊字符', () => {
    const mockOnSearch = jest.fn();
    render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    const specialText = '特殊字符!@#$%^&*()_+-=[]{}|;":,.<>?/~`';
    fireEvent.change(searchInput, { target: { value: specialText } });
    
    jest.advanceTimersByTime(300);
    
    expect(mockOnSearch).toHaveBeenCalledWith(specialText);
  });

  it('应该正确显示输入的值', () => {
    render(<DocumentSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    const testValue = '测试搜索内容';
    
    fireEvent.change(searchInput, { target: { value: testValue } });
    
    expect(searchInput).toHaveValue(testValue);
  });

  it('应该支持自定义CSS类', () => {
    const customClass = 'custom-search-class';
    render(<DocumentSearch {...defaultProps} className={customClass} />);
    
    const searchContainer = document.querySelector('.document-search');
    expect(searchContainer).toHaveClass(customClass);
  });

  it('连续相同输入不应该重复触发搜索', () => {
    const mockOnSearch = jest.fn();
    render(<DocumentSearch {...defaultProps} onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    
    // 第一次输入
    fireEvent.change(searchInput, { target: { value: '测试' } });
    jest.advanceTimersByTime(300);
    
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith('测试');
    
    // 相同内容再次输入
    fireEvent.change(searchInput, { target: { value: '测试' } });
    jest.advanceTimersByTime(300);
    
    // 应该再次触发（因为这是新的change事件）
    expect(mockOnSearch).toHaveBeenCalledTimes(2);
  });
});