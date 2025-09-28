/**
 * 权限常量定义
 * 
 * 统一管理所有权限代码，避免硬编码
 * 命名规范: {resource}_{action}
 */

// 系统管理权限
export const SYSTEM_PERMISSIONS = {
  ADMIN: 'system_admin',
  CONFIG: 'system_config',
  MAINTENANCE: 'system_maintenance'
} as const;

// REMOVED: 公司管理权限 (已迁移到ORGANIZATION_PERMISSIONS)
// 企业管理权限 (替代原company权限)

// DEPRECATED: 向后兼容的公司权限常量 (使用ORGANIZATION_PERMISSIONS代替)
export const COMPANY_PERMISSIONS = {
  ADMIN: 'organization_admin',
  READ: 'organization_read',
  CREATE: 'organization_create',
  UPDATE: 'organization_update',
  DELETE: 'organization_delete',
  USER_MANAGEMENT: 'organization_user_management',
  DEPARTMENT_MANAGEMENT: 'organization_department_management'
} as const;
export const ENTERPRISE_PERMISSIONS = {
  ADMIN: 'enterprise_admin',
  READ: 'enterprise_read', 
  CREATE: 'enterprise_create',
  UPDATE: 'enterprise_update',
  DELETE: 'enterprise_delete',
  USER_ADMIN: 'enterprise_user_admin'
} as const;

// 用户管理权限
export const USER_PERMISSIONS = {
  ADMIN: 'user_admin',
  READ: 'user_read',
  CREATE: 'user_create',
  UPDATE: 'user_update',
  DELETE: 'user_delete',
  PROFILE_READ: 'profile_read',
  PROFILE_UPDATE: 'profile_update'
} as const;
// 权限管理权限
export const PERMISSION_PERMISSIONS = {
  ADMIN: 'permission_admin',
  READ: 'permission_read',
  UPDATE: 'permission_update',
  ROLE_ADMIN: 'role_admin',
  ROLE_READ: 'role_read',
  ROLE_CREATE: 'role_create',
  ROLE_UPDATE: 'role_update',
  ROLE_DELETE: 'role_delete'
} as const;

// 项目管理权限
export const PROJECT_PERMISSIONS = {
  ADMIN: 'project_admin',
  READ: 'project_read',
  CREATE: 'project_create',
  UPDATE: 'project_update',
  DELETE: 'project_delete',
  TASK_READ: 'project_task_read',
  TASK_CREATE: 'project_task_create',
  TASK_UPDATE: 'project_task_update',
  TASK_DELETE: 'project_task_delete'
} as const;

// 任务管理权限
export const TASK_PERMISSIONS = {
  ADMIN: 'task_admin',
  READ: 'task_read',
  CREATE: 'task_create',
  UPDATE: 'task_update',
  DELETE: 'task_delete',
  ASSIGN: 'task_assign',
  STATUS_UPDATE: 'task_status_update'
} as const;

// 文档管理权限
export const DOCUMENT_PERMISSIONS = {
  ADMIN: 'document_admin',
  READ: 'document_read',
  CREATE: 'document_create',
  UPDATE: 'document_update',
  DELETE: 'document_delete',
  SHARE: 'document_share'
} as const;

// 时间追踪权限
export const TIME_PERMISSIONS = {
  READ: 'timer_read',
  CREATE: 'timer_create',
  UPDATE: 'timer_update',
  DELETE: 'timer_delete',
  REPORT_READ: 'time_report_read',
  ANALYTICS_READ: 'time_analytics_read'
} as const;
// 仪表板权限
export const DASHBOARD_PERMISSIONS = {
  READ: 'dashboard_read',
  ADMIN: 'dashboard_admin',
  INSIGHTS_READ: 'insights_read',
  INSIGHTS_ADMIN: 'insights_admin'
} as const;

// API密钥管理权限
export const API_KEY_PERMISSIONS = {
  ADMIN: 'api_key_admin',
  READ: 'api_key_read',
  CREATE: 'api_key_create',
  UPDATE: 'api_key_update',
  DELETE: 'api_key_delete'
} as const;

// 审计日志权限
export const AUDIT_PERMISSIONS = {
  READ: 'audit_read',
  ADMIN: 'audit_admin'
} as const;

// 导航管理权限
export const NAVIGATION_PERMISSIONS = {
  ADMIN: 'navigation_admin',
  READ: 'navigation_read',
  UPDATE: 'navigation_update'
} as const;

// 企业组织管理权限
export const ORGANIZATION_PERMISSIONS = {
  ADMIN: 'organization_admin',
  STRUCTURE_READ: 'organization_structure_read',
  STRUCTURE_MANAGE: 'organization_structure_manage',
  POSITION_READ: 'position_read',
  POSITION_MANAGE: 'position_manage',
  ROLE_READ: 'enterprise_role_read',
  ROLE_MANAGE: 'enterprise_role_manage',
  USER_READ: 'enterprise_user_read',
  USER_MANAGE: 'enterprise_user_manage',
  USER_INVITE: 'enterprise_user_invite'
} as const;

// 角色常量
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ENTERPRISE_ADMIN: 'enterprise_admin', // 替代原company_admin
  PROJECT_MANAGER: 'project_manager',
  TEAM_LEAD: 'team_lead',
  DEVELOPER: 'developer',
  VIEWER: 'viewer'
} as const;

// 页面路由权限映射
export const ROUTE_PERMISSIONS = {
  // 管理类页面 (已移除/companies相关路由，保留enterprises)
  '/enterprises': [ENTERPRISE_PERMISSIONS.READ],
  '/enterprises/create': [ENTERPRISE_PERMISSIONS.CREATE],
  '/user-management': [USER_PERMISSIONS.ADMIN],
  '/permissions': [PERMISSION_PERMISSIONS.ADMIN],
  '/enhanced-permissions': [PERMISSION_PERMISSIONS.ADMIN],
  '/ai-config': [SYSTEM_PERMISSIONS.ADMIN],
  '/api-keys': [API_KEY_PERMISSIONS.READ],
  '/navigation-management': [NAVIGATION_PERMISSIONS.ADMIN],
  '/audit-logs': [AUDIT_PERMISSIONS.READ],
  
  // 项目类页面
  '/projects': [PROJECT_PERMISSIONS.READ],
  '/tasks': [TASK_PERMISSIONS.READ],
  
  // 仪表板页面
  '/dashboard': [DASHBOARD_PERMISSIONS.READ],
  '/insights': [DASHBOARD_PERMISSIONS.INSIGHTS_READ],
  '/time-weekly-report': [TIME_PERMISSIONS.REPORT_READ],
  
  // 个人功能
  '/user-profile': [USER_PERMISSIONS.PROFILE_READ],
  '/personal-timer': [TIME_PERMISSIONS.READ],
  '/timer-analytics': [TIME_PERMISSIONS.ANALYTICS_READ],
  
  // 企业组织管理页面
  '/organization-structure': [ORGANIZATION_PERMISSIONS.STRUCTURE_READ],
  '/position-management': [ORGANIZATION_PERMISSIONS.POSITION_READ],
  '/enterprise-roles': [ORGANIZATION_PERMISSIONS.ROLE_READ],
  '/enterprise-users': [ORGANIZATION_PERMISSIONS.USER_READ]
} as const;

// 权限组合常量
export const PERMISSION_GROUPS = {
  ADMIN_PAGES: [
    SYSTEM_PERMISSIONS.ADMIN,
    ENTERPRISE_PERMISSIONS.ADMIN,
    USER_PERMISSIONS.ADMIN,
    PERMISSION_PERMISSIONS.ADMIN
  ],
  PROJECT_MANAGEMENT: [
    PROJECT_PERMISSIONS.READ,
    PROJECT_PERMISSIONS.CREATE,
    PROJECT_PERMISSIONS.UPDATE,
    TASK_PERMISSIONS.READ,
    TASK_PERMISSIONS.CREATE,
    TASK_PERMISSIONS.UPDATE
  ],
  BASIC_USER: [
    DASHBOARD_PERMISSIONS.READ,
    USER_PERMISSIONS.PROFILE_READ,
    TIME_PERMISSIONS.READ,
    TASK_PERMISSIONS.READ
  ]
} as const;

// 类型定义
export type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS];
export type EnterprisePermission = typeof ENTERPRISE_PERMISSIONS[keyof typeof ENTERPRISE_PERMISSIONS];
export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];
export type PermissionPermission = typeof PERMISSION_PERMISSIONS[keyof typeof PERMISSION_PERMISSIONS];
export type ProjectPermission = typeof PROJECT_PERMISSIONS[keyof typeof PROJECT_PERMISSIONS];
export type TaskPermission = typeof TASK_PERMISSIONS[keyof typeof TASK_PERMISSIONS];
export type DocumentPermission = typeof DOCUMENT_PERMISSIONS[keyof typeof DOCUMENT_PERMISSIONS];
export type TimePermission = typeof TIME_PERMISSIONS[keyof typeof TIME_PERMISSIONS];
export type DashboardPermission = typeof DASHBOARD_PERMISSIONS[keyof typeof DASHBOARD_PERMISSIONS];
export type APIKeyPermission = typeof API_KEY_PERMISSIONS[keyof typeof API_KEY_PERMISSIONS];
export type AuditPermission = typeof AUDIT_PERMISSIONS[keyof typeof AUDIT_PERMISSIONS];
export type NavigationPermission = typeof NAVIGATION_PERMISSIONS[keyof typeof NAVIGATION_PERMISSIONS];
export type OrganizationPermission = typeof ORGANIZATION_PERMISSIONS[keyof typeof ORGANIZATION_PERMISSIONS];
export type Role = typeof ROLES[keyof typeof ROLES];

export type AnyPermission = 
  | SystemPermission
  | EnterprisePermission
  | UserPermission
  | PermissionPermission
  | ProjectPermission
  | TaskPermission
  | DocumentPermission
  | TimePermission
  | DashboardPermission
  | APIKeyPermission
  | AuditPermission
  | NavigationPermission
  | OrganizationPermission;