import React from 'react';
import { colors, borderRadius, transitions, shadows, spacing, typography } from './designTokens';

export interface ProductCardProps {
  /**
   * 商品ID
   */
  id: string | number;

  /**
   * 商品名称
   */
  name: string;

  /**
   * 商品价格
   */
  price: number;

  /**
   * 商品图片URL（可选，如果没有则显示渐变背景）
   */
  image?: string;

  /**
   * 商品颜色主题（用于渐变背景）
   */
  colorTheme?: 'black' | 'pink' | 'default';

  /**
   * 商品图标（emoji 或 React 组件）
   */
  icon?: React.ReactNode;

  /**
   * 点击事件
   */
  onClick?: (id: string | number) => void;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 自定义样式
   */
  style?: React.CSSProperties;
}

/**
 * ProductCard 组件
 * 从 Figma Clothes Store UI 提取的商品卡片设计
 *
 * @example
 * ```tsx
 * <ProductCard
 *   id={1}
 *   name="Black Crew Neck T-shirt"
 *   price={100}
 *   colorTheme="black"
 *   icon="👕"
 * />
 * ```
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  image,
  colorTheme = 'default',
  icon = '👕',
  onClick,
  className = '',
  style = {},
}) => {
  // 根据颜色主题选择背景
  const getBackground = (): string => {
    if (colorTheme === 'black') {
      return colors.gradients.productBlack;
    } else if (colorTheme === 'pink') {
      return colors.gradients.productPink;
    }
    return colors.gradients.cardBackground;
  };

  const cardStyle: React.CSSProperties = {
    background: colors.gray[50],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: transitions.default,
    ...style,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '240px',
    background: image ? `url(${image}) center/cover` : getBackground(),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    position: 'relative',
  };

  const infoStyle: React.CSSProperties = {
    padding: spacing[4],
  };

  const nameStyle: React.CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    fontWeight: typography.fontWeight.normal,
  };

  const priceStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  };

  const handleClick = () => {
    onClick?.(id);
  };

  return (
    <>
      <style>{`
        .product-card-hover:hover {
          transform: translateY(-6px);
          box-shadow: ${shadows.lg};
        }
      `}</style>

      <div
        className={`product-card-hover ${className}`.trim()}
        style={cardStyle}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        <div style={imageStyle}>
          {!image && icon}
        </div>
        <div style={infoStyle}>
          <div style={nameStyle}>{name}</div>
          <div style={priceStyle}>${price}</div>
        </div>
      </div>
    </>
  );
};

export default ProductCard;
