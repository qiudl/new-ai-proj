import React, { useState } from 'react';
import { 
  Card, 
  Space, 
  Typography, 
  Table, 
  Tag, 
  Divider, 
  Alert,
  Row,
  Col,
  Statistic,
  Switch,
  Button,
  message
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useAdvancedPermissions } from '../hooks/useAdvancedPermissions';
import { useLocation } from 'react-router-dom';
import PermissionWrapper from '../components/PermissionWrapper';
import PermissionButton from '../components/PermissionButton';
import PermissionTableActions from '../components/PermissionTableActions';
import { 
  PROJECT_PERMISSIONS, 
  USER_PERMISSIONS, 
  ENTERPRISE_PERMISSIONS,
  SYSTEM_PERMISSIONS
} from '../constants/permissions';

const { Title, Paragraph, Text } = Typography;

// 模拟数据
const mockProjects = [
  { id: 1, name: '项目A', status: 'active', manager: '张三' },
  { id: 2, name: '项目B', status: 'planning', manager: '李四' },
  { id: 3, name: '项目C', status: 'completed', manager: '王五' }
];

const mockUsers = [
  { id: 1, name: '张三', role: 'admin', status: 'active' },
  { id: 2, name: '李四', role: 'manager', status: 'active' },
  { id: 3, name: '王五', role: 'user', status: 'suspended' }
];

/**
 * 权限功能演示页面
 * 
 * 展示各种权限组件的使用方法和效果
 */
const PermissionDemoPage: React.FC = () => {
  const location = useLocation();
  const [demoMode, setDemoMode] = useState<'normal' | 'restricted'>('normal');

  const {
    userPermissions,
    analyzeUserPermissions,
    routePermissionGranted,
    loading,
    error,
    canCreate,
    canUpdate,
    canDelete,
    isAdmin,
    isCompanyAdmin,
    hasEffectivePermission,
    renderWithPermission
  } = useAdvancedPermissions({
    routePath: location.pathname
  });

  // 处理操作
  const handleViewProject = (record: any) => {
    message.info(`查看项目: ${record.name}`);
  };

  const handleEditProject = (record: any) => {
    message.success(`编辑项目: ${record.name}`);
  };

  const handleDeleteProject = (record: any) => {
    message.warning(`删除项目: ${record.name}`);
  };

  const handleViewUser = (record: any) => {
    message.info(`查看用户: ${record.name}`);
  };

  const handleEditUser = (record: any) => {
    message.success(`编辑用户: ${record.name}`);
  };

  const handleDeleteUser = (record: any) => {
    message.error(`删除用户: ${record.name}`);
  };

  // 项目表格列定义
  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          planning: 'blue',
          completed: 'purple'
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      }
    },
    {
      title: '负责人',
      dataIndex: 'manager',
      key: 'manager',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <PermissionTableActions
          record={record}
          showView
          showEdit
          showDelete
          viewPermission={PROJECT_PERMISSIONS.READ}
          editPermission={PROJECT_PERMISSIONS.UPDATE}
          deletePermission={PROJECT_PERMISSIONS.DELETE}
          onView={handleViewProject}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          deleteConfirmContent={(record) => `确定要删除项目 "${record.name}" 吗？此操作不可恢复。`}
        />
      )
    }
  ];

  // 用户表格列定义
  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag>{role}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{status}</Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <PermissionTableActions
          record={record}
          showView
          showEdit
          showDelete
          viewPermission={USER_PERMISSIONS.READ}
          editPermission={USER_PERMISSIONS.UPDATE}
          deletePermission={USER_PERMISSIONS.DELETE}
          onView={handleViewUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          deleteConfirmContent={(record) => `确定要删除用户 "${record.name}" 吗？`}
          moreActions={[
            {
              key: 'resetPassword',
              label: '重置密码',
              permission: USER_PERMISSIONS.UPDATE,
              onClick: (record) => { message.info(`重置 ${record.name} 的密码`); }
            }
          ]}
        />
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>权限检查中...</Title>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="权限系统错误"
        description={error}
        showIcon
        style={{ margin: '20px' }}
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        <SafetyCertificateOutlined /> 权限管理功能演示
      </Title>

      {/* 权限概览 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Statistic
            title="当前角色"
            value={userPermissions?.role?.roleName || '未知'}
            prefix={<UserOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="有效权限数"
            value={analyzeUserPermissions?.totalPermissions || 0}
            prefix={<SafetyCertificateOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="管理员权限"
            value={isAdmin ? '是' : '否'}
            valueStyle={{ color: isAdmin ? '#3f8600' : '#cf1322' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="路由权限"
            value={routePermissionGranted ? '通过' : '拒绝'}
            valueStyle={{ color: routePermissionGranted ? '#3f8600' : '#cf1322' }}
          />
        </Col>
      </Row>

      {/* 演示模式切换 */}
      <Card size="small" style={{ marginBottom: '24px' }}>
        <Space>
          <Text>演示模式:</Text>
          <Switch
            checked={demoMode === 'restricted'}
            onChange={(checked) => setDemoMode(checked ? 'restricted' : 'normal')}
          />
          <Text>{demoMode === 'restricted' ? '受限模式' : '正常模式'}</Text>
          <Text type="secondary">
            (受限模式下某些按钮会被禁用以演示权限控制效果)
          </Text>
        </Space>
      </Card>

      {/* 权限按钮演示 */}
      <Card title="权限按钮演示" style={{ marginBottom: '24px' }}>
        <Paragraph>
          以下按钮会根据用户权限自动显示、隐藏或禁用：
        </Paragraph>
        
        <Space wrap>
          <PermissionButton
            type="primary"
            icon={<PlusOutlined />}
            permission={PROJECT_PERMISSIONS.CREATE}
            fallbackMode="tooltip"
            noPermissionTooltip="您没有创建项目的权限"
          >
            创建项目
          </PermissionButton>

          <PermissionButton
            icon={<EditOutlined />}
            permission={PROJECT_PERMISSIONS.UPDATE}
            fallbackMode="disable"
          >
            编辑项目
          </PermissionButton>

          <PermissionButton
            danger
            icon={<DeleteOutlined />}
            permission={PROJECT_PERMISSIONS.DELETE}
            fallbackMode="hide"
            dangerousOperation
          >
            删除项目
          </PermissionButton>

          <PermissionButton
            icon={<UserOutlined />}
            permissions={[USER_PERMISSIONS.CREATE, ENTERPRISE_PERMISSIONS.CREATE]}
            requireAll={false}
            fallbackMode="tooltip"
            noPermissionTooltip="需要用户创建或企业创建权限"
          >
            创建用户/企业
          </PermissionButton>

          <PermissionButton
            type="primary"
            permission={SYSTEM_PERMISSIONS.ADMIN}
            fallbackMode="tooltip"
            noPermissionTooltip="需要系统管理员权限"
          >
            系统管理
          </PermissionButton>
        </Space>
      </Card>

      {/* 权限包装器演示 */}
      <Card title="权限包装器演示" style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <PermissionWrapper 
              permission={PROJECT_PERMISSIONS.READ}
              fallback={<Alert type="warning" message="您没有权限查看项目信息" showIcon />}
            >
              <Alert type="success" message="您有权限查看项目信息" showIcon />
            </PermissionWrapper>
          </Col>
          <Col span={12}>
            <PermissionWrapper 
              permission={SYSTEM_PERMISSIONS.ADMIN}
              fallback={<Alert type="error" message="您没有系统管理权限" showIcon />}
            >
              <Alert type="info" message="您拥有系统管理权限" showIcon />
            </PermissionWrapper>
          </Col>
        </Row>
      </Card>

      {/* 项目管理演示 */}
      <Card 
        title={
          <Space>
            <ProjectOutlined />
            项目管理
          </Space>
        }
        extra={
          <PermissionButton
            type="primary"
            icon={<PlusOutlined />}
            permission={PROJECT_PERMISSIONS.CREATE}
            onClick={() => message.success('创建新项目')}
          >
            新建项目
          </PermissionButton>
        }
        style={{ marginBottom: '24px' }}
      >
        <Table
          columns={projectColumns}
          dataSource={mockProjects}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      {/* 用户管理演示 */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            用户管理
          </Space>
        }
        extra={
          <PermissionButton
            type="primary"
            icon={<PlusOutlined />}
            permission={USER_PERMISSIONS.CREATE}
            onClick={() => message.success('创建新用户')}
          >
            新建用户
          </PermissionButton>
        }
        style={{ marginBottom: '24px' }}
      >
        <Table
          columns={userColumns}
          dataSource={mockUsers}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      {/* 权限分析 */}
      <Card title="权限分析" style={{ marginBottom: '24px' }}>
        {analyzeUserPermissions && (
          <div>
            <Paragraph>
              <Text strong>角色:</Text> {analyzeUserPermissions.role?.roleName}
            </Paragraph>
            <Paragraph>
              <Text strong>权限统计:</Text> 
              总计 {analyzeUserPermissions.totalPermissions} 个权限，
              已授权 {analyzeUserPermissions.grantedPermissions.length} 个
            </Paragraph>
            <Paragraph>
              <Text strong>建议角色:</Text> {analyzeUserPermissions.suggectedRole}
            </Paragraph>
            <Paragraph>
              <Text strong>管理员状态:</Text> 
              <Tag color={analyzeUserPermissions.isAdmin ? 'green' : 'default'}>
                {analyzeUserPermissions.isAdmin ? '是' : '否'}
              </Tag>
            </Paragraph>
            
            <Divider orientation="left">已授权权限</Divider>
            <div>
              {analyzeUserPermissions.grantedPermissions.map(permission => (
                <Tag key={permission} color="green" style={{ marginBottom: '4px' }}>
                  {permission}
                </Tag>
              ))}
            </div>

            {analyzeUserPermissions.deniedPermissions.length > 0 && (
              <>
                <Divider orientation="left">未授权权限</Divider>
                <div>
                  {analyzeUserPermissions.deniedPermissions.map(permission => (
                    <Tag key={permission} color="red" style={{ marginBottom: '4px' }}>
                      {permission}
                    </Tag>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* 快捷权限检查演示 */}
      <Card title="快捷权限检查" style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Text>项目创建: </Text>
            <Tag color={canCreate('project') ? 'green' : 'red'}>
              {canCreate('project') ? '允许' : '拒绝'}
            </Tag>
          </Col>
          <Col span={6}>
            <Text>项目编辑: </Text>
            <Tag color={canUpdate('project') ? 'green' : 'red'}>
              {canUpdate('project') ? '允许' : '拒绝'}
            </Tag>
          </Col>
          <Col span={6}>
            <Text>项目删除: </Text>
            <Tag color={canDelete('project') ? 'green' : 'red'}>
              {canDelete('project') ? '允许' : '拒绝'}
            </Tag>
          </Col>
          <Col span={6}>
            <Text>企业管理: </Text>
            <Tag color={isCompanyAdmin ? 'green' : 'red'}>
              {isCompanyAdmin ? '允许' : '拒绝'}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* renderWithPermission 演示 */}
      <Card title="条件渲染演示" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {renderWithPermission(
            PROJECT_PERMISSIONS.ADMIN,
            <Alert type="success" message="您是项目管理员，可以看到这条消息" showIcon />,
            <Alert type="info" message="您不是项目管理员，看到的是这条消息" showIcon />
          )}
          
          {renderWithPermission(
            [USER_PERMISSIONS.CREATE, USER_PERMISSIONS.UPDATE],
            <Alert type="success" message="您有用户创建或编辑权限" showIcon />,
            <Alert type="warning" message="您没有用户管理相关权限" showIcon />,
            false // requireAll = false，满足任意一个权限即可
          )}
        </Space>
      </Card>
    </div>
  );
};

export default PermissionDemoPage;