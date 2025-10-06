import React from 'react';
import { Row, Col, Card, Statistic, Progress, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface StatsOverviewCardsProps {
  data: {
    total_count: number;
    completed_count: number;
    in_progress_count: number;
    pending_count: number;
    overdue_count: number;
    completion_rate: number;
  };
}

const StatsOverviewCards: React.FC<StatsOverviewCardsProps> = ({ data }) => {
  // 计算完成率的颜色
  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return '#52c41a';
    if (rate >= 60) return '#faad14';
    if (rate >= 40) return '#1890ff';
    return '#ff4d4f';
  };

  return (
    <Row gutter={[16, 16]}>
      {/* 任务总数 */}
      <Col xs={24} sm={12} md={8} lg={6} xl={4}>
        <Card bordered={false} style={{ background: '#f0f5ff' }}>
          <Statistic
            title="任务总数"
            value={data.total_count}
            prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff', fontSize: '28px' }}
          />
        </Card>
      </Col>

      {/* 已完成 */}
      <Col xs={24} sm={12} md={8} lg={6} xl={4}>
        <Card bordered={false} style={{ background: '#f6ffed' }}>
          <Statistic
            title="已完成"
            value={data.completed_count}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a', fontSize: '28px' }}
          />
          <div style={{ marginTop: '8px' }}>
            <Progress
              percent={data.total_count > 0 ? Math.round((data.completed_count / data.total_count) * 100) : 0}
              strokeColor="#52c41a"
              showInfo={false}
              size="small"
            />
          </div>
        </Card>
      </Col>

      {/* 进行中 */}
      <Col xs={24} sm={12} md={8} lg={6} xl={4}>
        <Card bordered={false} style={{ background: '#e6f7ff' }}>
          <Statistic
            title="进行中"
            value={data.in_progress_count}
            prefix={<PlayCircleOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff', fontSize: '28px' }}
          />
          <div style={{ marginTop: '8px' }}>
            <Progress
              percent={data.total_count > 0 ? Math.round((data.in_progress_count / data.total_count) * 100) : 0}
              strokeColor="#1890ff"
              showInfo={false}
              size="small"
            />
          </div>
        </Card>
      </Col>

      {/* 待办 */}
      <Col xs={24} sm={12} md={8} lg={6} xl={4}>
        <Card bordered={false} style={{ background: '#fffbe6' }}>
          <Statistic
            title="待办"
            value={data.pending_count}
            prefix={<InboxOutlined style={{ color: '#faad14' }} />}
            valueStyle={{ color: '#faad14', fontSize: '28px' }}
          />
          <div style={{ marginTop: '8px' }}>
            <Progress
              percent={data.total_count > 0 ? Math.round((data.pending_count / data.total_count) * 100) : 0}
              strokeColor="#faad14"
              showInfo={false}
              size="small"
            />
          </div>
        </Card>
      </Col>

      {/* 逾期 */}
      <Col xs={24} sm={12} md={8} lg={6} xl={4}>
        <Card bordered={false} style={{ background: '#fff2e8' }}>
          <Statistic
            title="逾期"
            value={data.overdue_count}
            prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ color: '#ff4d4f', fontSize: '28px' }}
          />
          <div style={{ marginTop: '8px' }}>
            <Text type="danger" style={{ fontSize: '12px' }}>
              {data.overdue_count > 0 ? '需要立即处理' : '无逾期任务'}
            </Text>
          </div>
        </Card>
      </Col>

      {/* 完成率 */}
      <Col xs={24} sm={12} md={8} lg={6} xl={4}>
        <Card bordered={false} style={{ background: '#f9f0ff' }}>
          <Statistic
            title="完成率"
            value={Math.round(data.completion_rate)}
            suffix="%"
            prefix={<TrophyOutlined style={{ color: getCompletionRateColor(data.completion_rate) }} />}
            valueStyle={{ color: getCompletionRateColor(data.completion_rate), fontSize: '28px' }}
          />
          <div style={{ marginTop: '8px' }}>
            <Progress
              percent={Math.round(data.completion_rate)}
              strokeColor={getCompletionRateColor(data.completion_rate)}
              showInfo={false}
              size="small"
            />
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default StatsOverviewCards;
