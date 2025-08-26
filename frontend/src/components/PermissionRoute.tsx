import React, { useState, useEffect, ReactNode } from 'react';
import { Result, Spin } from 'antd';
import { usePermissions } from '../hooks/usePermissions';
import { userService } from '../services/userService';

interface PermissionRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY permission
  roles?: string[];
  requireAllRoles?: boolean;
  resourceId?: number;
  fallbackComponent?: ReactNode;
  loadingComponent?: ReactNode;
}

/**
 * 增强的权限路由组件
 * 
 * 支持多种权限检查方式：
 * 1. 单个权限检查
 * 2. 多个权限检查（ANY/ALL）
 * 3. 角色检查（ANY/ALL）
 * 4. 混合权限和角色检查
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  roles,
  requireAllRoles = false,
  resourceId,
  fallbackComponent,
  loadingComponent
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // 获取当前用户ID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await userService.getProfile();
        if (response.success && response.data) {
          setCurrentUserId(response.data.id);
        } else {
          setError('无法获取当前用户信息');
        }
      } catch (error) {
        console.error('获取当前用户失败:', error);
        setError('无法获取当前用户信息');
      }
    };

    getCurrentUser();
  }, []);

  const {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasRole,
    hasAnyRole,
    userPermissions,
    loading: permissionLoading
  } = usePermissions({
    userId: currentUserId || undefined,
    autoLoad: !!currentUserId
  });

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 必须有用户ID才能进行权限检查
        if (!currentUserId) {
          return;
        }

        // 等待权限数据加载完成
        if (permissionLoading || !userPermissions) {
          return;
        }

        let permissionGranted = true;
        let roleGranted = true;

        // 检查权限
        if (permission) {
          // 单个权限检查
          permissionGranted = await checkPermission(permission, resourceId);
        } else if (permissions && permissions.length > 0) {
          // 多个权限检查
          if (requireAll) {
            permissionGranted = await checkAllPermissions(permissions, resourceId);
          } else {
            permissionGranted = await checkAnyPermission(permissions, resourceId);
          }
        }

        // 检查角色
        if (roles && roles.length > 0) {
          if (requireAllRoles) {
            roleGranted = roles.every(role => hasRole(role));
          } else {
            roleGranted = hasAnyRole(roles);
          }
        }

        // 最终权限 = 权限检查 AND 角色检查
        const finalAccess = permissionGranted && roleGranted;
        setHasAccess(finalAccess);

        // 记录权限检查结果（仅开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.log('[PermissionRoute] Access check:', {
            currentUserId,
            permission,
            permissions,
            roles,
            permissionGranted,
            roleGranted,
            finalAccess,
            userRole: userPermissions?.role?.roleCode
          });
        }

      } catch (err) {
        console.error('[PermissionRoute] Access check failed:', err);
        setError(err instanceof Error ? err.message : '权限检查失败');
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [
    currentUserId,
    permission,
    permissions,
    requireAll,
    roles,
    requireAllRoles,
    resourceId,
    permissionLoading,
    userPermissions,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasRole,
    hasAnyRole
  ]);

  // 显示加载状态
  if (isLoading || permissionLoading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <Result
        status="error"
        title="权限检查失败"
        subTitle={error}
        extra={
          <div style={{ fontSize: '14px', color: '#666' }}>
            请刷新页面重试，或联系管理员
          </div>
        }
      />
    );
  }

  // 显示无权限状态
  if (!hasAccess) {
    return fallbackComponent ? (
      <>{fallbackComponent}</>
    ) : (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <div style={{ fontSize: '14px', color: '#666' }}>
            {permission && `需要权限: ${permission}`}
            {permissions && `需要权限: ${permissions.join(', ')}`}
            {roles && `需要角色: ${roles.join(', ')}`}
          </div>
        }
      />
    );
  }

  // 显示页面内容
  return <>{children}</>;
};

export default PermissionRoute;