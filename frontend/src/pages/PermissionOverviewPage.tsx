import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Tabs,
  Badge,
  Tooltip,
  Collapse,
  Breadcrumb,
  Alert,
  Empty,
  Spin,
  message,
  Divider
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  GroupOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  BankOutlined,
  FileTextOutlined,
  HomeOutlined,
  ClearOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { permissionService } from '../services/permissionService';
import { PERMISSION_CATEGORIES, PERMISSION_MAPPINGS, getPermissionName, getPermissionDescription, getPermissionCategory } from '../utils/permissionMapping';
import { PERMISSION_PERMISSIONS } from '../constants/permissions';
import PermissionWrapper from '../components/PermissionWrapper';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface Permission {
  id: number;
  permission_code: string;
  permission_name: string;
  description?: string;
  category: string;
  module: string;
  is_system_permission: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PermissionStats {
  total_permissions: number;
  active_permissions: number;
  categories_count: number;
  modules_count: number;
  system_permissions: number;
  custom_permissions: number;
}

interface GroupedPermissions {
  [key: string]: Permission[];
}

const PermissionOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 数据状态
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PermissionStats | null>(null);
  
  // 筛选和搜索状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'category' | 'module' | 'none'>('category');
  const [activeTab, setActiveTab] = useState('overview');

  // 加载权限数据
  useEffect(() => {
    loadPermissions();
    loadStats();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await permissionService.getPermissions();
      
      // 转换数据格式，确保包含必要字段
      const permissionsData = response.map((perm: any) => ({
        id: perm.id,
        permission_code: perm.permission_code || perm.permissionCode,
        permission_name: perm.permission_name || getPermissionName(perm.permission_code || perm.permissionCode),
        description: perm.description || getPermissionDescription(perm.permission_code || perm.permissionCode),
        category: perm.category || getPermissionCategory(perm.permission_code || perm.permissionCode),
        module: perm.module || extractModuleFromCode(perm.permission_code || perm.permissionCode),
        is_system_permission: perm.is_system_permission ?? true,
        is_active: perm.is_active ?? true,
        created_at: perm.created_at,
        updated_at: perm.updated_at
      }));
      
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      message.error('加载权限数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // 模拟统计数据，实际应用中应从API获取
      const totalPermissions = Object.keys(PERMISSION_MAPPINGS).length;
      const categories = new Set(Object.values(PERMISSION_MAPPINGS).map(p => p.category));
      const modules = new Set(Object.keys(PERMISSION_MAPPINGS).map(code => code.split('.')[0]));
      
      setStats({
        total_permissions: totalPermissions,
        active_permissions: totalPermissions,
        categories_count: categories.size,
        modules_count: modules.size,
        system_permissions: Math.floor(totalPermissions * 0.7),
        custom_permissions: Math.floor(totalPermissions * 0.3)
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // 从权限代码中提取模块名
  const extractModuleFromCode = (code: string): string => {
    if (!code) return 'unknown';
    const parts = code.split('.');
    return parts[0] || 'unknown';
  };

  // 获取所有分类
  const categories = useMemo(() => {
    const categorySet = new Set(permissions.map(p => p.category));
    return Array.from(categorySet).filter(Boolean);
  }, [permissions]);

  // 获取所有模块
  const modules = useMemo(() => {
    const moduleSet = new Set(permissions.map(p => p.module));
    return Array.from(moduleSet).filter(Boolean);
  }, [permissions]);

  // 过滤权限数据
  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const matchesSearch = !searchTerm || 
        permission.permission_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.permission_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
      const matchesModule = selectedModule === 'all' || permission.module === selectedModule;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && permission.is_active) ||
        (statusFilter === 'inactive' && !permission.is_active) ||
        (statusFilter === 'system' && permission.is_system_permission) ||
        (statusFilter === 'custom' && !permission.is_system_permission);
      
      return matchesSearch && matchesCategory && matchesModule && matchesStatus;
    });
  }, [permissions, searchTerm, selectedCategory, selectedModule, statusFilter]);

  // 分组权限数据
  const groupedPermissions: GroupedPermissions = useMemo(() => {
    if (groupBy === 'none') {
      return { '所有权限': filteredPermissions };
    }
    
    const groups: GroupedPermissions = {};
    filteredPermissions.forEach(permission => {
      const groupKey = groupBy === 'category' ? permission.category : permission.module;
      const groupName = groupKey || '未分类';
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(permission);
    });
    
    return groups;
  }, [filteredPermissions, groupBy]);

  // 清除所有筛选
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedModule('all');
    setStatusFilter('all');
    setGroupBy('category');
  };

  // 权限表格列定义
  const columns: ColumnsType<Permission> = [
    {
      title: '权限代码',
      dataIndex: 'permission_code',
      key: 'permission_code',
      width: 200,
      render: (code: string) => (
        <Text code copyable={{ text: code }}>
          {code}
        </Text>
      ),
    },
    {
      title: '权限名称',
      dataIndex: 'permission_name',
      key: 'permission_name',
      render: (name: string, record: Permission) => (
        <Space direction="vertical" >
          <Text strong>{name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const categoryColors: { [key: string]: string } = {
          '用户管理': 'blue',
          '角色管理': 'green',
          '权限管理': 'purple',
          '项目管理': 'orange',
          '系统管理': 'red',
          '企业管理': 'cyan',
          '组织管理': 'geekblue'
        };
        return (
          <Tag color={categoryColors[category] || 'default'}>
            {category}
          </Tag>
        );
      },
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 100,
      render: (module: string) => (
        <Tag color="processing">{module}</Tag>
      ),
    },
    {
      title: '类型',
      key: 'type',
      width: 80,
      render: (_, record: Permission) => (
        <Tag color={record.is_system_permission ? 'gold' : 'default'}>
          {record.is_system_permission ? '系统' : '自定义'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'default'} 
          text={isActive ? '启用' : '禁用'} 
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record: Permission) => (
        <Space >
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              
              onClick={() => message.info(`查看权限: ${record.permission_name}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 统计卡片组件
  const StatsCards = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="权限总数"
            value={stats?.total_permissions || 0}
            prefix={<SafetyOutlined style={{ color: '#1890ff' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="分类数量"
            value={stats?.categories_count || 0}
            prefix={<GroupOutlined style={{ color: '#52c41a' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="模块数量"
            value={stats?.modules_count || 0}
            prefix={<BankOutlined style={{ color: '#fa8c16' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="系统权限"
            value={stats?.system_permissions || 0}
            prefix={<SettingOutlined style={{ color: '#f5222d' }} />}
          />
        </Card>
      </Col>
    </Row>
  );

  // 筛选区域组件
  const FilterSection = () => (
    <Card style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={8}>
          <Search
            placeholder="搜索权限名称、代码或描述"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            style={{ width: '100%' }}
            value={selectedCategory}
            onChange={setSelectedCategory}
            placeholder="选择分类"
          >
            <Option value="all">所有分类</Option>
            {categories.map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            style={{ width: '100%' }}
            value={selectedModule}
            onChange={setSelectedModule}
            placeholder="选择模块"
          >
            <Option value="all">所有模块</Option>
            {modules.map(module => (
              <Option key={module} value={module}>{module}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="选择状态"
          >
            <Option value="all">全部状态</Option>
            <Option value="active">启用</Option>
            <Option value="inactive">禁用</Option>
            <Option value="system">系统权限</Option>
            <Option value="custom">自定义权限</Option>
          </Select>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Space>
            <Select
              style={{ width: 120 }}
              value={groupBy}
              onChange={setGroupBy}
              placeholder="分组方式"
            >
              <Option value="none">不分组</Option>
              <Option value="category">按分类</Option>
              <Option value="module">按模块</Option>
            </Select>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              清除
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 权限说明组件
  const PermissionExplanation = () => (
    <Card title="权限系统说明" style={{ marginBottom: 24 }}>
      <Alert
        message="权限管理概述"
        description={
          <div>
            <Paragraph>
              权限系统采用基于角色的访问控制（RBAC）模型，通过权限、角色和用户的三层架构实现精细化的访问控制。
            </Paragraph>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>权限（Permission）</strong>：系统中最小的访问控制单元，定义了具体的操作权限</li>
              <li><strong>角色（Role）</strong>：权限的集合，代表一组相关的权限</li>
              <li><strong>用户（User）</strong>：被分配角色的系统使用者</li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card  title="权限分类说明">
            <Collapse  ghost>
              {Object.entries(PERMISSION_CATEGORIES).map(([key, name]) => (
                <Panel key={key} header={`${name} (${key})`}>
                  <Text type="secondary">
                    {name}相关的所有权限，包括创建、查看、编辑、删除等操作权限。
                  </Text>
                </Panel>
              ))}
            </Collapse>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card  title="权限代码规范">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>命名规则：</Text>
                <Text code>模块.操作</Text>
              </div>
              <div>
                <Text strong>示例：</Text>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><Text code>user.create</Text> - 创建用户</li>
                  <li><Text code>role.read</Text> - 查看角色</li>
                  <li><Text code>project.delete</Text> - 删除项目</li>
                </ul>
              </div>
              <div>
                <Text strong>操作类型：</Text>
                <Text>create (创建)、read (查看)、update (编辑)、delete (删除)、admin (管理)</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: 16 }}
        items={[
          { title: (<Link to="/"><HomeOutlined /> 首页</Link>) },
          { title: (<><SettingOutlined /> 系统管理</>) },
          { title: (<><SafetyOutlined /> 权限管理</>) }
        ]}
      />

      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SafetyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          权限管理
        </Title>
        <Text type="secondary">
          管理系统权限、查看权限详情、配置权限说明
        </Text>
      </div>

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane
          tab={
            <span>
              <InfoCircleOutlined />
              权限概览
            </span>
          }
          key="overview"
        >
          <StatsCards />
          <PermissionExplanation />
        </TabPane>

        <TabPane
          tab={
            <span>
              <SafetyOutlined />
              权限列表
              <Badge count={filteredPermissions.length} showZero style={{ marginLeft: 8 }} />
            </span>
          }
          key="permissions"
        >
          <FilterSection />
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" tip="加载权限数据..." />
            </div>
          ) : filteredPermissions.length === 0 ? (
            <Empty 
              description="没有找到匹配的权限"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : groupBy === 'none' ? (
            <Card>
              <Table
                columns={columns}
                dataSource={filteredPermissions}
                rowKey="id"
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                }}
                scroll={{ x: 800 }}
              />
            </Card>
          ) : (
            <Collapse defaultActiveKey={Object.keys(groupedPermissions)}>
              {Object.entries(groupedPermissions).map(([groupName, groupPermissions]) => (
                <Panel
                  key={groupName}
                  header={
                    <Space>
                      <Text strong>{groupName}</Text>
                      <Badge count={groupPermissions.length} showZero />
                    </Space>
                  }
                >
                  <Table
                    columns={columns}
                    dataSource={groupPermissions}
                    rowKey="id"
                    pagination={false}
                    
                    scroll={{ x: 800 }}
                  />
                </Panel>
              ))}
            </Collapse>
          )}
        </TabPane>

        <TabPane
          tab={
            <span>
              <TeamOutlined />
              快速操作
            </span>
          }
          key="actions"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card
                title="角色管理"
                actions={[
                  <PermissionWrapper permission={PERMISSION_PERMISSIONS.ROLE_READ} key="view">
                    <Button type="primary" onClick={() => navigate('/admin/roles')}>
                      查看角色
                    </Button>
                  </PermissionWrapper>
                ]}
              >
                <p>管理系统角色，配置角色权限，分配用户角色。</p>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                title="角色模板"
                actions={[
                  <Button type="primary" onClick={() => navigate('/admin/role-templates')} key="templates">
                    查看模板
                  </Button>
                ]}
              >
                <p>使用预设的角色模板快速创建标准角色。</p>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card
                title="用户管理"
                actions={[
                  <PermissionWrapper permission="user_read" key="users">
                    <Button type="primary" onClick={() => navigate('/user-management')}>
                      管理用户
                    </Button>
                  </PermissionWrapper>
                ]}
              >
                <p>管理系统用户，分配用户权限和角色。</p>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default PermissionOverviewPage;