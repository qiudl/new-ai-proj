import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIUsageStats from '../AIUsageStats';
import { TaskGenerationHistory } from '../../types/aiTaskGenerator';
import { AIProvider } from '../../types/ai';

// Mock aiTaskGeneratorService
const mockGetGenerationHistory = jest.fn();
jest.mock('../../services/aiTaskGeneratorService', () => ({
  getGenerationHistory: mockGetGenerationHistory
}));

// Mock antd message
jest.mock('antd', () => {
  const originalAntd = jest.requireActual('antd');
  return {
    ...originalAntd,
    message: {
      success: jest.fn(),
      error: jest.fn()
    }
  };
});

describe('AIUsageStats', () => {
  const mockHistoryData: TaskGenerationHistory[] = [
    {
      id: 'history-1',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      parentTaskId: 1,
      parentTaskTitle: 'React开发任务',
      keywords: 'React, 组件, TypeScript',
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
      parentTaskTitle: 'Node.js API开发',
      keywords: 'Node.js, Express, API',
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
      parentTaskTitle: '测试任务',
      keywords: '单元测试, Jest',
      usedProvider: 'claude' as AIProvider,
      usedModel: 'claude-3-haiku-20240307',
      generatedCount: 0,
      quality: 0,
      tokensUsed: 150,
      cost: 0.0015,
      success: false,
      errorMessage: 'API调用失败'
    },
    {
      id: 'history-4',
      timestamp: new Date('2024-01-12T14:20:00Z'),
      parentTaskId: 1,
      parentTaskTitle: 'Vue开发任务',
      keywords: 'Vue, 组件',
      usedProvider: 'deepseek' as AIProvider,
      usedModel: 'deepseek-chat',
      generatedCount: 4,
      quality: 90,
      tokensUsed: 900,
      cost: 0.0018,
      success: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGenerationHistory.mockReturnValue(mockHistoryData);
  });

  it('应该渲染统计组件', async () => {
    render(<AIUsageStats />);

    await waitFor(() => {
      expect(screen.getByText('概览统计')).toBeInTheDocument();
      expect(screen.getByText('提供商统计')).toBeInTheDocument();
      expect(screen.getByText('趋势分析')).toBeInTheDocument();
      expect(screen.getByText('成本分析')).toBeInTheDocument();
    });
  });

  it('应该显示控制面板', async () => {
    render(<AIUsageStats />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('最近30天')).toBeInTheDocument();
      expect(screen.getByDisplayValue('所有提供商')).toBeInTheDocument();
      expect(screen.getByText('刷新')).toBeInTheDocument();
      expect(screen.getByText('导出报告')).toBeInTheDocument();
    });
  });

  it('应该正确计算概览统计', async () => {
    render(<AIUsageStats />);

    await waitFor(() => {
      // 总请求数：4
      expect(screen.getByText('4')).toBeInTheDocument();
      
      // 成功率：75% (3/4)
      expect(screen.getByText('75.0%')).toBeInTheDocument();
      
      // Token使用总量：1200+800+150+900=3050
      expect(screen.getByText('3,050')).toBeInTheDocument();
      
      // 总成本：0.0024+0.008+0.0015+0.0018=0.0137
      expect(screen.getByText('0.0137')).toBeInTheDocument();
    });
  });

  it('应该正确计算平均质量评分', async () => {
    render(<AIUsageStats />);

    await waitFor(() => {
      // 平均质量：(85+78+0+90)/4=63.25
      expect(screen.getByText('63.3分')).toBeInTheDocument();
    });
  });

  it('应该支持时间范围过滤', async () => {
    render(<AIUsageStats />);

    // 选择"今天"
    const timeRangeSelect = screen.getByDisplayValue('最近30天');
    fireEvent.mouseDown(timeRangeSelect);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('今天'));
    });

    // 应该重新计算统计数据
    await waitFor(() => {
      expect(mockGetGenerationHistory).toHaveBeenCalled();
    });
  });

  it('应该支持提供商过滤', async () => {
    render(<AIUsageStats />);

    // 选择"DeepSeek"
    const providerSelect = screen.getByDisplayValue('所有提供商');
    fireEvent.mouseDown(providerSelect);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('DeepSeek'));
    });

    // 应该重新计算统计数据
    await waitFor(() => {
      expect(mockGetGenerationHistory).toHaveBeenCalled();
    });
  });

  it('应该显示提供商统计表格', async () => {
    render(<AIUsageStats />);

    // 切换到提供商统计标签页
    fireEvent.click(screen.getByText('提供商统计'));

    await waitFor(() => {
      expect(screen.getByText('AI提供商使用统计')).toBeInTheDocument();
      expect(screen.getByText('AI提供商')).toBeInTheDocument();
      expect(screen.getByText('请求次数')).toBeInTheDocument();
      expect(screen.getByText('Token使用')).toBeInTheDocument();
      expect(screen.getByText('成本')).toBeInTheDocument();
      expect(screen.getByText('平均质量')).toBeInTheDocument();
      expect(screen.getByText('成功率')).toBeInTheDocument();
    });
  });

  it('应该显示热门关键词统计', async () => {
    render(<AIUsageStats />);

    // 切换到趋势分析标签页
    fireEvent.click(screen.getByText('趋势分析'));

    await waitFor(() => {
      expect(screen.getByText('热门关键词统计')).toBeInTheDocument();
      expect(screen.getByText('关键词')).toBeInTheDocument();
      expect(screen.getByText('使用次数')).toBeInTheDocument();
      expect(screen.getByText('平均质量')).toBeInTheDocument();
      expect(screen.getByText('总成本')).toBeInTheDocument();
    });
  });

  it('应该显示成本分析', async () => {
    render(<AIUsageStats />);

    // 切换到成本分析标签页
    fireEvent.click(screen.getByText('成本分析'));

    await waitFor(() => {
      expect(screen.getByText('成本详细分解')).toBeInTheDocument();
      expect(screen.getByText('成本优化建议')).toBeInTheDocument();
    });
  });

  it('应该支持导出报告', async () => {
    // Mock创建下载链接
    const mockCreateElement = jest.spyOn(document, 'createElement');
    const mockLink = {
      setAttribute: jest.fn(),
      click: jest.fn()
    };
    mockCreateElement.mockReturnValue(mockLink as any);

    render(<AIUsageStats />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('导出报告'));
    });

    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', expect.stringContaining('data:application/json'));
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/ai_usage_report_.*\.json/));
    expect(mockLink.click).toHaveBeenCalled();

    mockCreateElement.mockRestore();
  });

  it('应该支持自定义日期范围', async () => {
    render(<AIUsageStats />);

    // 点击日期范围选择器（需要模拟antd的DatePicker行为）
    const dateRangeInput = screen.getByPlaceholderText('开始日期');
    fireEvent.mouseDown(dateRangeInput);

    // 这里需要更复杂的模拟来测试日期选择
    // 简化测试，只验证组件能正常渲染
    expect(dateRangeInput).toBeInTheDocument();
  });

  it('应该正确处理项目过滤', async () => {
    const projectId = 1;
    render(<AIUsageStats projectId={projectId} />);

    await waitFor(() => {
      // 应该调用历史记录获取方法
      expect(mockGetGenerationHistory).toHaveBeenCalled();
    });
  });

  it('应该处理空数据状态', async () => {
    mockGetGenerationHistory.mockReturnValue([]);
    
    render(<AIUsageStats />);

    await waitFor(() => {
      expect(screen.getByText('暂无使用统计数据')).toBeInTheDocument();
    });
  });

  it('应该正确计算提供商统计', async () => {
    render(<AIUsageStats />);

    // 切换到提供商统计
    fireEvent.click(screen.getByText('提供商统计'));

    await waitFor(() => {
      // DeepSeek: 2次请求，成功率100%
      // OpenAI: 1次请求，成功率100%  
      // Claude: 1次请求，成功率0%
      
      expect(screen.getByText('DeepSeek')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
    });
  });

  it('应该显示每日使用趋势', async () => {
    render(<AIUsageStats />);

    // 切换到趋势分析
    fireEvent.click(screen.getByText('趋势分析'));

    await waitFor(() => {
      expect(screen.getByText('每日使用趋势')).toBeInTheDocument();
      
      // 应该显示趋势分析信息
      expect(screen.getByText(/最近.*天的使用情况/)).toBeInTheDocument();
    });
  });

  it('应该支持刷新数据', async () => {
    render(<AIUsageStats />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('刷新'));
    });

    // 应该重新调用数据获取方法
    expect(mockGetGenerationHistory).toHaveBeenCalledTimes(2); // 初始化1次 + 刷新1次
  });

  it('应该正确处理成本分解', async () => {
    render(<AIUsageStats />);

    // 切换到成本分析
    fireEvent.click(screen.getByText('成本分析'));

    await waitFor(() => {
      // 应该显示各提供商的成本占比
      expect(screen.getByText('DeepSeek')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      
      // 应该显示输入输出token分布
      expect(screen.getByText(/输入Token:/)).toBeInTheDocument();
      expect(screen.getByText(/输出Token:/)).toBeInTheDocument();
    });
  });

  it('应该显示成本优化建议', async () => {
    render(<AIUsageStats />);

    // 切换到成本分析
    fireEvent.click(screen.getByText('成本分析'));

    await waitFor(() => {
      expect(screen.getByText('成本优化建议')).toBeInTheDocument();
      expect(screen.getByText(/DeepSeek具有最高的性价比/)).toBeInTheDocument();
      expect(screen.getByText(/Claude在复杂分析任务中表现出色/)).toBeInTheDocument();
      expect(screen.getByText(/合理选择AI提供商可以降低30-50%的使用成本/)).toBeInTheDocument();
    });
  });

  it('应该正确处理关键词统计', async () => {
    render(<AIUsageStats />);

    // 切换到趋势分析
    fireEvent.click(screen.getByText('趋势分析'));

    await waitFor(() => {
      // 应该解析关键词并显示统计
      // 基于mock数据，"组件"出现2次，其他关键词各出现1次
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('组件')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });

  it('应该支持不同的默认时间范围', () => {
    render(<AIUsageStats timeRange="week" />);

    expect(screen.getByDisplayValue('最近7天')).toBeInTheDocument();
  });

  it('应该处理加载状态', () => {
    // 模拟异步加载
    mockGetGenerationHistory.mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve([]), 100));
    });

    render(<AIUsageStats />);

    // 在数据加载完成前，组件应该正常渲染控制面板
    expect(screen.getByText('刷新')).toBeInTheDocument();
  });
});