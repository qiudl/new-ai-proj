import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TokenUsageDisplay from '../TokenUsageDisplay';
import { AIProvider } from '../../types/ai';

describe('TokenUsageDisplay', () => {
  const defaultProps = {
    tokensUsed: {
      input: 1000,
      output: 500,
      total: 1500
    },
    cost: 0.0045,
    provider: 'deepseek' as AIProvider,
    model: 'deepseek-chat',
    generationTime: 2500,
    quality: 85
  };

  it('应该在简化模式下正确渲染', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        showDetailed={false} 
      />
    );

    // 检查token显示
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('tokens')).toBeInTheDocument();

    // 检查成本显示
    expect(screen.getByText('¥0.0045')).toBeInTheDocument();

    // 检查提供商标签
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();

    // 检查质量评分
    expect(screen.getByText('85.0分')).toBeInTheDocument();
  });

  it('应该在详细模式下正确渲染', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        showDetailed={true} 
      />
    );

    // 检查标题
    expect(screen.getByText('Token使用详情')).toBeInTheDocument();

    // 检查统计信息
    expect(screen.getByText('总Token数')).toBeInTheDocument();
    expect(screen.getByText('总成本')).toBeInTheDocument();
    expect(screen.getByText('生成时间')).toBeInTheDocument();
    expect(screen.getByText('质量评分')).toBeInTheDocument();

    // 检查具体数值
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('¥0.0045')).toBeInTheDocument();
    expect(screen.getByText('2.5s')).toBeInTheDocument();
    expect(screen.getByText('85.0分')).toBeInTheDocument();
  });

  it('应该正确显示Token分布', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        showDetailed={true} 
      />
    );

    // 检查Token分布标题
    expect(screen.getByText('Token使用分布')).toBeInTheDocument();

    // 检查输入输出token数量和比例
    expect(screen.getByText(/输入Token: 1,000 \(66\.7%\)/)).toBeInTheDocument();
    expect(screen.getByText(/输出Token: 500 \(33\.3%\)/)).toBeInTheDocument();
  });

  it('应该显示正确的提供商信息', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        showDetailed={true} 
      />
    );

    expect(screen.getByText('AI提供商:')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    expect(screen.getByText('(deepseek-chat)')).toBeInTheDocument();
  });

  it('应该计算并显示每千token成本', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        showDetailed={true} 
      />
    );

    // 1500 tokens，成本0.0045，每1K tokens成本应该是0.003
    expect(screen.getByText('每1K tokens: ¥0.0030')).toBeInTheDocument();
  });

  it('应该根据质量分数显示不同颜色', () => {
    const { rerender } = render(
      <TokenUsageDisplay 
        {...defaultProps} 
        quality={90} // 高质量
        showDetailed={false}
      />
    );

    let qualityElement = screen.getByText('90.0分');
    expect(qualityElement).toHaveStyle('color: #52c41a'); // 绿色

    rerender(
      <TokenUsageDisplay 
        {...defaultProps} 
        quality={70} // 中等质量
        showDetailed={false}
      />
    );

    qualityElement = screen.getByText('70.0分');
    expect(qualityElement).toHaveStyle('color: #faad14'); // 橙色

    rerender(
      <TokenUsageDisplay 
        {...defaultProps} 
        quality={50} // 低质量
        showDetailed={false}
      />
    );

    qualityElement = screen.getByText('50.0分');
    expect(qualityElement).toHaveStyle('color: #ff4d4f'); // 红色
  });

  it('应该为不同提供商显示正确的标签颜色', () => {
    const { rerender } = render(
      <TokenUsageDisplay 
        {...defaultProps} 
        provider="openai"
        showDetailed={false}
      />
    );

    expect(screen.getByText('OpenAI')).toBeInTheDocument();

    rerender(
      <TokenUsageDisplay 
        {...defaultProps} 
        provider="claude"
        showDetailed={false}
      />
    );

    expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();

    rerender(
      <TokenUsageDisplay 
        {...defaultProps} 
        provider="deepseek"
        showDetailed={false}
      />
    );

    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
  });

  it('应该正确处理零token情况', () => {
    const zeroTokenProps = {
      ...defaultProps,
      tokensUsed: {
        input: 0,
        output: 0,
        total: 0
      },
      cost: 0
    };

    render(
      <TokenUsageDisplay 
        {...zeroTokenProps} 
        showDetailed={true} 
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('¥0')).toBeInTheDocument();
    expect(screen.getByText(/输入Token: 0 \(50\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/输出Token: 0 \(50\.0%\)/)).toBeInTheDocument();
  });

  it('应该显示成本优化建议', () => {
    const { rerender } = render(
      <TokenUsageDisplay 
        {...defaultProps} 
        provider="deepseek"
        cost={0.02} // 高成本以触发建议显示
        showDetailed={true}
      />
    );

    expect(screen.getByText(/您选择了性价比最高的DeepSeek/)).toBeInTheDocument();

    rerender(
      <TokenUsageDisplay 
        {...defaultProps} 
        provider="claude"
        cost={0.02}
        showDetailed={true}
      />
    );

    expect(screen.getByText(/Claude在复杂任务上表现出色/)).toBeInTheDocument();

    rerender(
      <TokenUsageDisplay 
        {...defaultProps} 
        provider="openai"
        cost={0.02}
        showDetailed={true}
      />
    );

    expect(screen.getByText(/OpenAI通用性强但成本较高/)).toBeInTheDocument();
  });

  it('应该支持不同的尺寸', () => {
    const { rerender } = render(
      <TokenUsageDisplay 
        {...defaultProps} 
        size="small"
        showDetailed={true}
      />
    );

    // 检查是否应用了小尺寸样式
    const titleElement = screen.getByText('Token使用详情');
    const cardElement = titleElement.closest('.ant-card');
    expect(cardElement).toHaveClass('ant-card-small');

    rerender(
      <TokenUsageDisplay 
        {...defaultProps} 
        size="large"
        showDetailed={true}
      />
    );

    // 大尺寸不会有特殊类名，但组件应该正常渲染
    expect(screen.getByText('Token使用详情')).toBeInTheDocument();
  });

  it('应该正确处理缺少可选属性的情况', () => {
    const minimalProps = {
      tokensUsed: {
        input: 800,
        output: 200,
        total: 1000
      },
      cost: 0.002,
      provider: 'deepseek' as AIProvider,
      model: 'deepseek-chat'
      // 缺少 generationTime 和 quality
    };

    render(
      <TokenUsageDisplay 
        {...minimalProps} 
        showDetailed={true}
      />
    );

    // 应该正常显示基本信息
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('¥0.0020')).toBeInTheDocument();

    // 不应该显示缺失的信息
    expect(screen.queryByText('生成时间')).not.toBeInTheDocument();
    expect(screen.queryByText('质量评分')).not.toBeInTheDocument();
  });

  it('应该在简化模式下显示tooltip', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        showDetailed={false}
      />
    );

    // 检查是否有tooltip提示
    const tokenElement = screen.getByText('1,500');
    const tooltipElement = tokenElement.closest('[title]');
    expect(tooltipElement).toHaveAttribute('title', '输入: 1,000 | 输出: 500');
  });

  it('应该正确计算token比例', () => {
    const customProps = {
      ...defaultProps,
      tokensUsed: {
        input: 300,
        output: 700,
        total: 1000
      }
    };

    render(
      <TokenUsageDisplay 
        {...customProps} 
        showDetailed={true}
      />
    );

    // 30% 输入，70% 输出
    expect(screen.getByText(/输入Token: 300 \(30\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/输出Token: 700 \(70\.0%\)/)).toBeInTheDocument();
  });

  it('应该支持自定义类名', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        className="custom-token-display"
        showDetailed={false}
      />
    );

    const tokenElement = screen.getByText('1,500');
    const customElement = tokenElement.closest('.custom-token-display');
    expect(customElement).toBeInTheDocument();
  });

  it('当成本较低时不应该显示优化建议', () => {
    render(
      <TokenUsageDisplay 
        {...defaultProps} 
        cost={0.005} // 低成本，不应该显示建议
        showDetailed={true}
      />
    );

    expect(screen.queryByText(/您选择了性价比最高的DeepSeek/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Claude在复杂任务上表现出色/)).not.toBeInTheDocument();
    expect(screen.queryByText(/OpenAI通用性强但成本较高/)).not.toBeInTheDocument();
  });
});