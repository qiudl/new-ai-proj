import React from 'react';
import { Card, Progress, Space, Typography, Row, Col, Statistic } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface TimeEfficiencyProgressProps {
  data: {
    totalPlannedTime: number;
    totalActualTime: number;
    totalRemainingTime: number;
    timeEfficiency: number;
    totalPlannedTimeFormatted: string;
    totalActualTimeFormatted: string;
    totalRemainingTimeFormatted: string;
  };
}

const TimeEfficiencyProgress: React.FC<TimeEfficiencyProgressProps> = ({ data }) => {
  // 根据效率值确定颜色
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return '#52c41a';
    if (efficiency >= 60) return '#faad14';
    return '#ff4d4f';
  };

  // 根据效率值确定状态
  const getEfficiencyStatus = (efficiency: number): 'success' | 'normal' | 'exception' => {
    if (efficiency >= 80) return 'success';
    if (efficiency >= 60) return 'normal';
    return 'exception';
  };

  // 计算已用时间百分比
  const actualPercentage = data.totalPlannedTime > 0
    ? Math.round((data.totalActualTime / data.totalPlannedTime) * 100)
    : 0;

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>时间效率分析</span>
        </Space>
      }
      bordered={false}
      style={{ height: '100%' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 时间效率进度环 */}
        <div style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            percent={Math.round(data.timeEfficiency)}
            size={160}
            strokeColor={getEfficiencyColor(data.timeEfficiency)}
            format={(percent) => (
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                  {percent}%
                </div>
                <div style={{ fontSize: '14px', color: '#8c8c8c', marginTop: '4px' }}>
                  时间效率
                </div>
              </div>
            )}
            status={getEfficiencyStatus(data.timeEfficiency)}
          />
        </div>

        {/* 时间统计详情 */}
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Statistic
              title={
                <Space size={4}>
                  <ClockCircleOutlined style={{ color: '#1890ff' }} />
                  <span>计划时间</span>
                </Space>
              }
              value={data.totalPlannedTimeFormatted}
              valueStyle={{ fontSize: '18px', color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={
                <Space size={4}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>实际用时</span>
                </Space>
              }
              value={data.totalActualTimeFormatted}
              valueStyle={{ fontSize: '18px', color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={
                <Space size={4}>
                  <HourglassOutlined style={{ color: '#faad14' }} />
                  <span>剩余时间</span>
                </Space>
              }
              value={data.totalRemainingTimeFormatted}
              valueStyle={{ fontSize: '18px', color: '#faad14' }}
            />
          </Col>
        </Row>

        {/* 时间使用进度条 */}
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            时间使用进度
          </Text>
          <Progress
            percent={actualPercentage}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068'
            }}
            status={actualPercentage > 100 ? 'exception' : 'active'}
            format={(percent) => `${percent}% (${data.totalActualTimeFormatted} / ${data.totalPlannedTimeFormatted})`}
          />
        </div>

        {/* 效率评估 */}
        <div
          style={{
            padding: '12px',
            background: data.timeEfficiency >= 80
              ? '#f6ffed'
              : data.timeEfficiency >= 60
              ? '#fffbe6'
              : '#fff2e8',
            border: `1px solid ${
              data.timeEfficiency >= 80
                ? '#b7eb8f'
                : data.timeEfficiency >= 60
                ? '#ffe58f'
                : '#ffbb96'
            }`,
            borderRadius: '6px'
          }}
        >
          <Text style={{ fontSize: '12px' }}>
            {data.timeEfficiency >= 80
              ? '✨ 优秀！您的时间管理效率很高，继续保持这种状态。'
              : data.timeEfficiency >= 60
              ? '👍 良好！时间效率不错，可以适当优化任务规划。'
              : '⚠️ 建议重新评估任务时间预估，提高计划准确性。'}
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default TimeEfficiencyProgress;
