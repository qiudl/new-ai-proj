import React from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.includes('/task-board')) return ['/task-board'];
    if (path.includes('/task-list')) return ['/task-list'];
    if (path.includes('/bulk-import')) return ['/bulk-import'];
    return [path];
  };

  // 获取当前打开的子菜单
  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.includes('/task-board') || path.includes('/task-list') || path.includes('/bulk-import')) {
      return ['/task-management'];
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
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
    },
    {
      key: '/task-management',
      icon: <AppstoreOutlined />,
      label: '任务管理',
      children: [
        {
          key: '/task-board',
          icon: <TableOutlined />,
          label: '任务看板',
        },
        {
          key: '/task-list',
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
      key: '/recycle-bin',
      icon: <DeleteOutlined />,
      label: '回收站',
    },
    {
      key: '/audit-logs',
      icon: <AuditOutlined />,
      label: '审计日志',
    },
  ];

  return (
    <AntLayout>
      <Header>
        <div className="logo">
          AI项目管理平台
        </div>
        <div className="user-info">
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space>
              <Avatar icon={<UserOutlined />} />
              <span>管理员</span>
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