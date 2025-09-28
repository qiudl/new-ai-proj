import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Switch,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Spin,
  message,
  Tag,
  Alert,
  Tooltip,
  Badge,
  Modal,
  Descriptions,
  List,
  Progress,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  SaveOutlined, 
  ReloadOutlined, 
  InfoCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  WarningOutlined,
  BulbOutlined,
  EyeOutlined,
  ExportOutlined,
  ImportOutlined,
  TeamOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { getPermissionName, getPermissionDescription, getPermissionCategory } from '../utils/permissionMapping';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface Role {
  id: number;
  role_name: string;
  role_code: string;
  is_system_role: boolean;
  status: string;
}

interface Permission {
  id: number;
  permission_name: string;
  permission_code: string;
  permission_description?: string;
  module: string;
  status: string;
}

interface PermissionMatrix {
  role_id: number;
  permission_id: number;
  granted: boolean;
}

interface PermissionMatrixProps {
  height?: number;
  onPermissionChange?: (roleId: number, permissionId: number, granted: boolean) => void;
  showStatistics?: boolean;
  enableBatchOperations?: boolean;
  enableExportImport?: boolean;
  readOnly?: boolean;
}

// 权限统计信息
interface PermissionStatistics {
  totalPermissions: number;
  totalRoles: number;
  grantedCount: number;
  deniedCount: number;
  roleStats: Array<{
    roleId: number;
    roleName: string;
    grantedCount: number;
    totalCount: number;
    percentage: number;
  }>;
  permissionStats: Array<{
    permissionId: number;
    permissionName: string;
    grantedCount: number;
    totalCount: number;
    percentage: number;
  }>;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  height = 600,
  onPermissionChange,
  showStatistics = true,
  enableBatchOperations = true,
  enableExportImport = true,
  readOnly = false
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedRoleType, setSelectedRoleType] = useState<string>('all');
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const [statistics, setStatistics] = useState<PermissionStatistics | null>(null);
  const [statisticsModalVisible, setStatisticsModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [batchAction, setBatchAction] = useState<'grant' | 'revoke'>('grant');
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showStatistics && roles.length > 0 && permissions.length > 0) {
      calculateStatistics();
    }
  }, [roles, permissions, permissionMatrix, showStatistics]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载角色、权限和权限矩阵数据
      const [rolesRes, permissionsRes] = await Promise.all([
        api.get('/api/v1/roles', { params: { include_inactive: false } }),
        api.get('/api/v1/permissions', { params: { include_inactive: false } })
      ]);

      if (rolesRes.data.success) {
        setRoles(rolesRes.data.data || []);
      }

      if (permissionsRes.data.success) {
        setPermissions(permissionsRes.data.data || []);
      }

      // 加载权限矩阵 - 使用模拟数据
      setPermissionMatrix([
        { role_id: 1, permission_id: 1, granted: true },
        { role_id: 1, permission_id: 2, granted: true },
        { role_id: 2, permission_id: 1, granted: true },
        { role_id: 2, permission_id: 3, granted: false },
      ]);

    } catch (error: any) {
      console.error('Failed to load permission matrix data:', error);
      message.error('加载权限矩阵数据失败');
      
      // 使用模拟数据
      setRoles([
        {
          id: 1,
          role_name: '超级管理员',
          role_code: 'SYSTEM_SUPER_ADMIN',
          is_system_role: true,
          status: 'active'
        },
        {
          id: 2,
          role_name: '企业管理员',
          role_code: 'ENTERPRISE_ADMIN',
          is_system_role: false,
          status: 'active'
        }
      ]);

      setPermissions([
        {
          id: 1,
          permission_name: '用户管理',
          permission_code: 'USER_MANAGE',
          module: '用户管理',
          status: 'active'
        },
        {
          id: 2,
          permission_name: '角色管理',
          permission_code: 'ROLE_MANAGE',
          module: '权限管理',
          status: 'active'
        },
        {
          id: 3,
          permission_name: '系统设置',
          permission_code: 'SYSTEM_CONFIG',
          module: '系统管理',
          status: 'active'
        }
      ]);

    } finally {
      setLoading(false);
    }
  };

  // 保存变更
  const handleSave = async (changes: Map<string, boolean>) => {
    setSaving(true);
    try {
      // 这里应该调用API保存权限矩阵变更
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      
      setChanges(new Map());
      message.success('权限变更保存成功');
      
      // 触发回调
      if (onPermissionChange) {
        changes.forEach((granted, key) => {
          const [roleId, permissionId] = key.split('-').map(Number);
          onPermissionChange(roleId, permissionId, granted);
        });
      }
    } catch (error) {
      message.error('保存失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 过滤角色
  const filteredRoles = useMemo(() => {
    return roles.filter(role => 
      selectedRoleType === 'all' || 
      (selectedRoleType === 'system' && role.is_system_role) ||
      (selectedRoleType === 'enterprise' && !role.is_system_role)
    );
  }, [roles, selectedRoleType]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const matchesSearch = !searchText || 
        permission.permission_name.toLowerCase().includes(searchText.toLowerCase()) ||
        permission.permission_code.toLowerCase().includes(searchText.toLowerCase()) ||
        (permission.permission_description && permission.permission_description.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesModule = selectedModule === 'all' || permission.module === selectedModule;
      
      return matchesSearch && matchesModule;
    });
  }, [permissions, searchText, selectedModule]);

  // 获取所有模块
  const modules = useMemo(() => {
    const moduleSet = new Set(permissions.map(p => p.module));
    return Array.from(moduleSet).sort();
  }, [permissions]);

  // 获取权限矩阵状态
  const getPermissionStatus = (roleId: number, permissionId: number): boolean => {
    const key = `${roleId}-${permissionId}`;
    if (changes.has(key)) {
      return changes.get(key)!;
    }
    
    const matrix = permissionMatrix.find(pm => 
      pm.role_id === roleId && pm.permission_id === permissionId
    );
    return matrix?.granted || false;
  };

  // 切换权限状态
  const togglePermission = (roleId: number, permissionId: number) => {
    const key = `${roleId}-${permissionId}`;
    const currentStatus = getPermissionStatus(roleId, permissionId);
    const newChanges = new Map(changes);
    newChanges.set(key, !currentStatus);
    setChanges(newChanges);
  };

  // 保存变更
  const handleSaveChanges = async () => {
    if (changes.size === 0) {
      message.info('没有需要保存的变更');
      return;
    }

    await handleSave(changes);
  };

  // 重置变更
  const handleReset = () => {
    setChanges(new Map());
    message.info('已重置所有变更');
  };

  // 计算统计信息
  const calculateStatistics = () => {
    const totalPermissions = permissions.length;
    const totalRoles = roles.length;
    let grantedCount = 0;

    // 计算总体统计
    permissionMatrix.forEach(pm => {
      if (pm.granted) grantedCount++;
    });

    // 计算每个角色的统计信息
    const roleStats = roles.map(role => {
      const rolePermissions = permissionMatrix.filter(pm => pm.role_id === role.id);
      const grantedCount = rolePermissions.filter(pm => pm.granted).length;
      return {
        roleId: role.id,
        roleName: role.role_name,
        grantedCount,
        totalCount: totalPermissions,
        percentage: totalPermissions > 0 ? Math.round((grantedCount / totalPermissions) * 100) : 0
      };
    });

    // 计算每个权限的统计信息
    const permissionStats = permissions.map(permission => {
      const permissionGrants = permissionMatrix.filter(pm => pm.permission_id === permission.id);
      const grantedCount = permissionGrants.filter(pm => pm.granted).length;
      return {
        permissionId: permission.id,
        permissionName: permission.permission_name,
        grantedCount,
        totalCount: totalRoles,
        percentage: totalRoles > 0 ? Math.round((grantedCount / totalRoles) * 100) : 0
      };
    });

    setStatistics({
      totalPermissions,
      totalRoles,
      grantedCount,
      deniedCount: (totalPermissions * totalRoles) - grantedCount,
      roleStats,
      permissionStats
    });
  };

  // 批量操作处理
  const handleBatchOperation = async () => {
    if (selectedRoles.length === 0 || selectedPermissions.length === 0) {
      message.warning('请选择角色和权限');
      return;
    }

    const newChanges = new Map(changes);
    selectedRoles.forEach(roleId => {
      selectedPermissions.forEach(permissionId => {
        const key = `${roleId}-${permissionId}`;
        newChanges.set(key, batchAction === 'grant');
      });
    });

    setChanges(newChanges);
    setBatchModalVisible(false);
    setSelectedRoles([]);
    setSelectedPermissions([]);
    message.success(`已${batchAction === 'grant' ? '授予' : '撤销'} ${selectedRoles.length} 个角色的 ${selectedPermissions.length} 个权限`);
  };

  // 导出权限矩阵
  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      roles: roles,
      permissions: permissions,
      matrix: permissionMatrix,
      statistics: statistics
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-matrix-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    message.success('权限矩阵已导出');
    setExportModalVisible(false);
  };

  // 导入权限矩阵
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        // 验证数据格式
        if (!importData.matrix || !Array.isArray(importData.matrix)) {
          throw new Error('无效的数据格式');
        }

        // 更新权限矩阵
        setPermissionMatrix(importData.matrix);
        
        message.success('权限矩阵导入成功');
      } catch (error) {
        message.error('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  // 构建表格数据
  const tableData = filteredPermissions.map(permission => ({
    key: permission.id,
    ...permission,
  }));

  // 构建表格列
  const tableColumns = [
    {
      title: '权限名称',
      dataIndex: 'permission_name',
      width: 150,
      fixed: 'left' as const,
      render: (text: string, record: Permission) => (
        <div>
          <div>{getPermissionName(record.permission_code)}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {record.permission_code}
          </div>
        </div>
      ),
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 100,
      fixed: 'left' as const,
      render: (module: string) => (
        <Tag color="blue">{module}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'permission_description',
      width: 150,
      ellipsis: true,
      render: (text: string, record: Permission) => 
        text || getPermissionDescription(record.permission_code),
    },
    // 动态生成角色列
    ...filteredRoles.map(role => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div>{role.role_name}</div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {role.is_system_role ? '系统' : '企业'}
          </div>
        </div>
      ),
      dataIndex: `role_${role.id}`,
      width: 120,
      align: 'center' as const,
      render: (_: any, permission: Permission) => {
        const granted = getPermissionStatus(role.id, permission.id);
        const key = `${role.id}-${permission.id}`;
        const hasChange = changes.has(key);
        
        return (
          <Switch
            checked={granted}
            onChange={() => togglePermission(role.id, permission.id)}
            
            style={hasChange ? { boxShadow: '0 0 0 2px #ff7875' } : undefined}
          />
        );
      },
    })),
  ];

  return (
    <Card title="权限矩阵管理">
      {/* 工具栏 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="搜索权限名称、代码或描述"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          
          <Select
            placeholder="选择模块"
            value={selectedModule}
            onChange={setSelectedModule}
            style={{ width: 150 }}
          >
            <Option value="all">全部模块</Option>
            {modules.map(module => (
              <Option key={module} value={module}>{module}</Option>
            ))}
          </Select>
          
          <Select
            placeholder="角色类型"
            value={selectedRoleType}
            onChange={setSelectedRoleType}
            style={{ width: 120 }}
          >
            <Option value="all">全部角色</Option>
            <Option value="system">系统角色</Option>
            <Option value="enterprise">企业角色</Option>
          </Select>
          
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveChanges}
            loading={saving}
            disabled={changes.size === 0 || readOnly}
          >
            保存变更 ({changes.size})
          </Button>
          
          <Button
            onClick={handleReset}
            disabled={changes.size === 0 || readOnly}
          >
            重置变更
          </Button>

          {enableBatchOperations && (
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => setBatchModalVisible(true)}
              disabled={readOnly}
            >
              批量操作
            </Button>
          )}

          {showStatistics && (
            <Button
              icon={<InfoCircleOutlined />}
              onClick={() => setStatisticsModalVisible(true)}
            >
              查看统计
            </Button>
          )}

          {enableExportImport && (
            <Button
              icon={<ExportOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              导出/导入
            </Button>
          )}
          
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 提示信息 */}
      {changes.size > 0 && (
        <Alert
          message={`您有 ${changes.size} 个未保存的权限变更，请及时保存`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 权限矩阵表格 */}
      <Spin spinning={loading}>
        <Table
          columns={tableColumns}
          dataSource={tableData}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条权限`,
          }}
          scroll={{ 
            x: Math.max(300 + filteredRoles.length * 120, 800), 
            y: height - 200 
          }}
          
          bordered
        />
      </Spin>

      {/* 统计信息 */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Text type="secondary">
            角色数量: <Text strong>{filteredRoles.length}</Text>
          </Text>
          <Text type="secondary">
            权限数量: <Text strong>{filteredPermissions.length}</Text>
          </Text>
          <Text type="secondary">
            模块数量: <Text strong>{modules.length}</Text>
          </Text>
          {changes.size > 0 && (
            <Text type="warning">
              未保存变更: <Text strong>{changes.size}</Text>
            </Text>
          )}
        </Space>
      </div>

      {/* 统计信息模态框 */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            权限矩阵统计信息
          </Space>
        }
        open={statisticsModalVisible}
        onCancel={() => setStatisticsModalVisible(false)}
        footer={null}
        width={900}
      >
        {statistics && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title="总角色数"
                  value={statistics.totalRoles}
                  prefix={<TeamOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="总权限数"
                  value={statistics.totalPermissions}
                  prefix={<SafetyOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已授权"
                  value={statistics.grantedCount}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="未授权"
                  value={statistics.deniedCount}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<StopOutlined />}
                />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card title="角色权限分布" >
                  <List
                    
                    dataSource={statistics.roleStats}
                    renderItem={(item) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text>{item.roleName}</Text>
                            <Text>{item.percentage}%</Text>
                          </div>
                          <Progress 
                            percent={item.percentage} 
                            
                            status={item.percentage > 80 ? 'success' : item.percentage > 50 ? 'normal' : 'exception'}
                          />
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="权限分配情况" >
                  <List
                    
                    dataSource={statistics.permissionStats}
                    renderItem={(item) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text ellipsis style={{ maxWidth: 150 }}>{item.permissionName}</Text>
                            <Text>{item.percentage}%</Text>
                          </div>
                          <Progress 
                            percent={item.percentage} 
                            
                            status={item.percentage > 80 ? 'exception' : item.percentage > 50 ? 'normal' : 'success'}
                          />
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* 批量操作模态框 */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined />
            批量权限操作
          </Space>
        }
        open={batchModalVisible}
        onCancel={() => {
          setBatchModalVisible(false);
          setSelectedRoles([]);
          setSelectedPermissions([]);
        }}
        onOk={handleBatchOperation}
        okText="执行"
        cancelText="取消"
        width={800}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>选择操作类型：</Text>
            <Select
              value={batchAction}
              onChange={setBatchAction}
              style={{ marginLeft: 8, width: 120 }}
            >
              <Option value="grant">批量授权</Option>
              <Option value="revoke">批量撤销</Option>
            </Select>
          </div>
          
          <div>
            <Text strong>选择角色：</Text>
            <Select
              mode="multiple"
              placeholder="请选择要操作的角色"
              style={{ width: '100%', marginTop: 8 }}
              value={selectedRoles}
              onChange={setSelectedRoles}
            >
              {filteredRoles.map(role => (
                <Option key={role.id} value={role.id}>
                  {role.role_name} ({role.is_system_role ? '系统' : '企业'})
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>选择权限：</Text>
            <Select
              mode="multiple"
              placeholder="请选择要操作的权限"
              style={{ width: '100%', marginTop: 8 }}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            >
              {filteredPermissions.map(permission => (
                <Option key={permission.id} value={permission.id}>
                  {permission.permission_name} ({permission.module})
                </Option>
              ))}
            </Select>
          </div>

          {selectedRoles.length > 0 && selectedPermissions.length > 0 && (
            <Alert
              message={`将${batchAction === 'grant' ? '授予' : '撤销'} ${selectedRoles.length} 个角色的 ${selectedPermissions.length} 个权限`}
              type="info"
              showIcon
            />
          )}
        </Space>
      </Modal>

      {/* 导出/导入模态框 */}
      <Modal
        title={
          <Space>
            <ExportOutlined />
            导出/导入权限矩阵
          </Space>
        }
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card title="导出权限矩阵" >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                导出当前的权限矩阵配置，包含角色、权限和分配关系
              </Text>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExport}
                block
              >
                导出为 JSON 文件
              </Button>
            </Space>
          </Card>

          <Card title="导入权限矩阵" >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                从JSON文件导入权限矩阵配置
              </Text>
              <Alert
                message="注意"
                description="导入将覆盖当前的权限矩阵配置，请谨慎操作"
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImport(file);
                    e.target.value = '';
                  }
                }}
                style={{ width: '100%' }}
              />
            </Space>
          </Card>
        </Space>
      </Modal>
    </Card>
  );
};

export default PermissionMatrix;
