/**
 * Theme Configuration
 * 主题配置系统 - 支持亮色/深色模式切换
 *
 * 用途：
 * - 管理应用主题（亮色/深色）
 * - 提供主题切换功能
 * - 集成 CSS 变量和 JS 变量
 *
 * 创建时间：2025-11-16
 */

import designTokens from './designTokens';

// 主题类型
export type ThemeMode = 'light' | 'dark' | 'auto';

// 主题配置接口
export interface ThemeConfig {
  mode: ThemeMode;
  colors: typeof designTokens.colors;
  typography: typeof designTokens.typography;
  spacing: typeof designTokens.spacing;
  borderRadius: typeof designTokens.borderRadius;
  shadows: typeof designTokens.shadows;
  transitions: typeof designTokens.transitions;
}

// 深色主题颜色覆盖
const darkModeColors = {
  primary: '#4a4a4a',
  primaryHover: '#666666',
  secondary: '#40a9ff',

  gradients: {
    promotion: 'linear-gradient(135deg, #5566cc 0%, #663a8a 100%)',
    productBlack: 'linear-gradient(135deg, #1a2332 0%, #22303f 100%)',
    productPink: 'linear-gradient(135deg, #c8806b 0%, #c4a84f 100%)',
    cardBackground: 'linear-gradient(135deg, #2a3447 0%, #3a2f47 100%)',
  },

  white: '#1a1a1a',
  black: '#ffffff',
  gray: {
    50: '#24292e',
    100: '#2d333b',
    200: '#373e47',
    300: '#444c56',
    400: '#768390',
    500: '#adbac7',
    600: '#cdd9e5',
    700: '#dee6ed',
    800: '#ecf2f8',
  },

  background: {
    primary: '#0d1117',
    secondary: '#161b22',
    detail: '#1c2128',
  },

  text: {
    primary: '#e6edf3',
    secondary: '#adbac7',
    tertiary: '#768390',
    white: '#0d1117',
  },
} as const;

// 深色主题阴影覆盖
const darkModeShadows = {
  ...designTokens.shadows,
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  base: '0 4px 12px rgba(0, 0, 0, 0.4)',
  md: '0 8px 20px rgba(0, 0, 0, 0.5)',
  lg: '0 12px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 60px rgba(0, 0, 0, 0.6)',
  hover: '0 8px 24px rgba(0, 0, 0, 0.4)',
} as const;

/**
 * 获取当前主题配置
 */
export const getThemeConfig = (mode: ThemeMode = 'light'): ThemeConfig => {
  const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    mode: isDark ? 'dark' : 'light',
    colors: isDark ? { ...designTokens.colors, ...darkModeColors } : designTokens.colors,
    typography: designTokens.typography,
    spacing: designTokens.spacing,
    borderRadius: designTokens.borderRadius,
    shadows: isDark ? darkModeShadows : designTokens.shadows,
    transitions: designTokens.transitions,
  };
};

/**
 * 主题管理类
 */
export class ThemeManager {
  private currentMode: ThemeMode = 'light';
  private listeners: Array<(mode: ThemeMode) => void> = [];

  constructor(initialMode: ThemeMode = 'light') {
    this.currentMode = initialMode;
    this.applyTheme(initialMode);

    // 监听系统主题变化
    if (initialMode === 'auto') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.currentMode === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }

  /**
   * 获取当前主题模式
   */
  getMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * 设置主题模式
   */
  setMode(mode: ThemeMode): void {
    this.currentMode = mode;
    this.applyTheme(mode);
    this.notifyListeners(mode);

    // 保存到 localStorage
    localStorage.setItem('theme-mode', mode);
  }

  /**
   * 切换主题（亮色 ⇄ 深色）
   */
  toggle(): void {
    const newMode = this.currentMode === 'dark' ? 'light' : 'dark';
    this.setMode(newMode);
  }

  /**
   * 订阅主题变化
   */
  subscribe(listener: (mode: ThemeMode) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 应用主题到 DOM
   */
  private applyTheme(mode: ThemeMode): void {
    const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * 通知所有订阅者
   */
  private notifyListeners(mode: ThemeMode): void {
    this.listeners.forEach((listener) => listener(mode));
  }

  /**
   * 从 localStorage 恢复主题
   */
  static restore(): ThemeManager {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
    return new ThemeManager(savedMode || 'light');
  }
}

/**
 * React Hook: 使用主题
 */
export const useTheme = () => {
  const [mode, setMode] = React.useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode | null;
    return saved || 'light';
  });

  React.useEffect(() => {
    const manager = new ThemeManager(mode);

    const unsubscribe = manager.subscribe((newMode) => {
      setMode(newMode);
    });

    return unsubscribe;
  }, []);

  const setThemeMode = React.useCallback((newMode: ThemeMode) => {
    const manager = ThemeManager.restore();
    manager.setMode(newMode);
    setMode(newMode);
  }, []);

  const toggleTheme = React.useCallback(() => {
    const manager = ThemeManager.restore();
    manager.toggle();
    setMode(manager.getMode());
  }, []);

  const config = React.useMemo(() => getThemeConfig(mode), [mode]);

  return {
    mode,
    config,
    setMode: setThemeMode,
    toggle: toggleTheme,
    isDark: mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  };
};

// React 导入（假设已安装）
import * as React from 'react';

/**
 * 默认主题管理器实例（单例）
 */
export const defaultThemeManager = ThemeManager.restore();

/**
 * 工具函数：获取 CSS 变量值
 */
export const getCSSVariable = (variableName: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
};

/**
 * 工具函数：设置 CSS 变量值
 */
export const setCSSVariable = (variableName: string, value: string): void => {
  document.documentElement.style.setProperty(variableName, value);
};

/**
 * 导出所有内容
 */
export default {
  getThemeConfig,
  ThemeManager,
  defaultThemeManager,
  useTheme,
  getCSSVariable,
  setCSSVariable,
};
