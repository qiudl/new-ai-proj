/**
 * PromotionBanner 组件
 *
 * 促销横幅组件，用于显示特别优惠、活动信息等
 *
 * 特性：
 * - 支持渐变背景
 * - 支持图标
 * - 支持关闭按钮
 * - 支持点击事件
 * - 响应式设计
 * - 平滑动画
 *
 * @example
 * ```tsx
 * <PromotionBanner
 *   title="Summer Sale"
 *   description="Up to 50% off on selected items"
 *   action="Shop Now"
 *   onActionClick={() => console.log('Clicked')}
 * />
 * ```
 */

import React, { useState } from 'react';
import { colors, typography, spacing, borderRadius, shadows, transitions } from './designTokens';

export interface PromotionBannerProps {
  /** 标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 行动按钮文字 */
  action?: string;
  /** 行动按钮点击事件 */
  onActionClick?: () => void;
  /** 图标 */
  icon?: React.ReactNode;
  /** 背景类型 */
  background?: 'primary' | 'secondary' | 'gradient' | 'success' | 'warning' | 'error';
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 关闭事件 */
  onClose?: () => void;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 是否全宽 */
  fullWidth?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export const PromotionBanner: React.FC<PromotionBannerProps> = ({
  title,
  description,
  action,
  onActionClick,
  icon,
  background = 'gradient',
  closable = false,
  onClose,
  size = 'medium',
  fullWidth = true,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // 等待动画完成
  };

  if (!isVisible && closable) {
    return null;
  }

  // 尺寸配置
  const sizeConfig = {
    small: {
      padding: spacing[4],
      titleSize: typography.fontSize.lg,
      descSize: typography.fontSize.sm,
      iconSize: '32px',
    },
    medium: {
      padding: spacing[6],
      titleSize: typography.fontSize['2xl'],
      descSize: typography.fontSize.base,
      iconSize: '48px',
    },
    large: {
      padding: spacing[8],
      titleSize: typography.fontSize['3xl'],
      descSize: typography.fontSize.lg,
      iconSize: '64px',
    },
  };

  const currentSize = sizeConfig[size];

  // 背景配置
  const backgroundConfig = {
    primary: colors.primary,
    secondary: colors.secondary,
    gradient: colors.gradients.promotion,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };

  // 容器样式
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    background: backgroundConfig[background],
    padding: currentSize.padding,
    borderRadius: borderRadius.lg,
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    boxShadow: shadows.lg,
    transition: transitions.default,
    transform: isVisible ? 'scale(1)' : 'scale(0.95)',
    opacity: isVisible ? 1 : 0,
    width: fullWidth ? '100%' : 'auto',
    overflow: 'hidden',
    ...(isHovered && {
      boxShadow: shadows.xl,
      transform: 'scale(1.02)',
    }),
    ...style,
  };

  // 图标容器样式
  const iconContainerStyle: React.CSSProperties = {
    fontSize: currentSize.iconSize,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // 内容容器样式
  const contentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
  };

  // 标题样式
  const titleStyle: React.CSSProperties = {
    fontSize: currentSize.titleSize,
    fontWeight: typography.fontWeight.bold,
    margin: 0,
    lineHeight: typography.lineHeight.tight,
  };

  // 描述样式
  const descriptionStyle: React.CSSProperties = {
    fontSize: currentSize.descSize,
    fontWeight: typography.fontWeight.normal,
    opacity: 0.9,
    margin: 0,
    lineHeight: typography.lineHeight.normal,
  };

  // 行动按钮样式
  const actionButtonStyle: React.CSSProperties = {
    background: colors.white,
    color: background === 'gradient' ? colors.primary : backgroundConfig[background],
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borderRadius.base,
    border: 'none',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: transitions.default,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  // 关闭按钮样式
  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    background: 'rgba(255, 255, 255, 0.2)',
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.full,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: typography.fontSize.lg,
    transition: transitions.fast,
    fontWeight: typography.fontWeight.bold,
  };

  const [actionHovered, setActionHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="banner"
    >
      {/* 图标 */}
      {icon && <div style={iconContainerStyle}>{icon}</div>}

      {/* 内容 */}
      <div style={contentStyle}>
        <h3 style={titleStyle}>{title}</h3>
        {description && <p style={descriptionStyle}>{description}</p>}
      </div>

      {/* 行动按钮 */}
      {action && onActionClick && (
        <button
          style={{
            ...actionButtonStyle,
            ...(actionHovered && {
              transform: 'translateY(-2px)',
              boxShadow: shadows.md,
            }),
          }}
          onClick={onActionClick}
          onMouseEnter={() => setActionHovered(true)}
          onMouseLeave={() => setActionHovered(false)}
        >
          {action}
        </button>
      )}

      {/* 关闭按钮 */}
      {closable && (
        <button
          style={{
            ...closeButtonStyle,
            ...(closeHovered && {
              background: 'rgba(255, 255, 255, 0.3)',
              transform: 'scale(1.1)',
            }),
          }}
          onClick={handleClose}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          aria-label="Close banner"
        >
          ×
        </button>
      )}

      {/* 装饰性元素（可选） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
          pointerEvents: 'none',
          opacity: isHovered ? 0.5 : 0,
          transition: transitions.default,
        }}
      />
    </div>
  );
};

export default PromotionBanner;
