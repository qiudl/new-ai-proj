import { User } from '../types/user';

/**
 * 用户工具函数
 * 处理用户信息的获取、验证和状态管理
 */

/**
 * 从localStorage获取当前用户信息
 * @returns 用户信息对象或null
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      return null;
    }
    
    const user = JSON.parse(userStr);
    
    // 基本字段验证
    if (!user.username || !user.user_type) {
      console.warn('⚠️ 用户信息格式不完整:', user);
      return null;
    }
    
    return user as User;
  } catch (error) {
    console.error('❌ 解析用户信息失败:', error);
    return null;
  }
};

/**
 * 检查用户是否为系统管理员
 * @param user 用户信息
 * @returns 是否为系统管理员
 */
export const isSystemAdmin = (user: User | null): boolean => {
  return user?.user_type === 'system' && user?.role === 'admin';
};

/**
 * 检查用户是否为企业用户
 * @param user 用户信息
 * @returns 是否为企业用户
 */
export const isCompanyUser = (user: User | null): boolean => {
  return user?.user_type === 'company';
};

/**
 * 检查用户是否有有效的企业ID
 * @param user 用户信息
 * @returns 是否有有效的企业ID
 */
export const hasValidCompanyId = (user: User | null): boolean => {
  return isCompanyUser(user) && typeof user?.company_id === 'number' && user.company_id > 0;
};

/**
 * 获取用户显示名称
 * @param user 用户信息
 * @returns 显示名称
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return '未登录用户';
  
  return user.profile?.name || user.username || '未知用户';
};

/**
 * 获取用户角色显示文本
 * @param user 用户信息
 * @returns 角色显示文本
 */
export const getUserRoleText = (user: User | null): string => {
  if (!user) return '';
  
  const roleMap: Record<string, string> = {
    // 系统用户角色
    'admin': '系统管理员',
    'project_manager': '项目经理',
    'developer': '研发工程师',
    // 企业用户角色
    'company_admin': '企业管理员',
    'company_user': '企业用户'
  };
  
  return roleMap[user.role] || user.role;
};

/**
 * 获取用户类型显示文本
 * @param user 用户信息
 * @returns 用户类型显示文本
 */
export const getUserTypeText = (user: User | null): string => {
  if (!user) return '';
  
  const typeMap: Record<string, string> = {
    'system': '系统用户',
    'company': '企业用户'
  };
  
  return typeMap[user.user_type] || user.user_type;
};

/**
 * 检查用户是否应该显示企业信息
 * @param user 用户信息
 * @returns 是否应该显示企业信息
 */
export const shouldShowCompanyInfo = (user: User | null): boolean => {
  // 系统管理员不显示企业信息
  if (isSystemAdmin(user)) {
    return false;
  }
  
  // 企业用户需要有有效的company_id
  return hasValidCompanyId(user);
};

/**
 * 更新localStorage中的用户信息
 * @param user 用户信息
 */
export const updateCurrentUser = (user: User): void => {
  try {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } catch (error) {
    console.error('❌ 更新用户信息失败:', error);
  }
};

/**
 * 清除当前用户信息
 */
export const clearCurrentUser = (): void => {
  try {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  } catch (error) {
    console.error('❌ 清除用户信息失败:', error);
  }
};