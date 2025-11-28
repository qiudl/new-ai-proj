import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Tabs,
  Alert,
  Form,
  Input,
  Switch,
  message,
  Spin,
  Badge,
  Avatar,
  Table,
  Tooltip,
  Popconfirm,
  Transfer,
  Tree,
  Divider,
  Statistic,
  Timeline
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  SafetyOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  SecurityScanOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { permissionService } from '../services/permissionService';
import { getPermissionName, getPermissionDescription, getPermissionCategory, groupPermissionsByCategory } from '../utils/permissionMapping';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 接口定义
interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  roleDescription?: string;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  permissionsCount?: number;
}

interface Permission {
  id: number;
  permissionCode: string;
  permissionName: string;
  permissionDescription?: string;
  module: string;
  resource: string;
  action: string;
  isActive: boolean;
  isGranted?: boolean;
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
}

const AdminRoleDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';

  // 状态管理
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [roleUsers, setRoleUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(isEditMode);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 表单
  const [form] = Form.useForm();

  // 权限相关状态
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // 加载角色详情
  const loadRoleDetail = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // 加载角色基本信息
      const roleResponse = await permissionService.getRoles();
      const allRoles = (roleResponse as any).roles || [];
      const currentRole = allRoles.find((r: Role) => r.id === parseInt(id));
      
      if (!currentRole) {
        message.error('角色不存在');
        navigate('/admin/roles');
        return;
      }

      setRole(currentRole);
      form.setFieldsValue({
        roleCode: currentRole.roleCode,
        roleName: currentRole.roleName,
        roleDescription: currentRole.roleDescription,
        isActive: currentRole.isActive
      });

      // 加载角色权限
      try {
        const rolePermissionsResponse = await permissionService.getRolePermissions(parseInt(id));
        const permissions = (rolePermissionsResponse as any).permissions || [];
        setRolePermissions(permissions);
        setSelectedPermissions(permissions.map((p: Permission) => p.permissionCode));
      } catch (error) {
        console.warn('Failed to load role permissions:', error);
        setRolePermissions([]);
        setSelectedPermissions([]);
      }

      // 加载模拟用户数据 (实际项目中应该从API获取)
      const mockUsers: User[] = [
        { id: 1, username: 'admin', name: '系统管理员', email: 'admin@company.com', isActive: true },
        { id: 2, username: 'john_doe', name: '张三', email: 'john@company.com', isActive: true },
        { id: 3, username: 'jane_smith', name: '李四', email: 'jane@company.com', isActive: true }
      ].slice(0, currentRole.userCount || 0);
      
      setRoleUsers(mockUsers);
      
    } catch (error: any) {
      console.error('Failed to load role detail:', error);
      message.error('加载角色信息失败：' + (error.message || '未知错误'));
      
      // 如果API失败，创建模拟数据
      const mockRole: Role = {
        id: parseInt(id),
        roleCode: 'SAMPLE_ROLE',
        roleName: '示例角色',
        roleDescription: '这是一个示例角色',
        isSystemRole: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        userCount: 5,
        permissionsCount: 12
      };
      setRole(mockRole);
      form.setFieldsValue(mockRole);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, form]);

  // 加载所有权限
  const loadAllPermissions = useCallback(async () => {
    try {
      const response = await permissionService.getPermissions();
      const allPermissions = (response as any).permissions || [];
      setPermissions(allPermissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      
      // 使用模拟权限数据
      const mockPermissions: Permission[] = [
        {
          id: 1,
          permissionCode: 'user.create',
          permissionName: '创建用户',
          permissionDescription: '允许创建新用户',
          module: '用户管理',
          resource: 'user',
          action: 'create',
          isActive: true
        },
        {
          id: 2,
          permissionCode: 'user.read',
          permissionName: '查看用户',
          permissionDescription: '允许查看用户信息',
          module: '用户管理',
          resource: 'user',
          action: 'read',
          isActive: true
        },
        {
          id: 3,
          permissionCode: 'project.create',
          permissionName: '创建项目',
          permissionDescription: '允许创建新项目',
          module: '项目管理',
          resource: 'project',
          action: 'create',
          isActive: true
        }
      ];
      setPermissions(mockPermissions);
    }
  }, []);

  // 保存角色信息
  const handleSaveRole = async (values: any) => {
    if (!role) return;
    
    setSaving(true);
    try {
      // 更新角色基本信息
      await permissionService.updateRole(role.id, {
        roleName: values.roleName,
        roleDescription: values.roleDescription,
        permissionCodes: selectedPermissions
      });
      
      message.success('角色信息保存成功');
      setEditMode(false);
      loadRoleDetail(); // 重新加载数据
    } catch (error: any) {
      message.error('保存失败：' + (error.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  // 权限分组数据
  const permissionGroups = useMemo(() => {
    return groupPermissionsByCategory(permissions.map(p => ({
      permission_code: p.permissionCode,
      ...p
    })));
  }, [permissions]);

  // 权限树数据
  const permissionTreeData = useMemo(() => {
    return Object.entries(permissionGroups).map(([category, perms]) => ({
      title: category,
      key: category,
      children: perms.map((perm: any) => ({
        title: (
          <div>
            <strong>{getPermissionName(perm.permission_code)}</strong>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {perm.permission_code}
            </Text>
          </div>
        ),
        key: perm.permission_code,
        isLeaf: true
      }))
    }));
  }, [permissionGroups]);

  // 初始化
  useEffect(() => {
    loadRoleDetail();
    loadAllPermissions();
  }, [loadRoleDetail, loadAllPermissions]);

  // 用户表格列
  const userColumns = [
    {
      title: '用户',
      key: 'user',
      render: (record: User) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.username}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Badge status={isActive ? 'success' : 'default'} text={isActive ? '活跃' : '禁用'} />
      ),
    }
  ];

  // 权限表格列
  const permissionColumns = [
    {
      title: '权限名称',
      key: 'permission',
      render: (record: Permission) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {getPermissionName(record.permissionCode)}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.permissionCode}
          </Text>
        </div>
      ),
    },
    {
      title: '分类',
      key: 'category',
      render: (record: Permission) => (
        <Tag color="blue">
          {getPermissionCategory(record.permissionCode)}
        </Tag>
      ),
    },
    {
      title: '描述',
      key: 'description',
      render: (record: Permission) => (
        <Text type="secondary">
          {getPermissionDescription(record.permissionCode)}
        </Text>
      ),
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" tip="加载角色信息...">
          <div style={{ minHeight: '100px' }} />
        </Spin>
      </div>
    );
  }

  if (!role) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Alert
          message="角色不存在"
          description="请检查角色ID是否正确"
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 面包屑导航 */}
      <div style={{ marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { title: (<span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>首页</span>) },
            { title: (<span onClick={() => navigate('/admin/permissions')} style={{ cursor: 'pointer' }}>系统管理</span>) },
            { title: (<span onClick={() => navigate('/admin/roles')} style={{ cursor: 'pointer' }}>角色管理</span>) },
            { title: role.roleName }
          ]}
        />
      </div>

      {/* 页面标题和操作 */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/admin/roles')}
              >
                返回列表
              </Button>
              <div>
                <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar 
                    icon={role.isSystemRole ? <SafetyOutlined /> : <TeamOutlined />}
                    style={{ 
                      backgroundColor: role.isSystemRole ? '#52c41a' : '#1890ff' 
                    }}
                  />
                  {role.roleName}
                  <Tag color={role.isSystemRole ? 'green' : 'blue'}>
                    {role.isSystemRole ? '系统角色' : '自定义角色'}
                  </Tag>
                  <Badge status={role.isActive ? 'success' : 'default'} />
                </Title>
                <Text type="secondary">{role.roleDescription || '暂无描述'}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              {!editMode && !role.isSystemRole && (
                <Button 
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditMode(true)}
                >
                  编辑角色
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* 角色统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="关联用户"
              value={role.userCount || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="分配权限"
              value={rolePermissions.length}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="创建时间"
              value={new Date(role.createdAt).toLocaleDateString()}
              prefix={<HistoryOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="最后更新"
              value={new Date(role.updatedAt).toLocaleDateString()}
              prefix={<HistoryOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
        >
          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                基本信息
              </span>
            } 
            key="overview"
          >
            {editMode ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSaveRole}
                style={{ maxWidth: 600 }}
              >
                <Form.Item
                  label="角色代码"
                  name="roleCode"
                >
                  <Input disabled />
                </Form.Item>
                
                <Form.Item
                  label="角色名称"
                  name="roleName"
                  rules={[
                    { required: true, message: '请输入角色名称' },
                    { max: 100, message: '角色名称不能超过100个字符' }
                  ]}
                >
                  <Input />
                </Form.Item>
                
                <Form.Item
                  label="角色描述"
                  name="roleDescription"
                >
                  <Input.TextArea rows={4} maxLength={500} />
                </Form.Item>
                
                <Form.Item
                  label="启用状态"
                  name="isActive"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                </Form.Item>

              </Form>
            ) : (
              <div>
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>角色代码：</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Tag color="geekblue">{role.roleCode}</Tag>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>角色名称：</Text>
                      <div style={{ marginTop: '4px', fontSize: '16px' }}>
                        {role.roleName}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>角色类型：</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Tag color={role.isSystemRole ? 'green' : 'blue'}>
                          {role.isSystemRole ? '系统角色' : '自定义角色'}
                        </Tag>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>状态：</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Badge 
                          status={role.isActive ? 'success' : 'default'} 
                          text={role.isActive ? '启用' : '禁用'}
                        />
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} md={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>角色描述：</Text>
                      <Paragraph style={{ marginTop: '4px', marginBottom: 0 }}>
                        {role.roleDescription || '暂无描述'}
                      </Paragraph>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>创建时间：</Text>
                      <div style={{ marginTop: '4px' }}>
                        {new Date(role.createdAt).toLocaleString()}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>更新时间：</Text>
                      <div style={{ marginTop: '4px' }}>
                        {new Date(role.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SecurityScanOutlined />
                权限管理 ({rolePermissions.length})
              </span>
            } 
            key="permissions"
          >
            {editMode ? (
              <div>
                <Alert
                  message="权限配置"
                  description="选择要分配给此角色的权限。权限按分类组织，可以展开查看详细权限。"
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <Tree
                  checkable
                  checkedKeys={selectedPermissions}
                  onCheck={(checkedKeys) => {
                    setSelectedPermissions(checkedKeys as string[]);
                  }}
                  treeData={permissionTreeData}
                  height={400}
                  style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '8px' }}
                />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">
                    已选择 {selectedPermissions.length} 个权限
                  </Text>
                </div>
              </div>
            ) : (
              <Table
                columns={permissionColumns}
                dataSource={rolePermissions}
                rowKey="id"
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `显示 ${range[0]}-${range[1]} 条，共 ${total} 个权限`,
                }}
                locale={{
                  emptyText: '暂未分配权限'
                }}
              />
            )}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                关联用户 ({roleUsers.length})
              </span>
            } 
            key="users"
          >
            <Table
              columns={userColumns}
              dataSource={roleUsers}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `显示 ${range[0]}-${range[1]} 条，共 ${total} 个用户`,
              }}
              locale={{
                emptyText: '暂无用户使用此角色'
              }}
            />
          </TabPane>
        </Tabs>

        {/* 全局保存按钮 - 编辑模式下显示 */}
        {editMode && (
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <Space>
              <Button onClick={() => {
                setEditMode(false);
                form.resetFields();
                form.setFieldsValue({
                  roleCode: role.roleCode,
                  roleName: role.roleName,
                  roleDescription: role.roleDescription,
                  isActive: role.isActive
                });
              }}>
                取消
              </Button>
              <Button
                type="primary"
                loading={saving}
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
              >
                保存更改
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminRoleDetailPage;