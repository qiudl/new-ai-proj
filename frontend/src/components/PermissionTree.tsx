import React, { useState, useEffect, useMemo } from 'react';
import {
  Tree,
  Card,
  Space,
  Input,
  Checkbox,
  Typography,
  Tag,
  Tooltip,
  Button,
  Divider,
  Alert,
  Spin,
  Badge
} from 'antd';
import {
  SearchOutlined,
  SafetyOutlined,
  CheckOutlined,
  CloseOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { groupPermissionsByCategory, getPermissionName, getPermissionDescription } from '../utils/permissionMapping';

const { Search } = Input;
const { Text } = Typography;

// 权限接口定义
export interface Permission {
  id: number;
  permission_code?: string;
  permissionCode?: string;
  permission_name?: string;
  permissionName?: string;
  permission_description?: string;
  permissionDescription?: string;
  module?: string;
  resource?: string;
  action?: string;
  is_active?: boolean;
  isActive?: boolean;
  is_granted?: boolean;
  isGranted?: boolean;
}

// 树节点数据
interface TreeNodeData {
  key: string;
  title: React.ReactNode;
  children?: TreeNodeData[];
  permission?: Permission;
  category?: string;
  isCategory?: boolean;
  checkable?: boolean;
  disableCheckbox?: boolean;
}

interface PermissionTreeProps {
  permissions: Permission[];
  selectedPermissions: string[];
  onSelectionChange: (selectedKeys: string[]) => void;
  loading?: boolean;
  disabled?: boolean;
  showSearch?: boolean;
  showStatistics?: boolean;
  height?: number;
  onRefresh?: () => void;
}

const PermissionTree: React.FC<PermissionTreeProps> = ({
  permissions,
  selectedPermissions,
  onSelectionChange,
  loading = false,
  disabled = false,
  showSearch = true,
  showStatistics = true,
  height = 400,
  onRefresh
}) => {
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

  // 更新选中状态
  useEffect(() => {
    setCheckedKeys(selectedPermissions);
  }, [selectedPermissions]);

  // 构建权限树数据
  const treeData = useMemo(() => {
    const grouped = groupPermissionsByCategory(permissions);
    const nodes: TreeNodeData[] = [];

    Object.entries(grouped).forEach(([category, categoryPermissions]) => {
      const categoryKey = `category-${category}`;
      
      const categoryNode: TreeNodeData = {
        key: categoryKey,
        title: (
          <Space>
            <SafetyOutlined style={{ color: '#1890ff' }} />
            <Text strong>{category}</Text>
            <Badge count={categoryPermissions.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        ),
        children: categoryPermissions.map(permission => {
          const code = permission.permission_code || permission.permissionCode || '';
          const name = permission.permission_name || permission.permissionName || getPermissionName(code);
          const description = permission.permission_description || permission.permissionDescription || getPermissionDescription(code);
          const isActive = permission.is_active ?? permission.isActive ?? true;
          
          return {
            key: code,
            title: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space direction="vertical" size={2} style={{ flex: 1 }}>
                  <Space>
                    <Text strong style={{ color: isActive ? '#000' : '#999' }}>
                      {name}
                    </Text>
                    {!isActive && <Tag color="red" size="small">已停用</Tag>}
                    {permission.module && (
                      <Tag color="geekblue" size="small">{permission.module}</Tag>
                    )}
                  </Space>
                  <Text 
                    type="secondary" 
                    style={{ fontSize: '12px', display: 'block', marginLeft: 0 }}
                    ellipsis
                  >
                    {description}
                  </Text>
                  <Text 
                    type="secondary" 
                    code 
                    style={{ fontSize: '11px', display: 'block', marginLeft: 0 }}
                  >
                    {code}
                  </Text>
                </Space>
              </div>
            ),
            permission,
            category,
            isCategory: false,
            checkable: true,
            disableCheckbox: !isActive || disabled
          };
        }),
        category,
        isCategory: true,
        checkable: false
      };

      nodes.push(categoryNode);
    });

    return nodes;
  }, [permissions, disabled]);

  // 搜索过滤
  const filteredTreeData = useMemo(() => {
    if (!searchText.trim()) {
      return treeData;
    }

    const filterNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        if (node.isCategory) {
          const filteredChildren = node.children ? filterNodes(node.children) : [];
          if (filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        } else {
          const permission = node.permission;
          if (!permission) return null;

          const code = permission.permission_code || permission.permissionCode || '';
          const name = permission.permission_name || permission.permissionName || getPermissionName(code);
          const description = permission.permission_description || permission.permissionDescription || getPermissionDescription(code);
          
          const searchLower = searchText.toLowerCase();
          if (
            code.toLowerCase().includes(searchLower) ||
            name.toLowerCase().includes(searchLower) ||
            description.toLowerCase().includes(searchLower)
          ) {
            return node;
          }
          return null;
        }
      }).filter(Boolean) as TreeNodeData[];
    };

    return filterNodes(treeData);
  }, [treeData, searchText]);

  // 统计信息
  const statistics = useMemo(() => {
    const totalPermissions = permissions.length;
    const selectedCount = checkedKeys.length;
    const activePermissions = permissions.filter(p => p.is_active ?? p.isActive ?? true).length;
    const categoriesCount = Object.keys(groupPermissionsByCategory(permissions)).length;

    return {
      total: totalPermissions,
      selected: selectedCount,
      active: activePermissions,
      categories: categoriesCount,
      coverage: totalPermissions > 0 ? Math.round((selectedCount / totalPermissions) * 100) : 0
    };
  }, [permissions, checkedKeys]);

  // 处理树节点展开
  const handleExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue as string[]);
    setAutoExpandParent(false);
  };

  // 处理权限选择
  const handleCheck = (checkedKeysValue: any, info: any) => {
    const { checked, halfChecked } = checkedKeysValue;
    const newCheckedKeys = Array.isArray(checked) ? checked : checkedKeysValue;
    
    setCheckedKeys(newCheckedKeys);
    onSelectionChange(newCheckedKeys);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    const allPermissionKeys = permissions
      .filter(p => p.is_active ?? p.isActive ?? true)
      .map(p => p.permission_code || p.permissionCode || '');
    
    if (checkedKeys.length === allPermissionKeys.length) {
      setCheckedKeys([]);
      onSelectionChange([]);
    } else {
      setCheckedKeys(allPermissionKeys);
      onSelectionChange(allPermissionKeys);
    }
  };

  // 展开/收起所有
  const handleExpandAll = () => {
    if (expandedKeys.length > 0) {
      setExpandedKeys([]);
    } else {
      const allCategoryKeys = treeData
        .filter(node => node.isCategory)
        .map(node => node.key);
      setExpandedKeys(allCategoryKeys);
    }
    setAutoExpandParent(true);
  };

  // 按分类选择
  const handleCategorySelect = (categoryName: string) => {
    const categoryPermissions = permissions.filter(p => {
      const code = p.permission_code || p.permissionCode || '';
      const category = groupPermissionsByCategory([p]);
      return Object.keys(category)[0] === categoryName;
    });
    
    const categoryKeys = categoryPermissions
      .filter(p => p.is_active ?? p.isActive ?? true)
      .map(p => p.permission_code || p.permissionCode || '');
    
    const isAllSelected = categoryKeys.every(key => checkedKeys.includes(key));
    
    let newCheckedKeys: string[];
    if (isAllSelected) {
      // 取消选择该分类的所有权限
      newCheckedKeys = checkedKeys.filter(key => !categoryKeys.includes(key));
    } else {
      // 选择该分类的所有权限
      newCheckedKeys = [...new Set([...checkedKeys, ...categoryKeys])];
    }
    
    setCheckedKeys(newCheckedKeys);
    onSelectionChange(newCheckedKeys);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 搜索和控制区域 */}
      {showSearch && (
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Search
              placeholder="搜索权限名称、代码或描述"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              allowClear
              prefix={<SearchOutlined />}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Button
                  size="small"
                  icon={expandedKeys.length > 0 ? <CompressOutlined /> : <ExpandAltOutlined />}
                  onClick={handleExpandAll}
                >
                  {expandedKeys.length > 0 ? '收起全部' : '展开全部'}
                </Button>
                
                <Button
                  size="small"
                  icon={checkedKeys.length === statistics.active ? <CloseOutlined /> : <CheckOutlined />}
                  onClick={handleSelectAll}
                  disabled={disabled}
                >
                  {checkedKeys.length === statistics.active ? '取消全选' : '全选'}
                </Button>
                
                {onRefresh && (
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={onRefresh}
                    loading={loading}
                  >
                    刷新
                  </Button>
                )}
              </Space>
            </div>
          </Space>
        </div>
      )}

      {/* 统计信息 */}
      {showStatistics && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Text type="secondary">权限总数:</Text>
                <Text strong>{statistics.total}</Text>
              </Space>
              <Space>
                <Text type="secondary">已选择:</Text>
                <Text strong style={{ color: '#52c41a' }}>{statistics.selected}</Text>
              </Space>
              <Space>
                <Text type="secondary">分类数:</Text>
                <Text strong>{statistics.categories}</Text>
              </Space>
              <Space>
                <Text type="secondary">覆盖率:</Text>
                <Text strong style={{ color: statistics.coverage > 70 ? '#52c41a' : statistics.coverage > 40 ? '#faad14' : '#ff4d4f' }}>
                  {statistics.coverage}%
                </Text>
              </Space>
            </div>
          </Space>
        </Card>
      )}

      {/* 权限树 */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
        <Spin spinning={loading}>
          {filteredTreeData.length === 0 ? (
            <Alert
              message={searchText ? "未找到匹配的权限" : "暂无权限数据"}
              type="info"
              showIcon
              style={{ margin: '20px 0' }}
            />
          ) : (
            <Tree
              checkable
              checkedKeys={checkedKeys}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onExpand={handleExpand}
              onCheck={handleCheck}
              treeData={filteredTreeData}
              height={height - 160}
              disabled={disabled}
              showLine
              showIcon={false}
              selectable={false}
              checkStrictly={false}
              titleRender={(nodeData) => {
                const node = nodeData as TreeNodeData;
                return (
                  <div style={{ width: '100%', padding: '4px 0' }}>
                    {node.isCategory ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {node.title}
                        <Button
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategorySelect(node.category || '');
                          }}
                        >
                          选择分类
                        </Button>
                      </div>
                    ) : (
                      node.title
                    )}
                  </div>
                );
              }}
            />
          )}
        </Spin>
      </div>
    </div>
  );
};

export default PermissionTree;