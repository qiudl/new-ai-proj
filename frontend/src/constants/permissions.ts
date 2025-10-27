/**
 * 权限常量定义
 *
 * 统一管理所有权限代码，避免硬编码
 *
 * ⚠️ 重要说明:
 * - 所有权限代码必须与数据库permissions表中的permission_code字段完全一致
 * - 数据库使用点号格式: module.resource.action (例如: project.list.read)
 * - 部分权限使用冒号格式: module:action (例如: project:read)
 * - 不要在权限代码中使用下划线格式,除非数据库明确使用
 * - 修改前请先查询数据库: SELECT permission_code FROM permissions WHERE is_active = true
 */

// 系统管理权限
export const SYSTEM_PERMISSIONS = {
  ADMIN: 'system.admin',
  AUDIT: 'system.audit',
  CONFIG: 'system.config',
  SETTINGS_READ: 'system.settings.read',
  SETTINGS_MANAGE: 'system.settings.manage',
  AUDIT_LOGS_READ: 'system.audit_logs.read'
} as const;

// 企业/公司管理权限
export const COMPANY_PERMISSIONS = {
  INFO_READ: 'company.info.read',
  INFO_UPDATE: 'company.info.update',
  USERS_READ: 'company.users.read',
  USERS_CREATE: 'company.users.create',
  USERS_UPDATE: 'company.users.update',
  USERS_DELETE: 'company.users.delete',
  ROLES_MANAGE: 'company.roles.manage'
} as const;

// 企业权限(别名,向后兼容)
export const ENTERPRISE_PERMISSIONS = COMPANY_PERMISSIONS;

// 用户管理权限
export const USER_PERMISSIONS = {
  READ: 'user.read',
  CREATE: 'user.create',
  UPDATE: 'user.update',
  DELETE: 'user.delete'
} as const;

// 权限管理权限(暂无数据库对应,保留用于未来扩展)
export const PERMISSION_PERMISSIONS = {
  ADMIN: 'permission.admin',
  READ: 'permission.read',
  UPDATE: 'permission.update',
  ROLE_ADMIN: 'role.admin',
  ROLE_READ: 'role.read',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete'
} as const;

// 项目管理权限
export const PROJECT_PERMISSIONS = {
  // 使用点号格式 (数据库主要格式)
  LIST_READ: 'project.list.read',        // 查看项目列表
  DETAIL_READ: 'project.detail.read',    // 查看项目详情
  CREATE: 'project.create',              // 创建项目
  UPDATE: 'project.update',              // 编辑项目
  DELETE: 'project.delete',              // 删除项目
  MEMBERS_MANAGE: 'project.members.manage', // 管理项目成员

  // 使用冒号格式 (数据库备用格式)
  READ: 'project:read',                  // 读取项目 (通用权限)
  LIST: 'project:list',                  // 列出项目

  // 向后兼容(已废弃,请使用上面的格式)
  /** @deprecated 使用 LIST_READ 代替 */
  OLD_READ: 'project_read',
  /** @deprecated 使用 CREATE 代替 */
  OLD_CREATE: 'project_create'
} as const;

// 任务管理权限
export const TASK_PERMISSIONS = {
  // 使用点号格式 (数据库主要格式)
  LIST_READ: 'task.list.read',           // 查看任务列表
  DETAIL_READ: 'task.detail.read',       // 查看任务详情
  CREATE: 'task.create',                 // 创建任务
  UPDATE: 'task.update',                 // 编辑任务
  DELETE: 'task.delete',                 // 删除任务
  ASSIGN: 'task.assign',                 // 分配任务

  // 使用冒号格式 (数据库备用格式)
  READ: 'task:read',                     // 读取任务 (通用权限)
  WRITE: 'task:write',                   // 修改任务
  STATUS: 'task:status',                 // 更新任务状态

  // 向后兼容(已废弃)
  /** @deprecated 使用 LIST_READ 或 DETAIL_READ 代替 */
  OLD_READ: 'task_read',
  /** @deprecated 使用 CREATE 代替 */
  OLD_CREATE: 'task_create'
} as const;

// 文档管理权限
export const DOCUMENT_PERMISSIONS = {
  READ: 'document:read',                 // 读取文档
  CREATE: 'document:create',             // 创建文档
  WRITE: 'document:write',               // 修改文档
  ATTACH: 'document:attach',             // 关联文档

  // 向后兼容
  /** @deprecated 使用 READ 代替 */
  OLD_READ: 'document_read',
  /** @deprecated 使用 CREATE 代替 */
  OLD_CREATE: 'document_create'
} as const;

// 时间追踪/计时器权限
export const TIME_PERMISSIONS = {
  MANAGE: 'timer:manage',                // 管理计时器
  READ: 'timer:manage',                  // 读取计时器 (使用manage权限)

  // 向后兼容
  /** @deprecated 使用 MANAGE 代替 */
  OLD_READ: 'timer_read',
  /** @deprecated 使用 MANAGE 代替 */
  OLD_CREATE: 'timer_create'
} as const;

// 今日任务/Daily Focus权限
export const DAILY_FOCUS_PERMISSIONS = {
  MANAGE: 'daily_focus:manage'           // 管理今日任务
} as const;

// 仪表板权限(暂无数据库对应,保留用于未来扩展)
export const DASHBOARD_PERMISSIONS = {
  READ: 'dashboard.read',
  ADMIN: 'dashboard.admin'
} as const;

// API密钥管理权限
export const API_KEY_PERMISSIONS = {
  ADMIN: 'api.admin',
  READ: 'api.keys.read',
  CREATE: 'api.keys.create',
  UPDATE: 'api.keys.update',
  DELETE: 'api.keys.delete',
  LOGS_READ: 'api.logs.read',
  QUOTA_READ: 'api.quota.read'
} as const;

// 审计日志权限
export const AUDIT_PERMISSIONS = {
  READ: 'system.audit',
  LOGS_READ: 'system.audit_logs.read'
} as const;

// 导航管理权限(暂无数据库对应,保留用于未来扩展)
export const NAVIGATION_PERMISSIONS = {
  ADMIN: 'navigation.admin',
  READ: 'navigation.read',
  UPDATE: 'navigation.update'
} as const;

// 企业组织管理权限
export const ORGANIZATION_PERMISSIONS = {
  // 使用company权限(数据库实际存储)
  INFO_READ: 'company.info.read',
  INFO_UPDATE: 'company.info.update',
  USERS_READ: 'company.users.read',
  USERS_CREATE: 'company.users.create',
  USERS_UPDATE: 'company.users.update',
  USERS_DELETE: 'company.users.delete',
  ROLES_MANAGE: 'company.roles.manage'
} as const;

// 工作笔记权限
export const WORK_NOTE_PERMISSIONS = {
  TEAM_NOTE_CREATE: 'team_work_note_create',
  TEAM_NOTE_UPDATE: 'team_work_note_update',
  TEAM_NOTE_DELETE: 'team_work_note_delete',
  TEAM_FOLDER_CREATE: 'team_work_note_folder_create',
  TEAM_FOLDER_UPDATE: 'team_work_note_folder_update',
  TEAM_FOLDER_DELETE: 'team_work_note_folder_delete'
} as const;

// 财务权限
export const FINANCE_PERMISSIONS = {
  CONTRACTS_READ: 'finance.contracts.read',
  CONTRACTS_MANAGE: 'finance.contracts.manage',
  REPORTS_READ: 'finance.reports.read'
} as const;

// 角色常量
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ENTERPRISE_ADMIN: 'enterprise_admin',
  ENTERPRISE_USER: 'enterprise_user',
  PROJECT_MANAGER: 'project_manager',
  TEAM_LEAD: 'team_lead',
  DEVELOPER: 'developer',
  VIEWER: 'viewer'
} as const;

// 页面路由权限映射
// 使用数组支持多个权限(OR关系),用户拥有任一权限即可访问
export const ROUTE_PERMISSIONS = {
  // 管理类页面
  '/enterprises': [COMPANY_PERMISSIONS.USERS_READ],
  '/enterprises/create': [COMPANY_PERMISSIONS.USERS_CREATE],
  '/user-management': [USER_PERMISSIONS.READ],
  '/permissions': [SYSTEM_PERMISSIONS.ADMIN],
  '/enhanced-permissions': [SYSTEM_PERMISSIONS.ADMIN],
  '/ai-config': [SYSTEM_PERMISSIONS.ADMIN],
  '/api-keys': [API_KEY_PERMISSIONS.READ],
  '/navigation-management': [SYSTEM_PERMISSIONS.ADMIN],
  '/audit-logs': [AUDIT_PERMISSIONS.LOGS_READ],

  // 项目类页面
  '/projects': [PROJECT_PERMISSIONS.LIST_READ, PROJECT_PERMISSIONS.READ],
  '/tasks': [TASK_PERMISSIONS.LIST_READ, TASK_PERMISSIONS.READ],

  // 仪表板页面
  '/dashboard': [DAILY_FOCUS_PERMISSIONS.MANAGE],

  // 企业组织管理页面
  '/organization-structure': [ORGANIZATION_PERMISSIONS.INFO_READ],
  '/position-management': [ORGANIZATION_PERMISSIONS.INFO_READ],
  '/enterprise-roles': [ORGANIZATION_PERMISSIONS.ROLES_MANAGE],
  '/enterprise-users': [ORGANIZATION_PERMISSIONS.USERS_READ]
} as const;

// 权限组合常量
export const PERMISSION_GROUPS = {
  ADMIN_PAGES: [
    SYSTEM_PERMISSIONS.ADMIN,
    COMPANY_PERMISSIONS.ROLES_MANAGE,
    USER_PERMISSIONS.CREATE
  ],
  PROJECT_MANAGEMENT: [
    PROJECT_PERMISSIONS.LIST_READ,
    PROJECT_PERMISSIONS.DETAIL_READ,
    PROJECT_PERMISSIONS.CREATE,
    PROJECT_PERMISSIONS.UPDATE,
    TASK_PERMISSIONS.LIST_READ,
    TASK_PERMISSIONS.DETAIL_READ,
    TASK_PERMISSIONS.CREATE,
    TASK_PERMISSIONS.UPDATE
  ],
  BASIC_USER: [
    DAILY_FOCUS_PERMISSIONS.MANAGE,
    TASK_PERMISSIONS.LIST_READ,
    TASK_PERMISSIONS.DETAIL_READ,
    PROJECT_PERMISSIONS.LIST_READ,
    PROJECT_PERMISSIONS.DETAIL_READ
  ]
} as const;

// 类型定义
export type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS];
export type CompanyPermission = typeof COMPANY_PERMISSIONS[keyof typeof COMPANY_PERMISSIONS];
export type EnterprisePermission = CompanyPermission; // 别名
export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];
export type PermissionPermission = typeof PERMISSION_PERMISSIONS[keyof typeof PERMISSION_PERMISSIONS];
export type ProjectPermission = typeof PROJECT_PERMISSIONS[keyof typeof PROJECT_PERMISSIONS];
export type TaskPermission = typeof TASK_PERMISSIONS[keyof typeof TASK_PERMISSIONS];
export type DocumentPermission = typeof DOCUMENT_PERMISSIONS[keyof typeof DOCUMENT_PERMISSIONS];
export type TimePermission = typeof TIME_PERMISSIONS[keyof typeof TIME_PERMISSIONS];
export type DailyFocusPermission = typeof DAILY_FOCUS_PERMISSIONS[keyof typeof DAILY_FOCUS_PERMISSIONS];
export type DashboardPermission = typeof DASHBOARD_PERMISSIONS[keyof typeof DASHBOARD_PERMISSIONS];
export type APIKeyPermission = typeof API_KEY_PERMISSIONS[keyof typeof API_KEY_PERMISSIONS];
export type AuditPermission = typeof AUDIT_PERMISSIONS[keyof typeof AUDIT_PERMISSIONS];
export type NavigationPermission = typeof NAVIGATION_PERMISSIONS[keyof typeof NAVIGATION_PERMISSIONS];
export type OrganizationPermission = typeof ORGANIZATION_PERMISSIONS[keyof typeof ORGANIZATION_PERMISSIONS];
export type WorkNotePermission = typeof WORK_NOTE_PERMISSIONS[keyof typeof WORK_NOTE_PERMISSIONS];
export type FinancePermission = typeof FINANCE_PERMISSIONS[keyof typeof FINANCE_PERMISSIONS];
export type Role = typeof ROLES[keyof typeof ROLES];

export type AnyPermission =
  | SystemPermission
  | CompanyPermission
  | UserPermission
  | PermissionPermission
  | ProjectPermission
  | TaskPermission
  | DocumentPermission
  | TimePermission
  | DailyFocusPermission
  | DashboardPermission
  | APIKeyPermission
  | AuditPermission
  | NavigationPermission
  | OrganizationPermission
  | WorkNotePermission
  | FinancePermission;
