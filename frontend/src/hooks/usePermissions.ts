import { useState, useEffect, useCallback } from 'react';
import { permissionService, UserPermissionSummary, PermissionResult } from '../services/permissionService';
import { isBasePermission, BASE_PERMISSIONS_ARRAY } from '../constants/permissions';

interface UsePermissionsOptions {
  userId?: number;
  autoLoad?: boolean;
}

interface PermissionCheck {
  permission: string;
  resourceId?: number;
  result?: PermissionResult;
  loading: boolean;
  error?: string;
}

export const usePermissions = (options: UsePermissionsOptions = {}) => {
  const { userId, autoLoad = true } = options;
  
  const [userPermissions, setUserPermissions] = useState<UserPermissionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionChecks, setPermissionChecks] = useState<Map<string, PermissionCheck>>(new Map());

  // Load user permissions
  const loadUserPermissions = useCallback(async (targetUserId?: number) => {
    const id = targetUserId || userId;
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await permissionService.getUserPermissions(id);
      setUserPermissions(response.permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      setUserPermissions(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Check single permission
  const checkPermission = useCallback(async (permission: string, resourceId?: number): Promise<boolean> => {
    // 基础权限直接返回true，无需查询后端
    // 这些权限在后端中间件中自动添加，前端也应视为"总是可用"
    if (isBasePermission(permission)) {
      return true;
    }

    const checkKey = `${permission}-${resourceId || 'global'}`;

    // Update loading state
    setPermissionChecks(prev => new Map(prev.set(checkKey, {
      permission,
      resourceId,
      loading: true
    })));

    try {
      // Use normalized helper with dev fallback and code normalization
      const allowed = await permissionService.hasPermission(permission, resourceId);

      // Update with result
      setPermissionChecks(prev => new Map(prev.set(checkKey, {
        permission,
        resourceId,
        result: { hasPermission: allowed, reason: allowed ? 'granted' : 'denied', grantedBy: [] },
        loading: false
      })));

      return allowed;
    } catch (err) {
      // Update with error
      setPermissionChecks(prev => new Map(prev.set(checkKey, {
        permission,
        resourceId,
        loading: false,
        error: err instanceof Error ? err.message : 'Permission check failed'
      })));

      return false;
    }
  }, []);

  // Check multiple permissions (ANY)
  const checkAnyPermission = useCallback(async (permissions: string[], resourceId?: number): Promise<boolean> => {
    try {
      const checks = await Promise.all(
        permissions.map(permission => checkPermission(permission, resourceId))
      );
      return checks.some(hasPermission => hasPermission);
    } catch {
      return false;
    }
  }, [checkPermission]);

  // Check multiple permissions (ALL)
  const checkAllPermissions = useCallback(async (permissions: string[], resourceId?: number): Promise<boolean> => {
    try {
      const checks = await Promise.all(
        permissions.map(permission => checkPermission(permission, resourceId))
      );
      return checks.every(hasPermission => hasPermission);
    } catch {
      return false;
    }
  }, [checkPermission]);

  // Get cached permission result
  const getPermissionCheck = useCallback((permission: string, resourceId?: number): PermissionCheck | undefined => {
    const checkKey = `${permission}-${resourceId || 'global'}`;
    return permissionChecks.get(checkKey);
  }, [permissionChecks]);

  // Clear permission cache
  const clearPermissionCache = useCallback(() => {
    setPermissionChecks(new Map());
  }, []);

  // Check if user has role
  const hasRole = useCallback((roleCode: string): boolean => {
    return userPermissions?.role?.roleCode === roleCode;
  }, [userPermissions]);

  // Check if user has unknown of the specified roles
  const hasAnyRole = useCallback((roleCodes: string[]): boolean => {
    return roleCodes.some(roleCode => hasRole(roleCode));
  }, [hasRole]);

  // Get effective permissions as a set for quick lookup
  // 自动包含基础权限
  const getEffectivePermissions = useCallback((): Set<string> => {
    const permissions = new Set<string>();

    // 添加基础权限（所有认证用户都拥有）
    BASE_PERMISSIONS_ARRAY.forEach(perm => permissions.add(perm));

    // 添加用户的其他权限
    if (userPermissions?.effectivePermissions) {
      userPermissions.effectivePermissions
        .filter(permission => permission.isGranted)
        .forEach(permission => permissions.add(permission.permissionCode));
    }

    return permissions;
  }, [userPermissions]);

  // Check if user has permission from effective permissions (client-side only)
  // 基础权限自动返回true
  const hasEffectivePermission = useCallback((permission: string): boolean => {
    // 基础权限直接返回true
    if (isBasePermission(permission)) {
      return true;
    }

    const effectivePermissions = getEffectivePermissions();
    return effectivePermissions.has(permission);
  }, [getEffectivePermissions]);

  // Auto-load permissions on mount
  useEffect(() => {
    if (autoLoad && userId) {
      loadUserPermissions();
    }
  }, [autoLoad, userId, loadUserPermissions]);

  return {
    // State
    userPermissions,
    loading,
    error,
    permissionChecks: Array.from(permissionChecks.values()),

    // Actions
    loadUserPermissions,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    clearPermissionCache,

    // Utilities
    getPermissionCheck,
    hasRole,
    hasAnyRole,
    hasEffectivePermission,
    getEffectivePermissions,

    // Computed values
    isAdmin: hasRole('company_admin'),
    isProjectManager: hasRole('project_manager'),
    effectivePermissions: getEffectivePermissions(),
    roleInfo: userPermissions?.role,
    customPermissions: userPermissions?.customPermissions || {},
    projectPermissions: userPermissions?.projectPermissions || []
  };
};

export default usePermissions;