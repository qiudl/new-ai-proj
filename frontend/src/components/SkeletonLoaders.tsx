import React from 'react';
import { Skeleton, Card, Row, Col, Space } from 'antd';

// 仪表板统计卡片骨架屏
export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <Row gutter={[16, 16]}>
      {[1, 2, 3, 4].map((key) => (
        <Col key={key} xs={24} sm={6}>
          <Card>
            <Skeleton active>
              <Skeleton.Input style={{ width: '100%', height: '60px' }} active />
            </Skeleton>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// 任务周报日历骨架屏
export const WeeklyCalendarSkeleton: React.FC = () => {
  return (
    <Row gutter={[12, 12]}>
      {[1, 2, 3, 4, 5, 6, 7].map((key) => (
        <Col key={key} xs={24} sm={12} md={8} lg={6} xl={3.42}>
          <Card
            size="small"
            title={<Skeleton.Button style={{ width: '80px', height: '20px' }} active />}
            extra={<Skeleton.Button style={{ width: '40px', height: '16px' }} active />}
          >
            <div style={{ minHeight: '200px', padding: '8px' }}>
              <Skeleton.Button style={{ width: '100%', height: '4px', marginBottom: '12px' }} active />
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {[1, 2, 3].map((taskKey) => (
                  <Card key={taskKey} size="small" style={{ borderLeft: '4px solid #f0f0f0' }}>
                    <Skeleton active paragraph={{ rows: 2, width: ['100%', '60%'] }}>
                      <Skeleton.Button style={{ width: '100%', height: '12px' }} active />
                    </Skeleton>
                  </Card>
                ))}
              </Space>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// 任务列表骨架屏
export const TaskListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
            <Skeleton.Avatar size="large" style={{ marginRight: '16px' }} active />
            <div style={{ flex: 1 }}>
              <Skeleton active paragraph={{ rows: 2, width: ['60%', '40%'] }}>
                <Skeleton.Button style={{ width: '200px', height: '20px' }} active />
              </Skeleton>
            </div>
            <Space>
              <Skeleton.Button style={{ width: '32px', height: '32px' }} active />
              <Skeleton.Button style={{ width: '32px', height: '32px' }} active />
            </Space>
          </div>
        ))}
      </Space>
    </Card>
  );
};

// 项目选择器骨架屏
export const ProjectSelectorSkeleton: React.FC = () => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={5}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Skeleton.Button style={{ width: '60px', height: '14px' }} active />
          <Skeleton.Input style={{ width: '100%' }} active />
        </Space>
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Skeleton.Button style={{ width: '60px', height: '14px' }} active />
          <Skeleton.Input style={{ width: '100%' }} active />
        </Space>
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Skeleton.Button style={{ width: '60px', height: '14px' }} active />
          <Skeleton.Input style={{ width: '100%' }} active />
        </Space>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Skeleton.Button style={{ width: '60px', height: '14px' }} active />
          <Skeleton.Input style={{ width: '100%' }} active />
        </Space>
      </Col>
      <Col xs={24} sm={24} md={3}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Skeleton.Button style={{ width: '40px', height: '14px' }} active />
          <div style={{ padding: '6px 0' }}>
            <Skeleton.Button style={{ width: '60px', height: '20px' }} active />
          </div>
        </Space>
      </Col>
    </Row>
  );
};

// 通用表格骨架屏
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <Card>
      <div style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          {Array.from({ length: columns }, (_, index) => (
            <Col key={index} span={24 / columns}>
              <Skeleton.Button style={{ width: '100%', height: '32px' }} active />
            </Col>
          ))}
        </Row>
      </div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <Row key={rowIndex} gutter={16} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <Col key={colIndex} span={24 / columns}>
                <Skeleton.Button 
                  style={{ 
                    width: colIndex === 0 ? '80%' : '60%', 
                    height: '16px' 
                  }} 
                  active 
                />
              </Col>
            ))}
          </Row>
        ))}
      </Space>
    </Card>
  );
};

// 仪表板页面完整骨架屏
export const DashboardPageSkeleton: React.FC = () => {
  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题骨架屏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <div>
                <Skeleton.Button style={{ width: '160px', height: '32px', marginBottom: '8px' }} active />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Skeleton.Button style={{ width: '120px', height: '16px' }} active />
                  <Skeleton.Button style={{ width: '60px', height: '22px' }} active />
                  <Skeleton.Button style={{ width: '40px', height: '22px' }} active />
                </div>
              </div>
              <Space>
                <Skeleton.Button style={{ width: '60px', height: '32px' }} active />
                <Skeleton.Button style={{ width: '80px', height: '32px' }} active />
                <Skeleton.Button style={{ width: '60px', height: '32px' }} active />
              </Space>
            </Space>
          </Col>
          <Col>
            <Space>
              <Skeleton.Button style={{ width: '120px', height: '32px' }} active />
              <Skeleton.Button style={{ width: '60px', height: '32px' }} active />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 筛选控制区域骨架屏 */}
      <Card style={{ marginBottom: '24px' }}>
        <ProjectSelectorSkeleton />
      </Card>

      {/* 统计概览骨架屏 */}
      <div style={{ marginBottom: '24px' }}>
        <DashboardStatsSkeleton />
      </div>

      {/* 主要内容区域骨架屏 */}
      <WeeklyCalendarSkeleton />
    </div>
  );
};

// 加载状态智能组件
interface SmartLoadingProps {
  loading: boolean;
  error?: Error | null;
  data?: any;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
}

export const SmartLoading: React.FC<SmartLoadingProps> = ({
  loading,
  error,
  data,
  skeleton,
  children,
  errorFallback,
  emptyFallback,
}) => {
  // 错误状态
  if (error && !loading) {
    return (
      <div>
        {errorFallback || (
          <Card>
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <h3>加载失败</h3>
              <p>{error.message}</p>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // 加载状态
  if (loading && !data) {
    return <div>{skeleton}</div>;
  }

  // 空数据状态
  if (!loading && (!data || (Array.isArray(data) && data.length === 0))) {
    return (
      <div>
        {emptyFallback || (
          <Card>
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <h3>暂无数据</h3>
              <p>没有找到相关内容</p>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // 正常状态
  return <div>{children}</div>;
};