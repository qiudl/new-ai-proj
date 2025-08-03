import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  message,
  Modal,
  Drawer,
  Tree,
  Tag,
  Tooltip,
  Switch,
  Badge,
  Alert,
  Popconfirm,
  Input,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
  notification
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  EyeOutlined,
  SettingOutlined,
  ReloadOutlined,
  MenuOutlined,
  LinkOutlined,
  SecurityScanOutlined,
  BugOutlined,
  SaveOutlined,
  RollbackOutlined,
  SearchOutlined,
  DragOutlined,
  CopyOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TreeProps } from 'antd';
import { navigationService } from '../services/navigationService';
import { 
  MenuItem, 
  MenuGroup, 
  RouteConfig, 
  NavigationConfig,
  ICON_OPTIONS,
  COMPONENT_OPTIONS,
  PERMISSION_LEVELS,
  MENU_TYPES
} from '../types/navigation';
import MenuItemForm from '../components/MenuItemForm';
import RouteConfigForm from '../components/RouteConfigForm';
import NavigationPreview from '../components/NavigationPreview';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const NavigationManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('menu-items');
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [stats, setStats] = useState<any>({});
  
  // 模态框和抽屉状态
  const [menuItemModalVisible, setMenuItemModalVisible] = useState(false);
  const [routeConfigModalVisible, setRouteConfigModalVisible] = useState(false);
  const [previewDrawerVisible, setPreviewDrawerVisible] = useState(false);
  const [settingsDrawerVisible, setSettingsDrawerVisible] = useState(false);
  
  // 编辑状态
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingRoute, setEditingRoute] = useState<RouteConfig | null>(null);
  
  // 搜索和过滤
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>();
  
  // 选择状态
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [menuItemsData, routesData, groupsData, statsData] = await Promise.all([
        navigationService.getMenuItems(),
        navigationService.getRoutes(),
        navigationService.getMenuGroups(),
        navigationService.getNavigationStats()
      ]);
      
      setMenuItems(menuItemsData);
      setRoutes(routesData);
      setMenuGroups(groupsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load navigation data:', error);
      message.error('加载导航数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 构建树形菜单数据
  const buildTreeData = (items: MenuItem[]): any[] => {
    const itemMap = new Map<string, MenuItem & { children: MenuItem[] }>();
    const rootItems: (MenuItem & { children: MenuItem[] })[] = [];

    // 创建映射表
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // 构建层级关系
    items.forEach(item => {
      const treeItem = itemMap.get(item.id)!;
      if (item.parent_id && itemMap.has(item.parent_id)) {
        itemMap.get(item.parent_id)!.children.push(treeItem);
      } else {
        rootItems.push(treeItem);
      }
    });

    return rootItems.map(item => ({
      key: item.id,
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span>{item.label}</span>
            <Tag color={item.is_enabled ? 'green' : 'red'}>
              {item.is_enabled ? '启用' : '禁用'}
            </Tag>
            {!item.is_visible && <Tag color="orange">隐藏</Tag>}
          </Space>
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEditMenuItem(item);
              }}
            />
            <Popconfirm
              title="确认删除此菜单项？"
              onConfirm={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();
                handleDeleteMenuItem(item.id);
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Space>
        </div>
      ),
      children: item.children.length > 0 ? buildTreeData(item.children) : undefined
    }));
  };

  // 菜单项表格列定义
  const menuItemColumns: unknown[] = [
    {
      title: '菜单标签',
      dataIndex: 'label',
      key: 'label',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.icon && <Tag>{record.icon}</Tag>}
        </Space>
      ),
    },
    {
      title: '菜单键值',
      dataIndex: 'key',
      key: 'key',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      render: (text) => text ? <Text code>{text}</Text> : '-',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
      sorter: (a, b) => a.sort_order - b.sort_order,
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space>
          <Switch
            size="small"
            checked={record.is_enabled}
            onChange={(checked) => handleToggleMenuItem(record.id, 'is_enabled', checked)}
          />
          <Tooltip title={record.is_visible ? '可见' : '隐藏'}>
            <Tag color={record.is_visible ? 'green' : 'orange'}>
              {record.is_visible ? '可见' : '隐藏'}
            </Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditMenuItem(record)}
          >
            编辑
          </Button>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyMenuItem(record)}
          >
            复制
          </Button>
          <Popconfirm
            title="确认删除此菜单项？"
            onConfirm={() => handleDeleteMenuItem(record.id)}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 路由配置表格列定义
  const routeColumns: unknown[] = [
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '组件',
      dataIndex: 'component',
      key: 'component',
    },
    {
      title: '关联菜单',
      dataIndex: 'menu_item_id',
      key: 'menu_item_id',
      render: (menuItemId) => {
        const menuItem = menuItems.find(item => item.id === menuItemId);
        return menuItem ? <Tag color="blue">{menuItem.label}</Tag> : '-';
      },
    },
    {
      title: '保护状态',
      dataIndex: 'is_protected',
      key: 'is_protected',
      render: (isProtected) => (
        <Tag color={isProtected ? 'red' : 'green'}>
          {isProtected ? '需要认证' : '公开访问'}
        </Tag>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (text) => text ? <Tag color="orange">{text}</Tag> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRoute(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除此路由配置？"
            onConfirm={() => handleDeleteRoute(record.id)}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 事件处理函数
  const handleAddMenuItem = () => {
    setEditingMenuItem(null);
    setMenuItemModalVisible(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuItemModalVisible(true);
  };

  const handleCopyMenuItem = (item: MenuItem) => {
    const { id, ...copiedItem } = {
      ...item,
      label: `${item.label} (副本)`,
      key: `${item.key}_copy_${Date.now()}`,
    };
    setEditingMenuItem(copiedItem as MenuItem);
    setMenuItemModalVisible(true);
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      await navigationService.deleteMenuItem(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      console.error('Delete menu item failed:', error);
      message.error('删除失败');
    }
  };

  const handleToggleMenuItem = async (id: string, field: 'is_enabled' | 'is_visible', value: boolean) => {
    try {
      await navigationService.updateMenuItem(id, { [field]: value });
      message.success('更新成功');
      loadData();
    } catch (error) {
      console.error('Update menu item failed:', error);
      message.error('更新失败');
    }
  };

  const handleAddRoute = () => {
    setEditingRoute(null);
    setRouteConfigModalVisible(true);
  };

  const handleEditRoute = (route: RouteConfig) => {
    setEditingRoute(route);
    setRouteConfigModalVisible(true);
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      await navigationService.deleteRoute(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      console.error('Delete route failed:', error);
      message.error('删除失败');
    }
  };

  const handlePreviewNavigation = () => {
    setPreviewDrawerVisible(true);
  };

  const handleExportConfig = async () => {
    try {
      const config = await navigationService.exportNavigationConfig();
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navigation-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败');
    }
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config: NavigationConfig = JSON.parse(text);
        
        Modal.confirm({
          title: '确认导入配置',
          content: '导入新配置将覆盖现有配置，此操作不可撤销。确认继续吗？',
          onOk: async () => {
            try {
              await navigationService.importNavigationConfig(config);
              message.success('导入成功');
              loadData();
            } catch (error) {
              console.error('Import failed:', error);
              message.error('导入失败');
            }
          },
        });
      } catch (error) {
        message.error('文件格式错误');
      }
    };
    input.click();
  };

  const handleApplyConfig = async () => {
    Modal.confirm({
      title: '应用导航配置',
      content: '确认要应用当前配置吗？这将重新生成导航菜单。',
      onOk: async () => {
        try {
          await navigationService.applyNavigationConfig();
          notification.success({
            message: '配置应用成功',
            description: '导航菜单已更新，页面将在3秒后刷新。',
          });
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } catch (error) {
          console.error('Apply config failed:', error);
          message.error('应用配置失败');
        }
      },
    });
  };

  const handleValidateRoutes = async () => {
    try {
      const result = await navigationService.validateRoutes();
      if (result.valid) {
        message.success('路由配置验证通过');
      } else {
        Modal.error({
          title: '路由配置验证失败',
          content: (
            <div>
              <p>发现以下问题：</p>
              <ul>
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          ),
        });
      }
    } catch (error) {
      console.error('Validate routes failed:', error);
      message.error('验证失败');
    }
  };

  // 过滤菜单项
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.path && item.path.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterEnabled === undefined || item.is_enabled === filterEnabled;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>导航菜单管理</Title>
        <Text type="secondary">
          管理系统导航菜单、路由配置和权限设置
        </Text>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="菜单项总数" 
              value={stats.total_items || 0} 
              prefix={<MenuOutlined />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="启用菜单" 
              value={stats.enabled_items || 0} 
              valueStyle={{ color: '#3f8600' }}
              prefix={<Badge status="success" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="路由配置" 
              value={stats.total_routes || 0} 
              prefix={<LinkOutlined />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="菜单分组" 
              value={stats.total_groups || 0} 
              prefix={<SettingOutlined />} 
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMenuItem}>
              新增菜单项
            </Button>
            <Button icon={<LinkOutlined />} onClick={handleAddRoute}>
              新增路由
            </Button>
            <Button icon={<EyeOutlined />} onClick={handlePreviewNavigation}>
              预览导航
            </Button>
          </Space>
          
          <Space>
            <Search
              placeholder="搜索菜单项..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="状态筛选"
              value={filterEnabled}
              onChange={setFilterEnabled}
              style={{ width: 120 }}
              allowClear
            >
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => setSettingsDrawerVisible(true)}>
              设置
            </Button>
          </Space>
        </div>
      </Card>

      {/* 主要内容 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="菜单项管理" key="menu-items">
            <div style={{ marginBottom: '16px' }}>
              <Alert
                message="菜单项管理"
                description="管理系统导航菜单项，包括标签、图标、路径、权限等配置。支持拖拽排序和层级管理。"
                type="info"
                showIcon
                closable
              />
            </div>
            
            <Table
              columns={menuItemColumns}
              dataSource={filteredMenuItems}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              rowSelection={{
                selectedRowKeys: selectedMenuItems,
                onChange: (selectedRowKeys) => setSelectedMenuItems(selectedRowKeys as string[]),
              }}
              scroll={{ x: 1200 }}
            />
          </TabPane>

          <TabPane tab="树形视图" key="tree-view">
            <div style={{ marginBottom: '16px' }}>
              <Alert
                message="树形视图"
                description="以树形结构展示菜单层级关系，可直接在树中进行编辑和删除操作。"
                type="info"
                showIcon
                closable
              />
            </div>
            
            <Tree
              treeData={buildTreeData(menuItems)}
              defaultExpandAll
              blockNode
              style={{ background: '#f5f5f5', padding: '16px', borderRadius: '6px' }}
            />
          </TabPane>

          <TabPane tab="路由配置" key="routes">
            <div style={{ marginBottom: '16px' }}>
              <Alert
                message="路由配置"
                description="管理应用路由配置，包括路径、组件、权限等设置。确保菜单项与路由的正确关联。"
                type="info"
                showIcon
                closable
              />
            </div>
            
            <Table
              columns={routeColumns}
              dataSource={routes}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              rowSelection={{
                selectedRowKeys: selectedRoutes,
                onChange: (selectedRowKeys) => setSelectedRoutes(selectedRowKeys as string[]),
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 菜单项表单模态框 */}
      <MenuItemForm
        visible={menuItemModalVisible}
        onCancel={() => {
          setMenuItemModalVisible(false);
          setEditingMenuItem(null);
        }}
        onSave={() => {
          setMenuItemModalVisible(false);
          setEditingMenuItem(null);
          loadData();
        }}
        menuItem={editingMenuItem}
        menuItems={menuItems}
      />

      {/* 路由配置表单模态框 */}
      <RouteConfigForm
        visible={routeConfigModalVisible}
        onCancel={() => {
          setRouteConfigModalVisible(false);
          setEditingRoute(null);
        }}
        onSave={() => {
          setRouteConfigModalVisible(false);
          setEditingRoute(null);
          loadData();
        }}
        route={editingRoute}
        menuItems={menuItems}
      />

      {/* 导航预览抽屉 */}
      <NavigationPreview
        visible={previewDrawerVisible}
        onClose={() => setPreviewDrawerVisible(false)}
      />

      {/* 设置抽屉 */}
      <Drawer
        title="导航管理设置"
        width={400}
        open={settingsDrawerVisible}
        onClose={() => setSettingsDrawerVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={4}>配置管理</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleApplyConfig}
                block
              >
                应用当前配置
              </Button>
              <Button
                icon={<BugOutlined />}
                onClick={handleValidateRoutes}
                block
              >
                验证路由配置
              </Button>
            </Space>
          </div>

          <div>
            <Title level={4}>导入导出</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExportConfig}
                block
              >
                导出配置
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={handleImportConfig}
                block
              >
                导入配置
              </Button>
            </Space>
          </div>

          <div>
            <Title level={4}>批量操作</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                disabled={selectedMenuItems.length === 0}
                danger
                block
              >
                批量删除菜单项 ({selectedMenuItems.length})
              </Button>
              <Button
                disabled={selectedRoutes.length === 0}
                danger
                block
              >
                批量删除路由 ({selectedRoutes.length})
              </Button>
            </Space>
          </div>
        </Space>
      </Drawer>
    </div>
  );
};

export default NavigationManagementPage;