import React, { useCallback } from 'react';
import { Card, Select, Input, Space, Tag, Button, DatePicker, Table, Avatar, Popconfirm, message } from 'antd';
import { 
  ContactsOutlined, 
  CheckCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  CrownOutlined,
  UserOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEnterpriseUsers } from '../../hooks/useUserManagement';
import { EnterpriseUserParams, EnterpriseUserStats, User, USER_STATUS_CONFIG, getEnterpriseId } from '../../types/user';
import userManagementService from '../../services/userManagementService';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ColumnsType } from 'antd/es/table';

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
  const navigate = useNavigate();

  // 处理筛选变更
  const handleFilterChange = useCallback((key: keyof EnterpriseUserParams, value: any) => {
    onParamsChange({ [key]: value, page: 1 });
  }, [onParamsChange]);

  // 用户操作处理
  const handleViewUser = useCallback((userId: number) => {
    navigate(`/users/${userId}`);
  }, [navigate]);

  const handleToggleUserStatus = useCallback(async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await userManagementService.updateUser(user.id, { status: newStatus });
      message.success(`用户已${newStatus === 'active' ? '激活' : '停用'}`);
      refreshUsers();
    } catch (error) {
      message.error('操作失败');
      console.error('Toggle user status error:', error);
    }
  }, [refreshUsers]);

  const handleDeleteUser = useCallback(async (userId: number) => {
    try {
      await userManagementService.deleteUser(userId);
      message.success('用户删除成功');
      refreshUsers();
    } catch (error) {
      message.error('删除失败');
      console.error('Delete user error:', error);
    }
  }, [refreshUsers]);

  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    onParamsChange({
      page,
      page_size: pageSize || params.page_size
    });
  }, [onParamsChange, params.page_size]);

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      render: (_, user) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{user.username}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
          </div>
        </div>
      ),
      width: 200
    },
    {
      title: '联系人信息',
      key: 'contact',
      render: (_, user) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {user.contact_person_name || '-'}
            {user.is_primary_contact && (
              <Tag color="gold" style={{ marginLeft: '4px', fontSize: '10px' }}>
                <CrownOutlined style={{ fontSize: '10px' }} /> 主要联系人
              </Tag>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {user.contact_phone || '-'}
          </div>
        </div>
      ),
      width: 180
    },
    {
      title: '部门职位',
      dataIndex: 'department_title',
      key: 'department_title',
      render: (title: string) => title || '-',
      width: 120
    },
    {
      title: '企业',
      key: 'enterprise',
      render: (_, user) => {
        // v1.5: Use getEnterpriseId for backward compatibility
        const enterpriseId = getEnterpriseId(user);
        const enterpriseName = enterprises.find(e => e.id === enterpriseId)?.name;
        return enterpriseName || (enterpriseId ? `企业${enterpriseId}` : '-');
      },
      width: 150
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = USER_STATUS_CONFIG[status as keyof typeof USER_STATUS_CONFIG];
        return config ? (
          <Tag color={config.color}>{config.label}</Tag>
        ) : (
          <Tag>{status}</Tag>
        );
      },
      width: 100
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <span title={new Date(date).toLocaleString()}>
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN })}
        </span>
      ),
      width: 120
    },
    {
      title: '账户到期',
      dataIndex: 'account_expires_at',
      key: 'account_expires_at',
      render: (date: string) => {
        if (!date) return '-';
        const expiresAt = new Date(date);
        const now = new Date();
        const isExpiring = (expiresAt.getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000; // 30天内
        return (
          <span 
            style={{ color: isExpiring ? '#fa541c' : undefined }}
            title={expiresAt.toLocaleString()}
          >
            {formatDistanceToNow(expiresAt, { addSuffix: true, locale: zhCN })}
          </span>
        );
      },
      width: 120
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, user) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewUser(user.id)}
            title="查看详情"
          />
          <Popconfirm
            title={`确定要${user.status === 'active' ? '停用' : '激活'}这个用户吗？`}
            onConfirm={() => handleToggleUserStatus(user)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              icon={user.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              danger={user.status === 'active'}
              title={user.status === 'active' ? '停用用户' : '激活用户'}
            />
          </Popconfirm>
          <Popconfirm
            title="确定要删除这个用户吗？此操作不可恢复。"
            onConfirm={() => handleDeleteUser(user.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              title="删除用户"
            />
          </Popconfirm>
        </Space>
      ),
      width: 120,
      fixed: 'right'
    }
  ];


  // 筛选器渲染
  const renderFilters = () => {
    return (
      <Card  style={{ marginBottom: 16 }}>
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
      {renderFilters()}
      
      {/* 用户表格 */}
      <Card>
        <Table<User>
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: params.page || 1,
            pageSize: params.page_size || 10,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: handlePageChange,
            onShowSizeChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 'max-content' }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default EnterpriseUsersTab;