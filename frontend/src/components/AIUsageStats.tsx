import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

interface AIUsageStatsProps {
  projectId?: number;
  timeRange?: string;
}

/**
 * AI使用统计组件
 * 临时占位符组件
 */
const AIUsageStats: React.FC<AIUsageStatsProps> = ({ projectId, timeRange }) => {
  return (
    <Card>
      <Title level={4}>AI使用统计</Title>
      <p>此组件正在开发中...</p>
    </Card>
  );
};

export default AIUsageStats;