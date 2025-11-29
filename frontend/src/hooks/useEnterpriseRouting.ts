/**
 * 企业路由 Hook
 *
 * 根据用户类型自动生成正确的路由路径：
 * - 企业用户：使用 /enterprises/{enterpriseId}/xxx 格式
 * - 系统用户：使用系统级路由如 /user-management
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/userUtils';
import {
  ENTERPRISE_ROUTE_MAP,
  EnterpriseRouteKey,
  isValidRouteKey,
} from '../config/enterpriseRoutes';

export interface EnterpriseRoutingResult {
  /** 当前是否为企业用户模式 */
  isEnterpriseMode: boolean;

  /** 当前企业ID（企业用户模式下） */
  enterpriseId: number | null;

  /** 企业路由前缀 (如 /enterprises/3) */
  enterprisePrefix: string;

  /** 根据路由标识获取完整路由路径 */
  getRoute: (routeKey: EnterpriseRouteKey) => string;

  /** 根据路由标识导航到对应页面 */
  navigateTo: (routeKey: EnterpriseRouteKey, params?: Record<string, string>) => void;

  /** 获取带企业前缀的自定义路径 */
  getEnterprisePath: (path: string) => string;

  /** 根据用户详情ID获取用户详情页路由 */
  getUserDetailRoute: (userId: number) => string;

  /** 用户类型 */
  userType: string | undefined;
}

/**
 * 判断用户类型是否为企业用户
 */
const isEnterpriseUserType = (userType: string | undefined): boolean => {
  if (!userType) return false;
  const enterpriseTypes = ['enterprise', 'enterprise_user', 'company', 'company_user'];
  return enterpriseTypes.includes(userType.toLowerCase());
};

/**
 * 企业路由 Hook
 *
 * @example
 * ```tsx
 * const { getRoute, navigateTo, isEnterpriseMode } = useEnterpriseRouting();
 *
 * // 获取用户管理路由
 * const usersRoute = getRoute('org-users');
 * // 企业用户: /enterprises/3/users
 * // 系统用户: /user-management
 *
 * // 导航到用户管理
 * navigateTo('org-users');
 * ```
 */
export const useEnterpriseRouting = (): EnterpriseRoutingResult => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // 用户类型
  const userType = currentUser?.user_type;

  // 判断是否为企业用户模式
  const isEnterpriseMode = useMemo(() => {
    return isEnterpriseUserType(userType);
  }, [userType]);

  // 获取企业ID
  const enterpriseId = useMemo((): number | null => {
    if (!isEnterpriseMode) return null;
    return currentUser?.enterprise_id || null;
  }, [isEnterpriseMode, currentUser?.enterprise_id]);

  // 企业路由前缀
  const enterprisePrefix = useMemo(() => {
    if (!isEnterpriseMode || !enterpriseId) return '';
    return `/enterprises/${enterpriseId}`;
  }, [isEnterpriseMode, enterpriseId]);

  // 获取路由
  const getRoute = useCallback(
    (routeKey: EnterpriseRouteKey): string => {
      if (!isValidRouteKey(routeKey)) {
        console.warn(`[useEnterpriseRouting] Unknown route key: ${routeKey}`);
        return '/';
      }

      const routeConfig = ENTERPRISE_ROUTE_MAP[routeKey];

      if (isEnterpriseMode && enterpriseId) {
        // 企业用户模式：添加企业前缀
        return `${enterprisePrefix}${routeConfig.enterprise}`;
      }

      // 系统用户模式：使用系统路由
      return routeConfig.system;
    },
    [isEnterpriseMode, enterpriseId, enterprisePrefix]
  );

  // 导航
  const navigateTo = useCallback(
    (routeKey: EnterpriseRouteKey, params?: Record<string, string>) => {
      let path = getRoute(routeKey);

      // 替换路径参数
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          path = path.replace(`:${key}`, value);
        });
      }

      navigate(path);
    },
    [getRoute, navigate]
  );

  // 获取带企业前缀的自定义路径
  const getEnterprisePath = useCallback(
    (path: string): string => {
      if (isEnterpriseMode && enterpriseId) {
        // 确保路径以 / 开头
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${enterprisePrefix}${normalizedPath}`;
      }
      return path;
    },
    [isEnterpriseMode, enterpriseId, enterprisePrefix]
  );

  // 获取用户详情页路由
  const getUserDetailRoute = useCallback(
    (userId: number): string => {
      if (isEnterpriseMode && enterpriseId) {
        return `${enterprisePrefix}/users/${userId}`;
      }
      return `/user-management/${userId}`;
    },
    [isEnterpriseMode, enterpriseId, enterprisePrefix]
  );

  return {
    isEnterpriseMode,
    enterpriseId,
    enterprisePrefix,
    getRoute,
    navigateTo,
    getEnterprisePath,
    getUserDetailRoute,
    userType,
  };
};

/**
 * 非 Hook 版本：根据用户信息生成路由
 * 用于不在 React 组件中的场景
 */
export const getEnterpriseRoute = (
  routeKey: EnterpriseRouteKey,
  enterpriseId: number | null,
  isEnterpriseUser: boolean
): string => {
  if (!isValidRouteKey(routeKey)) {
    console.warn(`[getEnterpriseRoute] Unknown route key: ${routeKey}`);
    return '/';
  }

  const routeConfig = ENTERPRISE_ROUTE_MAP[routeKey];

  if (isEnterpriseUser && enterpriseId) {
    return `/enterprises/${enterpriseId}${routeConfig.enterprise}`;
  }

  return routeConfig.system;
};

export default useEnterpriseRouting;
