/**
 * Figma Practice 组件库入口
 * 从 Figma Clothes Store UI 提取并转换为 React + TypeScript 组件
 *
 * Scene 2 组件 (基础组件):
 * - Button, ProductCard, SearchBar
 *
 * Scene 3 组件 (扩展组件):
 * - CategoryTabs, PromotionBanner, CartItem
 * - ColorSelector, QuantitySelector, IconButton
 */

// ========== Scene 2 基础组件 ==========
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { ProductCard } from './ProductCard';
export type { ProductCardProps } from './ProductCard';

export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

// ========== Scene 3 扩展组件 ==========
export { CategoryTabs } from './CategoryTabs';
export type { CategoryTabsProps, Category } from './CategoryTabs';

export { PromotionBanner } from './PromotionBanner';
export type { PromotionBannerProps } from './PromotionBanner';

export { CartItem } from './CartItem';
export type { CartItemProps } from './CartItem';

export { ColorSelector } from './ColorSelector';
export type { ColorSelectorProps, ColorOption } from './ColorSelector';

export { QuantitySelector } from './QuantitySelector';
export type { QuantitySelectorProps } from './QuantitySelector';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

// ========== Design Tokens 导出 ==========
export { default as designTokens } from './designTokens';
export * from './designTokens';

// ========== 主题系统导出 ==========
export { default as theme } from './theme';
export * from './theme';

/**
 * CSS 变量文件引用
 * 在应用入口处导入以启用 CSS 变量：
 *
 * import '@/components/FigmaPractice/design-tokens.css';
 *
 * 这将使所有 CSS 自定义属性（如 --color-primary）在整个应用中可用
 */
export const CSS_TOKENS_PATH = './design-tokens.css';

// ========== 演示页面导出 ==========
export { default as FigmaPracticeDemo } from './FigmaPracticeDemo';
export { default as FigmaPracticeScene3Demo } from './FigmaPracticeScene3Demo';
