# Figma Practice - React 组件库

> 从 Figma Clothes Store UI 设计转换为 React + TypeScript 组件的完整实践

## 📦 项目概述

本项目是 **Figma 与 Claude Code 集成练习** 的成果，展示了如何从 Figma 设计转换为可生产使用的 React 组件库。

**设计来源**: Figma Clothes Store UI (Community Design)
**技术栈**: React 18 + TypeScript + Inline Styles
**组件数量**: 9个核心组件 (Scene 2: 3个基础组件 + Scene 3: 6个扩展组件) + 2个演示页面
**设计 Token**: 96+ CSS 自定义属性 + 50+ TypeScript 设计变量

---

## 🎯 核心功能

### 1. 设计 Token 系统 (`designTokens.ts`)

统一管理所有设计规范，确保设计与代码一致：

```typescript
import { colors, typography, spacing, borderRadius, shadows } from './designTokens';

// 使用示例
const style = {
  background: colors.primary,
  fontSize: typography.fontSize.base,
  padding: spacing[4],
  borderRadius: borderRadius.md,
  boxShadow: shadows.base,
};
```

**包含内容**:
- ✅ 颜色系统（主色、渐变、中性色、状态色）
- ✅ 字体规范（字体家族、字号、字重、行高）
- ✅ 间距系统（基于 4px 网格）
- ✅ 圆角尺寸
- ✅ 阴影样式
- ✅ 断点配置
- ✅ 过渡动画
- ✅ Z-index 层级

### 2. React 组件

#### Button 组件

支持多种样式、尺寸和状态的按钮组件。

```tsx
<Button variant="primary" size="large" onClick={handleClick}>
  加入购物车
</Button>

<Button variant="outline" size="small" disabled>
  已售罄
</Button>

<Button loading block>
  处理中...
</Button>
```

**特性**:
- 4种样式: `primary`, `secondary`, `outline`, `text`
- 3种尺寸: `small`, `medium`, `large`
- 支持块级按钮 (`block`)
- 支持禁用状态 (`disabled`)
- 支持加载状态 (`loading`)
- 支持图标
- 完整的 TypeScript 类型
- 悬停和点击动画

#### ProductCard 组件

商品卡片组件，展示商品信息。

```tsx
<ProductCard
  id={1}
  name="Black Crew Neck T-shirt"
  price={100}
  colorTheme="black"
  icon="👕"
  onClick={(id) => console.log(id)}
/>
```

**特性**:
- 支持自定义图片或渐变背景
- 3种颜色主题: `black`, `pink`, `default`
- 悬停抬起动画
- 点击回调支持
- 响应式设计
- 完整的无障碍支持（键盘导航）

#### SearchBar 组件

搜索栏组件，支持受控和非受控模式。

```tsx
<SearchBar
  placeholder="Search clothes..."
  value={searchValue}
  onChange={setSearchValue}
  onSearch={(value) => console.log(value)}
/>
```

**特性**:
- 受控/非受控双模式
- 搜索图标
- 回车提交
- 焦点高亮效果
- 自定义占位符
- TypeScript 类型安全

### 3. Scene 3 扩展组件 🆕

#### CategoryTabs 组件

分类标签导航组件，支持多种样式变体。

```tsx
<CategoryTabs
  items={[
    { id: 'all', label: 'All', count: 24 },
    { id: 'shirts', label: 'T-Shirts', count: 12 },
  ]}
  activeCategory="all"
  onChange={(cat) => console.log(cat)}
  variant="pills"
  size="medium"
/>
```

**特性**:
- 3种样式变体: `default`, `pills`, `underline`
- 3种尺寸: `small`, `medium`, `large`
- 支持计数显示
- 支持全宽布局
- 完整键盘导航
- TypeScript 类型安全

#### PromotionBanner 组件

营销横幅组件，展示促销信息。

```tsx
<PromotionBanner
  title="🎉 New Season Sale!"
  description="Get up to 50% off on all items"
  action="Shop Now"
  onActionClick={() => navigate('/shop')}
  background="gradient"
  closable
  onClose={() => setShowBanner(false)}
/>
```

**特性**:
- 6种背景样式: `primary`, `secondary`, `gradient`, `success`, `warning`, `error`
- 3种尺寸: `small`, `medium`, `large`
- 支持图标显示
- 支持行动按钮
- 可关闭功能
- 全宽/固定宽度选项

#### CartItem 组件

购物车项目组件，展示商品详细信息。

```tsx
<CartItem
  id={1}
  name="Black Crew Neck T-shirt"
  price={100}
  quantity={2}
  color="Black"
  size="M"
  selectable
  selected={false}
  onQuantityChange={(qty) => updateCart(qty)}
  onRemove={() => removeItem()}
  onSelectChange={(selected) => toggleSelect(selected)}
/>
```

**特性**:
- 完整商品信息展示
- 数量选择器集成
- 选择/多选支持
- 删除功能
- 小计计算
- 商品属性显示（颜色、尺寸）
- 自定义货币符号

#### ColorSelector 组件

颜色选择器组件，用于产品变体选择。

```tsx
<ColorSelector
  colors={[
    { id: 'black', name: 'Black', value: '#000000' },
    { id: 'white', name: 'White', value: '#FFFFFF' },
  ]}
  selectedColor="black"
  onChange={(colorId) => setColor(colorId)}
  size="medium"
  showLabel
  labelPosition="top"
/>
```

**特性**:
- 3种尺寸: `small`, `medium`, `large`
- 标签位置: `top`, `bottom`, `right`
- 悬停提示
- 售罄状态支持
- 禁用状态支持
- 选中标记和动画

#### QuantitySelector 组件

数量选择器组件，用于购物车和产品详情。

```tsx
<QuantitySelector
  value={quantity}
  onChange={setQuantity}
  min={1}
  max={99}
  variant="outline"
  size="medium"
  label="Quantity"
/>
```

**特性**:
- 3种样式变体: `default`, `outline`, `rounded`
- 3种尺寸: `small`, `medium`, `large`
- 最小/最大值限制
- 步长支持
- 手动输入/按钮模式
- 禁用状态
- 可选标签

#### IconButton 组件

图标按钮组件，用于各种操作按钮。

```tsx
<IconButton
  icon="❤️"
  variant="primary"
  size="medium"
  shape="circle"
  tooltip="Add to favorites"
  tooltipPosition="top"
  onClick={() => toggleFavorite()}
/>
```

**特性**:
- 6种样式变体: `default`, `primary`, `secondary`, `outline`, `ghost`, `danger`
- 3种尺寸: `small`, `medium`, `large`
- 3种形状: `circle`, `square`, `rounded`
- 提示信息支持（4个方向）
- 加载状态
- 禁用状态
- 完整无障碍支持

---

## 📁 文件结构

```
FigmaPractice/
├── designTokens.ts                # TypeScript 设计 Token 配置
├── design-tokens.css              # CSS 自定义属性版本
├── theme.ts                       # 主题系统（支持亮色/深色模式）
│
├── Button.tsx                     # Scene 2: 按钮组件
├── ProductCard.tsx                # Scene 2: 商品卡片组件
├── SearchBar.tsx                  # Scene 2: 搜索栏组件
│
├── CategoryTabs.tsx               # Scene 3: 分类标签组件
├── PromotionBanner.tsx            # Scene 3: 营销横幅组件
├── CartItem.tsx                   # Scene 3: 购物车项目组件
├── ColorSelector.tsx              # Scene 3: 颜色选择器组件
├── QuantitySelector.tsx           # Scene 3: 数量选择器组件
├── IconButton.tsx                 # Scene 3: 图标按钮组件
│
├── FigmaPracticeDemo.tsx          # Scene 2 演示页面
├── FigmaPracticeScene3Demo.tsx    # Scene 3 演示页面
├── index.tsx                      # 统一导出
├── README.md                      # 本文档
└── DESIGN-TOKENS-USAGE.md         # Design Tokens 使用指南
```

---

## 🚀 快速开始

### 1. 安装依赖

已集成到 `new-ai-proj` 项目中，无需额外安装。

### 2. 导入组件

```typescript
// Scene 2 基础组件
import { Button, ProductCard, SearchBar } from '@/components/FigmaPractice';

// Scene 3 扩展组件
import {
  CategoryTabs,
  PromotionBanner,
  CartItem,
  ColorSelector,
  QuantitySelector,
  IconButton,
} from '@/components/FigmaPractice';

// 设计 Token
import { designTokens } from '@/components/FigmaPractice';
```

### 3. 使用组件

```tsx
function MyPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('black');
  const [quantity, setQuantity] = useState(1);

  return (
    <div>
      {/* Scene 2 基础组件 */}
      <SearchBar
        value={searchValue}
        onChange={setSearchValue}
      />

      <CategoryTabs
        categories={['All', 'T-Shirts', 'Pants', 'Shoes']}
        activeCategory="All"
        onChange={(cat) => console.log(cat)}
      />

      <ProductCard
        id={1}
        name="Black Crew Neck T-shirt"
        price={100}
        colorTheme="black"
      />

      {/* Scene 3 扩展组件 */}
      <ColorSelector
        colors={colorOptions}
        selectedColor={selectedColor}
        onChange={setSelectedColor}
      />

      <QuantitySelector
        value={quantity}
        onChange={setQuantity}
        min={1}
        max={99}
      />

      <Button variant="primary">
        加入购物车
      </Button>

      <IconButton
        icon="❤️"
        variant="outline"
        tooltip="添加到收藏"
      />
    </div>
  );
}
```

### 4. 查看演示

访问演示页面查看所有组件的实际效果：

```tsx
// Scene 2 基础组件演示
import { FigmaPracticeDemo } from '@/components/FigmaPractice';

// Scene 3 扩展组件演示
import { FigmaPracticeScene3Demo } from '@/components/FigmaPractice';

// 在路由中使用
<Route path="/figma-practice" component={FigmaPracticeDemo} />
<Route path="/figma-practice-scene3" component={FigmaPracticeScene3Demo} />
```

---

## 🎨 设计 Token 和主题系统

### CSS 变量使用（新增 ✨）

从 **Scene 3.2** 开始，我们新增了 CSS 自定义属性支持和完整的主题系统！

#### 导入 CSS 变量

```typescript
// 在应用入口（如 App.tsx 或 index.tsx）导入
import '@/components/FigmaPractice/design-tokens.css';
```

#### 在 CSS/SCSS 中使用

```css
.my-button {
  background: var(--color-primary);
  color: var(--color-white);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-base);
  box-shadow: var(--shadow-base);
  transition: var(--transition-default);
}

.my-button:hover {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-hover);
}
```

#### 主题切换（亮色/深色模式）

```typescript
import { useTheme } from '@/components/FigmaPractice';

function MyComponent() {
  const { mode, isDark, toggle, setMode } = useTheme();

  return (
    <div>
      <button onClick={toggle}>
        {isDark ? '🌞 切换到亮色' : '🌙 切换到深色'}
      </button>

      <button onClick={() => setMode('auto')}>
        🔄 跟随系统
      </button>
    </div>
  );
}
```

详细使用说明请查看：[DESIGN-TOKENS-USAGE.md](./DESIGN-TOKENS-USAGE.md)

---

### TypeScript Design Tokens 使用

### 颜色使用

```typescript
import { colors } from '@/components/FigmaPractice/designTokens';

const style = {
  // 主色调
  background: colors.primary,
  color: colors.white,

  // 渐变色
  background: colors.gradients.productBlack,

  // 文字颜色
  color: colors.text.secondary,

  // 状态色
  borderColor: colors.success,
};
```

### 字体使用

```typescript
import { typography } from '@/components/FigmaPractice/designTokens';

const style = {
  fontFamily: typography.fontFamily.primary,
  fontSize: typography.fontSize.lg,
  fontWeight: typography.fontWeight.bold,
  lineHeight: typography.lineHeight.relaxed,
};
```

### 间距使用

```typescript
import { spacing } from '@/components/FigmaPractice/designTokens';

const style = {
  padding: spacing[4],      // 16px
  margin: spacing[6],       // 24px
  gap: spacing[2],          // 8px
};
```

---

## 💡 最佳实践

### 1. 统一使用 Design Tokens

❌ **不推荐** - 硬编码值：
```typescript
const style = {
  color: '#333',
  fontSize: '14px',
  padding: '16px',
};
```

✅ **推荐** - 使用 Design Tokens：
```typescript
import { colors, typography, spacing } from './designTokens';

const style = {
  color: colors.text.primary,
  fontSize: typography.fontSize.base,
  padding: spacing[4],
};
```

### 2. TypeScript 类型安全

```typescript
// 定义组件 Props 类型
interface MyComponentProps {
  title: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

// 使用 FC 类型
const MyComponent: React.FC<MyComponentProps> = ({ title, variant = 'primary', onClick }) => {
  // ...
};
```

### 3. 组件复用

```typescript
// ✅ 创建可复用的基础组件
const BaseCard: React.FC = ({ children }) => (
  <div style={{
    background: colors.white,
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    boxShadow: shadows.base,
  }}>
    {children}
  </div>
);

// 在其他组件中使用
<BaseCard>
  <ProductCard {...props} />
</BaseCard>
```

### 4. 样式管理

```typescript
// ✅ 提取复杂样式为独立对象
const cardStyle: React.CSSProperties = {
  background: colors.white,
  padding: spacing[6],
  borderRadius: borderRadius.lg,
  transition: transitions.default,
};

// 在组件中使用
<div style={cardStyle}>Content</div>
```

---

## 📊 组件 API 文档

### Button Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `React.ReactNode` | - | 按钮文本 (必填) |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'text'` | `'primary'` | 按钮样式 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 按钮尺寸 |
| `block` | `boolean` | `false` | 是否为块级按钮 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否加载中 |
| `icon` | `React.ReactNode` | - | 图标 |
| `onClick` | `(event) => void` | - | 点击事件 |

### ProductCard Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | `string \| number` | - | 商品ID (必填) |
| `name` | `string` | - | 商品名称 (必填) |
| `price` | `number` | - | 商品价格 (必填) |
| `image` | `string` | - | 商品图片URL |
| `colorTheme` | `'black' \| 'pink' \| 'default'` | `'default'` | 颜色主题 |
| `icon` | `React.ReactNode` | `'👕'` | 商品图标 |
| `onClick` | `(id) => void` | - | 点击事件 |

### SearchBar Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `placeholder` | `string` | `'Search clothes...'` | 占位符文本 |
| `value` | `string` | - | 搜索值 (受控) |
| `onChange` | `(value) => void` | - | 值变化回调 |
| `onSearch` | `(value) => void` | - | 搜索提交回调 |

### CategoryTabs Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `categories` | `string[]` | `[]` | 简单模式：分类字符串数组 |
| `items` | `Category[]` | `[]` | 复杂模式：包含 id、label、count |
| `activeCategory` | `string` | - | 当前激活的分类 |
| `onChange` | `(category: string) => void` | - | 分类切换回调 |
| `variant` | `'default' \| 'pills' \| 'underline'` | `'default'` | 样式变体 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `fullWidth` | `boolean` | `false` | 是否全宽布局 |

### PromotionBanner Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | - | 横幅标题 (必填) |
| `description` | `string` | - | 描述文本 |
| `action` | `string` | - | 行动按钮文字 |
| `onActionClick` | `() => void` | - | 行动按钮点击回调 |
| `icon` | `React.ReactNode` | - | 图标 |
| `background` | `'primary' \| 'secondary' \| 'gradient' \| 'success' \| 'warning' \| 'error'` | `'primary'` | 背景样式 |
| `closable` | `boolean` | `false` | 是否可关闭 |
| `onClose` | `() => void` | - | 关闭回调 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `fullWidth` | `boolean` | `false` | 是否全宽 |

### CartItem Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | `string \| number` | - | 商品ID (必填) |
| `name` | `string` | - | 商品名称 (必填) |
| `price` | `number` | - | 商品价格 (必填) |
| `quantity` | `number` | - | 数量 (必填) |
| `image` | `string` | - | 商品图片URL |
| `icon` | `React.ReactNode` | `'🛍️'` | 商品图标 |
| `color` | `string` | - | 商品颜色 |
| `size` | `string` | - | 商品尺寸 |
| `selectable` | `boolean` | `false` | 是否可选中 |
| `selected` | `boolean` | `false` | 是否已选中 |
| `onSelectChange` | `(selected: boolean) => void` | - | 选中状态变化 |
| `onQuantityChange` | `(quantity: number) => void` | - | 数量变化回调 |
| `onRemove` | `() => void` | - | 删除回调 |
| `onClick` | `() => void` | - | 点击商品回调 |
| `currency` | `string` | `'¥'` | 货币符号 |

### ColorSelector Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `colors` | `ColorOption[]` | - | 颜色选项数组 (必填) |
| `selectedColor` | `string` | - | 当前选中的颜色ID |
| `onChange` | `(colorId: string) => void` | - | 颜色变化回调 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `showLabel` | `boolean` | `true` | 是否显示标签 |
| `labelPosition` | `'top' \| 'bottom' \| 'right'` | `'top'` | 标签位置 |

**ColorOption 接口**:
```typescript
interface ColorOption {
  id: string;              // 颜色ID
  name: string;            // 颜色名称
  value: string;           // 颜色值 (CSS 颜色)
  disabled?: boolean;      // 是否禁用
  outOfStock?: boolean;    // 是否售罄
}
```

### QuantitySelector Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `number` | - | 当前值 (必填) |
| `onChange` | `(value: number) => void` | - | 值变化回调 |
| `min` | `number` | `1` | 最小值 |
| `max` | `number` | `99` | 最大值 |
| `step` | `number` | `1` | 步长 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `variant` | `'default' \| 'outline' \| 'rounded'` | `'default'` | 样式变体 |
| `showInput` | `boolean` | `true` | 是否显示输入框 |
| `label` | `string` | - | 标签文本 |

### IconButton Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `icon` | `React.ReactNode` | - | 图标内容 (必填) |
| `onClick` | `(event) => void` | - | 点击事件 |
| `variant` | `'default' \| 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | `'default'` | 样式变体 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `shape` | `'circle' \| 'square' \| 'rounded'` | `'circle'` | 形状 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否加载中 |
| `tooltip` | `string` | - | 提示信息 |
| `tooltipPosition` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | 提示位置 |
| `ariaLabel` | `string` | - | ARIA 标签 |

---

## 🎓 学习收获

### 从 Figma 到 React 的完整流程

1. **设计分析** ✅ (Scene 1 & 2)
   - 从 Figma 截图中提取设计规范
   - 识别可复用的组件模式
   - 整理设计 Token

2. **代码实现** ✅ (Scene 2)
   - 创建 TypeScript 类型定义
   - 实现 React 功能组件
   - 添加交互和动画效果

3. **设计系统建立** ✅ (Scene 3.2 已完成)
   - TypeScript 到 CSS 变量转换
   - 完整的主题系统（亮色/深色模式）
   - 70+ CSS 自定义属性
   - ThemeManager 和 useTheme Hook
   - 实用工具类（间距、文字、圆角、阴影）

4. **质量保证** ✅
   - TypeScript 类型安全
   - 组件可访问性
   - 代码文档完善

5. **集成测试** ✅
   - 创建演示页面
   - 验证所有功能
   - 优化用户体验

### 关键技术要点

- ✅ **Design Tokens**: 统一管理设计规范（TypeScript + CSS 变量）
- ✅ **CSS Custom Properties**: 70+ CSS 自定义属性
- ✅ **Theme System**: 完整的亮色/深色主题切换系统
- ✅ **TypeScript**: 类型安全和智能提示
- ✅ **React Hooks**: useState、useTheme 管理状态
- ✅ **Inline Styles + CSS Variables**: 双重样式方案
- ✅ **无障碍性**: ARIA 属性和键盘导航
- ✅ **性能优化**: 避免不必要的渲染
- ✅ **文档完善**: README + 详细使用指南

---

## 🔗 相关资源

- **Figma API 速率限制管理器**: `/public/figma-practice/figma-api-manager.js`
- **管理器使用文档**: `/public/figma-practice/README-API-MANAGER.md`
- **HTML 原型示例**: `/public/figma-practice/practice-1-redesign-clothes-store.html`
- **任务文档**: Backend `/docs/tasks/projects/project-3780/`

---

## 📝 TODO

### 已完成 ✅
- [x] Scene 2: 3个基础组件（Button, ProductCard, SearchBar）
- [x] Scene 3.2: 深色模式和主题系统
- [x] Scene 3.2: CSS 自定义属性系统（96+ 变量）
- [x] Scene 3.2: 主题切换功能
- [x] Scene 3.3-3.8: 6个扩展组件
  - [x] CategoryTabs - 分类标签组件
  - [x] PromotionBanner - 营销横幅组件
  - [x] CartItem - 购物车项目组件
  - [x] ColorSelector - 颜色选择器组件
  - [x] QuantitySelector - 数量选择器组件
  - [x] IconButton - 图标按钮组件
- [x] 创建 Scene 3 演示页面
- [x] 完整的组件 API 文档

### 进行中 🚧
- [ ] Scene 3.1: 从 Figma 提取变量 (get_variable_defs) - 等待 API 限制恢复

### 计划中 📋
- [ ] Storybook 集成
- [ ] Code Connect 配置
- [ ] 添加单元测试 (Jest + React Testing Library)
- [ ] 集成到实际项目页面
- [ ] 性能优化和代码分割
- [ ] Scene 4-6 其他练习场景

---

**创建时间**: 2025-11-16
**最后更新**: 2025-11-16 (Scene 3.3-3.8 完成)
**版本**: 1.2.0
**作者**: Claude AI (Figma Practice 任务 #3780)
**进度**: Scene 1 ✅ | Scene 2 ✅ | Scene 3.2 ✅ | Scene 3.3-3.8 ✅ | Scene 3.1 (待续)
**组件统计**: 9个组件 + 2个演示页面 + 96+ CSS 变量 + 完整主题系统
**许可**: MIT
