import React, { useCallback } from 'react';
import { Card, Row, Col, Statistic, Select, Input, Space, Tag, Button, DatePicker } from 'antd';
import { 
  BankOutlined, 
  ContactsOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useEnterpriseUsers } from '../../hooks/useUserManagement';
import { EnterpriseUserParams, EnterpriseUserStats } from '../../types/user';

interface EnterpriseUsersTabProps {
  params: EnterpriseUserParams;
  onParamsChange: (newParams: Partial<EnterpriseUserParams>) => void;
  onStatClick: (type: string, value?: string) => void;
  enterprises: Array<{ id: number; name: string }>; // 企业选项
}

const EnterpriseUsersTab: React.FC<EnterpriseUsersTabProps> = ({
  params,
  onParamsChange,
  onStatClick,
  enterprises = []
}) => {
  const { users, total, stats, loading, refreshUsers, refreshStats } = useEnterpriseUsers(params);

  // 处理筛选变更
  const handleFilterChange = useCallback((key: keyof EnterpriseUserParams, value: any) => {
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
              prefix={<BankOutlined />}
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
              title="主要联系人"
              value={stats.primary_contacts}
              prefix={<CrownOutlined style={{ color: '#faad14' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('contact_type', 'primary')}
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
              title="普通联系人"
              value={(stats.total || 0) - (stats.primary_contacts || 0)}
              prefix={<ContactsOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('contact_type', 'normal')}
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
              title="即将过期账户"
              value={stats.expiring_accounts}
              prefix={<ClockCircleOutlined style={{ color: '#fa541c' }} />}
              suffix={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => onStatClick('expiring')}
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
            mode="multiple"
            placeholder="选择企业"
            allowClear
            style={{ minWidth: 200 }}
            value={params.enterprise_ids}
            onChange={(value) => handleFilterChange('enterprise_ids', value)}
            options={enterprises.map(enterprise => ({
              label: enterprise.name,
              value: enterprise.id
            }))}
          />
          
          <Select
            placeholder="联系人类型"
            allowClear
            style={{ width: 120 }}
            value={params.contact_type}
            onChange={(value) => handleFilterChange('contact_type', value)}
            options={[
              { 
                label: <><CrownOutlined style={{ color: '#faad14' }} /> 主要联系人</>, 
                value: 'primary' 
              },
              { 
                label: <><ContactsOutlined style={{ color: '#1890ff' }} /> 普通联系人</>, 
                value: 'normal' 
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

          <DatePicker.RangePicker
            placeholder={['账户过期开始', '账户过期结束']}
            style={{ width: 240 }}
            value={params.expire_date_range ? 
              [params.expire_date_range[0] as any, params.expire_date_range[1] as any] : 
              undefined
            }
            onChange={(dates, dateStrings) => {
              handleFilterChange('expire_date_range', dateStrings as [string, string]);
            }}
          />

          <Input.Search
            placeholder="搜索用户名或联系人"
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
    <div className="enterprise-users-tab">
      {renderStatsCards()}
      {renderStatusStats()}
      {renderFilters()}
      
      {/* 用户表格将在后续步骤中实现 */}
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div>企业用户表格 ({users.length} / {total})</div>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
            表格组件将在下一阶段实现
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnterpriseUsersTab;