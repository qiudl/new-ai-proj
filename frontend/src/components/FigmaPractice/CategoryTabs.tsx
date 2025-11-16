/**
 * CategoryTabs 组件
 *
 * 分类标签页组件，用于显示和切换商品分类
 *
 * 特性：
 * - 支持多个分类标签
 * - 支持激活状态
 * - 支持禁用状态
 * - 响应式设计
 * - 平滑过渡动画
 *
 * @example
 * ```tsx
 * <CategoryTabs
 *   categories={['All', 'T-Shirts', 'Hoodies', 'Accessories']}
 *   activeCategory="All"
 *   onChange={(category) => console.log(category)}
 * />
 * ```
 */

import React, { useState } from 'react';
import { colors, typography, spacing, borderRadius, shadows, transitions } from './designTokens';

export interface Category {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  count?: number;
}

export interface CategoryTabsProps {
  /** 分类列表（简单模式：字符串数组） */
  categories?: string[];
  /** 分类列表（完整模式：对象数组） */
  items?: Category[];
  /** 当前激活的分类 */
  activeCategory?: string;
  /** 分类变化回调 */
  onChange?: (category: string) => void;
  /** 是否全宽显示 */
  fullWidth?: boolean;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 样式变体 */
  variant?: 'default' | 'pills' | 'underline';
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories = [],
  items = [],
  activeCategory,
  onChange,
  fullWidth = false,
  size = 'medium',
  variant = 'default',
}) => {
  // 处理简单模式和完整模式
  const categoryItems: Category[] = items.length > 0
    ? items
    : categories.map((cat) => ({ id: cat, label: cat }));

  // 内部状态管理（如果没有提供 activeCategory）
  const [internalActive, setInternalActive] = useState<string>(
    activeCategory || categoryItems[0]?.id || ''
  );

  const currentActive = activeCategory !== undefined ? activeCategory : internalActive;

  const handleClick = (categoryId: string, disabled?: boolean) => {
    if (disabled) return;

    if (activeCategory === undefined) {
      setInternalActive(categoryId);
    }

    onChange?.(categoryId);
  };

  // 样式配置
  const sizeConfig = {
    small: {
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: typography.fontSize.sm,
      gap: spacing[2],
    },
    medium: {
      padding: `${spacing[3]} ${spacing[5]}`,
      fontSize: typography.fontSize.base,
      gap: spacing[3],
    },
    large: {
      padding: `${spacing[4]} ${spacing[6]}`,
      fontSize: typography.fontSize.lg,
      gap: spacing[4],
    },
  };

  const currentSize = sizeConfig[size];

  // 容器样式
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: currentSize.gap,
    flexWrap: 'wrap',
    width: fullWidth ? '100%' : 'auto',
    padding: variant === 'underline' ? `0 0 ${spacing[1]}` : spacing[1],
    borderBottom: variant === 'underline' ? `2px solid ${colors.gray[200]}` : 'none',
  };

  // Tab 基础样式
  const getTabStyle = (isActive: boolean, disabled?: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: currentSize.padding,
      fontSize: currentSize.fontSize,
      fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
      color: disabled
        ? colors.gray[400]
        : isActive
        ? colors.white
        : colors.text.primary,
      background: disabled
        ? colors.gray[100]
        : isActive
        ? colors.primary
        : variant === 'pills'
        ? colors.gray[100]
        : 'transparent',
      border: variant === 'default' ? `2px solid ${isActive ? colors.primary : colors.gray[300]}` : 'none',
      borderRadius: variant === 'underline' ? '0' : borderRadius.base,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: transitions.default,
      opacity: disabled ? 0.5 : 1,
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      whiteSpace: 'nowrap',
      flex: fullWidth ? '1' : 'none',
      justifyContent: fullWidth ? 'center' : 'flex-start',
      position: 'relative',
      borderBottom: variant === 'underline' && isActive
        ? `3px solid ${colors.primary}`
        : variant === 'underline'
        ? `3px solid transparent`
        : 'none',
      marginBottom: variant === 'underline' ? '-2px' : '0',
    };

    return baseStyle;
  };

  // Hover 样式
  const getHoverStyle = (isActive: boolean, disabled?: boolean): React.CSSProperties => {
    if (disabled) return {};

    if (isActive) {
      return {
        background: colors.primaryHover,
      };
    }

    return {
      background: variant === 'pills' ? colors.gray[200] : colors.gray[50],
      borderColor: variant === 'default' ? colors.gray[400] : undefined,
      transform: 'translateY(-1px)',
      boxShadow: variant !== 'underline' ? shadows.sm : undefined,
    };
  };

  // 计数标签样式
  const countBadgeStyle: React.CSSProperties = {
    background: colors.secondary,
    color: colors.white,
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    minWidth: '20px',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle} role="tablist">
      {categoryItems.map((item) => {
        const isActive = currentActive === item.id;
        const [isHovered, setIsHovered] = useState(false);

        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={item.disabled}
            style={{
              ...getTabStyle(isActive, item.disabled),
              ...(isHovered ? getHoverStyle(isActive, item.disabled) : {}),
            }}
            onClick={() => handleClick(item.id, item.disabled)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(item.id, item.disabled);
              }
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span style={countBadgeStyle}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
