import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIGenerationHistory from '../AIGenerationHistory';
import { TaskGenerationHistory } from '../../types/aiTaskGenerator';
import { AIProvider } from '../../types/ai';

// Mock dependencies
jest.mock('../../services/aiTaskGeneratorService', () => ({
  getGenerationHistory: jest.fn(),
  deleteGenerationHistory: jest.fn()
}));

jest.mock('antd', () => {
  const originalAntd = jest.requireActual('antd');
  return {
    ...originalAntd,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn()
    }
  };
});

describe('AIGenerationHistory', () => {
  const mockHistory: TaskGenerationHistory[] = [
    {
      id: 'history-1',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      parentTaskId: 1,
      parentTaskTitle: '前端开发任务',
      keywords: 'React, TypeScript, 组件开发',
      usedProvider: 'deepseek' as AIProvider,
      usedModel: 'deepseek-chat',
      generatedCount: 5,
      quality: 85,
      tokensUsed: 1200,
      cost: 0.0024,
      success: true
    },
    {
      id: 'history-2',
      timestamp: new Date('2024-01-14T15:30:00Z'),
      parentTaskId: 2,
      parentTaskTitle: '后端API开发',
      keywords: 'Node.js, Express, 数据库设计',
      usedProvider: 'openai' as AIProvider,
      usedModel: 'gpt-3.5-turbo',
      generatedCount: 3,
      quality: 78,
      tokensUsed: 800,
      cost: 0.008,
      success: true
    },
    {
      id: 'history-3',
      timestamp: new Date('2024-01-13T09:15:00Z'),
      parentTaskId: 3,
      parentTaskTitle: '测试计划',
      keywords: '单元测试, 集成测试',
      usedProvider: 'claude' as AIProvider,
      usedModel: 'claude-3-haiku-20240307',
      generatedCount: 0,
      quality: 0,
      tokensUsed: 150,
      cost: 0.0015,
      success: false,
      errorMessage: 'AI API调用失败'
    }
  ];

  const mockGeneratedTasks = [
    {
      title: '设置React项目结构',
      description: '创建基础的React项目目录结构',
      priority: 'high' as const,
      estimatedHours: 2,
      status: 'todo' as const,
      custom_fields: {
        tags: ['前端', '初始化'],
        ai_generated: true,
        generation_id: 'history-1'
      }
    }
  ];

  const defaultProps = {
    onReuse: jest.fn(),
    onSaveAsTemplate: jest.fn()
  };

  beforeEach(() => {
    // 清除所有mock调用
    jest.clearAllMocks();
    
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage
    });

    // 默认返回mock历史数据
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'ai_generation_history') {
        return JSON.stringify(mockHistory);
      }
      if (key === 'ai_generation_templates') {
        return JSON.stringify([]);
      }
      return null;
    });
  });

  it('应该渲染历史记录组件', () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    expect(screen.getByText('生成历史 (3)')).toBeInTheDocument();
    expect(screen.getByText('保存的模板 (0)')).toBeInTheDocument();
  });

  it('应该显示统计信息', () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 检查统计面板
    expect(screen.getByText('总生成次数')).toBeInTheDocument();
    expect(screen.getByText('成功率')).toBeInTheDocument();
    expect(screen.getByText('生成任务数')).toBeInTheDocument();
    expect(screen.getByText('平均质量')).toBeInTheDocument();
    expect(screen.getByText('总成本')).toBeInTheDocument();
    expect(screen.getByText('模板数量')).toBeInTheDocument();
  });

  it('应该正确计算统计数据', () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 总生成次数应该是3
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    
    // 成功率应该是66.7% (2/3)
    const successRateElement = screen.getByText(/66\.7%/);
    expect(successRateElement).toBeInTheDocument();
    
    // 生成任务数应该是8 (5+3+0)
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });

  it('应该渲染历史记录表格', () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 检查表格标题
    expect(screen.getByText('时间')).toBeInTheDocument();
    expect(screen.getByText('父任务')).toBeInTheDocument();
    expect(screen.getByText('关键词')).toBeInTheDocument();
    expect(screen.getByText('AI提供商')).toBeInTheDocument();
    expect(screen.getByText('生成结果')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
    
    // 检查历史记录数据
    expect(screen.getByText('前端开发任务')).toBeInTheDocument();
    expect(screen.getByText('后端API开发')).toBeInTheDocument();
    expect(screen.getByText('测试计划')).toBeInTheDocument();
  });

  it('应该显示不同AI提供商的标签', () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
  });

  it('应该显示成功和失败的状态', () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    const successTags = screen.getAllByText('成功');
    const failTags = screen.getAllByText('失败');
    
    expect(successTags).toHaveLength(2);
    expect(failTags).toHaveLength(1);
  });

  it('应该支持搜索过滤', async () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('搜索关键词或任务名称');
    
    // 搜索"前端"
    fireEvent.change(searchInput, { target: { value: '前端' } });
    fireEvent.click(screen.getByText('应用过滤'));
    
    await waitFor(() => {
      expect(screen.getByText('前端开发任务')).toBeInTheDocument();
      expect(screen.queryByText('后端API开发')).not.toBeInTheDocument();
    });
  });

  it('应该支持按AI提供商过滤', async () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 选择DeepSeek过滤器
    const providerSelect = screen.getByDisplayValue('AI提供商');
    fireEvent.mouseDown(providerSelect);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('DeepSeek'));
    });
    
    fireEvent.click(screen.getByText('应用过滤'));
    
    await waitFor(() => {
      expect(screen.getByText('前端开发任务')).toBeInTheDocument();
      expect(screen.queryByText('后端API开发')).not.toBeInTheDocument();
      expect(screen.queryByText('测试计划')).not.toBeInTheDocument();
    });
  });

  it('应该支持查看详情功能', async () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 点击第一条记录的查看详情按钮
    const viewButtons = screen.getAllByTitle('查看详情');
    fireEvent.click(viewButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('生成详情')).toBeInTheDocument();
      expect(screen.getByText('前端开发任务')).toBeInTheDocument();
      expect(screen.getByText('React, TypeScript, 组件开发')).toBeInTheDocument();
    });
  });

  it('应该支持复用历史配置', async () => {
    const mockOnReuse = jest.fn();
    render(<AIGenerationHistory {...defaultProps} onReuse={mockOnReuse} />);
    
    // 点击复用按钮
    const reuseButtons = screen.getAllByTitle('复用配置');
    fireEvent.click(reuseButtons[0]);
    
    await waitFor(() => {
      expect(mockOnReuse).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'history-1',
          keywords: 'React, TypeScript, 组件开发'
        }),
        expect.any(Array)
      );
    });
  });

  it('应该支持保存为模板', async () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 点击保存为模板按钮
    const templateButtons = screen.getAllByTitle('保存为模板');
    fireEvent.click(templateButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('保存为模板')).toBeInTheDocument();
    });
    
    // 填写模板信息
    const nameInput = screen.getByPlaceholderText('请输入模板名称');
    fireEvent.change(nameInput, { target: { value: '前端开发模板' } });
    
    const descInput = screen.getByPlaceholderText('请输入模板描述（可选）');
    fireEvent.change(descInput, { target: { value: '用于前端开发任务的模板' } });
    
    // 确认保存
    fireEvent.click(screen.getByText('保存'));
    
    await waitFor(() => {
      expect(screen.queryByText('保存为模板')).not.toBeInTheDocument();
    });
  });

  it('应该支持删除历史记录', async () => {
    const mockLocalStorage = window.localStorage as unknown;
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 点击删除按钮并确认
    const deleteButtons = screen.getAllByTitle('删除');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('确定删除这条历史记录吗？')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('确定'));
    
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  it('应该支持导出历史记录', () => {
    // Mock创建下载链接
    const mockCreateElement = jest.spyOn(document, 'createElement');
    const mockLink = {
      setAttribute: jest.fn(),
      click: jest.fn()
    };
    mockCreateElement.mockReturnValue(mockLink as unknown);
    
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 点击导出按钮
    fireEvent.click(screen.getByText('导出记录'));
    
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', expect.stringContaining('data:application/json'));
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/ai_generation_history_.*\.json/));
    expect(mockLink.click).toHaveBeenCalled();
    
    mockCreateElement.mockRestore();
  });

  it('应该正确处理空数据状态', () => {
    // Mock空的历史记录
    const mockLocalStorage = window.localStorage as unknown;
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'ai_generation_history') {
        return JSON.stringify([]);
      }
      if (key === 'ai_generation_templates') {
        return JSON.stringify([]);
      }
      return null;
    });
    
    render(<AIGenerationHistory {...defaultProps} />);
    
    expect(screen.getByText('暂无生成历史记录')).toBeInTheDocument();
    expect(screen.getByText('暂无保存的模板')).toBeInTheDocument();
  });

  it('应该支持切换到模板标签页', async () => {
    render(<AIGenerationHistory {...defaultProps} />);
    
    // 点击模板标签
    fireEvent.click(screen.getByText('保存的模板 (0)'));
    
    await waitFor(() => {
      expect(screen.getByText('模板名称')).toBeInTheDocument();
      expect(screen.getByText('关键词')).toBeInTheDocument();
      expect(screen.getByText('标签')).toBeInTheDocument();
      expect(screen.getByText('使用次数')).toBeInTheDocument();
      expect(screen.getByText('创建时间')).toBeInTheDocument();
    });
  });

  it('应该正确处理项目过滤', () => {
    const projectId = 1;
    render(<AIGenerationHistory {...defaultProps} projectId={projectId} />);
    
    // 当提供projectId时，应该只显示该项目的历史记录
    expect(screen.getByText('前端开发任务')).toBeInTheDocument();
    // 其他项目的记录不应该显示（需要mock数据支持这个测试）
  });

  it('应该处理localStorage错误', () => {
    // Mock localStorage抛出错误
    const mockLocalStorage = window.localStorage as unknown;
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<AIGenerationHistory {...defaultProps} />);
    
    expect(consoleSpy).toHaveBeenCalledWith('读取历史记录失败:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});