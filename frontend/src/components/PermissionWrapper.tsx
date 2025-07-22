import React, { useState, useEffect, ReactNode } from 'react';
import { permissionService } from '../services/permissionService';

interface PermissionWrapperProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY permission
  resourceId?: number;
  fallback?: ReactNode;
  loading?: ReactNode;
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  resourceId,
  fallback = null,
  loading = null
}) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setIsLoading(true);
        
        let result = false;
        
        if (permission) {
          // Single permission check
          result = await permissionService.hasPermission(permission, resourceId);
        } else if (permissions && permissions.length > 0) {
          // Multiple permissions check
          if (requireAll) {
            result = await permissionService.hasAllPermissions(permissions, resourceId);
          } else {
            result = await permissionService.hasAnyPermission(permissions, resourceId);
          }
        } else {
          // No permissions specified, default to true
          result = true;
        }
        
        setHasPermission(result);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, [permission, permissions, requireAll, resourceId]);

  if (isLoading) {
    return loading ? <>{loading}</> : null;
  }

  if (!hasPermission) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

export default PermissionWrapper;