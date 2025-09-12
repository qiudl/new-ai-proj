import React, { useCallback } from 'react';
import { Card, Row, Col, Statistic, Select, Input, Space, Tag, Button } from 'antd';
import { 
  UserOutlined, 
  CrownOutlined, 
  TeamOutlined, 
  BuildOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useSystemUsers } from '../../hooks/useUserManagement';
import { SystemUserParams, SystemUserStats } from '../../types/user';

interface SystemUsersTabProps {
  params: SystemUserParams;
  onParamsChange: (newParams: Partial<SystemUserParams>) => void;
  onStatClick: (type: string, value?: string) => void;
}

const SystemUsersTab: React.FC<SystemUsersTabProps> = ({
  params,
  onParamsChange,
  onStatClick
}) => {
  const { users, total, stats, loading, refreshUsers, refreshStats } = useSystemUsers(params);

  // 处理筛选变更
  const handleFilterChange = useCallback((key: keyof SystemUserParams, value: any) => {
    onParamsChange({ [key]: value, page: 1 });
  }, [onParamsChange]);

  // 统计卡片渲染
  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" className="stats-card">
            <Statistic
              title="总用户数"
              value={stats.total}
              prefix={<UserOutlined />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('total')}
                >
                  查看全部
                </Button>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stats-card">
            <Statistic
              title="系统管理员"
              value={stats.by_role?.admin || 0}
              prefix={<CrownOutlined style={{ color: '#f50' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('role', 'admin')}
                >
                  筛选
                </Button>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stats-card">
            <Statistic
              title="项目经理"
              value={stats.by_role?.project_manager || 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('role', 'project_manager')}
                >
                  筛选
                </Button>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stats-card">
            <Statistic
              title="开发工程师"
              value={stats.by_role?.developer || 0}
              prefix={<BuildOutlined style={{ color: '#52c41a' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('role', 'developer')}
                >
                  筛选
                </Button>
              }
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 状态统计渲染
  const renderStatusStats = () => {
    if (!stats?.by_status) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small" className="stats-card">
            <Statistic
              title="正常用户"
              value={stats.by_status.active || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('status', 'active')}
                >
                  筛选
                </Button>
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="stats-card">
            <Statistic
              title="未激活用户"
              value={stats.by_status.inactive || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('status', 'inactive')}
                >
                  筛选
                </Button>
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" className="stats-card">
            <Statistic
              title="已停用用户"
              value={stats.by_status.suspended || 0}
              prefix={<StopOutlined style={{ color: '#f50' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('status', 'suspended')}
                >
                  筛选
                </Button>
              }
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 筛选器渲染
  const renderFilters = () => {
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="选择角色"
            allowClear
            style={{ width: 160 }}
            value={params.role}
            onChange={(value) => handleFilterChange('role', value)}
            options={[
              { 
                label: <><CrownOutlined style={{ color: '#f50' }} /> 系统管理员</>, 
                value: 'admin' 
              },
              { 
                label: <><TeamOutlined style={{ color: '#1890ff' }} /> 项目经理</>, 
                value: 'project_manager' 
              },
              { 
                label: <><BuildOutlined style={{ color: '#52c41a' }} /> 开发工程师</>, 
                value: 'developer' 
              }
            ]}
          />
          
          <Select
            placeholder="用户状态"
            allowClear
            style={{ width: 120 }}
            value={params.status}
            onChange={(value) => handleFilterChange('status', value)}
            options={[
              { 
                label: <Tag color="success">正常</Tag>, 
                value: 'active' 
              },
              { 
                label: <Tag color="warning">未激活</Tag>, 
                value: 'inactive' 
              },
              { 
                label: <Tag color="error">已停用</Tag>, 
                value: 'suspended' 
              }
            ]}
          />

          <Input.Search
            placeholder="搜索用户名或邮箱"
            allowClear
            style={{ width: 200 }}
            value={params.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onSearch={() => {/* 搜索逻辑已在onChange中处理 */}}
          />

          <Button onClick={() => {
            refreshUsers();
            refreshStats();
          }}>
            刷新
          </Button>
        </Space>
      </Card>
    );
  };

  return (
    <div className="system-users-tab">
      {renderStatsCards()}
      {renderStatusStats()}
      {renderFilters()}
      
      {/* 用户表格将在后续步骤中实现 */}
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div>系统用户表格 ({users.length} / {total})</div>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
            表格组件将在下一阶段实现
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemUsersTab;