import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  message,
  Tooltip,
  Transfer,
  Descriptions,
  Avatar,
  Badge,
  Alert,
  Spin,
  Divider,
  List
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  EditOutlined,
  HistoryOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  SwapOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 用户接口定义
interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  is_active: boolean;
  user_type: 'system' | 'enterprise';
  enterprise_id?: number;
  enterprise_name?: string;
  created_at: string;
}

// 角色接口定义
interface Role {
  id: number;
  role_code: string;
  role_name: string;
  role_description?: string;
  is_system_role: boolean;
  is_active: boolean;
}

// 用户角色关系接口
interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  assigned_by: number;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  role?: Role;
  assigned_by_name?: string;
}

// Transfer组件需要的数据格式
interface TransferItem {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
  role: Role;
}

interface UserRoleAssignmentProps {
  userId?: number;
  onRoleChange?: (userId: number, roles: Role[]) => void;
}

const UserRoleAssignment: React.FC<UserRoleAssignmentProps> = ({
  userId,
  onRoleChange
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterUserType, setFilterUserType] = useState<'all' | 'system' | 'enterprise'>('all');
  
  // Transfer组件状态
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // 加载数据
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  useEffect(() => {
    if (userId) {
      const user = users.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
        loadUserRoles(userId);
      }
    }
  }, [userId, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/users', {
        params: {
          include_inactive: false,
          page_size: 100
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.data?.users || response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get('/api/v1/roles', {
        params: { include_inactive: false }
      });
      
      if (response.data.success) {
        setRoles(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load roles:', error);
      message.error('加载角色列表失败');
    }
  };

  const loadUserRoles = async (userId: number) => {
    try {
      const response = await api.get(`/api/v1/users/${userId}/roles`);
      
      if (response.data.success) {
        const userRoleData = response.data.data || [];
        setUserRoles(userRoleData);
        
        // 设置Transfer组件的目标键
        const assignedRoleIds = userRoleData
          .filter((ur: UserRole) => ur.is_active)
          .map((ur: UserRole) => ur.role_id.toString());
        setTargetKeys(assignedRoleIds);
      }
    } catch (error: any) {
      console.error('Failed to load user roles:', error);
      message.error('加载用户角色失败');
    }
  };

  // 筛选后的用户列表
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchText || 
        user.username.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase()) ||
        user.display_name.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesType = filterUserType === 'all' || user.user_type === filterUserType;
      
      return matchesSearch && matchesType;
    });
  }, [users, searchText, filterUserType]);

  // 打开角色分配模态框
  const handleAssignRoles = (user: User) => {
    setSelectedUser(user);
    setAssignModalVisible(true);
    loadUserRoles(user.id);
  };

  // 查看角色历史
  const handleViewHistory = (user: User) => {
    setSelectedUser(user);
    setHistoryModalVisible(true);
    // TODO: 加载角色变更历史
  };

  // 保存角色分配
  const handleSaveRoleAssignment = async () => {
    if (!selectedUser) return;

    try {
      const assignedRoles = targetKeys.map(key => parseInt(key));
      
      await api.post(`/api/v1/users/${selectedUser.id}/roles`, {
        role_ids: assignedRoles
      });

      message.success('角色分配成功');
      setAssignModalVisible(false);
      loadUsers(); // 刷新用户列表
      
      // 触发回调
      if (onRoleChange) {
        const assignedRoleObjects = roles.filter(role => assignedRoles.includes(role.id));
        onRoleChange(selectedUser.id, assignedRoleObjects);
      }
      
    } catch (error: any) {
      console.error('Failed to assign roles:', error);
      message.error('角色分配失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 构建Transfer数据源
  const transferDataSource: TransferItem[] = roles.map(role => ({
    key: role.id.toString(),
    title: role.role_name,
    description: role.role_description,
    disabled: !role.is_active,
    role: role
  }));

  // 自定义Transfer渲染
  const renderTransferItem = (item: TransferItem) => {
    const customLabel = (
      <Space direction="vertical" size={2} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            {item.role.is_system_role ? (
              <SafetyOutlined style={{ color: '#52c41a' }} />
            ) : (
              <TeamOutlined style={{ color: '#1890ff' }} />
            )}
            <span style={{ fontWeight: 'bold' }}>{item.title}</span>
          </Space>
          <Tag color={item.role.is_system_role ? 'green' : 'blue'}>
            {item.role.is_system_role ? '系统' : '企业'}
          </Tag>
        </div>
        {item.description && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {item.description}
          </Text>
        )}
      </Space>
    );

    return {
      label: customLabel,
      value: item.title,
    };
  };

  // 用户表格列定义
  const userColumns = [
    {
      title: '用户信息',
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: User) => (
        <Space>
          <Avatar  icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.display_name || text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {text} ({record.email})
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '用户类型',
      dataIndex: 'user_type',
      key: 'user_type',
      render: (type: string) => (
        <Tag color={type === 'system' ? 'green' : 'blue'}>
          {type === 'system' ? '系统用户' : '企业用户'}
        </Tag>
      ),
    },
    {
      title: '所属企业',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (name: string) => name || '-',
    },
    {
      title: '当前角色',
      key: 'roles',
      render: (record: User) => (
        <div>
          {/* 这里应该显示用户的角色，但由于数据结构限制，暂时显示占位符 */}
          <Tag>待加载...</Tag>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Badge 
          status={active ? 'success' : 'default'} 
          text={active ? '启用' : '禁用'} 
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: User) => (
        <Space >
          <Button
            type="link"
            
            icon={<SwapOutlined />}
            onClick={() => handleAssignRoles(record)}
          >
            分配角色
          </Button>
          <Button
            type="link"
            
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record)}
          >
            查看历史
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 筛选控制栏 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Search
            placeholder="搜索用户名、邮箱或显示名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} md={6}>
          <Select
            placeholder="用户类型"
            style={{ width: '100%' }}
            value={filterUserType}
            onChange={setFilterUserType}
          >
            <Option value="all">全部用户</Option>
            <Option value="system">系统用户</Option>
            <Option value="enterprise">企业用户</Option>
          </Select>
        </Col>
      </Row>

      {/* 用户表格 */}
      <Table
        columns={userColumns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条用户`,
        }}
        scroll={{ x: 800 }}
      />

      {/* 角色分配模态框 */}
      <Modal
        title={
          selectedUser && (
            <Space>
              <UserOutlined />
              <span>为 "{selectedUser.display_name || selectedUser.username}" 分配角色</span>
            </Space>
          )
        }
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedUser(null);
          setTargetKeys([]);
          setSelectedKeys([]);
        }}
        onOk={handleSaveRoleAssignment}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        {selectedUser && (
          <>
            <Descriptions  column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用户名">{selectedUser.username}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{selectedUser.email}</Descriptions.Item>
              <Descriptions.Item label="显示名称">{selectedUser.display_name}</Descriptions.Item>
              <Descriptions.Item label="用户类型">
                <Tag color={selectedUser.user_type === 'system' ? 'green' : 'blue'}>
                  {selectedUser.user_type === 'system' ? '系统用户' : '企业用户'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            <Divider />
            
            <Transfer
              dataSource={transferDataSource}
              titles={['可分配角色', '已分配角色']}
              targetKeys={targetKeys}
              selectedKeys={selectedKeys}
              onChange={(nextTargetKeys) => {
                setTargetKeys(nextTargetKeys as string[]);
              }}
              onSelectChange={(sourceSelectedKeys, targetSelectedKeys) => {
                setSelectedKeys([...sourceSelectedKeys as string[], ...targetSelectedKeys as string[]]);
              }}
              render={renderTransferItem}
              listStyle={{
                width: 350,
                height: 400,
              }}
              showSearch
              showSelectAll
            />
          </>
        )}
      </Modal>

      {/* 角色历史模态框 */}
      <Modal
        title={
          selectedUser && (
            <Space>
              <HistoryOutlined />
              <span>"{selectedUser.display_name || selectedUser.username}" 的角色变更历史</span>
            </Space>
          )
        }
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedUser(null);
        }}
        footer={null}
        width={700}
      >
        {selectedUser && (
          <Alert
            message="功能开发中"
            description="角色变更历史功能正在开发中，敬请期待。"
            type="info"
            showIcon
          />
        )}
      </Modal>
    </div>
  );
};

export default UserRoleAssignment;