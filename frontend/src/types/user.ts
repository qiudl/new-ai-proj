export type UserRole = 'admin' | 'project_manager' | 'developer' | 'client';
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
  role: UserRole;
  status: UserStatus;
  profile: UserProfile;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  profile?: UserProfile;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
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

// 角色权限配置
export const USER_ROLE_CONFIG = {
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
  },
  client: {
    label: '甲方客户',
    color: '#722ed1',
    permissions: ['project_view_readonly', 'task_view_readonly']
  }
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