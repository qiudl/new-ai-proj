import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { TestStatistics } from '@/types/aiConfig';

interface StatisticsCardProps {
  statistics: TestStatistics | null;
  loading?: boolean;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  statistics,
  loading
}) => {
  return (
    <Card
      loading={loading}
      style={{ marginBottom: 16 }}
    >
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="总测试次数"
            value={statistics?.totalTests || 0}
            prefix={<ExperimentOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="成功率"
            value={statistics?.successRate || 0}
            suffix="%"
            prefix={<CheckCircleOutlined />}
            valueStyle={{
              color: (statistics?.successRate || 0) >= 80 ? '#52c41a' : '#faad14'
            }}
            precision={2}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="平均响应时间"
            value={statistics?.averageResponseTime || 0}
            suffix="ms"
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
      </Row>
    </Card>
  );
};
