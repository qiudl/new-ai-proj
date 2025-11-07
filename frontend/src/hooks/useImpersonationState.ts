import { useState, useEffect, useCallback } from 'react';
import { useImpersonation } from '../contexts/ImpersonationContext';
import {
  ImpersonationWarning,
  ImpersonationWarningType,
  ImpersonationPermissions
} from '../types/impersonation';
import impersonationService from '../services/impersonationService';
import { getCurrentUser, isSystemAdmin } from '../utils/userUtils';

/**
 * 模拟状态管理的自定义Hook
 * 提供更高级的状态管理和辅助功能
 */
export const useImpersonationState = () => {
  const context = useImpersonation();
  const [permissions, setPermissions] = useState<ImpersonationPermissions>({
    canStartImpersonation: false,
    canExitImpersonation: false,
    canViewHistory: false,
    canAccessSensitiveOperations: false,
    restrictedActions: []
  });
  const [warnings, setWarnings] = useState<ImpersonationWarning[]>([]);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);

  // 检查权限
  const checkPermissions = useCallback(async () => {
    try {
      const perms = await impersonationService.checkPermissions();
      setPermissions({
        ...perms,
        canAccessSensitiveOperations: !context.isImpersonating,
      });
    } catch (error) {
      console.error('检查权限失败:', error);

      // 权限检查失败时，根据用户角色设置默认权限
      const currentUser = getCurrentUser();
      const isSysAdmin = isSystemAdmin(currentUser);

      // 系统管理员默认有模拟权限
      setPermissions({
        canStartImpersonation: isSysAdmin && !context.isImpersonating,
        canExitImpersonation: context.isImpersonating,
        canViewHistory: isSysAdmin,
        canAccessSensitiveOperations: !context.isImpersonating,
        restrictedActions: isSysAdmin ? [] : ['*']
      });
    }
  }, [context.isImpersonating]);

  // 计算会话剩余时间
  const updateTimeLeft = useCallback(() => {
    if (context.impersonationStatus?.session?.expires_at) {
      const expiresAt = new Date(context.impersonationStatus.session.expires_at);
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setSessionTimeLeft(timeLeft);
      
      // 生成时间相关警告
      const minutes = Math.floor(timeLeft / 60);
      if (minutes <= 0 && timeLeft > 0) {
        addWarning({
          type: 'session_expiring',
          message: `会话将在 ${timeLeft} 秒后过期`,
          expiresAt: context.impersonationStatus.session.expires_at,
          actions: [{
            label: '刷新令牌',
            action: refreshToken,
            type: 'primary'
          }, {
            label: '退出模拟',
            action: context.exitImpersonation,
            type: 'danger'
          }]
        });
      } else if (timeLeft <= 0) {
        addWarning({
          type: 'session_expired',
          message: '模拟会话已过期',
          actions: [{
            label: '退出模拟',
            action: context.exitImpersonation,
            type: 'primary'
          }]
        });
      } else if (minutes <= 10) {
        addWarning({
          type: 'session_expiring',
          message: `会话将在 ${minutes} 分钟后过期`,
          expiresAt: context.impersonationStatus.session.expires_at,
          actions: [{
            label: '刷新令牌',
            action: refreshToken
          }]
        });
      }
    } else {
      setSessionTimeLeft(null);
    }
  }, [context.impersonationStatus?.session?.expires_at, context.exitImpersonation]);

  // 刷新令牌
  const refreshToken = useCallback(async () => {
    try {
      const response = await impersonationService.refreshToken();
      if (response.token) {
        localStorage.setItem('token', response.token);
        await context.refreshStatus();
        removeWarning('session_expiring');
        removeWarning('session_expired');
      }
    } catch (error) {
      console.error('刷新令牌失败:', error);
    }
  }, [context.refreshStatus]);

  // 添加警告
  const addWarning = useCallback((warning: ImpersonationWarning) => {
    setWarnings(prev => {
      // 避免重复添加同类型警告
      const filtered = prev.filter(w => w.type !== warning.type);
      return [...filtered, warning];
    });
  }, []);

  // 移除警告
  const removeWarning = useCallback((type: ImpersonationWarningType) => {
    setWarnings(prev => prev.filter(w => w.type !== type));
  }, []);

  // 清除所有警告
  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  // 检查操作是否被限制
  const isActionRestricted = useCallback((action: string): boolean => {
    return permissions.restrictedActions.includes('*') || 
           permissions.restrictedActions.includes(action) ||
           (context.isImpersonating && !permissions.canAccessSensitiveOperations);
  }, [permissions.restrictedActions, context.isImpersonating, permissions.canAccessSensitiveOperations]);

  // 获取格式化的会话信息
  const getSessionInfo = useCallback(() => {
    if (!context.impersonationStatus?.session) return null;
    
    const session = context.impersonationStatus.session;
    const startedAt = new Date(session.started_at);
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    
    return {
      sessionId: session.id,
      startedAt: startedAt.toLocaleString(),
      expiresAt: expiresAt.toLocaleString(),
      duration: Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60)), // 分钟
      timeLeft: sessionTimeLeft,
      reason: session.reason,
      isExpired: sessionTimeLeft !== null && sessionTimeLeft <= 0,
      isExpiringSoon: sessionTimeLeft !== null && sessionTimeLeft <= 600 // 10分钟
    };
  }, [context.impersonationStatus?.session, sessionTimeLeft]);

  // 获取企业信息
  const getEnterpriseInfo = useCallback(() => {
    if (!context.impersonationStatus?.enterprise) return null;
    
    return {
      id: context.impersonationStatus.enterprise.id,
      name: context.impersonationStatus.enterprise.name,
      code: context.impersonationStatus.enterprise.code
    };
  }, [context.impersonationStatus?.enterprise]);

  // 获取原始用户信息
  const getOriginalUserInfo = useCallback(() => {
    if (!context.impersonationStatus?.original_user) return null;
    
    return {
      id: context.impersonationStatus.original_user.id,
      username: context.impersonationStatus.original_user.username,
      role: context.impersonationStatus.original_user.role
    };
  }, [context.impersonationStatus?.original_user]);

  // 初始化和定时更新
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    if (context.isImpersonating) {
      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 1000); // 每秒更新
      return () => clearInterval(interval);
    } else {
      setSessionTimeLeft(null);
      clearWarnings();
    }
  }, [context.isImpersonating, updateTimeLeft, clearWarnings]);

  return {
    // 基础状态
    ...context,
    
    // 权限信息
    permissions,
    
    // 警告管理
    warnings,
    addWarning,
    removeWarning,
    clearWarnings,
    
    // 会话信息
    sessionTimeLeft,
    sessionInfo: getSessionInfo(),
    enterpriseInfo: getEnterpriseInfo(),
    originalUserInfo: getOriginalUserInfo(),
    
    // 辅助方法
    isActionRestricted,
    refreshToken,
    checkPermissions,
    
    // 便捷状态检查
    isExpired: sessionTimeLeft !== null && sessionTimeLeft <= 0,
    isExpiringSoon: sessionTimeLeft !== null && sessionTimeLeft <= 600,
    canPerformSensitiveActions: permissions.canAccessSensitiveOperations && !context.isImpersonating,
  };
};

export default useImpersonationState;