import React, { useState, useEffect, useMemo } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space, Button, Tooltip, Input, message } from 'antd';
import { cleanupGlobalOverlays } from '../utils/overlayCleanup';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { userService } from '../services/userService';
import { User } from '../types/user';
import { TaskService } from '../services/taskService';
import { filterMenuItems, getUserType } from '../config/menuVisibility';
import EnterpriseImpersonation from './EnterpriseImpersonation';

// 开发环境下加载菜单测试工具
if (process.env.NODE_ENV === 'development') {
  import('../utils/testMenuVisibility').catch(error => {
    console.warn('Failed to load menu visibility test tool:', error);
  });
}
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
  ClockCircleOutlined,
  BarChartOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  KeyOutlined,
  BankOutlined,
  ContactsOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children?: React.ReactNode;
}

// 类型守卫：检测是否包含 type 字段
const hasTypeField = (e: unknown): e is { type?: string } => {
  return typeof e === 'object' && e !== null && 'type' in (e as any);
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    // 从localStorage读取用户的折叠状态偏好，默认为false
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickJumpLoading, setQuickJumpLoading] = useState(false);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('进入全屏失败:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('退出全屏失败:', err);
      });
    }
  };

  // 任务ID快速跳转
  const handleTaskQuickJump = async (raw: string) => {
    const value = (raw || '').trim();
    if (!value) {
      message.warning('请输入任务ID');
      return;
    }
    const match = value.match(/\d+/);
    const taskId = match ? parseInt(match[0], 10) : NaN;
    if (!taskId || Number.isNaN(taskId)) {
      message.warning('请输入有效的任务ID');
      return;
    }

    setQuickJumpLoading(true);
    try {
      // 通过全局任务接口解析项目ID
      const resp = await TaskService.getAllTasks({ task_id: taskId, page: 1, page_size: 1 });
      const task = Array.isArray(resp?.data) && resp.data.length > 0 ? resp.data[0] : null;
      if (!task) {
        message.error(`未找到任务 #${taskId}`);
        return;
      }
      const projectId = (task as any).project_id;
      if (!projectId) {
        message.error('未获取到项目ID，无法跳转');
        return;
      }
      navigate(`/projects/${projectId}/tasks/${taskId}`);
    } catch (err) {
      console.error('Quick jump failed:', err);
      message.error('跳转失败，请稍后重试');
    } finally {
      setQuickJumpLoading(false);
    }
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('[DEBUG Layout] Token from localStorage exists:', !!token);
        if (!token) {
          console.error('No token found, redirecting to login');
          navigate('/login');
          return;
        }

        const response = await userService.getProfile();
        console.log('[DEBUG Layout] Profile API response:', response);
        
        if (response.success && response.data) {
          console.log('[DEBUG Layout] Setting currentUser:', {
            id: response.data.id,
            username: response.data.username,
            role: response.data.role,
            email: response.data.email,
            userType: response.data.user_type
          });
          setCurrentUser(response.data);
          
          // 存储到localStorage以便调试
          localStorage.setItem('currentUser', JSON.stringify(response.data));
          console.log('[DEBUG Layout] User stored in localStorage');
        } else {
          console.error('Failed to load user profile:', response.message);
          // Don't redirect to login for profile fetch failure, user might still be authenticated
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        
        // Check if it's an authentication error
        if (hasTypeField(error) && error.type === 'AUTHENTICATION') {
          console.log('[DEBUG Layout] Authentication error, clearing storage and redirecting');
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          navigate('/login');
          return;
        }
        
        // For other errors, don't redirect but show a fallback
        const storedUser = localStorage.getItem('currentUser');
        console.log('[DEBUG Layout] Attempting to use stored user, exists:', !!storedUser);
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('[DEBUG Layout] Using fallback stored user:', {
              id: parsedUser.id,
              username: parsedUser.username,
              role: parsedUser.role
            });
            setCurrentUser(parsedUser);
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
          }
        }
      }
    };
    fetchUser();
  }, [navigate]);

  // 全局兜底清理：在页面可见性/焦点变化与路由变化时清理遗留的全屏/遮罩状态
  useEffect(() => {
    const handleVisibilityOrFocus = () => cleanupGlobalOverlays();
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  useEffect(() => {
    cleanupGlobalOverlays();
  }, [location.pathname]);

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return ['/'];
    if (path.includes('/personal-timer')) return ['/personal-timer'];
    if (path.includes('/timer-analytics')) return ['/timer-analytics'];
    if (path.includes('/time-weekly-report')) return ['/time-weekly-report'];
    if (path.includes('/task-dashboard')) return ['/task-dashboard'];
    if (path.includes('/tasks')) return ['/tasks'];
    if (path.includes('/task-list')) return ['/task-list'];
    if (path.includes('/bulk-import')) return ['/bulk-import'];
    if (path === '/projects') return ['/projects'];
    if (path.includes('/enterprises')) return ['/enterprises'];
    if (path.includes('/document-manager')) return ['/document-manager'];
    if (path.includes('/task-documents')) return ['/task-documents'];
    if (path.includes('/api-keys')) return ['/api-keys'];
    if (path.includes('/organization-structure')) return ['/organization-structure'];
    if (path.includes('/position-management')) return ['/position-management'];
    if (path.includes('/enterprise-roles')) return ['/enterprise-roles'];
    if (path.includes('/enterprise-users')) return ['/enterprise-users'];
    if (path.includes('/admin/permissions')) return ['/admin/permissions'];
    if (path.includes('/admin/roles')) return ['/admin/roles'];
    if (path.includes('/admin/role-templates')) return ['/admin/role-templates'];
    return [path];
  };

  // 获取当前打开的子菜单
  const getOpenKeys = () => {
    // 如果侧边栏被折叠，不展开任何子菜单
    if (collapsed) return [];
    
    const path = location.pathname;
    if (path === '/' || path === '/dashboard' || path.includes('/time-weekly-report') || path.includes('/task-dashboard')) {
      return ['/workspace-management'];
    }
    if (path.includes('/personal-timer') || path.includes('/timer-analytics')) {
      return ['/timer-management'];
    }
    if (path.includes('/projects') || path.includes('/enterprises') || path.includes('/tasks')) {
      return ['/project-customer-management'];
    }
    if (path.includes('/document-manager') || path.includes('/task-documents')) {
      return ['/document-management'];
    }
    if (path.includes('/organization-structure') || path.includes('/position-management') || path.includes('/enterprise-roles') || path.includes('/enterprise-users')) {
      return ['/organization-management'];
    }
    if (path.includes('/admin/permissions') || path.includes('/admin/roles') || path.includes('/user-management') || path.includes('/ai-config') || path.includes('/recycle-bin') || path.includes('/audit-logs') || path.includes('/navigation-management') || path.includes('/api-keys')) {
      return ['/system-management'];
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
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  const baseSidebarItems = [
    {
      key: '/workspace-management',
      icon: <DashboardOutlined />,
      label: '工作台',
      children: [
        {
          key: '/',
          icon: <DashboardOutlined />,
          label: '工作概览',
        },
        {
          key: '/time-weekly-report',
          icon: <CalendarOutlined />,
          label: '时间周报',
        },
        {
          key: '/task-dashboard',
          icon: <CalendarOutlined />,
          label: '任务周报',
        },
      ],
    },
    {
      key: '/timer-management',
      icon: <ClockCircleOutlined />,
      label: '计时系统',
      children: [
        {
          key: '/personal-timer',
          icon: <ClockCircleOutlined />,
          label: '个人计时',
        },
        {
          key: '/timer-analytics',
          icon: <BarChartOutlined />,
          label: '数据分析',
        },
      ],
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
          key: '/tasks',
          icon: <UnorderedListOutlined />,
          label: '全部任务',
        },
        {
          key: '/enterprises',
          icon: <CustomerServiceOutlined />,
          label: '企业客户',
        },
      ],
    },
    {
      key: '/bulk-import',
      icon: <ImportOutlined />,
      label: '批量导入',
    },
    {
      key: '/document-management',
      icon: <FileTextOutlined />,
      label: '文档管理',
      children: [
        {
          key: '/document-manager',
          icon: <FolderOutlined />,
          label: '工作笔记',
        },
        {
          key: '/task-documents',
          icon: <FileTextOutlined />,
          label: '任务文档',
        },
      ],
    },
    {
      key: '/organization-management',
      icon: <BankOutlined />,
      label: '组织管理',
      children: [
        {
          key: '/organization-structure',
          icon: <BankOutlined />,
          label: '组织架构',
        },
        {
          key: '/position-management',
          icon: <ContactsOutlined />,
          label: '岗位管理',
        },
        {
          key: '/enterprise-roles',
          icon: <SafetyCertificateOutlined />,
          label: '角色管理',
        },
        {
          key: '/enterprise-users',
          icon: <UserOutlined />,
          label: '用户管理',
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
          key: '/admin/permissions',
          icon: <SafetyOutlined />,
          label: '权限管理',
        },
        {
          key: '/admin/roles',
          icon: <TeamOutlined />,
          label: '角色管理',
        },
        {
          key: '/admin/role-templates',
          icon: <SafetyCertificateOutlined />,
          label: '角色模板',
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
        {
          key: '/navigation-management',
          icon: <MenuUnfoldOutlined />,
          label: '导航管理',
        },
        {
          key: '/api-keys',
          icon: <KeyOutlined />,
          label: 'API Key管理',
        },
      ],
    },
  ];

  // 根据用户角色过滤菜单项
  const sidebarItems = useMemo(() => {
    if (!currentUser || !currentUser.role) {
      // 如果用户信息未加载，显示基础菜单
      return baseSidebarItems;
    }

    const userType = getUserType(currentUser.user_type);
    const filteredItems = filterMenuItems(baseSidebarItems, userType, currentUser.role);
    
    // 开发环境下打印菜单过滤结果
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG Layout] Menu filtering:', {
        userRole: currentUser.role,
        userType: userType,
        originalMenuCount: baseSidebarItems.length,
        filteredMenuCount: filteredItems.length,
        filteredItems: filteredItems.map(item => ({
          key: item.key,
          label: item.label,
          childrenCount: item.children?.length || 0
        }))
      });
    }
    
    return filteredItems;
  }, [currentUser]);

  return (
    <AntLayout>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>AI上下文任务系统</span>
{/* 环境标志显示 */}
            {process.env['REACT_APP_LOCAL_DEV'] === 'true' && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#52c41a',
                color: 'white',
                fontSize: '12px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                开发环境
              </span>
            )}
            {(process.env['REACT_APP_ENV'] === 'development' && process.env['REACT_APP_ENVIRONMENT'] === 'development' && process.env['REACT_APP_LOCAL_DEV'] !== 'true') && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#1890ff',
                color: 'white',
                fontSize: '12px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                测试版本
              </span>
            )}
            {(process.env['REACT_APP_ENV'] === 'staging' || process.env['REACT_APP_ENVIRONMENT'] === 'staging') && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#fa8c16',
                color: 'white',
                fontSize: '12px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                预发布
              </span>
            )}
            {(process.env['REACT_APP_ENV'] === 'production' || process.env['REACT_APP_ENVIRONMENT'] === 'production') && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#f5222d',
                color: 'white',
                fontSize: '12px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                生产环境
              </span>
            )}
          </div>
        </div>
        <div className="user-info" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
            <Tooltip title={isFullscreen ? '退出全屏' : '进入全屏'}>
              <Button
                type="text"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
                style={{
                  fontSize: '16px',
                  width: 32,
                  height: 32,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            </Tooltip>
            {/* 企业模拟管理 */}
            <EnterpriseImpersonation />
            
            {/* 任务ID快速跳转：右对齐，位于头像前 */}
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Input.Search
                aria-label="任务ID快速跳转"
                placeholder="输入任务ID，按回车跳转"
                enterButton="跳转"
                allowClear
                size="middle"
                loading={quickJumpLoading}
                onSearch={handleTaskQuickJump}
                style={{ width: 240 }}
              />
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space>
                <Avatar icon={<UserOutlined />} />
                <span>
                  {(() => {
                    const displayText = currentUser?.username || '加载中...';
                    console.log('[DEBUG Layout] Rendering user display:', {
                      currentUser: currentUser,
                      username: currentUser?.username,
                      role: currentUser?.role,
                      displayText: displayText
                    });
                    return displayText;
                  })()}
                </span>
              </Space>
            </Dropdown>
          </div>
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
          {children ?? <Outlet />}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;