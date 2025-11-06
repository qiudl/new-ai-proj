/**
 * 响应式Hook - 检测屏幕尺寸断点
 * Responsive Hook for Detecting Screen Size Breakpoints
 */

import { useState, useEffect } from 'react';
import { Grid } from 'antd';

const { useBreakpoint } = Grid;

/**
 * 屏幕尺寸类型
 */
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * Ant Design 断点配置
 * xs: < 576px
 * sm: ≥ 576px
 * md: ≥ 768px
 * lg: ≥ 992px
 * xl: ≥ 1200px
 * xxl: ≥ 1600px
 */
export const BREAKPOINTS = {
  xs: 576,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1600,
  xxl: 1920,
};

/**
 * 响应式信息接口
 */
export interface ResponsiveInfo {
  /** 当前是否为移动端 (< md) */
  isMobile: boolean;
  /** 当前是否为平板 (md - lg) */
  isTablet: boolean;
  /** 当前是否为桌面 (>= lg) */
  isDesktop: boolean;
  /** 当前是否为超小屏 (< sm) */
  isXs: boolean;
  /** 当前是否为小屏 (sm - md) */
  isSm: boolean;
  /** 当前是否为中屏 (md - lg) */
  isMd: boolean;
  /** 当前是否为大屏 (lg - xl) */
  isLg: boolean;
  /** 当前是否为超大屏 (>= xl) */
  isXl: boolean;
  /** 当前屏幕尺寸类型 */
  currentSize: ScreenSize;
  /** 当前屏幕宽度 */
  screenWidth: number;
  /** Ant Design 断点对象 */
  breakpoint: Partial<Record<ScreenSize, boolean>>;
}

/**
 * 使用响应式Hook
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 *
 * return (
 *   <div>
 *     {isMobile && <MobileView />}
 *     {isTablet && <TabletView />}
 *     {isDesktop && <DesktopView />}
 *   </div>
 * );
 * ```
 */
export const useResponsive = (): ResponsiveInfo => {
  const breakpoint = useBreakpoint();
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 计算当前屏幕尺寸
  const getCurrentSize = (): ScreenSize => {
    if (breakpoint.xxl) return 'xxl';
    if (breakpoint.xl) return 'xl';
    if (breakpoint.lg) return 'lg';
    if (breakpoint.md) return 'md';
    if (breakpoint.sm) return 'sm';
    return 'xs';
  };

  const currentSize = getCurrentSize();

  return {
    // 设备类型
    isMobile: !breakpoint.md, // < 768px
    isTablet: breakpoint.md && !breakpoint.lg, // 768px - 992px
    isDesktop: breakpoint.lg || false, // >= 992px

    // 具体断点
    isXs: !breakpoint.sm, // < 576px
    isSm: breakpoint.sm && !breakpoint.md, // 576px - 768px
    isMd: breakpoint.md && !breakpoint.lg, // 768px - 992px
    isLg: breakpoint.lg && !breakpoint.xl, // 992px - 1200px
    isXl: breakpoint.xl || false, // >= 1200px

    // 其他信息
    currentSize,
    screenWidth,
    breakpoint,
  };
};

/**
 * 根据屏幕尺寸获取值
 *
 * @example
 * ```tsx
 * const columns = getResponsiveValue({
 *   xs: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4,
 * }, 'xs');
 * ```
 */
export const getResponsiveValue = <T,>(
  values: Partial<Record<ScreenSize, T>>,
  currentSize: ScreenSize
): T | undefined => {
  // 按照优先级从大到小查找
  const priorities: ScreenSize[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = priorities.indexOf(currentSize);

  // 从当前尺寸开始向下查找
  for (let i = currentIndex; i < priorities.length; i++) {
    const size = priorities[i];
    if (values[size] !== undefined) {
      return values[size];
    }
  }

  return undefined;
};

/**
 * 获取响应式Modal宽度
 */
export const getResponsiveModalWidth = (
  defaultWidth: number,
  responsive: ResponsiveInfo
): number | string => {
  if (responsive.isXs) return '95%';
  if (responsive.isSm) return '90%';
  if (responsive.isMd) return Math.min(defaultWidth, 700);
  return defaultWidth;
};

/**
 * 获取响应式Table滚动宽度
 */
export const getResponsiveTableScroll = (
  defaultScrollX: number,
  responsive: ResponsiveInfo
): { x?: number | string; y?: number } => {
  if (responsive.isMobile) {
    return { x: 'max-content' }; // 移动端自适应宽度
  }
  return { x: defaultScrollX };
};

export default useResponsive;
