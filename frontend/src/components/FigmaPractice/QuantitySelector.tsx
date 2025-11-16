/**
 * QuantitySelector 组件
 *
 * 数量选择器组件，用于选择商品数量
 *
 * 特性：
 * - 增加/减少按钮
 * - 手动输入
 * - 最小/最大值限制
 * - 禁用状态
 * - 多种样式变体
 *
 * @example
 * ```tsx
 * <QuantitySelector
 *   value={1}
 *   min={1}
 *   max={99}
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { colors, typography, spacing, borderRadius, shadows, transitions } from './designTokens';

export interface QuantitySelectorProps {
  /** 当前值 */
  value: number;
  /** 值变化回调 */
  onChange?: (value: number) => void;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 样式变体 */
  variant?: 'default' | 'outline' | 'rounded';
  /** 是否显示输入框 */
  showInput?: boolean;
  /** 标签文本 */
  label?: string;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  disabled = false,
  size = 'medium',
  variant = 'default',
  showInput = true,
  label,
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  // 尺寸配置
  const sizeConfig = {
    small: {
      height: '28px',
      buttonWidth: '28px',
      fontSize: typography.fontSize.sm,
      inputWidth: '40px',
    },
    medium: {
      height: '36px',
      buttonWidth: '36px',
      fontSize: typography.fontSize.base,
      inputWidth: '50px',
    },
    large: {
      height: '44px',
      buttonWidth: '44px',
      fontSize: typography.fontSize.lg,
      inputWidth: '60px',
    },
  };

  const currentSize = sizeConfig[size];

  // 容器样式
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: spacing[2],
  };

  // 标签样式
  const labelStyle: React.CSSProperties = {
    fontSize: currentSize.fontSize,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  };

  // 选择器容器样式
  const selectorStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    height: currentSize.height,
    border: variant === 'outline' ? `2px solid ${colors.gray[300]}` : 'none',
    borderRadius: variant === 'rounded' ? borderRadius.full : borderRadius.base,
    overflow: 'hidden',
    background: disabled ? colors.gray[100] : colors.white,
    opacity: disabled ? 0.6 : 1,
    transition: transitions.fast,
    ...(isFocused && variant === 'outline' && {
      borderColor: colors.secondary,
      boxShadow: shadows.focus,
    }),
  };

  // 按钮基础样式
  const buttonBaseStyle: React.CSSProperties = {
    width: currentSize.buttonWidth,
    height: currentSize.height,
    border: variant === 'default' ? `1px solid ${colors.gray[300]}` : 'none',
    background: disabled ? colors.gray[100] : colors.white,
    color: colors.text.primary,
    fontSize: currentSize.fontSize,
    fontWeight: typography.fontWeight.bold,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: transitions.fast,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
  };

  // 减少按钮样式
  const decreaseButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    borderTopLeftRadius: variant === 'outline' ? '0' : borderRadius.base,
    borderBottomLeftRadius: variant === 'outline' ? '0' : borderRadius.base,
    borderRight: variant === 'default' ? 'none' : undefined,
  };

  // 增加按钮样式
  const increaseButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    borderTopRightRadius: variant === 'outline' ? '0' : borderRadius.base,
    borderBottomRightRadius: variant === 'outline' ? '0' : borderRadius.base,
    borderLeft: variant === 'default' ? 'none' : undefined,
  };

  // 输入框样式
  const inputStyle: React.CSSProperties = {
    width: currentSize.inputWidth,
    height: currentSize.height,
    border: variant === 'default' ? `1px solid ${colors.gray[300]}` : 'none',
    borderLeft: variant === 'default' ? 'none' : undefined,
    borderRight: variant === 'default' ? 'none' : undefined,
    background: 'transparent',
    color: colors.text.primary,
    fontSize: currentSize.fontSize,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    outline: 'none',
    padding: 0,
    fontFamily: typography.fontFamily.primary,
  };

  const handleDecrease = () => {
    if (disabled) return;
    const newValue = Math.max(min, value - step);
    onChange?.(newValue);
  };

  const handleIncrease = () => {
    if (disabled) return;
    const newValue = Math.min(max, value + step);
    onChange?.(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setInputValue(inputVal);

    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange?.(clampedValue);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < min) {
      setInputValue(min.toString());
      onChange?.(min);
    } else if (numValue > max) {
      setInputValue(max.toString());
      onChange?.(max);
    } else {
      setInputValue(numValue.toString());
    }
  };

  const [decreaseHovered, setDecreaseHovered] = useState(false);
  const [increaseHovered, setIncreaseHovered] = useState(false);

  const canDecrease = value > min && !disabled;
  const canIncrease = value < max && !disabled;

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}

      <div style={selectorStyle}>
        {/* 减少按钮 */}
        <button
          style={{
            ...decreaseButtonStyle,
            ...(decreaseHovered && canDecrease && {
              background: colors.gray[100],
            }),
            ...((!canDecrease) && {
              opacity: 0.5,
              cursor: 'not-allowed',
            }),
          }}
          onClick={handleDecrease}
          disabled={!canDecrease}
          onMouseEnter={() => setDecreaseHovered(true)}
          onMouseLeave={() => setDecreaseHovered(false)}
          aria-label="Decrease quantity"
        >
          −
        </button>

        {/* 输入框 */}
        {showInput ? (
          <input
            type="text"
            style={inputStyle}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={() => setIsFocused(true)}
            disabled={disabled}
            aria-label="Quantity"
          />
        ) : (
          <div
            style={{
              ...inputStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {value}
          </div>
        )}

        {/* 增加按钮 */}
        <button
          style={{
            ...increaseButtonStyle,
            ...(increaseHovered && canIncrease && {
              background: colors.gray[100],
            }),
            ...((!canIncrease) && {
              opacity: 0.5,
              cursor: 'not-allowed',
            }),
          }}
          onClick={handleIncrease}
          disabled={!canIncrease}
          onMouseEnter={() => setIncreaseHovered(true)}
          onMouseLeave={() => setIncreaseHovered(false)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default QuantitySelector;
