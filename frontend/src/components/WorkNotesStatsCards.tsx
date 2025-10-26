import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  LinkOutlined
} from '@ant-design/icons';

interface WorkNotesStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
  associated: number;
}

interface WorkNotesStatsCardsProps {
  stats: WorkNotesStats;
  loading?: boolean;
}

const WorkNotesStatsCards: React.FC<WorkNotesStatsCardsProps> = ({
  stats,
  loading = false
}) => {
  return (
    <Row gutter={12} style={{ marginBottom: 12 }}>
      <Col span={5}>
        <Card size="small">
          <Statistic
            title="总笔记数"
            value={stats.total}
            prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}
            loading={loading}
          />
        </Card>
      </Col>
      <Col span={5}>
        <Card size="small">
          <Statistic
            title="草稿笔记"
            value={stats.draft}
            prefix={<EditOutlined style={{ color: '#fa8c16' }} />}
            valueStyle={{ color: '#fa8c16', fontSize: '20px', fontWeight: 'bold' }}
            loading={loading}
          />
        </Card>
      </Col>
      <Col span={5}>
        <Card size="small">
          <Statistic
            title="已发布笔记"
            value={stats.published}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}
            loading={loading}
          />
        </Card>
      </Col>
      <Col span={4}>
        <Card size="small">
          <Statistic
            title="已归档笔记"
            value={stats.archived}
            prefix={<InboxOutlined style={{ color: '#8c8c8c' }} />}
            valueStyle={{ color: '#8c8c8c', fontSize: '20px', fontWeight: 'bold' }}
            loading={loading}
          />
        </Card>
      </Col>
      <Col span={5}>
        <Card size="small">
          <Statistic
            title="关联任务笔记"
            value={stats.associated}
            prefix={<LinkOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ color: '#722ed1', fontSize: '20px', fontWeight: 'bold' }}
            loading={loading}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default WorkNotesStatsCards;