import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space } from 'antd';
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
  TableOutlined,
  DeleteOutlined,
  AuditOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await userService.getProfile();
        if (response.success && response.data) {
          setCurrentUser(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchUser();
  }, []);

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.includes('/task-dashboard')) return ['/task-dashboard'];
    if (path.includes('/task-board')) return ['/task-board'];
    if (path.includes('/task-list')) return ['/task-list'];
    if (path === '/tasks') return ['/tasks'];
    if (path.includes('/bulk-import')) return ['/bulk-import'];
    if (path === '/project-dashboard') return ['/project-dashboard'];
    if (path === '/projects') return ['/projects'];
    if (path.includes('/customers')) return ['/customers'];
    return [path];
  };

  // 获取当前打开的子菜单
  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.includes('/task-dashboard') || path.includes('/task-board') || path.includes('/task-list') || path === '/tasks' || path.includes('/bulk-import')) {
      return ['/task-management'];
    }
    if (path.includes('/project-dashboard') || path.includes('/projects')) {
      return ['/project-management'];
    }
    if (path.includes('/customers')) {
      return ['/customer-management'];
    }
    return [];
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
      onClick: () => navigate('/user-profile'),
    },
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
      key: '/project-management',
      icon: <ProjectOutlined />,
      label: '项目管理',
      children: [
        {
          key: '/project-dashboard',
          icon: <DashboardOutlined />,
          label: '项目仪表盘',
        },
        {
          key: '/projects',
          icon: <UnorderedListOutlined />,
          label: '项目列表',
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
          key: '/task-board',
          icon: <TableOutlined />,
          label: '任务看板',
        },
        {
          key: '/tasks',
          icon: <UnorderedListOutlined />,
          label: '任务列表',
        },
        {
          key: '/bulk-import',
          icon: <ImportOutlined />,
          label: '批量导入',
        },
      ],
    },
    {
      key: '/customer-management',
      icon: <CustomerServiceOutlined />,
      label: '客户管理',
      children: [
        {
          key: '/customers',
          icon: <TeamOutlined />,
          label: '客户列表',
        },
      ],
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
    {
      key: '/user-profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
  ];

  return (
    <AntLayout>
      <Header>
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          AI项目管理平台
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
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            style={{ height: '100%', borderRight: 0 }}
            items={sidebarItems}
            onClick={({ key }) => handleMenuClick(key)}
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