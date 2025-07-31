export type UserType = 'system' | 'company';
export type SystemUserRole = 'admin' | 'project_manager' | 'developer';
export type CompanyUserRole = 'company_admin' | 'company_user';
export type UserRole = SystemUserRole | CompanyUserRole;
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  name?: string;
  phone?: string;
  department?: string;
  avatar?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  user_type: UserType;
  company_id?: number;
  company_user_id?: number;
  role: UserRole;
  status: UserStatus;
  profile: UserProfile;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  // Enterprise user fields
  contact_person_name?: string;
  contact_phone?: string;
  department_title?: string;
  is_primary_contact?: boolean;
  account_expires_at?: string;
  last_project_access?: string;
  notes?: string;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  user_type: UserType;
  company_id?: number;
  role: UserRole;
  profile?: UserProfile;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  user_type?: UserType;
  company_id?: number;
  role?: UserRole;
  status?: UserStatus;
  profile?: UserProfile;
}

export interface UserProfileUpdateRequest {
  username: string;
  email: string;
  profile?: UserProfile;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordResetRequest {
  new_password: string;
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  user_type?: UserType;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  page_size: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// 用户类型配置
export const USER_TYPE_CONFIG = {
  system: {
    label: '系统用户',
    color: '#1890ff',
    description: '拥有系统级权限，可跨企业操作'
  },
  company: {
    label: '企业用户',
    color: '#722ed1',
    description: '仅能访问所属企业相关的项目和数据'
  }
} as const;

// 系统用户角色配置
export const SYSTEM_USER_ROLE_CONFIG = {
  admin: {
    label: '系统管理员',
    color: '#f50',
    permissions: ['all']
  },
  project_manager: {
    label: '项目经理',
    color: '#1890ff',
    permissions: ['project_manage', 'task_manage', 'user_view']
  },
  developer: {
    label: '研发工程师',
    color: '#52c41a',
    permissions: ['task_execute', 'project_view']
  }
} as const;

// 企业用户角色配置
export const COMPANY_USER_ROLE_CONFIG = {
  company_admin: {
    label: '企业管理员',
    color: '#fa541c',
    permissions: ['company_manage', 'project_view', 'task_view', 'user_manage_company']
  },
  company_user: {
    label: '企业普通用户',
    color: '#faad14',
    permissions: ['project_view_limited', 'task_view_assigned']
  }
} as const;

// 角色权限配置（兼容性）
export const USER_ROLE_CONFIG = {
  ...SYSTEM_USER_ROLE_CONFIG,
  ...COMPANY_USER_ROLE_CONFIG
} as const;

export const USER_STATUS_CONFIG = {
  active: {
    label: '正常',
    color: '#52c41a'
  },
  inactive: {
    label: '未激活',
    color: '#faad14'
  },
  suspended: {
    label: '已停用',
    color: '#f50'
  }
} as const;

// 工具函数
export const getRoleConfigByType = (userType: UserType) => {
  return userType === 'system' ? SYSTEM_USER_ROLE_CONFIG : COMPANY_USER_ROLE_CONFIG;
};

export const getValidRolesForUserType = (userType: UserType): UserRole[] => {
  if (userType === 'system') {
    return Object.keys(SYSTEM_USER_ROLE_CONFIG) as SystemUserRole[];
  } else {
    return Object.keys(COMPANY_USER_ROLE_CONFIG) as CompanyUserRole[];
  }
};

export const validateUserRole = (userType: UserType, role: UserRole): boolean => {
  const validRoles = getValidRolesForUserType(userType);
  return validRoles.includes(role);
};

// Enterprise User Management Types
export interface CompanyUserCreateRequest {
  company_id: number;
  username: string;
  email: string;
  contact_person_name: string;
  contact_phone: string;
  department_title: string;
  is_primary_contact: boolean;
  account_expires_at?: string;
  notes?: string;
}

export interface CompanyUserUpdateRequest {
  contact_person_name?: string;
  contact_phone?: string;
  department_title?: string;
  is_primary_contact?: boolean;
  account_expires_at?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface CompanyUserStatusUpdateRequest {
  status: 'active' | 'inactive';
}

export interface CompanyUserListParams {
  page?: number;
  page_size?: number;
  company_id?: number;
  status?: 'active' | 'inactive';
  search?: string;
}

export interface EnterpriseUserResponse {
  id: number;
  username: string;
  email: string;
  contact_person_name: string;
  contact_phone: string;
  department_title: string;
  is_primary_contact: boolean;
  status: string;
  company_id: number;
  company_name: string;
  last_login_at?: string;
  account_expires_at?: string;
  last_project_access?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyUserListResponse {
  data: EnterpriseUserResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface CompanyUserStats {
  total: number;
  by_status: Record<string, number>;
  by_company: Record<string, number>;
  primary_contacts: number;
  expiring_accounts: number;
  recent_registrations: number;
}

export interface BatchCompanyUserRequest {
  user_ids: number[];
  action: 'activate' | 'deactivate' | 'extend_expiry';
}

export interface CompanyUserCreateResponse {
  user: User;
  password: string;
}