import api from './api';

export interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  roleDescription: string;
  isSystemRole: boolean;
  isActive: boolean;
}

export interface Permission {
  id: number;
  permissionCode: string;
  permissionName: string;
  permissionDescription: string;
  module: string;
  resource: string;
  action: string;
  isActive: boolean;
  isGranted?: boolean;
}

export interface RoleRequest {
  roleCode?: string;
  roleName: string;
  roleDescription: string;
  permissionCodes: string[];
}

export interface UserPermissionSummary {
  companyUserID: number;
  userName: string;
  role?: {
    id: number;
    roleCode: string;
    roleName: string;
    roleDescription: string;
    isSystemRole: boolean;
    isActive: boolean;
  };
  customPermissions: Record<string, boolean>;
  projectPermissions: unknown[];
  effectivePermissions: Permission[];
  lastUpdated: string;
}

export interface PermissionCheckRequest {
  permissionCode: string;
  resourceID?: number;
}

export interface PermissionResult {
  hasPermission: boolean;
  reason: string;
  grantedBy: string[];
}

export const permissionService = {
  // Role Management
  async getRoles(companyId?: number) {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get('/permissions/roles', { params });
    return response;
  },

  async createRole(roleData: RoleRequest) {
    const response = await api.post('/permissions/roles', roleData);
    return response;
  },

  async updateRole(roleId: number, roleData: Omit<RoleRequest, 'roleCode'>) {
    const response = await api.put(`/permissions/roles/${roleId}`, roleData);
    return response;
  },

  async deleteRole(roleId: number) {
    const response = await api.delete(`/permissions/roles/${roleId}`);
    return response;
  },

  async getRolePermissions(roleId: number) {
    const response = await api.get(`/permissions/roles/${roleId}/permissions`);
    return response;
  },

  async setRolePermissions(roleId: number, permissionIds: number[]) {
    const response = await api.post(`/permissions/roles/${roleId}/permissions`, {
      permission_ids: permissionIds
    });
    return response;
  },

  // Permission Management
  async getPermissions(module?: string) {
    const params = module ? { module } : {};
    const response = await api.get('/permissions', { params });
    return response;
  },

  // User Permission Management
  async getUserPermissions(userId: number): Promise<{ permissions: UserPermissionSummary }> {
    const response = await api.get(`/permissions/users/${userId}`);
    return response;
  },

  async updateUserPermissions(userId: number, permissionData: {
    roleId?: number;
    customPermissions?: Record<string, boolean>;
    projectPermissions?: any[];
  }) {
    const response = await api.put(`/permissions/users/${userId}`, permissionData);
    return response;
  },

  // Permission Checking
  async checkUserPermission(request: PermissionCheckRequest): Promise<{ result: PermissionResult }> {
    const response: any = await api.post('/permissions/check', request);
    // Axios may unwrap or return raw; normalize here
    if (response && response.result && typeof response.result.hasPermission === 'boolean') {
      return { result: response.result as PermissionResult };
    }
    if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
      // Wrapped { success, data }
      return response as { result: PermissionResult };
    }
    // Fallback: assume response already is { result: PermissionResult }
    return response as { result: PermissionResult };
  },

  // Audit Logs
  async getPermissionAuditLogs(userId?: number, limit = 20, offset = 0) {
    const params = { limit, offset };
    if (userId) {
      (params as unknown).user_id = userId;
    }
    const response = await api.get('/permissions/audit-logs', { params });
    return response;
  },

  // Company User Permission Management (through company service)
  async getCompanyUserPermissions(companyId: number, userId: number): Promise<{ permissions: UserPermissionSummary }> {
    const response = await api.get(`/companies/${companyId}/users/${userId}/permissions`);
    return response;
  },

  async updateCompanyUserPermissions(companyId: number, userId: number, permissionData: {
    roleId?: number;
    customPermissions?: Record<string, boolean>;
    projectPermissions?: any[];
  }) {
    const response = await api.put(`/companies/${companyId}/users/${userId}/permissions`, permissionData);
    return response;
  },

  async assignUserRole(companyId: number, userId: number, roleId: number) {
    const response = await api.post(`/companies/${companyId}/users/${userId}/role`, {
      role_id: roleId
    });
    return response;
  },

  // Utility functions for permission checking
  async hasPermission(permissionCode: string, resourceId?: number): Promise<boolean> {
    try {
      // Dev fallback: if current JWT indicates admin, grant access
      // This unblocks development when backend RBAC endpoints are not available
      if (process.env.NODE_ENV === 'development') {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload && payload.role === 'admin') {
              return true;
            }
          } catch {}
        }
      }

      // Normalize permission code (support both underscore and dot formats)
      const normalizedCode = permissionCode.includes('.')
        ? permissionCode
        : permissionCode.replace(/_/g, '.');

      const result = await this.checkUserPermission({
        permissionCode: normalizedCode,
        resourceID: resourceId
      });
      return result.result.hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  },

  async hasAnyPermission(permissionCodes: string[], resourceId?: number): Promise<boolean> {
    try {
      const checks = await Promise.all(
        permissionCodes.map(code => this.hasPermission(code, resourceId))
      );
      return checks.some(hasPermission => hasPermission);
    } catch (error) {
      console.error('Multiple permission check failed:', error);
      return false;
    }
  },

  async hasAllPermissions(permissionCodes: string[], resourceId?: number): Promise<boolean> {
    try {
      const checks = await Promise.all(
        permissionCodes.map(code => this.hasPermission(code, resourceId))
      );
      return checks.every(hasPermission => hasPermission);
    } catch (error) {
      console.error('Multiple permission check failed:', error);
      return false;
    }
  }
};

export default permissionService;