/**
 * 企业权限检查 Hook
 *
 * 提供企业级别的权限检查功能，包括：
 * - 企业用户编辑权限
 * - 企业资源隔离检查
 * - 系统管理员 vs 企业管理员权限区分
 */

import { useMemo, useCallback } from 'react';
import { getCurrentUser } from '../utils/userUtils';
import { isSystemAdmin, isCompanyAdmin } from '../utils/permissions';

interface EnterprisePermissions {
  /** 是否可以编辑指定企业的用户 */
  canEditEnterpriseUser: (targetEnterpriseId: number) => boolean;
  /** 是否可以删除指定企业的用户 */
  canDeleteEnterpriseUser: (targetEnterpriseId: number) => boolean;
  /** 是否可以查看指定企业的用户 */
  canViewEnterpriseUser: (targetEnterpriseId: number) => boolean;
  /** 是否可以管理指定企业的角色 */
  canManageEnterpriseRoles: (targetEnterpriseId: number) => boolean;
  /** 是否可以管理指定企业的部门 */
  canManageEnterpriseDepartments: (targetEnterpriseId: number) => boolean;
  /** 是否是系统管理员 */
  isSystemAdmin: boolean;
  /** 是否是企业管理员 */
  isEnterpriseAdmin: boolean;
  /** 当前用户的企业ID */
  currentEnterpriseId: number | undefined;
  /** 检查是否属于同一企业 */
  isSameEnterprise: (targetEnterpriseId: number) => boolean;
}

/**
 * 企业权限检查 Hook
 *
 * @example
 * ```tsx
 * const { canEditEnterpriseUser, isEnterpriseAdmin } = useEnterprisePermissions();
 *
 * // 检查是否可以编辑企业3的用户
 * if (canEditEnterpriseUser(3)) {
 *   // 显示编辑按钮
 * }
 * ```
 */
export const useEnterprisePermissions = (): EnterprisePermissions => {
  const currentUser = getCurrentUser();

  // 缓存用户权限状态
  const userPermissionState = useMemo(() => {
    const isSysAdmin = isSystemAdmin(currentUser);
    const isEntAdmin = isCompanyAdmin(currentUser);
    const enterpriseId = currentUser?.enterprise_id;

    return {
      isSysAdmin,
      isEntAdmin,
      enterpriseId,
    };
  }, [currentUser]);

  // 检查是否属于同一企业
  const isSameEnterprise = useCallback((targetEnterpriseId: number): boolean => {
    if (!userPermissionState.enterpriseId) {
      return false;
    }
    return userPermissionState.enterpriseId === targetEnterpriseId;
  }, [userPermissionState.enterpriseId]);

  // 检查是否可以编辑企业用户
  const canEditEnterpriseUser = useCallback((targetEnterpriseId: number): boolean => {
    // 系统管理员可以编辑所有企业的用户
    if (userPermissionState.isSysAdmin) {
      return true;
    }

    // 企业管理员只能编辑本企业的用户
    if (userPermissionState.isEntAdmin) {
      return isSameEnterprise(targetEnterpriseId);
    }

    // 普通用户不能编辑其他用户
    return false;
  }, [userPermissionState.isSysAdmin, userPermissionState.isEntAdmin, isSameEnterprise]);

  // 检查是否可以删除企业用户
  const canDeleteEnterpriseUser = useCallback((targetEnterpriseId: number): boolean => {
    // 与编辑权限相同的逻辑
    return canEditEnterpriseUser(targetEnterpriseId);
  }, [canEditEnterpriseUser]);

  // 检查是否可以查看企业用户
  const canViewEnterpriseUser = useCallback((targetEnterpriseId: number): boolean => {
    // 系统管理员可以查看所有企业的用户
    if (userPermissionState.isSysAdmin) {
      return true;
    }

    // 企业用户只能查看本企业的用户
    return isSameEnterprise(targetEnterpriseId);
  }, [userPermissionState.isSysAdmin, isSameEnterprise]);

  // 检查是否可以管理企业角色
  const canManageEnterpriseRoles = useCallback((targetEnterpriseId: number): boolean => {
    // 系统管理员可以管理所有企业的角色
    if (userPermissionState.isSysAdmin) {
      return true;
    }

    // 企业管理员只能管理本企业的角色
    if (userPermissionState.isEntAdmin) {
      return isSameEnterprise(targetEnterpriseId);
    }

    return false;
  }, [userPermissionState.isSysAdmin, userPermissionState.isEntAdmin, isSameEnterprise]);

  // 检查是否可以管理企业部门
  const canManageEnterpriseDepartments = useCallback((targetEnterpriseId: number): boolean => {
    // 与角色管理权限相同的逻辑
    return canManageEnterpriseRoles(targetEnterpriseId);
  }, [canManageEnterpriseRoles]);

  return {
    canEditEnterpriseUser,
    canDeleteEnterpriseUser,
    canViewEnterpriseUser,
    canManageEnterpriseRoles,
    canManageEnterpriseDepartments,
    isSystemAdmin: userPermissionState.isSysAdmin,
    isEnterpriseAdmin: userPermissionState.isEntAdmin,
    currentEnterpriseId: userPermissionState.enterpriseId,
    isSameEnterprise,
  };
};

export default useEnterprisePermissions;
