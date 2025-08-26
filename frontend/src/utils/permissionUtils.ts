import { ROUTE_PERMISSIONS } from '../constants/permissions';
import { permissionService } from '../services/permissionService';

/**
 * 权限工具类
 * 提供权限相关的工具方法
 */
export class PermissionUtils {
  /**
   * 获取路由所需的权限
   * @param pathname 路由路径
   * @returns 权限数组
   */
  static getRoutePermissions(pathname: string): string[] {
    // 精确匹配
    if (ROUTE_PERMISSIONS[pathname as keyof typeof ROUTE_PERMISSIONS]) {
      return ROUTE_PERMISSIONS[pathname as keyof typeof ROUTE_PERMISSIONS];
    }

    // 动态路由匹配
    for (const [route, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
      if (this.matchDynamicRoute(route, pathname)) {
        return permissions;
      }
    }

    return [];
  }

  /**
   * 匹配动态路由
   * @param route 路由模板（如 /companies/:id）
   * @param pathname 实际路径（如 /companies/123）
   * @returns 是否匹配
   */
  static matchDynamicRoute(route: string, pathname: string): boolean {
    const routeParts = route.split('/');
    const pathParts = pathname.split('/');

    if (routeParts.length !== pathParts.length) {
      return false;
    }

    return routeParts.every((part, index) => {
      return part.startsWith(':') || part === pathParts[index];
    });
  }

  /**
   * 批量检查权限
   * @param permissions 权限列表
   * @param requireAll 是否需要全部权限
   * @param resourceId 资源ID
   * @returns 权限检查结果
   */
  static async batchCheckPermissions(
    permissions: string[],
    requireAll: boolean = false,
    resourceId?: number
  ): Promise<boolean> {
    try {
      if (permissions.length === 0) {
        return true;
      }

      if (requireAll) {
        return await permissionService.hasAllPermissions(permissions, resourceId);
      } else {
        return await permissionService.hasAnyPermission(permissions, resourceId);
      }
    } catch (error) {
      console.error('[PermissionUtils] Batch permission check failed:', error);
      return false;
    }
  }

  /**
   * 格式化权限显示名称
   * @param permission 权限代码
   * @returns 显示名称
   */
  static formatPermissionName(permission: string): string {
    const parts = permission.split('_');
    return parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * 根据权限获取建议的用户角色
   * @param permissions 权限列表
   * @returns 建议的角色
   */
  static suggestRoleForPermissions(permissions: string[]): string {
    const adminPermissions = ['system_admin', 'company_admin', 'permission_admin'];
    const managerPermissions = ['project_admin', 'user_admin', 'task_admin'];

    if (permissions.some(p => adminPermissions.includes(p))) {
      return 'admin';
    }

    if (permissions.some(p => managerPermissions.includes(p))) {
      return 'manager';
    }

    return 'user';
  }

  /**
   * 检查用户是否有管理员权限
   * @param userPermissions 用户权限列表
   * @returns 是否为管理员
   */
  static isAdmin(userPermissions: string[]): boolean {
    const adminPermissions = [
      'system_admin',
      'company_admin',
      'permission_admin'
    ];

    return userPermissions.some(permission =>
      adminPermissions.includes(permission)
    );
  }

  /**
   * 获取权限的资源类型
   * @param permission 权限代码
   * @returns 资源类型
   */
  static getPermissionResource(permission: string): string {
    const parts = permission.split('_');
    return parts[0];
  }

  /**
   * 获取权限的操作类型
   * @param permission 权限代码
   * @returns 操作类型
   */
  static getPermissionAction(permission: string): string {
    const parts = permission.split('_');
    return parts.slice(1).join('_');
  }

  /**
   * 检查权限是否为危险操作
   * @param permission 权限代码
   * @returns 是否为危险操作
   */
  static isDangerousPermission(permission: string): boolean {
    const dangerousActions = ['delete', 'admin', 'create'];
    const action = this.getPermissionAction(permission);
    return dangerousActions.includes(action);
  }
}