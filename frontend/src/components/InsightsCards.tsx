import React from 'react';
import { Card, Col, Progress, Row, Statistic, Tag } from 'antd';

export interface InsightsStats {
  total: number;
  completed: number;
  in_progress: number;
  todo: number;
  overdue: number;
  high?: number;
  medium?: number;
  low?: number;
}

export const InsightsCards: React.FC<{ stats: InsightsStats }> = ({ stats }) => {
  const { total, completed, in_progress, todo, overdue, high=0, medium=0, low=0 } = stats;
  const donePct = total ? Math.round((completed / total) * 100) : 0;
  const inProgPct = total ? Math.round((in_progress / total) * 100) : 0;
  const overduePct = total ? Math.round((overdue / total) * 100) : 0;

  return (
    <Row gutter={[16,16]}>
      <Col xs={24} md={8}>
        <Card title="总任务">
          <Statistic value={total} />
          <div style={{ marginTop: 8 }}>
            <Tag color="green">完成 {completed}</Tag>
            <Tag color="blue">进行中 {in_progress}</Tag>
            <Tag>待办 {todo}</Tag>
          </div>
          <div style={{ marginTop: 12 }}>
            <div>完成率</div>
            <Progress percent={donePct} size="small" />
          </div>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="进行中/逾期">
          <div style={{ marginBottom: 8 }}>进行中占比</div>
          <Progress percent={inProgPct} size="small" status="active" />
          <div style={{ marginTop: 12 }}>逾期占比</div>
          <Progress percent={overduePct} size="small" status={overduePct > 0 ? 'exception' : 'normal'} />
          <div style={{ marginTop: 8 }}>
            <Tag color="red">逾期 {overdue}</Tag>
          </div>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="优先级分布">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag color="red">高 {high}</Tag>
            <Tag color="orange">中 {medium}</Tag>
            <Tag color="default">低 {low}</Tag>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default InsightsCards;
