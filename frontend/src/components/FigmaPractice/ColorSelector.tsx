/**
 * ColorSelector 组件
 *
 * 颜色选择器组件，用于选择商品颜色
 *
 * 特性：
 * - 支持多种颜色选项
 * - 支持选中状态
 * - 支持禁用状态
 * - 悬停效果
 * - 无障碍支持
 *
 * @example
 * ```tsx
 * <ColorSelector
 *   colors={[
 *     { id: 'black', name: 'Black', value: '#000000' },
 *     { id: 'white', name: 'White', value: '#FFFFFF' },
 *   ]}
 *   selectedColor="black"
 *   onChange={(colorId) => console.log(colorId)}
 * />
 * ```
 */

import React, { useState } from 'react';
import { colors as tokenColors, typography, spacing, borderRadius, shadows, transitions } from './designTokens';

export interface ColorOption {
  /** 颜色ID */
  id: string;
  /** 颜色名称 */
  name: string;
  /** 颜色值 */
  value: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否售罄 */
  outOfStock?: boolean;
}

export interface ColorSelectorProps {
  /** 颜色选项列表 */
  colors: ColorOption[];
  /** 当前选中的颜色ID */
  selectedColor?: string;
  /** 颜色变化回调 */
  onChange?: (colorId: string) => void;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 显示颜色名称 */
  showLabel?: boolean;
  /** 标签位置 */
  labelPosition?: 'top' | 'bottom' | 'right';
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  colors,
  selectedColor,
  onChange,
  size = 'medium',
  showLabel = true,
  labelPosition = 'top',
}) => {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // 尺寸配置
  const sizeConfig = {
    small: {
      swatchSize: '24px',
      fontSize: typography.fontSize.xs,
      gap: spacing[2],
    },
    medium: {
      swatchSize: '36px',
      fontSize: typography.fontSize.sm,
      gap: spacing[3],
    },
    large: {
      swatchSize: '48px',
      fontSize: typography.fontSize.base,
      gap: spacing[4],
    },
  };

  const currentSize = sizeConfig[size];

  // 容器样式
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: labelPosition === 'right' ? 'row' : 'column',
    gap: currentSize.gap,
    alignItems: labelPosition === 'right' ? 'center' : 'flex-start',
  };

  // 标签样式
  const labelStyle: React.CSSProperties = {
    fontSize: currentSize.fontSize,
    fontWeight: typography.fontWeight.medium,
    color: tokenColors.text.primary,
    marginBottom: labelPosition === 'top' ? spacing[2] : 0,
  };

  // 色块容器样式
  const swatchesContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: currentSize.gap,
    flexWrap: 'wrap',
  };

  // 获取色块样式
  const getSwatchStyle = (
    colorOption: ColorOption,
    isSelected: boolean,
    isHovered: boolean
  ): React.CSSProperties => {
    const { disabled, outOfStock } = colorOption;

    return {
      width: currentSize.swatchSize,
      height: currentSize.swatchSize,
      borderRadius: borderRadius.full,
      background: colorOption.value,
      border: `3px solid ${isSelected ? tokenColors.secondary : 'transparent'}`,
      outline: isHovered && !disabled ? `2px solid ${tokenColors.gray[400]}` : 'none',
      outlineOffset: '2px',
      cursor: disabled || outOfStock ? 'not-allowed' : 'pointer',
      transition: transitions.fast,
      position: 'relative',
      opacity: disabled || outOfStock ? 0.4 : 1,
      transform: isSelected ? 'scale(1.1)' : isHovered ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isSelected ? shadows.base : 'none',
    };
  };

  // 选中标记样式
  const checkMarkStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#FFFFFF',
    fontSize: size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
    fontWeight: typography.fontWeight.bold,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  };

  // 售罄标记样式
  const outOfStockStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    width: '120%',
    height: '2px',
    background: tokenColors.error,
  };

  // 颜色提示样式
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: spacing[2],
    padding: `${spacing[1]} ${spacing[3]}`,
    background: tokenColors.gray[800],
    color: tokenColors.white,
    fontSize: typography.fontSize.xs,
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    transition: transitions.fast,
  };

  const handleColorSelect = (colorOption: ColorOption) => {
    if (colorOption.disabled || colorOption.outOfStock) return;
    onChange?.(colorOption.id);
  };

  const selectedColorOption = colors.find((c) => c.id === selectedColor);

  return (
    <div style={containerStyle}>
      {/* 标签 */}
      {showLabel && labelPosition === 'top' && (
        <div style={labelStyle}>
          {selectedColorOption
            ? `颜色: ${selectedColorOption.name}`
            : '选择颜色'}
        </div>
      )}

      {/* 色块容器 */}
      <div style={swatchesContainerStyle}>
        {colors.map((colorOption) => {
          const isSelected = selectedColor === colorOption.id;
          const isHovered = hoveredColor === colorOption.id;

          return (
            <div
              key={colorOption.id}
              style={{ position: 'relative' }}
              onClick={() => handleColorSelect(colorOption)}
              onMouseEnter={() => setHoveredColor(colorOption.id)}
              onMouseLeave={() => setHoveredColor(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleColorSelect(colorOption);
                }
              }}
              role="button"
              tabIndex={colorOption.disabled || colorOption.outOfStock ? -1 : 0}
              aria-label={`${colorOption.name}${isSelected ? ' (selected)' : ''}${
                colorOption.outOfStock ? ' (out of stock)' : ''
              }`}
              aria-disabled={colorOption.disabled || colorOption.outOfStock}
            >
              {/* 色块 */}
              <div style={getSwatchStyle(colorOption, isSelected, isHovered)}>
                {/* 选中标记 */}
                {isSelected && <span style={checkMarkStyle}>✓</span>}

                {/* 售罄标记 */}
                {colorOption.outOfStock && <div style={outOfStockStyle} />}
              </div>

              {/* 悬停提示 */}
              <div
                style={{
                  ...tooltipStyle,
                  opacity: isHovered && !colorOption.disabled ? 1 : 0,
                }}
              >
                {colorOption.name}
                {colorOption.outOfStock && ' (售罄)'}
              </div>
            </div>
          );
        })}
      </div>

      {/* 右侧标签 */}
      {showLabel && labelPosition === 'right' && (
        <div style={labelStyle}>
          {selectedColorOption
            ? `颜色: ${selectedColorOption.name}`
            : '选择颜色'}
        </div>
      )}

      {/* 底部标签 */}
      {showLabel && labelPosition === 'bottom' && selectedColorOption && (
        <div style={{ ...labelStyle, marginBottom: 0, marginTop: spacing[2] }}>
          已选择: {selectedColorOption.name}
        </div>
      )}
    </div>
  );
};

export default ColorSelector;
