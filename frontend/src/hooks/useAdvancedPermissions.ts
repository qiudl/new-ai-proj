import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { authService } from '../services/authService';
import { PermissionUtils } from '../utils/permissionUtils';
import { AnyPermission } from '../constants/permissions';

interface UseAdvancedPermissionsOptions {
  userId?: number;
  autoLoad?: boolean;
  routePath?: string; // 当前路由路径，用于自动路由权限检查
}

export const useAdvancedPermissions = (options: UseAdvancedPermissionsOptions = {}) => {
  const { userId = authService.getCurrentUserId(), autoLoad = true, routePath } = options;
  
  const [permissionCache, setPermissionCache] = useState<Map<string, boolean>>(new Map());
  const [routePermissionGranted, setRoutePermissionGranted] = useState<boolean>(true);
  const [isRoutePermissionLoading, setIsRoutePermissionLoading] = useState<boolean>(false);

  const {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasRole,
    hasAnyRole,
    hasEffectivePermission,
    userPermissions,
    loading: baseLoading,
    error: baseError,
    ...otherPermissionProps
  } = usePermissions({
    userId,
    autoLoad
  });

  // 检查路由权限
  useEffect(() => {
    const checkRoutePermission = async () => {
      if (!routePath || !userPermissions) return;

      try {
        setIsRoutePermissionLoading(true);
        const requiredPermissions = PermissionUtils.getRoutePermissions(routePath);
        
        if (requiredPermissions.length === 0) {
          setRoutePermissionGranted(true);
          return;
        }

        // 检查是否有任意一个权限即可访问
        const hasPermission = await checkAnyPermission(requiredPermissions);
        setRoutePermissionGranted(hasPermission);

        // 开发环境日志
        if (process.env.NODE_ENV === 'development') {
          console.log('[useAdvancedPermissions] Route permission check:', {
            routePath,
            requiredPermissions,
            hasPermission,
            userRole: userPermissions.role?.roleCode
          });
        }
      } catch (error) {
        console.error('[useAdvancedPermissions] Route permission check failed:', error);
        setRoutePermissionGranted(false);
      } finally {
        setIsRoutePermissionLoading(false);
      }
    };

    if (!baseLoading) {
      checkRoutePermission();
    }
  }, [routePath, userPermissions, baseLoading, checkAnyPermission]);

  // 缓存权限检查结果
  const checkPermissionWithCache = useCallback(async (
    permission: string,
    resourceId?: number
  ): Promise<boolean> => {
    const cacheKey = `${permission}-${resourceId || 'global'}`;
    
    // 检查缓存
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!;
    }

    try {
      const result = await checkPermission(permission, resourceId);
      
      // 缓存结果
      setPermissionCache(prev => new Map(prev.set(cacheKey, result)));
      
      return result;
    } catch (error) {
      console.error('[useAdvancedPermissions] Permission check failed:', error);
      return false;
    }
  }, [checkPermission, permissionCache]);

  // 批量权限检查（带缓存）
  const checkPermissionsWithCache = useCallback(async (
    permissions: string[],
    resourceId?: number,
    requireAll = false
  ): Promise<boolean> => {
    try {
      const results = await Promise.all(
        permissions.map(permission => checkPermissionWithCache(permission, resourceId))
      );
      
      return requireAll ? results.every(Boolean) : results.some(Boolean);
    } catch (error) {
      console.error('[useAdvancedPermissions] Batch permission check failed:', error);
      return false;
    }
  }, [checkPermissionWithCache]);

  // 清除权限缓存
  const clearPermissionCache = useCallback((permission?: string) => {
    if (permission) {
      setPermissionCache(prev => {
        const newCache = new Map(prev);
        // 清除指定权限的所有缓存（包括不同resourceId的）
        Array.from(newCache.keys())
          .filter(key => key.startsWith(`${permission}-`))
          .forEach(key => newCache.delete(key));
        return newCache;
      });
    } else {
      setPermissionCache(new Map());
    }
  }, []);

  // 权限分析工具
  const analyzeUserPermissions = useMemo(() => {
    if (!userPermissions) return null;

    const effectivePermissions = userPermissions.effectivePermissions || [];
    const grantedPermissions = effectivePermissions
      .filter(p => p.isGranted)
      .map(p => p.permissionCode);

    return {
      totalPermissions: effectivePermissions.length,
      grantedPermissions,
      deniedPermissions: effectivePermissions
        .filter(p => !p.isGranted)
        .map(p => p.permissionCode),
      role: userPermissions.role,
      customPermissions: userPermissions.customPermissions || {},
      isAdmin: PermissionUtils.isAdmin(grantedPermissions),
      suggectedRole: PermissionUtils.suggestRoleForPermissions(grantedPermissions)
    };
  }, [userPermissions]);

  // 权限条件渲染工具
  const renderWithPermission = useCallback((
    permission: string | string[],
    component: React.ReactNode,
    fallback: React.ReactNode = null,
    requireAll = false
  ) => {
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    // 首先尝试客户端权限检查（同步）
    if (permissions.every(p => hasEffectivePermission(p))) {
      return component;
    }
    
    if (permissions.some(p => hasEffectivePermission(p)) && !requireAll) {
      return component;
    }
    
    return fallback;
  }, [hasEffectivePermission]);

  // 危险操作权限检查
  const checkDangerousOperation = useCallback(async (
    permission: string,
    resourceId?: number,
    confirmationRequired = true
  ): Promise<boolean> => {
    const isDangerous = PermissionUtils.isDangerousPermission(permission);
    const hasPermission = await checkPermissionWithCache(permission, resourceId);
    
    if (!hasPermission) {
      return false;
    }

    if (isDangerous && confirmationRequired && process.env.NODE_ENV === 'production') {
      // 在生产环境中，危险操作需要额外确认
      console.warn(`[Security] Dangerous operation attempted: ${permission}`, {
        userId,
        resourceId,
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }, [checkPermissionWithCache, userId]);

  return {
    // 基础权限功能
    ...otherPermissionProps,
    checkPermission: checkPermissionWithCache,
    checkAnyPermission: checkPermissionsWithCache,
    checkAllPermissions: (permissions: string[], resourceId?: number) => 
      checkPermissionsWithCache(permissions, resourceId, true),
    hasRole,
    hasAnyRole,
    hasEffectivePermission,
    
    // 高级功能
    routePermissionGranted,
    isRoutePermissionLoading,
    permissionCache,
    clearPermissionCache,
    analyzeUserPermissions,
    renderWithPermission,
    checkDangerousOperation,
    
    // 状态
    userPermissions,
    loading: baseLoading || isRoutePermissionLoading,
    error: baseError,
    
    // 快捷权限检查
    canCreate: (resource: string) => hasEffectivePermission(`${resource}_create`),
    canRead: (resource: string) => hasEffectivePermission(`${resource}_read`),
    canUpdate: (resource: string) => hasEffectivePermission(`${resource}_update`),
    canDelete: (resource: string) => hasEffectivePermission(`${resource}_delete`),
    canAdmin: (resource: string) => hasEffectivePermission(`${resource}_admin`),
    
    // 角色快捷检查
    isSuperAdmin: hasRole('super_admin'),
    isCompanyAdmin: hasRole('company_admin'),
    isProjectManager: hasRole('project_manager'),
    isTeamLead: hasRole('team_lead'),
    isDeveloper: hasRole('developer'),
    isViewer: hasRole('viewer')
  };
};