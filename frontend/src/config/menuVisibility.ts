// 菜单可见性配置
// 定义菜单对不同用户类型的可见性规则

export enum UserType {
  SYSTEM_USER = 'system',    // 系统用户 (admin, project_manager, developer) - 匹配JWT中的user_type
  COMPANY_USER = 'company',  // 企业用户 (company_admin, company_user) - 匹配JWT中的user_type
  BOTH = 'both'              // 两种用户都可见
}

export interface MenuVisibilityConfig {
  [menuKey: string]: {
    userType: UserType;
    requiredRole?: string[];  // 特定角色要求
    description?: string;     // 配置说明
  };
}

// 菜单可见性配置表
export const MENU_VISIBILITY_CONFIG: MenuVisibilityConfig = {
  // 工作台 - 两种用户都需要
  '/': { 
    userType: UserType.BOTH,
    description: '工作概览 - 所有用户' 
  },
  '/workspace-management': { 
    userType: UserType.BOTH,
    description: '工作台菜单组 - 所有用户' 
  },
  '/time-weekly-report': { 
    userType: UserType.BOTH,
    description: '时间周报 - 所有用户' 
  },
  '/task-dashboard': { 
    userType: UserType.BOTH,
    description: '任务周报 - 所有用户' 
  },

  // 计时系统 - 两种用户都需要
  '/timer-management': { 
    userType: UserType.BOTH,
    description: '计时系统菜单组 - 所有用户' 
  },
  '/personal-timer': { 
    userType: UserType.BOTH,
    description: '个人计时 - 所有用户' 
  },
  '/timer-analytics': { 
    userType: UserType.BOTH,
    description: '计时数据分析 - 所有用户' 
  },

  // 项目客户管理 - 需要区分
  '/project-customer-management': { 
    userType: UserType.BOTH,
    description: '项目客户菜单组 - 所有用户' 
  },
  '/projects': { 
    userType: UserType.BOTH,
    description: '项目列表 - 所有用户，但数据隔离' 
  },
  '/tasks': { 
    userType: UserType.BOTH,
    description: '任务列表 - 所有用户，但数据隔离' 
  },
  '/enterprises': { 
    userType: UserType.SYSTEM_USER,
    description: '企业管理 - 仅系统用户' 
  },

  // 批量导入 - 根据权限控制
  '/bulk-import': { 
    userType: UserType.BOTH,
    description: '批量导入 - 根据具体权限控制' 
  },

  // 文档管理 - 两种用户都需要
  '/document-management': { 
    userType: UserType.BOTH,
    description: '文档管理菜单组 - 所有用户' 
  },
  '/work-note': { 
    userType: UserType.BOTH,
    description: '工作笔记 - 所有用户' 
  },
  '/task-documents': { 
    userType: UserType.BOTH,
    description: '任务文档 - 所有用户' 
  },

  // 系统管理 - 主要面向系统用户，企业管理员有部分权限
  '/system-management': { 
    userType: UserType.SYSTEM_USER,
    description: '系统管理菜单组 - 仅系统用户可见' 
  },
  '/user-management': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin', 'company_admin'],
    description: '用户管理 - 系统管理员和企业管理员' 
  },
  '/permissions': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin'],
    description: '权限管理 - 仅系统管理员' 
  },
  '/admin/permissions': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin'],
    description: '权限管理（新）- 仅系统管理员' 
  },
  '/role-management': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin'],
    description: '角色管理 - 仅系统管理员' 
  },
  '/admin/roles': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin'],
    description: '角色管理（新）- 仅系统管理员' 
  },
  '/admin/role-templates': {
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin'],
    description: '角色模板（新）- 仅系统管理员'
  },
  '/ai-config': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin'],
    description: 'AI配置 - 仅系统管理员' 
  },
  '/recycle-bin': { 
    userType: UserType.BOTH,
    description: '回收站 - 所有用户，但数据隔离' 
  },
  '/audit-logs': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin', 'company_admin'],
    description: '审计日志 - 系统管理员和企业管理员' 
  },
  '/navigation-management': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin'],
    description: '导航管理 - 仅系统管理员' 
  },
  '/api-keys': { 
    userType: UserType.SYSTEM_USER,
    requiredRole: ['admin', 'company_admin'],
    description: 'API Key管理 - 系统管理员和企业管理员' 
  },

  // 企业组织管理 - 专为企业用户设计的组织管理功能
  '/organization-management': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '企业组织管理菜单组 - 仅企业管理员可见' 
  },
  '/organization-structure': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '组织架构管理 - 仅企业管理员' 
  },
  '/position-management': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '岗位管理 - 仅企业管理员' 
  },
  '/enterprise-roles': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '企业角色管理 - 仅企业管理员' 
  },
  '/enterprise-users': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '企业用户管理 - 仅企业管理员' 
  }
};

// 企业用户专有菜单配置（已迁移到新企业架构）
export const COMPANY_SPECIFIC_MENUS: MenuVisibilityConfig = {
  '/enterprise-dashboard': { 
    userType: UserType.COMPANY_USER,
    description: '企业仪表板 - 仅企业用户' 
  },
  '/enterprise-settings': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '企业设置 - 仅企业管理员' 
  },
  '/enterprise-users': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '企业用户管理 - 仅企业管理员' 
  },
  // 🚨 保留旧路由用于向后兼容（已弃用）
  '/company-dashboard': { 
    userType: UserType.COMPANY_USER,
    description: '企业仪表板 - 仅企业用户（已弃用，请使用 /enterprise-dashboard）' 
  },
  '/company-settings': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '企业设置 - 仅企业管理员（已弃用，请使用 /enterprise-settings）' 
  },
  '/company-users': { 
    userType: UserType.COMPANY_USER,
    requiredRole: ['company_admin'],
    description: '企业用户管理 - 仅企业管理员（已弃用，请使用 /enterprise-users）' 
  }
};

/**
 * 根据用户信息检查菜单项是否可见
 */
export function isMenuVisible(
  menuKey: string, 
  userType: string, 
  userRole: string
): boolean {
  const config = MENU_VISIBILITY_CONFIG[menuKey] || COMPANY_SPECIFIC_MENUS[menuKey];
  
  if (!config) {
    // 如果没有配置，默认对所有用户可见
    return true;
  }

  // 检查用户类型
  if (config.userType === UserType.BOTH) {
    // 对所有用户可见，但可能有角色限制
    if (config.requiredRole && config.requiredRole.length > 0) {
      return config.requiredRole.includes(userRole);
    }
    return true;
  }

  // 使用传入的用户类型参数
  const currentUserType = getUserType(userType);
  
  // 检查用户类型是否匹配
  if (config.userType !== currentUserType) {
    return false;
  }

  // 检查角色要求
  if (config.requiredRole && config.requiredRole.length > 0) {
    return config.requiredRole.includes(userRole);
  }

  return true;
}

/**
 * 根据用户类型字符串转换为UserType枚举
 * @param userType JWT中的user_type字段值 ('system' | 'company')
 * @returns UserType枚举值
 */
export function getUserType(userType: string): UserType {
  switch (userType) {
    case 'system':
      return UserType.SYSTEM_USER;
    case 'company':
      return UserType.COMPANY_USER;
    default:
      // 默认归类为系统用户
      console.warn(`Unknown user_type: ${userType}, defaulting to system user`);
      return UserType.SYSTEM_USER;
  }
}

/**
 * @deprecated 使用 getUserType(userType) 替代，直接传入JWT中的user_type字段
 * 根据角色确定用户类型 (仅为向后兼容保留)
 */
export function getUserTypeFromRole(role: string): UserType {
  const systemRoles = ['admin', 'project_manager', 'developer'];
  const companyRoles = ['company_admin', 'company_user'];
  
  if (systemRoles.includes(role)) {
    return UserType.SYSTEM_USER;
  } else if (companyRoles.includes(role)) {
    return UserType.COMPANY_USER;
  }
  
  // 默认归类为系统用户
  return UserType.SYSTEM_USER;
}

/**
 * 过滤菜单项数组，移除不可见的菜单项
 */
export function filterMenuItems(
  menuItems: any[], 
  userType: string, 
  userRole: string
): any[] {
  return menuItems.filter(item => {
    // 检查当前菜单项是否可见
    if (!isMenuVisible(item.key, userType, userRole)) {
      return false;
    }

    // 如果有子菜单，递归过滤
    if (item.children && Array.isArray(item.children)) {
      item.children = filterMenuItems(item.children, userType, userRole);
      // 如果所有子菜单都被过滤掉，则隐藏父菜单
      return item.children.length > 0;
    }

    return true;
  });
}

/**
 * 获取用户可见的菜单配置摘要
 */
export function getUserMenuSummary(userType: string, userRole: string): {
  visibleMenus: string[];
  hiddenMenus: string[];
  totalMenus: number;
} {
  const allMenuKeys = [...Object.keys(MENU_VISIBILITY_CONFIG), ...Object.keys(COMPANY_SPECIFIC_MENUS)];
  
  const visibleMenus: string[] = [];
  const hiddenMenus: string[] = [];
  
  allMenuKeys.forEach(menuKey => {
    if (isMenuVisible(menuKey, userType, userRole)) {
      visibleMenus.push(menuKey);
    } else {
      hiddenMenus.push(menuKey);
    }
  });

  return {
    visibleMenus,
    hiddenMenus,
    totalMenus: allMenuKeys.length
  };
}