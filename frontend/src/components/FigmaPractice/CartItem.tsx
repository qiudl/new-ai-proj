/**
 * CartItem 组件
 *
 * 购物车项目组件，显示购物车中的单个商品
 *
 * 特性：
 * - 显示商品图片、名称、价格
 * - 数量选择器
 * - 删除按钮
 * - 支持选择状态
 * - 响应式设计
 *
 * @example
 * ```tsx
 * <CartItem
 *   id={1}
 *   name="Black T-Shirt"
 *   price={100}
 *   quantity={2}
 *   image="/images/tshirt.jpg"
 *   onQuantityChange={(qty) => console.log(qty)}
 *   onRemove={() => console.log('removed')}
 * />
 * ```
 */

import React, { useState } from 'react';
import { colors, typography, spacing, borderRadius, shadows, transitions } from './designTokens';

export interface CartItemProps {
  /** 商品ID */
  id: string | number;
  /** 商品名称 */
  name: string;
  /** 商品价格 */
  price: number;
  /** 购买数量 */
  quantity: number;
  /** 商品图片URL */
  image?: string;
  /** 商品图标（无图片时使用） */
  icon?: React.ReactNode;
  /** 商品颜色 */
  color?: string;
  /** 商品尺寸 */
  size?: string;
  /** 是否可选中 */
  selectable?: boolean;
  /** 是否已选中 */
  selected?: boolean;
  /** 选中状态变化 */
  onSelectChange?: (selected: boolean) => void;
  /** 数量变化回调 */
  onQuantityChange?: (quantity: number) => void;
  /** 删除回调 */
  onRemove?: () => void;
  /** 点击商品回调 */
  onClick?: () => void;
  /** 货币符号 */
  currency?: string;
}

export const CartItem: React.FC<CartItemProps> = ({
  id,
  name,
  price,
  quantity,
  image,
  icon = '🛍️',
  color,
  size,
  selectable = false,
  selected = false,
  onSelectChange,
  onQuantityChange,
  onRemove,
  onClick,
  currency = '¥',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  // 容器样式
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing[4],
    padding: spacing[4],
    background: colors.white,
    borderRadius: borderRadius.md,
    border: `2px solid ${selected ? colors.secondary : colors.gray[200]}`,
    transition: transitions.default,
    cursor: onClick ? 'pointer' : 'default',
    ...(isHovered && {
      boxShadow: shadows.md,
      transform: 'translateY(-2px)',
      borderColor: colors.gray[300],
    }),
  };

  // 复选框样式
  const checkboxStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: borderRadius.sm,
    border: `2px solid ${selected ? colors.secondary : colors.gray[400]}`,
    background: selected ? colors.secondary : colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: transitions.fast,
    flexShrink: 0,
    marginTop: '4px',
  };

  // 图片容器样式
  const imageContainerStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: borderRadius.base,
    background: image ? 'transparent' : colors.gradients.productBlack,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  };

  // 图片样式
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  // 内容容器样式
  const contentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
  };

  // 商品名称样式
  const nameStyle: React.CSSProperties = {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    lineHeight: typography.lineHeight.tight,
  };

  // 属性容器样式
  const attributesStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing[3],
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  };

  // 属性样式
  const attributeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  };

  // 价格容器样式
  const priceContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  };

  // 价格样式
  const priceStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  };

  // 小计样式
  const subtotalStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginLeft: spacing[2],
  };

  // 数量选择器容器样式
  const quantityContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  };

  // 数量按钮样式
  const quantityButtonStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: borderRadius.sm,
    border: `1px solid ${colors.gray[300]}`,
    background: colors.white,
    color: colors.text.primary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    transition: transitions.fast,
  };

  // 数量显示样式
  const quantityDisplayStyle: React.CSSProperties = {
    minWidth: '32px',
    textAlign: 'center',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  };

  // 删除按钮样式
  const deleteButtonStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: spacing[3],
    right: spacing[3],
    width: '24px',
    height: '24px',
    borderRadius: borderRadius.full,
    border: 'none',
    background: deleteHovered ? colors.error : colors.gray[200],
    color: deleteHovered ? colors.white : colors.text.secondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    transition: transitions.fast,
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      onQuantityChange?.(newQuantity);
    }
  };

  const subtotal = price * quantity;

  return (
    <div
      style={{ position: 'relative', ...containerStyle }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 复选框 */}
      {selectable && (
        <div
          style={checkboxStyle}
          onClick={(e) => {
            e.stopPropagation();
            onSelectChange?.(!selected);
          }}
        >
          {selected && (
            <span style={{ color: colors.white, fontSize: '14px' }}>✓</span>
          )}
        </div>
      )}

      {/* 商品图片 */}
      <div style={imageContainerStyle}>
        {image ? (
          <img src={image} alt={name} style={imageStyle} />
        ) : (
          <span style={{ fontSize: '32px' }}>{icon}</span>
        )}
      </div>

      {/* 商品信息 */}
      <div style={contentStyle}>
        <h4 style={nameStyle}>{name}</h4>

        {/* 商品属性 */}
        {(color || size) && (
          <div style={attributesStyle}>
            {color && (
              <div style={attributeStyle}>
                <span>颜色:</span>
                <span style={{ fontWeight: typography.fontWeight.medium }}>{color}</span>
              </div>
            )}
            {size && (
              <div style={attributeStyle}>
                <span>尺寸:</span>
                <span style={{ fontWeight: typography.fontWeight.medium }}>{size}</span>
              </div>
            )}
          </div>
        )}

        {/* 价格和数量 */}
        <div style={priceContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={priceStyle}>
              {currency}{price}
            </span>
            {quantity > 1 && (
              <span style={subtotalStyle}>
                小计: {currency}{subtotal}
              </span>
            )}
          </div>

          {/* 数量选择器 */}
          <div style={quantityContainerStyle}>
            <button
              style={{
                ...quantityButtonStyle,
                ...(quantity <= 1 && { opacity: 0.5, cursor: 'not-allowed' }),
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(quantity - 1);
              }}
              disabled={quantity <= 1}
            >
              −
            </button>
            <span style={quantityDisplayStyle}>{quantity}</span>
            <button
              style={quantityButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(quantity + 1);
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 删除按钮 */}
      {onRemove && (
        <button
          style={deleteButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          aria-label="Remove item"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default CartItem;
