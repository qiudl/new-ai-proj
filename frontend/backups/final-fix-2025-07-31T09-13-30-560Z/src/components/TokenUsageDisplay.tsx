// @ts-nocheck
import React from 'react';
import { Card, Statistic, Progress, Typography, Space, Tooltip, Tag } from 'antd';
import { 
  ThunderboltOutlined, 
  DollarCircleOutlined, 
  ClockCircleOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import { AIProvider, AI_PROVIDER_INFO } from '../types/ai';

const { Text } = Typography;

interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

interface TokenUsageDisplayProps {
  tokensUsed: TokenUsage;
  cost: number;
  provider: AIProvider;
  model: string;
  generationTime?: number;
  quality?: number;
  showDetailed?: boolean;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({
  tokensUsed,
  cost,
  provider,
  model,
  generationTime,
  quality,
  showDetailed = false,
  size = 'default',
  className = ''
}) => {
  // 计算输入输出token比例
  const inputRatio = tokensUsed.total > 0 ? (tokensUsed.input / tokensUsed.total) * 100 : 50;
  const outputRatio = tokensUsed.total > 0 ? (tokensUsed.output / tokensUsed.total) * 100 : 50;

  // 获取提供商颜色
  const getProviderColor = (provider: AIProvider): string => {
    const colorMap: Record<AIProvider, string> = {
      openai: 'green',
      claude: 'blue',
      deepseek: 'purple'
    };
    return colorMap[provider] || 'default';
  };

  // 获取质量颜色
  const getQualityColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  // 计算每千token的成本
  const costPer1KTokens = tokensUsed.total > 0 ? (cost / tokensUsed.total) * 1000 : 0;

  if (!showDetailed) {
    // 简化显示模式
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
        <Tooltip title={`输入: ${tokensUsed.input.toLocaleString()} | 输出: ${tokensUsed.output.toLocaleString()}`}>
          <Space size={4}>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            <Text strong>{tokensUsed.total.toLocaleString()}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>tokens</Text>
          </Space>
        </Tooltip>
        
        <Tooltip title={`每1K tokens成本: ¥${costPer1KTokens.toFixed(4)}`}>
          <Space size={4}>
            <DollarCircleOutlined style={{ color: '#fa8c16' }} />
            <Text strong>¥{cost.toFixed(4)}</Text>
          </Space>
        </Tooltip>

        <Tag color={getProviderColor(provider)}>
          {AI_PROVIDER_INFO[provider]?.name || provider}
        </Tag>

        {quality !== undefined && (
          <Tooltip title="生成质量评分">
            <Text strong style={{ color: getQualityColor(quality) }}>
              {quality.toFixed(1)}分
            </Text>
          </Tooltip>
        )}
      </div>
    );
  }

  // 详细显示模式
  return (
    <Card 
      size={size as any} 
      title={
        <Space>
          <ThunderboltOutlined />
          Token使用详情
        </Space>
      }
      className={className}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 核心统计 */}
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
          <Statistic
            title="总Token数"
            value={tokensUsed.total}
            prefix={<ThunderboltOutlined />}
            formatter={(value) => value?.toLocaleString()}
            valueStyle={{ color: '#1890ff' }}
          />
          <Statistic
            title="总成本"
            value={cost}
            precision={4}
            prefix="¥"
            valueStyle={{ color: '#fa8c16' }}
          />
          {generationTime && (
            <Statistic
              title="生成时间"
              value={generationTime / 1000}
              precision={1}
              suffix="s"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          )}
          {quality !== undefined && (
            <Statistic
              title="质量评分"
              value={quality}
              precision={1}
              suffix="分"
              valueStyle={{ color: getQualityColor(quality) }}
            />
          )}
        </div>

        {/* Token使用分布 */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Token使用分布</Text>
            <Tooltip title="输入token通常包含prompt和上下文，输出token是AI生成的内容">
              <InfoCircleOutlined style={{ marginLeft: 4, color: '#8c8c8c' }} />
            </Tooltip>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">输入Token: {tokensUsed.input.toLocaleString()} ({inputRatio.toFixed(1)}%)</Text>
              <Text type="secondary">输出Token: {tokensUsed.output.toLocaleString()} ({outputRatio.toFixed(1)}%)</Text>
            </div>
            <Progress
              percent={100}
              success={{ percent: outputRatio }}
              strokeColor="#ff7a45"
              trailColor="#52c41a"
              size="small"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8c8c8c', marginTop: 2 }}>
              <span>输入 (绿色)</span>
              <span>输出 (橙色)</span>
            </div>
          </div>
        </div>

        {/* 提供商和成本信息 */}
        <div style={{ 
          padding: '12px', 
          background: '#fafafa', 
          borderRadius: '6px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <Space>
              <Text strong>AI提供商:</Text>
              <Tag color={getProviderColor(provider)}>
                {AI_PROVIDER_INFO[provider]?.name || provider}
              </Tag>
              <Text type="secondary">({model})</Text>
            </Space>
          </div>
          <div>
            <Text type="secondary">
              每1K tokens: ¥{costPer1KTokens.toFixed(4)}
            </Text>
          </div>
        </div>

        {/* 成本优化建议 */}
        {cost > 0.01 && (
          <div style={{ 
            background: '#e6f7ff', 
            border: '1px solid #91d5ff', 
            borderRadius: '4px',
            padding: '8px 12px'
          }}>
            <Space>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <Text style={{ fontSize: '12px' }}>
                {provider === 'deepseek' ? 
                  '您选择了性价比最高的DeepSeek，成本控制很好！' :
                  provider === 'claude' ? 
                  'Claude在复杂任务上表现出色，但成本较高。简单任务可考虑使用DeepSeek。' :
                  'OpenAI通用性强但成本较高，可考虑根据任务复杂度选择更经济的选项。'
                }
              </Text>
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default TokenUsageDisplay;