import React from 'react';
import { Button, Tooltip, ButtonProps } from 'antd';
import { useAdvancedPermissions } from '../hooks/useAdvancedPermissions';
import { AnyPermission } from '../constants/permissions';

interface PermissionButtonProps extends ButtonProps {
  permission?: AnyPermission;
  permissions?: AnyPermission[];
  requireAll?: boolean; // 如果有多个权限，是否需要全部满足
  resourceId?: number;
  fallbackMode?: 'hide' | 'disable' | 'tooltip'; // 无权限时的处理方式
  noPermissionTooltip?: string;
  dangerousOperation?: boolean; // 是否为危险操作，需要额外确认
  onPermissionDenied?: () => void; // 权限被拒绝时的回调
  loadingMode?: 'spinner' | 'disable'; // 权限检查中的状态
}

/**
 * 权限按钮组件
 * 
 * 根据用户权限自动处理按钮的显示状态：
 * - hide: 无权限时隐藏按钮
 * - disable: 无权限时禁用按钮
 * - tooltip: 无权限时禁用按钮并显示提示
 */
const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  permissions,
  requireAll = false,
  resourceId,
  fallbackMode = 'disable',
  noPermissionTooltip,
  dangerousOperation = false,
  onPermissionDenied,
  loadingMode = 'disable',
  children,
  onClick,
  ...buttonProps
}) => {
  const {
    hasEffectivePermission,
    checkDangerousOperation,
    loading: permissionLoading
  } = useAdvancedPermissions();

  // 确定要检查的权限列表
  const permissionsToCheck = React.useMemo(() => {
    if (permission) return [permission];
    if (permissions && permissions.length > 0) return permissions;
    return [];
  }, [permission, permissions]);

  // 检查权限
  const hasPermission = React.useMemo(() => {
    if (permissionsToCheck.length === 0) return true;

    if (requireAll) {
      return permissionsToCheck.every(p => hasEffectivePermission(p));
    } else {
      return permissionsToCheck.some(p => hasEffectivePermission(p));
    }
  }, [permissionsToCheck, requireAll, hasEffectivePermission]);

  // 处理点击事件
  const handleClick = React.useCallback(async (event: React.MouseEvent<HTMLElement>) => {
    // 权限检查
    if (!hasPermission) {
      onPermissionDenied?.();
      return;
    }

    // 危险操作额外检查
    if (dangerousOperation && permissionsToCheck.length > 0) {
      const canPerformDangerous = await checkDangerousOperation(
        permissionsToCheck[0], // 使用第一个权限进行危险操作检查
        resourceId
      );
      
      if (!canPerformDangerous) {
        onPermissionDenied?.();
        return;
      }
    }

    // 执行原始点击事件
    onClick?.(event);
  }, [
    hasPermission, 
    dangerousOperation, 
    permissionsToCheck, 
    resourceId, 
    checkDangerousOperation, 
    onPermissionDenied, 
    onClick
  ]);

  // 生成无权限提示
  const getNoPermissionTooltip = React.useCallback(() => {
    if (noPermissionTooltip) return noPermissionTooltip;
    
    if (permissionsToCheck.length === 0) return '无权限要求';
    
    // 规范化并去重，避免同时显示 task.list.read 与 task:read
    const normalize = (p: string) => p.replace(/:/g, '.');
    const uniq = Array.from(new Set(permissionsToCheck.map(normalize)));
    return `需要权限: ${uniq.join(', ')}`;
  }, [noPermissionTooltip, permissionsToCheck]);

  // 权限检查中的状态
  if (permissionLoading) {
    if (loadingMode === 'spinner') {
      return <Button {...buttonProps} loading>{children}</Button>;
    }
    return <Button {...buttonProps} disabled>{children}</Button>;
  }

  // 无权限处理
  if (!hasPermission) {
    switch (fallbackMode) {
      case 'hide':
        return null;
      
      case 'tooltip':
        return (
          <Tooltip title={getNoPermissionTooltip()}>
            <Button {...buttonProps} disabled>
              {children}
            </Button>
          </Tooltip>
        );
      
      case 'disable':
      default:
        return (
          <Button {...buttonProps} disabled>
            {children}
          </Button>
        );
    }
  }

  // 有权限，正常渲染
  return (
    <Button {...buttonProps} onClick={handleClick}>
      {children}
    </Button>
  );
};

export default PermissionButton;