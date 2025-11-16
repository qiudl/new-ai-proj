import React from 'react';
import { colors, borderRadius, transitions, shadows, spacing, typography } from './designTokens';

export interface ButtonProps {
  /**
   * 按钮文本
   */
  children: React.ReactNode;

  /**
   * 按钮类型
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'text';

  /**
   * 按钮尺寸
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 是否为块级按钮（宽度100%）
   */
  block?: boolean;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 是否加载中
   */
  loading?: boolean;

  /**
   * 图标（可选）
   */
  icon?: React.ReactNode;

  /**
   * 点击事件
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 自定义样式
   */
  style?: React.CSSProperties;

  /**
   * HTML button type
   */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Button 组件
 * 从 Figma Clothes Store UI 提取的按钮设计
 *
 * @example
 * ```tsx
 * <Button variant="primary">加入购物车</Button>
 * <Button variant="outline" size="small">查看详情</Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  block = false,
  disabled = false,
  loading = false,
  icon,
  onClick,
  className = '',
  style = {},
  type = 'button',
}) => {
  // 样式计算
  const buttonStyle: React.CSSProperties = {
    // 基础样式
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: transitions.default,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeight.semibold,
    textDecoration: 'none',
    userSelect: 'none',
    opacity: disabled || loading ? 0.6 : 1,

    // 宽度
    width: block ? '100%' : 'auto',

    // 根据 size 设置尺寸
    ...(size === 'small' && {
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: typography.fontSize.sm,
      borderRadius: borderRadius.base,
      minHeight: '32px',
    }),
    ...(size === 'medium' && {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.base,
      borderRadius: borderRadius.md,
      minHeight: '40px',
    }),
    ...(size === 'large' && {
      padding: `${spacing[4]} ${spacing[8]}`,
      fontSize: typography.fontSize.md,
      borderRadius: borderRadius.md,
      minHeight: '48px',
    }),

    // 根据 variant 设置颜色
    ...(variant === 'primary' && {
      background: colors.primary,
      color: colors.white,
    }),
    ...(variant === 'secondary' && {
      background: colors.secondary,
      color: colors.white,
    }),
    ...(variant === 'outline' && {
      background: 'transparent',
      color: colors.primary,
      border: `2px solid ${colors.gray[200]}`,
    }),
    ...(variant === 'text' && {
      background: 'transparent',
      color: colors.primary,
    }),

    // 合并用户自定义样式
    ...style,
  };

  // Hover 样式（通过 CSS class）
  const hoverClass = [
    variant === 'primary' && 'button-hover-primary',
    variant === 'secondary' && 'button-hover-secondary',
    variant === 'outline' && 'button-hover-outline',
    variant === 'text' && 'button-hover-text',
  ].filter(Boolean).join(' ');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <>
      <style>{`
        .button-hover-primary:hover:not(:disabled) {
          background: ${colors.primaryHover};
          transform: translateY(-2px);
          box-shadow: ${shadows.md};
        }

        .button-hover-secondary:hover:not(:disabled) {
          background: #096dd9;
          transform: translateY(-2px);
          box-shadow: ${shadows.md};
        }

        .button-hover-outline:hover:not(:disabled) {
          border-color: ${colors.secondary};
          color: ${colors.secondary};
          background: rgba(24, 144, 255, 0.05);
        }

        .button-hover-text:hover:not(:disabled) {
          background: ${colors.gray[50]};
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <button
        type={type}
        style={buttonStyle}
        className={`${hoverClass} ${className}`.trim()}
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {loading && <span>⏳</span>}
        {icon && !loading && icon}
        {children}
      </button>
    </>
  );
};

export default Button;
