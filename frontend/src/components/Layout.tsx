import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { userService } from '../services/userService';
import { User } from '../types/user';
import {
  DashboardOutlined,
  ProjectOutlined,
  LogoutOutlined,
  UserOutlined,
  ImportOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  AuditOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SafetyOutlined,
  RobotOutlined,
  FileTextOutlined,
  FolderOutlined,
} from '@ant-design/icons';

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
          console.error('No token found, redirecting to login');
          navigate('/login');
          return;
        }

        console.log('Fetching user profile...');
        const response = await userService.getProfile();
        console.log('User profile response:', response);
        
        if (response.success && response.data) {
          setCurrentUser(response.data);
          console.log('User profile loaded successfully:', response.data);
        } else {
          console.error('Failed to load user profile:', response.message);
          // Don't redirect to login for profile fetch failure, user might still be authenticated
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        
        // Check if it's an authentication error
        if (error && typeof error === 'object' && 'type' in error) {
          if ((error as any).type === 'AUTHENTICATION') {
            console.log('Authentication error detected, redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            navigate('/login');
            return;
          }
        }
        
        // For other errors, don't redirect but show a fallback
        console.log('Non-authentication error, continuing with fallback user data');
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser));
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
          }
        }
      }
    };
    fetchUser();
  }, [navigate]);

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.includes('/task-dashboard')) return ['/task-dashboard'];
    if (path.includes('/task-list')) return ['/task-list'];
    if (path === '/tasks') return ['/tasks'];
    if (path.includes('/bulk-import')) return ['/bulk-import'];
    if (path === '/projects') return ['/projects'];
    if (path.includes('/companies')) return ['/companies'];
    if (path.includes('/document-manager')) return ['/document-manager'];
    return [path];
  };

  // 获取当前打开的子菜单
  const getOpenKeys = () => {
    // 如果侧边栏被折叠，不展开任何子菜单
    if (collapsed) return [];
    
    const path = location.pathname;
    if (path.includes('/task-dashboard') || path.includes('/task-list') || path === '/tasks' || path.includes('/bulk-import')) {
      return ['/task-management'];
    }
    if (path.includes('/projects') || path.includes('/companies')) {
      return ['/project-customer-management'];
    }
    if (path.includes('/document-manager')) {
      return ['/document-management'];
    }
    if (path.includes('/permissions') || path.includes('/user-management') || path.includes('/ai-config') || path.includes('/recycle-bin') || path.includes('/audit-logs')) {
      return ['/system-management'];
    }
    return [];
  };

  const userMenuItems = [
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  const sidebarItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: '/project-customer-management',
      icon: <ProjectOutlined />,
      label: '项目客户',
      children: [
        {
          key: '/projects',
          icon: <UnorderedListOutlined />,
          label: '项目列表',
        },
        {
          key: '/companies',
          icon: <CustomerServiceOutlined />,
          label: '企业客户',
        },
      ],
    },
    {
      key: '/task-management',
      icon: <AppstoreOutlined />,
      label: '任务管理',
      children: [
        {
          key: '/task-dashboard',
          icon: <CalendarOutlined />,
          label: '任务仪表盘',
        },
        {
          key: '/tasks',
          icon: <UnorderedListOutlined />,
          label: '任务列表',
        },
        {
          key: '/tasks/all-fields',
          icon: <DatabaseOutlined />,
          label: '全字段列表',
        },
        {
          key: '/bulk-import',
          icon: <ImportOutlined />,
          label: '批量导入',
        },
      ],
    },
    {
      key: '/document-management',
      icon: <FileTextOutlined />,
      label: '文档管理',
      children: [
        {
          key: '/document-manager',
          icon: <FolderOutlined />,
          label: '文档管理器',
        },
      ],
    },
    {
      key: '/system-management',
      icon: <SafetyOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/user-management',
          icon: <TeamOutlined />,
          label: '用户管理',
        },
        {
          key: '/permissions',
          icon: <SafetyOutlined />,
          label: '权限管理',
        },
        {
          key: '/ai-config',
          icon: <RobotOutlined />,
          label: 'AI配置',
        },
        {
          key: '/recycle-bin',
          icon: <DeleteOutlined />,
          label: '回收站',
        },
        {
          key: '/audit-logs',
          icon: <AuditOutlined />,
          label: '审计日志',
        },
      ],
    },
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
              height: 32,
            }}
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
            transition: 'all 0.2s',
          }}
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