# Design Tokens 使用指南

> 从 TypeScript 设计令牌到 CSS 自定义属性的完整使用指南

---

## 📋 目录

1. [快速开始](#快速开始)
2. [TypeScript 中使用](#typescript-中使用)
3. [CSS 中使用](#css-中使用)
4. [主题切换](#主题切换)
5. [最佳实践](#最佳实践)
6. [完整 API 参考](#完整-api-参考)

---

## 快速开始

### 1. 导入方式

#### TypeScript/JavaScript

```typescript
// 方式一：导入所有 tokens
import designTokens from '@/components/FigmaPractice/designTokens';
const { colors, typography, spacing } = designTokens;

// 方式二：按需导入
import { colors, typography, spacing } from '@/components/FigmaPractice/designTokens';

// 方式三：导入类型
import type { Colors, Typography } from '@/components/FigmaPractice/designTokens';
```

#### CSS

```css
/* 导入 CSS 变量文件 */
@import '@/components/FigmaPractice/design-tokens.css';

/* 使用变量 */
.my-component {
  color: var(--color-primary);
  font-size: var(--font-size-base);
  padding: var(--spacing-4);
}
```

---

## TypeScript 中使用

### 颜色使用

```typescript
import { colors } from './designTokens';

const buttonStyle: React.CSSProperties = {
  // 主色
  background: colors.primary,
  color: colors.white,

  // 渐变
  background: colors.gradients.productBlack,

  // 中性色
  borderColor: colors.gray[300],

  // 文字颜色
  color: colors.text.secondary,

  // 状态色
  borderColor: colors.success,
};
```

### 字体使用

```typescript
import { typography } from './designTokens';

const textStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily.primary,
  fontSize: typography.fontSize.lg,
  fontWeight: typography.fontWeight.bold,
  lineHeight: typography.lineHeight.relaxed,
};
```

### 间距使用

```typescript
import { spacing } from './designTokens';

const cardStyle: React.CSSProperties = {
  padding: spacing[6],        // 24px
  margin: spacing[4],         // 16px
  gap: spacing[2],            // 8px
};
```

### 组合使用

```typescript
import { colors, typography, spacing, borderRadius, shadows } from './designTokens';

const productCardStyle: React.CSSProperties = {
  background: colors.white,
  padding: spacing[6],
  borderRadius: borderRadius.lg,
  boxShadow: shadows.base,
  fontSize: typography.fontSize.base,
  color: colors.text.primary,
};
```

---

## CSS 中使用

### 基础用法

```css
.button {
  /* 颜色 */
  background: var(--color-primary);
  color: var(--color-white);

  /* 字体 */
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);

  /* 间距 */
  padding: var(--spacing-3) var(--spacing-6);
  margin: var(--spacing-4);

  /* 圆角 */
  border-radius: var(--border-radius-base);

  /* 阴影 */
  box-shadow: var(--shadow-base);

  /* 过渡 */
  transition: var(--transition-default);
}

.button:hover {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-hover);
}
```

### 渐变背景

```css
.product-card-black {
  background: var(--gradient-product-black);
}

.product-card-pink {
  background: var(--gradient-product-pink);
}

.promotion-banner {
  background: var(--gradient-promotion);
}
```

### 响应式设计

```css
/* 使用断点变量 */
@media (min-width: 768px) {
  .container {
    max-width: var(--breakpoint-md);
    padding: var(--spacing-8);
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: var(--breakpoint-lg);
    padding: var(--spacing-12);
  }
}
```

### 实用工具类

CSS 文件已包含常用工具类：

```html
<!-- 间距工具类 -->
<div class="p-4 m-2">Padding 16px, Margin 8px</div>

<!-- 文字工具类 -->
<p class="text-lg font-bold">Large Bold Text</p>

<!-- 圆角工具类 -->
<div class="rounded-lg">16px border radius</div>

<!-- 阴影工具类 -->
<div class="shadow-md">Medium shadow</div>

<!-- 过渡工具类 -->
<button class="transition">Smooth transition</button>
```

---

## 主题切换

### React 中使用主题

```typescript
import { useTheme } from '@/components/FigmaPractice/theme';

function MyComponent() {
  const { mode, isDark, toggle, setMode, config } = useTheme();

  return (
    <div>
      <p>当前主题: {mode}</p>
      <p>是否深色: {isDark ? '是' : '否'}</p>

      {/* 切换主题 */}
      <button onClick={toggle}>切换主题</button>

      {/* 设置特定主题 */}
      <button onClick={() => setMode('dark')}>深色模式</button>
      <button onClick={() => setMode('light')}>亮色模式</button>
      <button onClick={() => setMode('auto')}>跟随系统</button>

      {/* 使用主题配置 */}
      <div style={{ color: config.colors.text.primary }}>
        主题化文本
      </div>
    </div>
  );
}
```

### 主题管理器

```typescript
import { ThemeManager } from '@/components/FigmaPractice/theme';

// 创建主题管理器
const themeManager = new ThemeManager('light');

// 切换主题
themeManager.toggle();

// 设置主题
themeManager.setMode('dark');

// 获取当前主题
const currentMode = themeManager.getMode();

// 订阅主题变化
const unsubscribe = themeManager.subscribe((mode) => {
  console.log('主题已变更:', mode);
});

// 取消订阅
unsubscribe();
```

### CSS 中响应主题

CSS 变量会自动根据主题切换：

```css
.my-component {
  /* 这些变量会根据主题自动变化 */
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-color: var(--color-gray-300);
}

/* 也可以手动指定深色模式样式 */
[data-theme="dark"] .my-component {
  border-width: 2px; /* 深色模式特殊样式 */
}
```

---

## 最佳实践

### ✅ 推荐做法

#### 1. 始终使用 Design Tokens

```typescript
// ✅ 好
import { colors, spacing } from './designTokens';
const style = {
  color: colors.text.primary,
  padding: spacing[4],
};

// ❌ 不好
const style = {
  color: '#333',
  padding: '16px',
};
```

#### 2. 使用语义化变量名

```typescript
// ✅ 好 - 语义清晰
const successButton = {
  background: colors.success,
  color: colors.white,
};

// ❌ 不好 - 硬编码
const greenButton = {
  background: '#52c41a',
  color: '#ffffff',
};
```

#### 3. 组合使用 CSS 变量和工具类

```html
<!-- ✅ 好 - 结合使用 -->
<div class="p-4 rounded-lg shadow" style="background: var(--gradient-product-pink)">
  Content
</div>

<!-- ❌ 不好 - 全部内联 -->
<div style="padding: 16px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1)">
  Content
</div>
```

#### 4. TypeScript 类型安全

```typescript
import type { Colors } from './designTokens';

// ✅ 好 - 类型安全
const getColor = (colorKey: keyof Colors): string => {
  return colors[colorKey];
};

// ❌ 不好 - 无类型检查
const getColor = (colorKey: string): string => {
  return colors[colorKey];
};
```

### ⚠️ 注意事项

1. **避免覆盖 CSS 变量**：除非必要，不要在组件中覆盖 `:root` 的变量
2. **主题一致性**：使用主题系统时，确保所有颜色都响应主题切换
3. **性能考虑**：CSS 变量性能优异，但过度嵌套可能影响性能
4. **浏览器兼容性**：CSS 自定义属性在现代浏览器中支持良好，但 IE11 不支持

---

## 完整 API 参考

### Design Tokens (TypeScript)

#### Colors

```typescript
colors.primary          // 主色 #333333
colors.secondary        // 次色 #1890ff
colors.white            // 白色
colors.black            // 黑色
colors.gray[50-800]     // 灰度色阶
colors.text.primary     // 主文本色
colors.text.secondary   // 次文本色
colors.success          // 成功色
colors.warning          // 警告色
colors.error            // 错误色
colors.gradients.*      // 渐变色
```

#### Typography

```typescript
typography.fontFamily.primary   // 主字体
typography.fontFamily.mono      // 等宽字体
typography.fontSize.*           // 字号 (xs, sm, base, md, lg, xl, 2xl, 3xl, 4xl, 5xl)
typography.fontWeight.*         // 字重 (normal, medium, semibold, bold)
typography.lineHeight.*         // 行高 (tight, normal, relaxed, loose)
```

#### Spacing

```typescript
spacing[0]    // 0
spacing[1]    // 4px
spacing[2]    // 8px
spacing[3]    // 12px
spacing[4]    // 16px
spacing[6]    // 24px
spacing[8]    // 32px
spacing[12]   // 48px
spacing[16]   // 64px
```

#### Border Radius

```typescript
borderRadius.none     // 0
borderRadius.sm       // 6px
borderRadius.base     // 8px
borderRadius.md       // 12px
borderRadius.lg       // 16px
borderRadius.xl       // 24px
borderRadius.full     // 50%
```

#### Shadows

```typescript
shadows.none    // 无阴影
shadows.sm      // 小阴影
shadows.base    // 基础阴影
shadows.md      // 中等阴影
shadows.lg      // 大阴影
shadows.xl      // 超大阴影
shadows.hover   // 悬停阴影
shadows.focus   // 焦点阴影
```

#### Transitions

```typescript
transitions.duration.*   // 持续时间 (fast, base, normal, slow)
transitions.easing.*     // 缓动函数 (linear, ease, easeIn, easeOut, easeInOut)
transitions.default      // all 0.3s ease
transitions.fast         // all 0.15s ease
transitions.slow         // all 0.5s ease
```

#### Z-Index

```typescript
zIndex.base              // 0
zIndex.dropdown          // 1000
zIndex.sticky            // 1020
zIndex.fixed             // 1030
zIndex.modalBackdrop     // 1040
zIndex.modal             // 1050
zIndex.tooltip           // 1070
```

### CSS 变量

所有 TypeScript tokens 都有对应的 CSS 变量，格式为：

```
--{category}-{subcategory}-{name}
```

示例：
- `--color-primary`
- `--font-size-lg`
- `--spacing-4`
- `--border-radius-md`
- `--shadow-base`

### Theme API

#### useTheme Hook

```typescript
const {
  mode,         // 当前主题模式: 'light' | 'dark' | 'auto'
  isDark,       // 是否为深色模式: boolean
  config,       // 当前主题配置: ThemeConfig
  setMode,      // 设置主题: (mode: ThemeMode) => void
  toggle,       // 切换主题: () => void
} = useTheme();
```

#### ThemeManager Class

```typescript
class ThemeManager {
  getMode(): ThemeMode
  setMode(mode: ThemeMode): void
  toggle(): void
  subscribe(listener: (mode: ThemeMode) => void): () => void
  static restore(): ThemeManager
}
```

---

## 示例代码

### 完整组件示例

```typescript
import React from 'react';
import { colors, typography, spacing, borderRadius, shadows } from './designTokens';
import { useTheme } from './theme';

const ProductCard: React.FC = () => {
  const { toggle, isDark } = useTheme();

  const cardStyle: React.CSSProperties = {
    background: colors.white,
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    boxShadow: shadows.base,
    transition: 'all 0.3s ease',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Product Title</h3>
      <p style={{ color: colors.text.secondary }}>
        Product description goes here
      </p>
      <button onClick={toggle}>
        {isDark ? '🌞 亮色' : '🌙 深色'}
      </button>
    </div>
  );
};
```

### 完整 CSS 示例

```css
/* 导入 tokens */
@import './design-tokens.css';

/* 商品卡片 */
.product-card {
  background: var(--color-white);
  padding: var(--spacing-6);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-base);
  transition: var(--transition-default);
}

.product-card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-4px);
}

.product-card__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-4);
}

.product-card__description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

/* 深色模式自动适配 */
[data-theme="dark"] .product-card {
  /* CSS 变量已自动切换，无需额外配置 */
}
```

---

## 相关文件

- **TypeScript Tokens**: `designTokens.ts`
- **CSS Variables**: `design-tokens.css`
- **Theme System**: `theme.ts`
- **Components**: `Button.tsx`, `ProductCard.tsx`, `SearchBar.tsx`
- **Demo**: `FigmaPracticeDemo.tsx`

---

**创建时间**: 2025-11-16
**版本**: 1.0.0
**场景**: Figma Practice - Scene 3 (设计系统建立)
