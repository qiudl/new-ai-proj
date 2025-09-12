import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Typography,
  Space,
  Tree,
  Alert,
  Tabs,
  Table,
  Button,
  Tooltip,
  Badge,
  Switch,
  List,
  Avatar,
  Divider,
  Modal,
  Input,
  Select,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EyeOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import api from '../services/api';
import { getPermissionName, getPermissionDescription, getPermissionCategory } from '../utils/permissionMapping';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 权限接口定义
interface Permission {
  id: number;
  permission_code: string;
  permission_name: string;
  permission_description?: string;
  module: string;
  resource: string;
  action: string;
  is_active: boolean;
  is_granted: boolean;
  source: 'role' | 'custom' | 'inherited';
  granted_by?: string;
  granted_at?: string;
  expires_at?: string;
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

// 用户接口定义
interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  user_type: 'system' | 'enterprise';
  is_active: boolean;
}

// 权限预览组件属性
interface PermissionPreviewProps {
  targetType: 'user' | 'role';
  targetId?: number;
  permissions?: Permission[];
  showConflicts?: boolean;
  showSuggestions?: boolean;
  onPermissionToggle?: (permissionId: number, granted: boolean) => void;
  height?: number;
}

// 权限冲突检测
interface PermissionConflict {
  type: 'duplicate' | 'contradiction' | 'circular';
  permissions: Permission[];
  description: string;
  severity: 'high' | 'medium' | 'low';
}

// 权限建议
interface PermissionSuggestion {
  type: 'add' | 'remove' | 'modify';
  permission: Permission;
  reason: string;
  confidence: number;
}

const PermissionPreview: React.FC<PermissionPreviewProps> = ({
  targetType,
  targetId,
  permissions = [],
  showConflicts = true,
  showSuggestions = true,
  onPermissionToggle,
  height = 600
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [targetInfo, setTargetInfo] = useState<User | Role | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<Permission[]>([]);
  const [conflicts, setConflicts] = useState<PermissionConflict[]>([]);
  const [suggestions, setSuggestions] = useState<PermissionSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState('tree');
  const [filterText, setFilterText] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [showInactivePermissions, setShowInactivePermissions] = useState(false);

  // 加载数据
  useEffect(() => {
    if (targetId) {
      loadTargetInfo();
      loadEffectivePermissions();
    } else if (permissions.length > 0) {
      setEffectivePermissions(permissions);
      analyzePermissions(permissions);
    }
  }, [targetId, targetType, permissions]);

  const loadTargetInfo = async () => {
    if (!targetId) return;

    try {
      setLoading(true);
      const endpoint = targetType === 'user' ? `/api/v1/users/${targetId}` : `/api/v1/roles/${targetId}`;
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        setTargetInfo(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load target info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEffectivePermissions = async () => {
    if (!targetId) return;

    try {
      setLoading(true);
      const endpoint = targetType === 'user' 
        ? `/api/v1/users/${targetId}/effective-permissions`
        : `/api/v1/roles/${targetId}/permissions`;
      
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        const perms = response.data.data || [];
        setEffectivePermissions(perms);
        analyzePermissions(perms);
      }
    } catch (error: any) {
      console.error('Failed to load effective permissions:', error);
      // 使用模拟数据进行演示
      const mockPermissions: Permission[] = [
        {
          id: 1,
          permission_code: 'USER_MANAGE',
          permission_name: '用户管理',
          permission_description: '创建、编辑、删除用户',
          module: '用户管理',
          resource: 'user',
          action: 'manage',
          is_active: true,
          is_granted: true,
          source: 'role',
          granted_by: '超级管理员',
          granted_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 2,
          permission_code: 'ROLE_VIEW',
          permission_name: '角色查看',
          permission_description: '查看角色信息',
          module: '权限管理',
          resource: 'role',
          action: 'view',
          is_active: true,
          is_granted: true,
          source: 'role',
          granted_by: '系统',
          granted_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 3,
          permission_code: 'SYSTEM_CONFIG',
          permission_name: '系统配置',
          permission_description: '修改系统配置参数',
          module: '系统管理',
          resource: 'system',
          action: 'config',
          is_active: true,
          is_granted: false,
          source: 'custom',
          granted_by: '企业管理员',
          granted_at: '2025-01-01T00:00:00Z'
        }
      ];
      
      setEffectivePermissions(mockPermissions);
      analyzePermissions(mockPermissions);
    } finally {
      setLoading(false);
    }
  };

  // 分析权限冲突和建议
  const analyzePermissions = (permissions: Permission[]) => {
    if (!showConflicts && !showSuggestions) return;

    // 检测权限冲突
    const detectedConflicts: PermissionConflict[] = [];
    const permissionMap = new Map<string, Permission[]>();

    // 按资源分组
    permissions.forEach(perm => {
      const key = `${perm.module}.${perm.resource}`;
      if (!permissionMap.has(key)) {
        permissionMap.set(key, []);
      }
      permissionMap.get(key)!.push(perm);
    });

    // 检测重复权限
    permissionMap.forEach((perms, resource) => {
      if (perms.length > 1) {
        const duplicates = perms.filter(p => p.is_granted);
        if (duplicates.length > 1) {
          detectedConflicts.push({
            type: 'duplicate',
            permissions: duplicates,
            description: `资源 "${resource}" 存在重复权限授权`,
            severity: 'medium'
          });
        }
      }
    });

    setConflicts(detectedConflicts);

    // 生成权限建议
    const generatedSuggestions: PermissionSuggestion[] = [];

    // 建议移除未使用的权限
    permissions.forEach(perm => {
      if (perm.is_granted && perm.source === 'custom') {
        generatedSuggestions.push({
          type: 'remove',
          permission: perm,
          reason: '此权限可能不是必需的，建议移除以遵循最小权限原则',
          confidence: 0.6
        });
      }
    });

    // 建议添加相关权限
    const hasManagePermission = permissions.some(p => p.action === 'manage' && p.is_granted);
    const hasViewPermission = permissions.some(p => p.action === 'view' && p.is_granted);
    
    if (hasManagePermission && !hasViewPermission) {
      const viewPermission = permissions.find(p => p.action === 'view');
      if (viewPermission) {
        generatedSuggestions.push({
          type: 'add',
          permission: viewPermission,
          reason: '拥有管理权限通常也需要查看权限',
          confidence: 0.9
        });
      }
    }

    setSuggestions(generatedSuggestions);
  };

  // 过滤权限
  const filteredPermissions = useMemo(() => {
    return effectivePermissions.filter(perm => {
      const matchesFilter = !filterText || 
        perm.permission_name.toLowerCase().includes(filterText.toLowerCase()) ||
        perm.permission_code.toLowerCase().includes(filterText.toLowerCase()) ||
        (perm.permission_description && perm.permission_description.toLowerCase().includes(filterText.toLowerCase()));
      
      const matchesModule = filterModule === 'all' || perm.module === filterModule;
      const matchesSource = filterSource === 'all' || perm.source === filterSource;
      const matchesActive = showInactivePermissions || perm.is_active;
      
      return matchesFilter && matchesModule && matchesSource && matchesActive;
    });
  }, [effectivePermissions, filterText, filterModule, filterSource, showInactivePermissions]);

  // 获取所有模块
  const modules = useMemo(() => {
    const moduleSet = new Set(effectivePermissions.map(p => p.module));
    return Array.from(moduleSet).sort();
  }, [effectivePermissions]);

  // 构建权限树数据
  const treeData: DataNode[] = useMemo(() => {
    const moduleMap = new Map<string, Permission[]>();
    
    filteredPermissions.forEach(perm => {
      if (!moduleMap.has(perm.module)) {
        moduleMap.set(perm.module, []);
      }
      moduleMap.get(perm.module)!.push(perm);
    });

    return Array.from(moduleMap.entries()).map(([module, perms]) => ({
      title: (
        <Space>
          <Text strong>{module}</Text>
          <Badge count={perms.filter(p => p.is_granted).length}  />
        </Space>
      ),
      key: module,
      children: perms.map(perm => ({
        title: (
          <Space>
            {perm.is_granted ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <StopOutlined style={{ color: '#ff4d4f' }} />
            )}
            <span style={{ 
              textDecoration: !perm.is_active ? 'line-through' : 'none',
              opacity: !perm.is_active ? 0.5 : 1
            }}>
              {getPermissionName(perm.permission_code)}
            </span>
            <Tag  color={
              perm.source === 'role' ? 'blue' : 
              perm.source === 'custom' ? 'green' : 'orange'
            }>
              {perm.source === 'role' ? '角色' : perm.source === 'custom' ? '自定义' : '继承'}
            </Tag>
            {!perm.is_active && <Tag  color="default">禁用</Tag>}
          </Space>
        ),
        key: `${module}-${perm.id}`,
        isLeaf: true,
        permission: perm
      }))
    }));
  }, [filteredPermissions]);

  // 处理权限切换
  const handlePermissionToggle = (permission: Permission) => {
    if (onPermissionToggle) {
      onPermissionToggle(permission.id, !permission.is_granted);
    }
  };

  // 表格列定义
  const permissionColumns = [
    {
      title: '权限名称',
      dataIndex: 'permission_name',
      key: 'permission_name',
      render: (text: string, record: Permission) => (
        <Space>
          {record.is_granted ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <StopOutlined style={{ color: '#ff4d4f' }} />
          )}
          <div>
            <div style={{ 
              textDecoration: !record.is_active ? 'line-through' : 'none',
              opacity: !record.is_active ? 0.5 : 1
            }}>
              {text}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.permission_code}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      render: (module: string) => <Tag color="geekblue">{module}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => <Tag color="green">{action}</Tag>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag color={
          source === 'role' ? 'blue' : 
          source === 'custom' ? 'green' : 'orange'
        }>
          {source === 'role' ? '角色权限' : source === 'custom' ? '自定义权限' : '继承权限'}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (record: Permission) => (
        <Space>
          <Tag color={record.is_granted ? 'success' : 'error'}>
            {record.is_granted ? '已授权' : '未授权'}
          </Tag>
          {!record.is_active && <Tag color="default">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Permission) => (
        <Space>
          {onPermissionToggle && (
            <Switch
              
              checked={record.is_granted}
              onChange={() => handlePermissionToggle(record)}
              disabled={!record.is_active}
            />
          )}
          <Tooltip title="查看详情">
            <Button type="link"  icon={<EyeOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 统计数据
  const statistics = useMemo(() => {
    const total = effectivePermissions.length;
    const granted = effectivePermissions.filter(p => p.is_granted).length;
    const denied = total - granted;
    const bySource = {
      role: effectivePermissions.filter(p => p.source === 'role').length,
      custom: effectivePermissions.filter(p => p.source === 'custom').length,
      inherited: effectivePermissions.filter(p => p.source === 'inherited').length
    };

    return { total, granted, denied, bySource };
  }, [effectivePermissions]);

  return (
    <div style={{ height }}>
      {/* 目标信息头部 */}
      {targetInfo && (
        <Card  style={{ marginBottom: 16 }}>
          <Descriptions  column={4}>
            <Descriptions.Item label={targetType === 'user' ? '用户' : '角色'}>
              <Space>
                {targetType === 'user' ? <UserOutlined /> : <TeamOutlined />}
                {targetType === 'user' 
                  ? (targetInfo as User).display_name || (targetInfo as User).username
                  : (targetInfo as Role).role_name
                }
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag color={
                targetType === 'user' 
                  ? ((targetInfo as User).user_type === 'system' ? 'green' : 'blue')
                  : ((targetInfo as Role).is_system_role ? 'green' : 'blue')
              }>
                {targetType === 'user' 
                  ? ((targetInfo as User).user_type === 'system' ? '系统用户' : '企业用户')
                  : ((targetInfo as Role).is_system_role ? '系统角色' : '企业角色')
                }
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="权限统计">
              <Space>
                <Text>总数: <Text strong>{statistics.total}</Text></Text>
                <Text>已授权: <Text strong style={{ color: '#52c41a' }}>{statistics.granted}</Text></Text>
                <Text>未授权: <Text strong style={{ color: '#ff4d4f' }}>{statistics.denied}</Text></Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 筛选控制栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Search
            placeholder="搜索权限名称或代码"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={4}>
          <Select
            placeholder="选择模块"
            style={{ width: '100%' }}
            value={filterModule}
            onChange={setFilterModule}
          >
            <Option value="all">全部模块</Option>
            {modules.map(module => (
              <Option key={module} value={module}>{module}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={4}>
          <Select
            placeholder="权限来源"
            style={{ width: '100%' }}
            value={filterSource}
            onChange={setFilterSource}
          >
            <Option value="all">全部来源</Option>
            <Option value="role">角色权限</Option>
            <Option value="custom">自定义权限</Option>
            <Option value="inherited">继承权限</Option>
          </Select>
        </Col>
        <Col xs={24} sm={8}>
          <Space>
            <span>显示禁用权限:</span>
            <Switch
              
              checked={showInactivePermissions}
              onChange={setShowInactivePermissions}
            />
          </Space>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'tree',
              label: (
                <span>
                  <SafetyOutlined />
                  权限树
                </span>
              ),
              children: (
                <div style={{ maxHeight: height - 200, overflow: 'auto' }}>
                  <Tree
                    checkable
                    treeData={treeData}
                    expandedKeys={expandedKeys}
                    checkedKeys={checkedKeys}
                    onExpand={setExpandedKeys}
                    onCheck={(checked) => setCheckedKeys(checked as React.Key[])}
                    height={height - 250}
                  />
                </div>
              ),
            },
            {
              key: 'table',
              label: (
                <span>
                  <TeamOutlined />
                  权限列表
                </span>
              ),
              children: (
                <Table
                  columns={permissionColumns}
                  dataSource={filteredPermissions}
                  rowKey="id"
                  pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      `第 ${range[0]}-${range[1]} 条，共 ${total} 条权限`,
                  }}
                  scroll={{ y: height - 250 }}
                  
                />
              ),
            },
            ...(showConflicts && conflicts.length > 0 ? [{
              key: 'conflicts',
              label: (
                <span>
                  <WarningOutlined />
                  冲突检测 <Badge count={conflicts.length}  />
                </span>
              ),
              children: (
                <List
                  dataSource={conflicts}
                  renderItem={(conflict) => (
                    <List.Item>
                      <Alert
                        type={conflict.severity === 'high' ? 'error' : conflict.severity === 'medium' ? 'warning' : 'info'}
                        message={`${conflict.type === 'duplicate' ? '重复权限' : '权限冲突'}`}
                        description={conflict.description}
                        showIcon
                        style={{ width: '100%' }}
                        action={
                          <Button  type="link">
                            查看详情
                          </Button>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            }] : []),
            ...(showSuggestions && suggestions.length > 0 ? [{
              key: 'suggestions',
              label: (
                <span>
                  <BulbOutlined />
                  优化建议 <Badge count={suggestions.length}  />
                </span>
              ),
              children: (
                <List
                  dataSource={suggestions}
                  renderItem={(suggestion) => (
                    <List.Item
                      actions={[
                        <Button key="apply" type="link" >
                          应用建议
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={suggestion.type === 'add' ? <CheckCircleOutlined /> : <StopOutlined />}
                            style={{ backgroundColor: suggestion.type === 'add' ? '#52c41a' : '#ff4d4f' }}
                          />
                        }
                        title={`${suggestion.type === 'add' ? '建议添加' : '建议移除'}: ${suggestion.permission.permission_name}`}
                        description={
                          <div>
                            <div>{suggestion.reason}</div>
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary">可信度: {Math.round(suggestion.confidence * 100)}%</Text>
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            }] : [])
          ]}
        />
      </Card>
    </div>
  );
};

export default PermissionPreview;