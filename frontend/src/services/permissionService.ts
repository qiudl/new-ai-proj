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

// Normalize various permission code formats to canonical dot notation
// - Replace ':' with '.'
// - Map common aliases (write -> update, list -> list.read)
function normalizePermissionCode(code: string): string {
  if (!code) return code;
  let normalized = code.trim();

  // Replace colon with dot
  normalized = normalized.replace(/:/g, '.');

  // Handle "list" shorthand (e.g., project.list -> project.list.read)
  const parts = normalized.split('.');
  if (parts.length === 2 && parts[1] === 'list') {
    normalized = `${parts[0]}.list.read`;
  }

  // Map common action aliases
  normalized = normalized
    .replace(/\.write$/,'\.update')
    .replace(/\.create$/,'\.create')
    .replace(/\.read$/,'\.read')
    .replace(/\.update$/,'\.update')
    .replace(/\.delete$/,'\.delete');

  return normalized;
}

export const permissionService = {
  // Role Management
  async getRoles(enterpriseId?: number) {
    const params = enterpriseId ? { enterprise_id: enterpriseId } : {};
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
    return (response as any).data;
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

    // New format: Backend directly returns { hasPermission, reason, source }
    if (response && typeof response.hasPermission === 'boolean') {
      const normalizedResult: PermissionResult = {
        hasPermission: response.hasPermission,
        reason: response.reason || '',
        grantedBy: response.grantedBy || response.granted_by || []
      };
      return { result: normalizedResult };
    }

    // Old format (backward compatibility): { result: { has_permission, reason, source } }
    if (response && response.result) {
      const backendResult = response.result;
      const normalizedResult: PermissionResult = {
        hasPermission: backendResult.has_permission ?? backendResult.hasPermission ?? false,
        reason: backendResult.reason || '',
        grantedBy: backendResult.granted_by || backendResult.grantedBy || []
      };
      return { result: normalizedResult };
    }

    // Fallback for unexpected format
    console.warn('[checkUserPermission] Unexpected response format:', response);
    return {
      result: {
        hasPermission: false,
        reason: 'Invalid response format',
        grantedBy: []
      }
    };
  },

  // Audit Logs
  async getPermissionAuditLogs(userId?: number, limit = 20, offset = 0) {
    const params = { limit, offset };
    if (userId) {
      (params as any).user_id = userId;
    }
    const response = await api.get('/permissions/audit-logs', { params });
    return response;
  },


  // Enterprise User Permission Management (企业系统)
  async getEnterpriseUserPermissions(enterpriseId: number, userId: number): Promise<{ permissions: UserPermissionSummary }> {
    const response = await api.get(`/enterprises/${enterpriseId}/users/${userId}/permissions`);
    return (response as any).data;
  },

  async updateEnterpriseUserPermissions(enterpriseId: number, userId: number, permissionData: {
    roleId?: number;
    customPermissions?: Record<string, boolean>;
    projectPermissions?: any[];
  }) {
    const response = await api.put(`/enterprises/${enterpriseId}/users/${userId}/permissions`, permissionData);
    return response;
  },

  async assignEnterpriseUserRole(enterpriseId: number, userId: number, roleId: number) {
    const response = await api.post(`/enterprises/${enterpriseId}/users/${userId}/role`, {
      role_id: roleId
    });
    return response;
  },

  // 企业角色管理
  async getEnterpriseRoles(enterpriseId: number) {
    try {
      const response = await api.get(`/enterprises/${enterpriseId}/roles`);
      return response;
    } catch (error) {
      console.warn('⚠️ 新企业角色系统不可用，回退到旧系统:', error);
      // 回退到旧的公司角色系统
      return await this.getRoles(enterpriseId);
    }
  },

  // Utility functions for permission checking
  async hasPermission(permissionCode: string, resourceId?: number): Promise<boolean> {
    try {
      // Dev fallback: if current JWT indicates admin or company_admin, grant access
      // This unblocks development when backend RBAC endpoints are not available
      if (process.env.NODE_ENV === 'development') {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));

            // ✅ RBAC v2: Priority check for role_v2 field (new system)
            if (payload && payload.role_v2) {
              // RBAC v2 system roles: super_admin, admin, enterprise_manager
              // RBAC v2 enterprise roles: enterprise_admin, project_manager, member, viewer
              if (['super_admin', 'admin', 'enterprise_admin'].includes(payload.role_v2)) {
                console.log('[hasPermission] Dev bypass for RBAC v2 admin role:', payload.role_v2);
                return true;
              }
            }

            // Fallback to legacy role field for backward compatibility
            if (payload && (payload.role === 'admin' || payload.role === 'company_admin')) {
              console.log('[hasPermission] Dev bypass for legacy admin/company_admin');
              return true;
            }
            // Also check for impersonation context in JWT
            if (payload && payload.impersonation && payload.role === 'enterprise_admin') {
              console.log('[hasPermission] Dev bypass for enterprise_admin with impersonation');
              return true;
            }
          } catch {}
        }
      }

      // No normalization needed - frontend and database now use same format
      // Use permission code directly as it comes from constants/permissions.ts
      const normalizedCode = normalizePermissionCode(permissionCode);
      console.log('[hasPermission] Checking permission:', { permissionCode, normalizedCode, resourceId });

      const result = await this.checkUserPermission({
        permissionCode: normalizedCode,
        resourceID: resourceId
      });

      console.log('[hasPermission] API response:', result);
      console.log('[hasPermission] Result:', result.result.hasPermission);

      return result.result.hasPermission;
    } catch (error) {
      console.error('[hasPermission] Permission check failed:', error);
      console.error('[hasPermission] Error details:', {
        permissionCode,
        resourceId,
        error: error instanceof Error ? error.message : String(error)
      });
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