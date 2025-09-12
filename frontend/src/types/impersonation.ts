// 模拟系统相关类型定义

export interface ImpersonationContext {
  enterprise_id: number;
  enterprise_name: string;
  enterprise_code: string;
  original_user_id: number;
  original_username: string;
  original_role: string;
  started_at: string;
  expires_at: string;
  session_id: string;
  reason: string;
  ip_address: string;
}

export interface ImpersonationSession {
  id: number;
  session_id: string;
  user_id: number;
  username: string;
  enterprise_id: number;
  enterprise_name: string;
  enterprise_code: string;
  reason: string;
  started_at: string;
  ended_at?: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
  status: 'active' | 'expired' | 'ended';
  created_at: string;
  updated_at: string;
}

export interface ImpersonationHistoryItem {
  id: number;
  username: string;
  enterprise_name: string;
  enterprise_id: number;
  action: 'start' | 'end';
  started_at: string;
  ended_at?: string;
  duration?: string;
  reason: string;
  status: 'success' | 'failed' | 'active';
}

export interface ImpersonationStatus {
  is_impersonating: boolean;
  enterprise?: {
    id: number;
    name: string;
    code: string;
  };
  original_user?: {
    id: number;
    username: string;
    role: string;
  };
  session?: {
    id: string;
    started_at: string;
    expires_at: string;
    reason: string;
  };
}

export interface StartImpersonationRequest {
  reason: string;
}

export interface StartImpersonationResponse {
  success: boolean;
  message: string;
  token: string;
  enterprise: {
    id: number;
    name: string;
    code: string;
  };
  session: {
    id: string;
    started_at: string;
    expires_at: string;
    reason: string;
  };
}

export interface ExitImpersonationResponse {
  success: boolean;
  message: string;
  token: string;
  original_user: {
    id: number;
    username: string;
    role: string;
  };
}

export interface ImpersonationHistoryResponse {
  data: ImpersonationHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ImpersonationStateContextType {
  // 模拟状态
  isImpersonating: boolean;
  impersonationStatus: ImpersonationStatus | null;
  
  // 加载状态
  loading: boolean;
  error: string | null;
  
  // 操作方法
  startImpersonation: (enterpriseId: number, reason: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
  getImpersonationStatus: () => Promise<void>;
  getImpersonationHistory: (page?: number, pageSize?: number) => Promise<ImpersonationHistoryItem[]>;
  
  // 刷新方法
  refreshStatus: () => Promise<void>;
  
  // 警告和提示
  showWarning: boolean;
  warningMessage: string;
  dismissWarning: () => void;
}

// 模拟警告类型
export type ImpersonationWarningType = 'session_expiring' | 'session_expired' | 'limited_permissions';

export interface ImpersonationWarning {
  type: ImpersonationWarningType;
  message: string;
  expiresAt?: string;
  actions?: Array<{
    label: string;
    action: () => void;
    type?: 'primary' | 'danger';
  }>;
}

// 企业切换器相关
export interface EnterpriseSwitcherProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (enterpriseId: number) => void;
}

export interface EnterpriseOption {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  userCount?: number;
  isCurrentlyImpersonated?: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

// 模拟权限检查
export interface ImpersonationPermissions {
  canStartImpersonation: boolean;
  canExitImpersonation: boolean;
  canViewHistory: boolean;
  canAccessSensitiveOperations: boolean;
  restrictedActions: string[];
}