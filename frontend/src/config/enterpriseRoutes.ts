/**
 * 企业路由映射配置
 *
 * 定义语义化路由标识到实际路由路径的映射关系
 * - enterprise: 企业用户模式下的路由后缀 (会自动添加 /enterprises/{id} 前缀)
 * - system: 系统用户模式下的路由路径
 */

export interface EnterpriseRouteConfig {
  /** 企业用户路由后缀 (会添加 /enterprises/{id} 前缀) */
  enterprise: string;
  /** 系统用户路由 */
  system: string;
  /** 菜单标签 */
  label: string;
  /** 图标名称 */
  icon?: string;
}

/**
 * 企业路由映射表
 */
export const ENTERPRISE_ROUTE_MAP: Record<string, EnterpriseRouteConfig> = {
  // ========== 组织管理 ==========
  'org-structure': {
    enterprise: '/organization-structure',
    system: '/organization-structure',
    label: '组织架构',
    icon: 'ApartmentOutlined',
  },
  'org-roles': {
    enterprise: '/roles',
    system: '/enterprise-roles',
    label: '角色管理',
    icon: 'SafetyCertificateOutlined',
  },
  'org-users': {
    enterprise: '/users',
    system: '/user-management',
    label: '用户管理',
    icon: 'UserOutlined',
  },

  // ========== 企业详情页 ==========
  'enterprise-detail': {
    enterprise: '',  // /enterprises/{id}
    system: '/enterprises',
    label: '企业详情',
    icon: 'BankOutlined',
  },
  'enterprise-user-detail': {
    enterprise: '/users/:userId',
    system: '/user-management/:userId',
    label: '用户详情',
    icon: 'UserOutlined',
  },

  // ========== 项目管理 ==========
  'projects': {
    enterprise: '/projects',
    system: '/projects',
    label: '项目管理',
    icon: 'ProjectOutlined',
  },

  // ========== 需求管理 ==========
  'requirements': {
    enterprise: '/requirements',
    system: '/requirements',
    label: '需求管理',
    icon: 'FileTextOutlined',
  },
} as const;

/**
 * 路由标识类型
 */
export type EnterpriseRouteKey = keyof typeof ENTERPRISE_ROUTE_MAP;

/**
 * 获取所有路由标识
 */
export const getRouteKeys = (): EnterpriseRouteKey[] => {
  return Object.keys(ENTERPRISE_ROUTE_MAP) as EnterpriseRouteKey[];
};

/**
 * 检查路由标识是否有效
 */
export const isValidRouteKey = (key: string): key is EnterpriseRouteKey => {
  return key in ENTERPRISE_ROUTE_MAP;
};

/**
 * 组织管理相关的路由标识
 */
export const ORGANIZATION_ROUTE_KEYS: EnterpriseRouteKey[] = [
  'org-structure',
  'org-roles',
  'org-users',
];

/**
 * 需要企业上下文的路由前缀列表
 * 用于判断当前页面是否在企业上下文中
 */
export const ENTERPRISE_CONTEXT_PREFIXES = [
  '/enterprises/',
  '/organization-structure',
  '/enterprise-roles',
  '/enterprise-users',
];

/**
 * 判断路径是否需要企业上下文
 */
export const needsEnterpriseContext = (path: string): boolean => {
  return ENTERPRISE_CONTEXT_PREFIXES.some(prefix => path.startsWith(prefix));
};
