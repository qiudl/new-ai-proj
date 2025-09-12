import React, { useCallback } from 'react';
import { Card, Select, Input, Space, Tag, Button, Table, Avatar, Popconfirm, message } from 'antd';
import { 
  UserOutlined, 
  CrownOutlined, 
  TeamOutlined, 
  BuildOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSystemUsers } from '../../hooks/useUserManagement';
import { SystemUserParams, SystemUserStats, User, USER_ROLE_CONFIG, USER_STATUS_CONFIG } from '../../types/user';
import userManagementService from '../../services/userManagementService';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ColumnsType } from 'antd/es/table';

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
  const navigate = useNavigate();

  // 处理筛选变更
  const handleFilterChange = useCallback((key: keyof SystemUserParams, value: any) => {
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
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const config = USER_ROLE_CONFIG[role as keyof typeof USER_ROLE_CONFIG];
        return config ? (
          <Tag color={config.color}>{config.label}</Tag>
        ) : (
          <Tag>{role}</Tag>
        );
      },
      width: 120
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
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (date: string) => date ? (
        <span title={new Date(date).toLocaleString()}>
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN })}
        </span>
      ) : '-',
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

export default SystemUsersTab;