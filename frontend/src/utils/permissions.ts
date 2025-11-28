/**
 * 权限判断工具函数
 *
 * 提供用户权限相关的判断工具函数
 */

import { User } from '../types/user';

/**
 * 判断用户是否为系统管理员
 *
 * 系统管理员的定义：
 * - user_type 必须为 'system'
 * - role 必须为 'admin'
 *
 * @param user - 用户对象，可能为 null 或 undefined
 * @returns 如果是系统管理员返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * const user = { user_type: 'system', role: 'admin', ... };
 * if (isSystemAdmin(user)) {
 *   // 显示系统管理员功能
 * }
 * ```
 */
export function isSystemAdmin(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return user.user_type === 'system' && user.role === 'admin';
}

/**
 * 判断用户是否为系统用户（任意角色）
 *
 * @param user - 用户对象，可能为 null 或 undefined
 * @returns 如果是系统用户返回 true，否则返回 false
 */
export function isSystemUser(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return user.user_type === 'system';
}

/**
 * 判断用户是否为企业管理员
 *
 * @param user - 用户对象，可能为 null 或 undefined
 * @returns 如果是企业管理员返回 true，否则返回 false
 */
export function isCompanyAdmin(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  // 兼容 'company' 和 'enterprise' 两种 user_type
  // 兼容 'company_admin' 和 'enterprise_admin' 两种角色
  const isEnterpriseUserType = user.user_type === 'company' || user.user_type === 'enterprise';
  const isAdminRole = user.role === 'company_admin' || user.role === 'enterprise_admin';
  return isEnterpriseUserType && isAdminRole;
}

/**
 * 判断用户是否有管理员权限（系统管理员或企业管理员）
 *
 * @param user - 用户对象，可能为 null 或 undefined
 * @returns 如果有管理员权限返回 true，否则返回 false
 */
export function hasAdminPermission(user: User | null | undefined): boolean {
  return isSystemAdmin(user) || isCompanyAdmin(user);
}
