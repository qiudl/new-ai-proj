import React from 'react';
import { Card, Progress, Space, Statistic, Row, Col, Empty, Spin, Tag } from 'antd';
import { 
  ProjectOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useProgress, getProgressColor } from '../hooks/useProgress';

interface ProjectProgressDisplayProps {
  projectId: number;
  showStats?: boolean;
  className?: string;
}

export const ProjectProgressDisplay: React.FC<ProjectProgressDisplayProps> = ({
  projectId,
  showStats = true,
  className,
}) => {
  const { data: progressData, isLoading } = useProgress('project', projectId, {
    include: 'children',
    useCache: true,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="加载项目进度...">
            <div style={{ minHeight: '100px' }} />
          </Spin>
        </div>
      </Card>
    );
  }

  if (!progressData) {
    return (
      <Card className={className}>
        <Empty description="暂无进度数据" />
      </Card>
    );
  }

  const progress = Math.round(progressData.progress);
  const progressColor = getProgressColor(progress);
  
  // Calculate statistics from breakdown
  const stats = progressData.breakdown ? {
    total: progressData.breakdown.length,
    completed: progressData.breakdown.filter(t => t.status === 'completed').length,
    inProgress: progressData.breakdown.filter(t => t.status === 'in_progress').length,
    blocked: progressData.breakdown.filter(t => t.status === 'blocked').length,
  } : { total: 0, completed: 0, inProgress: 0, blocked: 0 };

  return (
    <Card
      className={className}
      title={
        <Space>
          <ProjectOutlined />
          <span>项目整体进度</span>
        </Space>
      }
    >
      {/* Main Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: progressColor }}>
            {progress}%
          </div>
          <div style={{ color: '#8c8c8c', marginTop: 8 }}>
            整体完成度
          </div>
        </div>
        
        <Progress
          percent={progress}
          strokeColor={progressColor}
          strokeWidth={16}
          showInfo={false}
        />
        
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Tag color={progressColor}>
            {progressData.method_used}
          </Tag>
        </div>
      </div>

      {/* Statistics */}
      {showStats && stats.total > 0 && (
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总任务数"
              value={stats.total}
              prefix={<ProjectOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="进行中"
              value={stats.inProgress}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已阻塞"
              value={stats.blocked}
              valueStyle={{ color: stats.blocked > 0 ? '#faad14' : undefined }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
        </Row>
      )}

      {/* Top Tasks */}
      {progressData.breakdown && progressData.breakdown.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 12, fontWeight: 500 }}>
            主要任务进度（前5项）
          </div>
          {progressData.breakdown.slice(0, 5).map((task) => {
            const taskProgress = Math.round(task.progress);
            const taskColor = getProgressColor(taskProgress, task.status);
            
            return (
              <div key={task.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{task.title || `任务 #${task.id}`}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: taskColor }}>
                    {taskProgress}%
                  </span>
                </div>
                <Progress
                  percent={taskProgress}
                  strokeColor={taskColor}
                  
                  showInfo={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
