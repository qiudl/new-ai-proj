/**
 * 设计 Token 配置
 * 从 Figma Clothes Store UI 提取的设计规范
 *
 * 用途：统一管理颜色、字体、间距、圆角等设计元素
 * 优势：设计更新时只需修改此文件
 */

export const colors = {
  // 主色调
  primary: '#333333',
  primaryHover: '#000000',
  secondary: '#1890ff',

  // T-shirt 商品色
  productBlack: {
    start: '#2c3e50',
    end: '#34495e',
  },
  productPink: {
    start: '#fda085',
    end: '#f6d365',
  },

  // 渐变色
  gradients: {
    promotion: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    productBlack: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    productPink: 'linear-gradient(135deg, #fda085 0%, #f6d365 100%)',
    cardBackground: 'linear-gradient(135deg, #e0e7ff 0%, #f0e7ff 100%)',
  },

  // 中性色
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f8f9fa',
    100: '#f0f0f0',
    200: '#e0e0e0',
    300: '#ddd',
    400: '#999',
    500: '#666',
    600: '#595959',
    700: '#333',
    800: '#24292e',
  },

  // 背景色
  background: {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    detail: '#f0f4f8',
  },

  // 文字颜色
  text: {
    primary: '#333',
    secondary: '#666',
    tertiary: '#999',
    white: '#ffffff',
  },

  // 状态色
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',
} as const;

export const typography = {
  // 字体家族
  fontFamily: {
    primary: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    mono: "'Monaco', 'Menlo', 'Courier New', monospace",
  },

  // 字号
  fontSize: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
    '4xl': '32px',
    '5xl': '36px',
  },

  // 字重
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // 行高
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
  },
} as const;

export const spacing = {
  // 间距（基于 4px 网格）
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const;

export const borderRadius = {
  none: '0',
  sm: '6px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '50%',
  circle: '50%',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
  base: '0 4px 12px rgba(0, 0, 0, 0.1)',
  md: '0 8px 20px rgba(0, 0, 0, 0.15)',
  lg: '0 12px 24px rgba(0, 0, 0, 0.12)',
  xl: '0 20px 60px rgba(0, 0, 0, 0.2)',

  // 交互状态阴影
  hover: '0 8px 24px rgba(0, 0, 0, 0.12)',
  focus: '0 0 0 3px rgba(24, 144, 255, 0.2)',
} as const;

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const transitions = {
  // 过渡时间
  duration: {
    fast: '150ms',
    base: '200ms',
    normal: '300ms',
    slow: '500ms',
  },

  // 缓动函数
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // 常用组合
  default: 'all 0.3s ease',
  fast: 'all 0.15s ease',
  slow: 'all 0.5s ease',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
} as const;

// 导出所有 token 的类型
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Breakpoints = typeof breakpoints;
export type Transitions = typeof transitions;
export type ZIndex = typeof zIndex;

// 统一导出
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  transitions,
  zIndex,
} as const;

export default designTokens;
