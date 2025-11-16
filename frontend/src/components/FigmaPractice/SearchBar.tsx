import React, { useState } from 'react';
import { colors, borderRadius, transitions, spacing, typography } from './designTokens';

export interface SearchBarProps {
  /**
   * 占位符文本
   */
  placeholder?: string;

  /**
   * 搜索值
   */
  value?: string;

  /**
   * 值变化回调
   */
  onChange?: (value: string) => void;

  /**
   * 搜索提交回调
   */
  onSearch?: (value: string) => void;

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
 * SearchBar 组件
 * 从 Figma Clothes Store UI 提取的搜索栏设计
 *
 * @example
 * ```tsx
 * <SearchBar
 *   placeholder="Search clothes..."
 *   onSearch={(value) => console.log('搜索:', value)}
 * />
 * ```
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search clothes...',
  value: controlledValue,
  onChange,
  onSearch,
  className = '',
  style = {},
}) => {
  const [internalValue, setInternalValue] = useState('');

  // 使用受控或非受控模式
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    ...style,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing[3]} ${spacing[12]} ${spacing[3]} ${spacing[5]}`,
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    background: colors.gray[50],
    transition: transitions.default,
    fontFamily: typography.fontFamily.primary,
    outline: 'none',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: spacing[4],
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: typography.fontSize.md,
    pointerEvents: 'none',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(value);
    }
  };

  return (
    <>
      <style>{`
        .search-bar-input:focus {
          border-color: ${colors.secondary};
          background: ${colors.white};
          box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
        }

        .search-bar-input::placeholder {
          color: ${colors.gray[400]};
        }
      `}</style>

      <div style={containerStyle} className={className}>
        <span style={iconStyle}>🔍</span>
        <input
          type="text"
          className="search-bar-input"
          style={inputStyle}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>
    </>
  );
};

export default SearchBar;
