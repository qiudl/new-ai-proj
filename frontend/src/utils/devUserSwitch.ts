import { User } from '../types/user';

/**
 * 开发环境用户切换工具
 * 仅在开发环境下使用，用于测试不同用户类型的界面显示
 */

// 模拟用户数据
export const DEV_USERS: Record<string, User> = {
  system_admin: {
    id: 1,
    username: 'admin',
    email: 'admin@system.com',
    user_type: 'system',
    role: 'admin',
    status: 'active',
    profile: {
      name: '系统管理员',
      department: 'IT部门'
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  company_admin: {
    id: 2,
    username: 'company_admin',
    email: 'admin@company.com',
    user_type: 'company',
    enterprise_id: 2, // 测试科技有限公司
    role: 'company_admin',
    status: 'active',
    profile: {
      name: '企业管理员',
      department: '管理部'
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  company_user: {
    id: 3,
    username: 'company_user',
    email: 'user@company.com',
    user_type: 'company',
    enterprise_id: 2, // 测试科技有限公司
    role: 'company_user',
    status: 'active',
    profile: {
      name: '企业用户',
      department: '技术部'
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  project_manager: {
    id: 4,
    username: 'project_manager',
    email: 'pm@system.com',
    user_type: 'system',
    role: 'project_manager',
    status: 'active',
    profile: {
      name: '项目经理',
      department: '项目部'
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

/**
 * 检查是否为开发环境
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         process.env.REACT_APP_ENV === 'development' ||
         window.location.hostname === 'localhost';
};

/**
 * 切换到指定用户（仅开发环境）
 * @param userKey 用户键
 */
export const switchToUser = (userKey: keyof typeof DEV_USERS): void => {
  if (!isDevelopment()) {
    console.warn('⚠️ 用户切换功能仅在开发环境下可用');
    return;
  }
  
  const user = DEV_USERS[userKey];
  if (!user) {
    console.error('❌ 未找到用户:', userKey);
    return;
  }
  
  try {
    localStorage.setItem('currentUser', JSON.stringify(user));
    console.log('✅ 切换用户成功:', user.username, user.user_type, user.role);
    
    // 刷新页面以应用新用户状态
    window.location.reload();
  } catch (error) {
    console.error('❌ 切换用户失败:', error);
  }
};

/**
 * 获取当前用户类型显示名称
 * @param userKey 用户键
 */
export const getUserDisplayInfo = (userKey: keyof typeof DEV_USERS): string => {
  const user = DEV_USERS[userKey];
  if (!user) return '';
  
  const typeText = user.user_type === 'system' ? '系统用户' : '企业用户';
  const roleText = {
    'admin': '系统管理员',
    'project_manager': '项目经理', 
    'developer': '研发工程师',
    'company_admin': '企业管理员',
    'company_user': '企业用户'
  }[user.role] || user.role;
  
  return `${user.profile?.name} (${typeText} - ${roleText})`;
};