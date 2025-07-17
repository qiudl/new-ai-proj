import React from 'react';
import { Card, Row, Col, Statistic, Button } from 'antd';
import { ProjectOutlined, CheckCircleOutlined, ClockCircleOutlined, ImportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: '项目总数',
      value: 3,
      icon: <ProjectOutlined style={{ color: '#1890ff' }} />,
    },
    {
      title: '已完成任务',
      value: 15,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    },
    {
      title: '进行中任务',
      value: 8,
      icon: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
    },
    {
      title: '待办任务',
      value: 12,
      icon: <ClockCircleOutlined style={{ color: '#faad14' }} />,
    },
  ];

  const quickActions = [
    {
      title: '项目管理',
      description: '查看和管理所有项目',
      action: () => navigate('/projects'),
    },
    {
      title: '批量导入',
      description: '使用AI辅助批量导入任务',
      action: () => navigate('/bulk-import'),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">工作台</h1>
        <p className="page-description">项目和任务概览</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="快速操作" extra={<Button type="link">更多</Button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {quickActions.map((action, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ImportOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{action.title}</div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>{action.description}</div>
                  </div>
                  <Button type="primary" size="small" onClick={action.action}>
                    前往
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="最近活动" extra={<Button type="link">查看全部</Button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>完成任务：项目环境搭建</span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>2小时前</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ProjectOutlined style={{ color: '#1890ff' }} />
                <span>创建项目：AI模型训练项目</span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>1天前</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImportOutlined style={{ color: '#fa8c16' }} />
                <span>批量导入25个任务</span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>2天前</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;