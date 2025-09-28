import React, { useMemo } from 'react';
import { Card, Col, Row, Tag, Typography, Empty } from 'antd';
import type { Task } from '../types/task';

const { Title, Text } = Typography;

export interface SmartSwimlanesProps {
  tasks: Task[];
}

export const SmartSwimlanes: React.FC<SmartSwimlanesProps> = ({ tasks }) => {
  const groups = useMemo(() => {
    const byStatus: Record<string, Task[]> = { todo: [], in_progress: [], completed: [], other: [] };
    (Array.isArray(tasks) ? tasks : []).forEach(t => {
      if (t.status === 'todo') byStatus.todo.push(t);
      else if (t.status === 'in_progress') byStatus.in_progress.push(t);
      else if (t.status === 'completed') byStatus.completed.push(t);
      else (byStatus.other = byStatus.other || []).push(t);
    });
    return byStatus;
  }, [tasks]);

  const columns = [
    { key: 'todo', title: '待办', color: 'default' as const },
    { key: 'in_progress', title: '进行中', color: 'blue' as const },
    { key: 'completed', title: '已完成', color: 'green' as const },
  ];

  const data = tasks || [];
  if (!data.length) {
    return <Empty description="暂无任务" />;
  }

  return (
    <Row gutter={16}>
      {columns.map(col => (
        <Col key={col.key} xs={24} md={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={4} style={{ margin: 0 }}>{col.title}</Title>
                <Tag color={col.color}>{(groups as any)[col.key]?.length || 0}</Tag>
              </div>
            }
            style={{ minHeight: 300 }}
          >
            {(groups as any)[col.key]?.map((t: Task) => (
              <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                {t.description && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{t.description}</Text>
                )}
                <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                  {t.assignee_name && <Tag>{t.assignee_name}</Tag>}
                  {t.due_date && <Tag color="orange">截止 {t.due_date}</Tag>}
                </div>
              </div>
            ))}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SmartSwimlanes;
