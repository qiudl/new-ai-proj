import React from 'react';
import { Card, Tag } from 'antd';
import { CheckCircleFilled, RobotOutlined } from '@ant-design/icons';
import { AIConfig } from '../types';

interface AIConfigCardProps {
  config: AIConfig;
  selected: boolean;
  onClick: () => void;
}

/**
 * AI配置卡片组件
 */
const AIConfigCard: React.FC<AIConfigCardProps> = ({ config, selected, onClick }) => {
  // Provider颜色映射
  const providerColors: Record<string, string> = {
    openai: '#10a37f',
    deepseek: '#1890ff',
    anthropic: '#d97706',
  };

  const providerColor = providerColors[config.provider] || '#666';

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderColor: selected ? '#1890ff' : '#d9d9d9',
        borderWidth: selected ? 2 : 1,
        backgroundColor: selected ? '#f0f8ff' : '#fff',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.3s',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      {/* 选中标记 */}
      {selected && (
        <CheckCircleFilled
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 20,
            color: '#1890ff',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* 图标 */}
        <div
          style={{
            fontSize: 32,
            color: providerColor,
            marginTop: 4,
          }}
        >
          <RobotOutlined />
        </div>

        {/* 内容 */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <Tag color={providerColor}>{config.provider.toUpperCase()}</Tag>
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              marginBottom: 4,
              color: '#262626',
            }}
          >
            {config.model}
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#8c8c8c',
              lineHeight: '1.5',
            }}
          >
            {config.description}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AIConfigCard;
