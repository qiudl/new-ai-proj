// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
 Drawer,
 Menu,
 Card,
 Alert, 
 Typography, 
 Layout,
 Row,
 Col, 
 Empty,
 message
} from 'antd';
import { 
 MobileOutlined,
 DesktopOutlined,
 ReloadOutlined,
 ExportOutlined, 
 ExclamationCircleOutlined
} from '@ant-design/icons';
import { navigationService } from '../services/navigationService';
import { MenuItem } from '../types/navigation';
import IconSelector from './IconSelector';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

interface NavigationPreviewProps {
  visible: boolean;
  onClose: () => void;
}

const NavigationPreview: React.FC<NavigationPreviewProps> = ({
  visible,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);

  // 加载预览数据
  const loadPreviewData = async () => {
    setLoading(true);
    try {
      const data = await navigationService.previewNavigation();
      setMenuData(data);
      
      // 同时验证路由
      const validation = await navigationService.validateRoutes();
      setValidationResults(validation);
    } catch (error) {
      console.error('Failed to load preview data:', error);
      message.error('加载预览数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadPreviewData();
    }
  }, [visible]);

  // 构建菜单项
  const buildMenuItems = (items: MenuItem[]): any[] => {
    return items
      .filter(item => item.is_visible && item.is_enabled)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(item => {
        const menuItem: any = {
          key: item.key,
          label: item.label,
          icon: item.icon ? getIconElement(item.icon) : null};

        // 如果有子菜单
        if (item.children && item.children.length > 0) {
          menuItem.children = buildMenuItems(item.children);
        }

        return menuItem;
    });
  };

  // 获取图标元素（简化版本）
  const getIconElement = (iconName: string) => {
    // 这里可以根据图标名称返回对应的图标组件
    // 为了简化，这里只返回一个通用图标
    return <span style={{ marginRight: 8 }}>📄</span>;
  };

  // 渲染验证结果
  const renderValidationResults = () => {
    if (!validationResults) return null;

    return (
      <Card title="配置验证结果" size="small" style={{ marginBottom: 16 }}>
        {validationResults.valid ? (
          <Alert
            message="配置验证通过"
            description="所有路由配置都正确，可以正常使用。"
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        ) : (
          <Alert
            message="发现配置问题"
            description={
              <div>
                <p>以下配置需要修复：</p>
                <ul style={{ marginBottom: 0 }}>
                  {validationResults.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            }
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        )}
      </Card>
    );
  };

  // 渲染菜单统计
  const renderMenuStats = () => {
    const totalItems = menuData.length;
    const visibleItems = menuData.filter(item => item.is_visible).length;
    const enabledItems = menuData.filter(item => item.is_enabled).length;
    const topLevelItems = menuData.filter(item => !item.parent_id).length;

    return (
      <Card title="菜单统计" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {totalItems}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>总菜单项</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {visibleItems}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>可见菜单</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                {enabledItems}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>启用菜单</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                {topLevelItems}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>顶级菜单</div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  // 渲染预览工具栏
  const renderPreviewToolbar = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space split={<Divider type="vertical" />}>
        <Space>
          <Text strong>视图模式:</Text>
          <Button
            type={!isMobile ? 'primary' : 'default'}
            size="small"
            icon={<DesktopOutlined />}
            onClick={() => setIsMobile(false)}
          >
            桌面版
          </Button>
          <Button
            type={isMobile ? 'primary' : 'default'}
            size="small"
            icon={<MobileOutlined />}
            onClick={() => setIsMobile(true)}
          >
            移动版
          </Button>
        </Space>

        <Space>
          <Text strong>折叠状态:</Text>
          <Switch
            checked={collapsed}
            onChange={setCollapsed}
            checkedChildren="折叠"
            unCheckedChildren="展开"
          />
        </Space>

        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadPreviewData}
          >
            刷新预览
          </Button>
          <Button
            size="small"
            icon={<ExportOutlined />}
            onClick={() => {
              const dataStr = JSON.stringify(menuData, null, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'navigation-preview.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            导出预览
          </Button>
        </Space>
      </Space>
    </Card>
  );

  // 渲染导航预览
  const renderNavigationPreview = () => {
    if (menuData.length === 0) {
      return (
        <Card>
          <Empty
            description="暂无菜单数据"
            style={{ padding: '40px 0' }}
          />
        </Card>
      );
    }

    const menuItems = buildMenuItems(menuData);

    return (
      <Card
        title="导航预览"
        size="small"
        style={{
          border: isMobile ? '2px dashed #d9d9d9' : '1px solid #d9d9d9',
          borderRadius: isMobile ? '20px' : '6px',
          maxWidth: isMobile ? '375px' : '100%',
          margin: isMobile ? '0 auto' : undefined}}
        bodyStyle={{
          padding: 0,
          height: '500px',
          overflow: 'hidden'
        }}
      >
        <Layout style={{ height: '100%' }}>
          <Sider
            width={collapsed ? 80 : 200}
            collapsed={collapsed}
            style={{
              background: '#001529',
              overflow: 'auto'
            }}
          >
            <div style={{ 
              height: '32px', 
              margin: '16px', 
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {collapsed ? 'LOGO' : 'AI上下文任务系统'}
            </div>
            
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={selectedKeys}
              onSelect={({ selectedKeys }) => setSelectedKeys(selectedKeys as string[])}
              items={menuItems}
              style={{ border: 'none' }}
            />
          </Sider>
          
          <Content style={{ 
            padding: '24px',
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <EyeOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <div style={{ fontSize: '16px', color: '#666' }}>
                {selectedKeys.length > 0 ? `当前页面: ${selectedKeys[0]}` : '请选择菜单项查看效果'}
              </div>
            </div>
          </Content>
        </Layout>
      </Card>
    );
  };

  return (
    <Drawer
      title="导航预览"
      width={800}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">正在加载预览数据...</Text>
          </div>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="导航预览"
            description="这里展示了根据当前配置生成的导航菜单效果。您可以切换视图模式和折叠状态来查看不同场景下的显示效果。"
            type="info"
            showIcon
            closable
          />

          {renderMenuStats()}
          {renderValidationResults()}
          {renderPreviewToolbar()}
          {renderNavigationPreview()}
        </Space>
      )}
    </Drawer>
  );
};

export default NavigationPreview;