/**
 * IconButton 组件
 *
 * 图标按钮组件，用于显示带图标的按钮
 *
 * 特性：
 * - 支持多种样式变体
 * - 支持多种尺寸
 * - 支持圆形/方形
 * - 支持禁用和加载状态
 * - 支持提示信息
 * - 完整的无障碍支持
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon="❤️"
 *   onClick={() => console.log('Liked!')}
 *   tooltip="Add to favorites"
 * />
 * ```
 */

import React, { useState } from 'react';
import { colors, typography, spacing, borderRadius, shadows, transitions } from './designTokens';

export interface IconButtonProps {
  /** 图标内容 */
  icon: React.ReactNode;
  /** 点击事件 */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** 样式变体 */
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 形状 */
  shape?: 'circle' | 'square' | 'rounded';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 提示信息 */
  tooltip?: string;
  /** 提示位置 */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** aria-label */
  ariaLabel?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  variant = 'default',
  size = 'medium',
  shape = 'circle',
  disabled = false,
  loading = false,
  tooltip,
  tooltipPosition = 'top',
  ariaLabel,
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // 尺寸配置
  const sizeConfig = {
    small: {
      size: '32px',
      fontSize: typography.fontSize.sm,
      iconSize: '16px',
    },
    medium: {
      size: '40px',
      fontSize: typography.fontSize.base,
      iconSize: '20px',
    },
    large: {
      size: '48px',
      fontSize: typography.fontSize.lg,
      iconSize: '24px',
    },
  };

  const currentSize = sizeConfig[size];

  // 变体配置
  const variantConfig = {
    default: {
      background: colors.white,
      color: colors.text.primary,
      border: `1px solid ${colors.gray[300]}`,
      hoverBackground: colors.gray[50],
      hoverColor: colors.text.primary,
    },
    primary: {
      background: colors.primary,
      color: colors.white,
      border: 'none',
      hoverBackground: colors.primaryHover,
      hoverColor: colors.white,
    },
    secondary: {
      background: colors.secondary,
      color: colors.white,
      border: 'none',
      hoverBackground: '#1677cc',
      hoverColor: colors.white,
    },
    outline: {
      background: 'transparent',
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      hoverBackground: colors.primary,
      hoverColor: colors.white,
    },
    ghost: {
      background: 'transparent',
      color: colors.text.primary,
      border: 'none',
      hoverBackground: colors.gray[100],
      hoverColor: colors.text.primary,
    },
    danger: {
      background: colors.error,
      color: colors.white,
      border: 'none',
      hoverBackground: '#d92828',
      hoverColor: colors.white,
    },
  };

  const currentVariant = variantConfig[variant];

  // 形状配置
  const shapeConfig = {
    circle: borderRadius.full,
    square: '0',
    rounded: borderRadius.md,
  };

  // 按钮样式
  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    width: currentSize.size,
    height: currentSize.size,
    padding: 0,
    border: currentVariant.border,
    borderRadius: shapeConfig[shape],
    background: disabled ? colors.gray[200] : currentVariant.background,
    color: disabled ? colors.gray[400] : currentVariant.color,
    fontSize: currentSize.iconSize,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: transitions.default,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    opacity: disabled ? 0.5 : 1,
    ...(isHovered && !disabled && !loading && {
      background: currentVariant.hoverBackground,
      color: currentVariant.hoverColor,
      transform: 'translateY(-2px)',
      boxShadow: shadows.md,
    }),
    ...style,
  };

  // 加载动画样式
  const loadingSpinnerStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    border: `2px solid ${currentVariant.color}`,
    borderTopColor: 'transparent',
    borderRadius: borderRadius.full,
    animation: 'spin 0.8s linear infinite',
  };

  // 提示框样式
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    padding: `${spacing[2]} ${spacing[3]}`,
    background: colors.gray[800],
    color: colors.white,
    fontSize: typography.fontSize.xs,
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 1000,
    opacity: showTooltip && !disabled ? 1 : 0,
    transition: transitions.fast,
    ...(tooltipPosition === 'top' && {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: spacing[2],
    }),
    ...(tooltipPosition === 'bottom' && {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: spacing[2],
    }),
    ...(tooltipPosition === 'left' && {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: spacing[2],
    }),
    ...(tooltipPosition === 'right' && {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: spacing[2],
    }),
  };

  // 提示箭头样式
  const tooltipArrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    ...(tooltipPosition === 'top' && {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderWidth: '4px 4px 0 4px',
      borderColor: `${colors.gray[800]} transparent transparent transparent`,
    }),
    ...(tooltipPosition === 'bottom' && {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderWidth: '0 4px 4px 4px',
      borderColor: `transparent transparent ${colors.gray[800]} transparent`,
    }),
    ...(tooltipPosition === 'left' && {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      borderWidth: '4px 0 4px 4px',
      borderColor: `transparent transparent transparent ${colors.gray[800]}`,
    }),
    ...(tooltipPosition === 'right' && {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      borderWidth: '4px 4px 4px 0',
      borderColor: `transparent ${colors.gray[800]} transparent transparent`,
    }),
  };

  return (
    <>
      {/* 动画关键帧 */}
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <button
        style={buttonStyle}
        onClick={onClick}
        disabled={disabled || loading}
        onMouseEnter={() => {
          setIsHovered(true);
          if (tooltip) setShowTooltip(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowTooltip(false);
        }}
        onFocus={() => {
          if (tooltip) setShowTooltip(true);
        }}
        onBlur={() => setShowTooltip(false)}
        aria-label={ariaLabel || (typeof icon === 'string' ? icon : 'Icon button')}
        aria-busy={loading}
      >
        {/* 加载状态 */}
        {loading ? (
          <div style={loadingSpinnerStyle} />
        ) : (
          icon
        )}

        {/* 提示框 */}
        {tooltip && (
          <div style={tooltipStyle}>
            {tooltip}
            <div style={tooltipArrowStyle} />
          </div>
        )}
      </button>
    </>
  );
};

export default IconButton;
