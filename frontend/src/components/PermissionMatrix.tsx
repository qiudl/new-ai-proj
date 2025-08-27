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
  Alert
} from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';

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
  roles: Role[];
  permissions: Permission[];
  permissionMatrix: PermissionMatrix[];
  loading?: boolean;
  height?: number;
  onSave?: (changes: Map<string, boolean>) => Promise<void>;
  onRefresh?: () => void;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  roles = [],
  permissions = [],
  permissionMatrix = [],
  loading = false,
  height = 600,
  onSave,
  onRefresh
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedRoleType, setSelectedRoleType] = useState<string>('all');
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);

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
  const handleSave = async () => {
    if (changes.size === 0) {
      message.info('没有需要保存的变更');
      return;
    }

    if (!onSave) {
      message.error('未配置保存处理器');
      return;
    }

    setSaving(true);
    try {
      await onSave(changes);
      setChanges(new Map());
      message.success('权限变更保存成功');
    } catch (error) {
      message.error('保存失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 重置变更
  const handleReset = () => {
    setChanges(new Map());
    message.info('已重置所有变更');
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
          <div>{text}</div>
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
            size="small"
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
            onClick={handleSave}
            loading={saving}
            disabled={changes.size === 0}
          >
            保存变更 ({changes.size})
          </Button>
          
          <Button
            onClick={handleReset}
            disabled={changes.size === 0}
          >
            重置变更
          </Button>
          
          {onRefresh && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
            >
              刷新
            </Button>
          )}
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
          size="small"
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
    </Card>
  );
};

export default PermissionMatrix;
