import React from 'react';
import { Card, Row, Col } from 'antd';
import { HierarchicalStats } from '../utils/HierarchicalTaskManager';

interface HierarchicalStatsCardsProps {
  stats: HierarchicalStats | null;
  onCardClick?: (filterType: string, value: any) => void;
}

const HierarchicalStatsCards: React.FC<HierarchicalStatsCardsProps> = ({
  stats,
  onCardClick,
}) => {
  if (!stats) {
    return null;
  }

  const rootTasks = stats.byLevel.get(0) || 0;
  const childTasks = stats.total - rootTasks;

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={4}>
        <Card style={{ cursor: 'pointer' }} onClick={() => onCardClick?.('all', null)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {stats.total}
            </div>
            <div style={{ color: '#666' }}>📋 总任务</div>
          </div>
        </Card>
      </Col>
      <Col span={4}>
        <Card style={{ cursor: 'pointer' }} onClick={() => onCardClick?.('level', 0)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {rootTasks}
            </div>
            <div style={{ color: '#666' }}>🌳 根任务</div>
          </div>
        </Card>
      </Col>
      <Col span={4}>
        <Card style={{ cursor: 'pointer' }} onClick={() => onCardClick?.('document', 'with')}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
              {stats.withDocuments}
            </div>
            <div style={{ color: '#666' }}>📄 有文档</div>
          </div>
        </Card>
      </Col>
      <Col span={4}>
        <Card style={{ cursor: 'pointer' }} onClick={() => onCardClick?.('document', 'without')}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
              {stats.withoutDocuments}
            </div>
            <div style={{ color: '#666' }}>❌ 无文档</div>
          </div>
        </Card>
      </Col>
      <Col span={4}>
        <Card style={{ cursor: 'pointer' }} onClick={() => onCardClick?.('status', 'in_progress')}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#13c2c2' }}>
              {stats.byStatus.get('in_progress') || 0}
            </div>
            <div style={{ color: '#666' }}>🔄 进行中</div>
          </div>
        </Card>
      </Col>
      <Col span={4}>
        <Card style={{ cursor: 'pointer' }} onClick={() => onCardClick?.('child', null)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#eb2f96' }}>
              {childTasks}
            </div>
            <div style={{ color: '#666' }}>🌿 子任务</div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default HierarchicalStatsCards;