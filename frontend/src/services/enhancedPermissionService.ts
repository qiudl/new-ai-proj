import api from './api';

// Types for enhanced permission management
export interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  default_permissions: string[];
  required_permissions: string[];
  conflicting_roles: string[];
  recommended_for: string[];
  is_built_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionTemplate {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  use_cases: string[];
  is_built_in: boolean;
}

export interface PermissionRequest {
  id: number;
  requester_id: number;
  requester_name: string;
  permission_code: string;
  resource_type: string;
  resource_id?: number;
  justification: string;
  requested_duration: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approver_id?: number;
  approver_name?: string;
  approved_at?: string;
  expires_at?: string;
  comments: string;
  created_at: string;
  updated_at: string;
}

export interface PermissionDelegation {
  id: number;
  delegator_id: number;
  delegator_name: string;
  delegate_id: number;
  delegate_name: string;
  permission_codes: string[];
  resource_type: string;
  resource_id?: number;
  valid_from: string;
  valid_until: string;
  can_delegate: boolean;
  is_active: boolean;
  reason: string;
  created_at: string;
  revoked_at?: string;
  revoked_by?: number;
}

export interface CreateRoleFromTemplateRequest {
  template_id: number;
  role_name: string;
  customizations?: Record<string, boolean>;
}

export interface RequestPermissionRequest {
  permission_code: string;
  resource_type: string;
  resource_id?: number;
  justification: string;
  duration_hours: number;
}

export interface DelegatePermissionsRequest {
  delegate_id: number;
  permission_codes: string[];
  resource_type: string;
  resource_id?: number;
  valid_hours: number;
  reason: string;
}

export interface ApproveRequestRequest {
  comments?: string;
}

export interface RejectRequestRequest {
  reason: string;
}

export interface RevokeRequest {
  reason: string;
}

export interface CheckDynamicPermissionRequest {
  user_id: number;
  permission_code: string;
  resource_type: string;
  resource_id?: number;
  context?: Record<string, any>;
}

export interface PermissionUsageAnalysis {
  user_id: number;
  time_range: string;
  most_used_permissions: Array<{
    permission: string;
    count: number;
    last_used: string;
  }>;
  unused_permissions: string[];
  permission_requests: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  delegations: {
    given: number;
    received: number;
    active: number;
  };
  recommendations: string[];
}

export interface RoleOptimizationSuggestions {
  user_id: number;
  current_role: {
    id: number;
    name: string;
    permissions_count: number;
  };
  usage_analysis: {
    used_permissions: number;
    unused_permissions: number;
    usage_rate: string;
  };
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    [key: string]: any;
  }>;
  security_score: number;
  optimization_potential: string;
}

export interface DynamicPermissionResult {
  has_permission: boolean;
  reason: string;
  check_type: string;
}

class EnhancedPermissionService {
  private baseUrl = '/api/v1/enhanced-permissions';

  // Role template methods
  async getRoleTemplates(): Promise<RoleTemplate[]> {
    const response = await api.get(`${this.baseUrl}/role-templates`);
    return response.data.data;
  }

  async getPermissionTemplates(): Promise<PermissionTemplate[]> {
    const response = await api.get(`${this.baseUrl}/permission-templates`);
    return response.data.data;
  }

  async createRoleFromTemplate(request: CreateRoleFromTemplateRequest): Promise<any> {
    const response = await api.post(`${this.baseUrl}/roles/from-template`, request);
    return response.data.data;
  }

  // Permission request methods
  async requestPermission(request: RequestPermissionRequest): Promise<PermissionRequest> {
    const response = await api.post(`${this.baseUrl}/request`, request);
    return response.data.data;
  }

  async getPermissionRequests(params?: {
    status?: string;
    user_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PermissionRequest[]> {
    const response = await api.get(`${this.baseUrl}/requests`, { params });
    return response.data.data;
  }

  async approvePermissionRequest(requestId: number, data: ApproveRequestRequest): Promise<void> {
    await api.post(`${this.baseUrl}/requests/${requestId}/approve`, data);
  }

  async rejectPermissionRequest(requestId: number, data: RejectRequestRequest): Promise<void> {
    await api.post(`${this.baseUrl}/requests/${requestId}/reject`, data);
  }

  // Permission delegation methods
  async delegatePermissions(request: DelegatePermissionsRequest): Promise<PermissionDelegation> {
    const response = await api.post(`${this.baseUrl}/delegate`, request);
    return response.data.data;
  }

  async getUserDelegations(userId: number): Promise<PermissionDelegation[]> {
    const response = await api.get(`${this.baseUrl}/users/${userId}/delegations`);
    return response.data.data;
  }

  async revokeDelegation(delegationId: number, data: RevokeRequest): Promise<void> {
    await api.post(`${this.baseUrl}/delegations/${delegationId}/revoke`, data);
  }

  // Analysis and optimization methods
  async analyzePermissionUsage(userId: number, timeRange?: string): Promise<PermissionUsageAnalysis> {
    const params = timeRange ? { time_range: timeRange } : {};
    const response = await api.get(`${this.baseUrl}/users/${userId}/usage-analysis`, { params });
    return response.data.data;
  }

  async getRoleOptimizationSuggestions(userId: number): Promise<RoleOptimizationSuggestions> {
    const response = await api.get(`${this.baseUrl}/users/${userId}/optimization-suggestions`);
    return response.data.data;
  }

  // Dynamic permission check
  async checkDynamicPermission(request: CheckDynamicPermissionRequest): Promise<DynamicPermissionResult> {
    const response = await api.post(`${this.baseUrl}/check-dynamic`, request);
    return response.data.data;
  }

  // Utility methods for UI
  formatDuration(hours: number): string {
    if (hours < 24) {
      return `${hours}小时`;
    } else if (hours < 24 * 7) {
      const days = Math.floor(hours / 24);
      return `${days}天`;
    } else {
      const weeks = Math.floor(hours / (24 * 7));
      return `${weeks}周`;
    }
  }

  formatPermissionList(permissions: string[]): string {
    const permissionNames: Record<string, string> = {
      'project.read': '查看项目',
      'project.update': '编辑项目',
      'project.delete': '删除项目',
      'task.read': '查看任务',
      'task.create': '创建任务',
      'task.update': '编辑任务',
      'task.delete': '删除任务',
      'task.assign': '分配任务',
      'document.read': '查看文档',
      'document.create': '创建文档',
      'document.update': '编辑文档',
      'member.read': '查看成员',
      'member.invite': '邀请成员',
      'member.remove': '移除成员',
      'report.read': '查看报告',
      'report.generate': '生成报告',
      'financial.read': '查看财务',
      'financial.manage': '管理财务',
      'system.admin': '系统管理',
    };

    return permissions
      .map(code => permissionNames[code] || code)
      .join('、');
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': 'orange',
      'approved': 'green',
      'rejected': 'red',
      'expired': 'gray',
    };
    return colors[status] || 'default';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'pending': '待批准',
      'approved': '已批准',
      'rejected': '已拒绝',
      'expired': '已过期',
    };
    return texts[status] || status;
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'management': 'blue',
      'development': 'green',
      'product': 'purple',
      'qa': 'orange',
      'viewer': 'gray',
    };
    return colors[category] || 'default';
  }

  getCategoryText(category: string): string {
    const texts: Record<string, string> = {
      'management': '管理层',
      'development': '开发',
      'product': '产品',
      'qa': '测试',
      'viewer': '观察者',
    };
    return texts[category] || category;
  }
}

export default new EnhancedPermissionService();