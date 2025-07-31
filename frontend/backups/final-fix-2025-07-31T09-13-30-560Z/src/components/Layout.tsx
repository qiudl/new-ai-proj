// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Dropdown} from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { userService } from '../services/userService';
import { User } from '../types/user';
import {
 DashboardOutlined, 
 LogoutOutlined,
 UserOutlined,
 ImportOutlined, 
 UnorderedListOutlined, 
 AuditOutlined, 
 CustomerServiceOutlined,
 TeamOutlined,
 MenuUnfoldOutlined,
 MenuFoldOutlined,
 SafetyOutlined,
 RobotOutlined,
 FileTextOutlined, 
 BarChartOutlined} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    // 从localStorage读取用户的折叠状态偏好，默认为false
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleSidebar = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    // 保存用户偏好到localStorage
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newCollapsed));
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await userService.getProfile();
        
        if (response.success && response.data) {
          setCurrentUser(response.data);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to load user profile:', response.message);
          }
          // Don't redirect to login for profile fetch failure, user might still be authenticated
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch user profile:', error);
        }
        
        // Check if it's an authentication error
        if (error && typeof error === 'object' && 'type' in error) {
          if ((error as any).type === 'AUTHENTICATION') {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            navigate('/login');
            return;
          }
        }
        
        // For other errors, don't redirect but show a fallback
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser));
          } catch (parseError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to parse stored user data:', parseError);
            }
          }
        }
      }
    };
    fetchUser();
  }, [navigate]);

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return ['/'];
    if (path.includes('/task-list')) return ['/task-list'];
    if (path.includes('/bulk-import')) return ['/bulk-import'];
    if (path === '/projects') return ['/projects'];
    if (path.includes('/companies')) return ['/companies'];
    if (path.includes('/document-manager')) return ['/document-manager'];
    if (path.includes('/task-documents')) return ['/task-documents'];
    return [path];
  };

  // 获取当前打开的子菜单
  const getOpenKeys = () => {
    // 如果侧边栏被折叠，不展开任何子菜单
    if (collapsed) return [];
    
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      return ['/workspace-management'];
    }
    if (path.includes('/projects') || path.includes('/companies')) {
      return ['/project-customer-management'];
    }
    if (path.includes('/document-manager') || path.includes('/task-documents')) {
      return ['/document-management'];
    }
    if (path.includes('/time-')) {
      return ['/time-management'];
    }
    if (path.includes('/user-management') || path.includes('/ai-config') || path.includes('/recycle-bin') || path.includes('/audit-logs') || path.includes('/navigation-management')) {
      return ['/system-management'];
    }
    return [];
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
      onClick: () => navigate('/user-profile')},
    {
      type: 'divider' as const},
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout},
  ];

  const sidebarItems = [
    {
      key: '/workspace-management',
      icon: <DashboardOutlined />,
      label: '工作台',
      children: [
        {
          key: '/',
          icon: <DashboardOutlined />,
          label: '工作概览'},
      ]},
    {
      key: '/project-customer-management',
      icon: <ProjectOutlined />,
      label: '项目客户',
      children: [
        {
          key: '/projects',
          icon: <UnorderedListOutlined />,
          label: '项目列表'},
        {
          key: '/companies',
          icon: <CustomerServiceOutlined />,
          label: '企业客户'},
      ]},
    {
      key: '/bulk-import',
      icon: <ImportOutlined />,
      label: '批量导入'},
    {
      key: '/document-management',
      icon: <FileTextOutlined />,
      label: '文档管理',
      children: [
        {
          key: '/document-manager',
          icon: <FolderOutlined />,
          label: '工作笔记'},
        {
          key: '/task-documents',
          icon: <FileTextOutlined />,
          label: '任务文档'},
      ]},
    {
      key: '/time-management',
      icon: <ClockCircleOutlined />,
      label: '时间管理',
      children: [
        {
          key: '/time-management',
          icon: <DashboardOutlined />,
          label: '时间首页'},
        {
          key: '/time-analysis',
          icon: <BarChartOutlined />,
          label: '时间分析'},
        {
          key: '/time-weekly-report',
          icon: <CalendarOutlined />,
          label: '周报标准版'},
        {
          key: '/time-weekly-report-enhanced',
          icon: <FileTextOutlined />,
          label: '周报增强版'},
      ]},
    {
      key: '/system-management',
      icon: <SafetyOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/user-management',
          icon: <TeamOutlined />,
          label: '用户管理'},
        {
          key: '/ai-config',
          icon: <RobotOutlined />,
          label: 'AI配置'},
        {
          key: '/recycle-bin',
          icon: <DeleteOutlined />,
          label: '回收站'},
        {
          key: '/audit-logs',
          icon: <AuditOutlined />,
          label: '审计日志'},
        {
          key: '/navigation-management',
          icon: <MenuUnfoldOutlined />,
          label: '导航管理'},
      ]},
  ];

  return (
    <AntLayout>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            style={{
              fontSize: '16px',
              width: 32,
              height: 32}}
          />
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            AI项目管理平台
          </div>
        </div>
        <div className="user-info">
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space>
              <Avatar icon={<UserOutlined />} />
              <span>{currentUser?.username || '加载中...'}</span>
            </Space>
          </Dropdown>
        </div>
      </Header>
      <AntLayout>
        <Sider 
          width={200} 
          theme="light" 
          collapsible 
          collapsed={collapsed} 
          trigger={null}
          style={{
            transition: 'all 0.2s'}}
        >
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={collapsed ? [] : getOpenKeys()}
            style={{ height: '100%', borderRight: 0 }}
            items={sidebarItems}
            onClick={({ key }) => handleMenuClick(key)}
            inlineCollapsed={collapsed}
          />
        </Sider>
        <Content>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;