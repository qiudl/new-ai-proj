import React, { useState } from 'react';
import {
  CategoryTabs,
  PromotionBanner,
  CartItem,
  ColorSelector,
  QuantitySelector,
  IconButton,
  designTokens,
  type Category,
  type ColorOption,
} from './index';

const { colors, spacing, typography, borderRadius, shadows } = designTokens;

/**
 * Figma Practice Scene 3 组件演示页面
 * 展示扩展组件：CategoryTabs, PromotionBanner, CartItem, ColorSelector, QuantitySelector, IconButton
 */
export const FigmaPracticeScene3Demo: React.FC = () => {
  // State management
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState('black');
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'Black Crew Neck T-shirt', price: 100, quantity: 2, color: 'Black', size: 'M', selected: false },
    { id: 2, name: 'Pink Crew Neck T-shirt', price: 100, quantity: 1, color: 'Pink', size: 'L', selected: false },
  ]);
  const [showBanner, setShowBanner] = useState(true);

  // Color options
  const colorOptions: ColorOption[] = [
    { id: 'black', name: 'Black', value: '#000000' },
    { id: 'white', name: 'White', value: '#FFFFFF' },
    { id: 'gray', name: 'Gray', value: '#9CA3AF' },
    { id: 'red', name: 'Red', value: '#EF4444' },
    { id: 'blue', name: 'Blue', value: '#3B82F6' },
    { id: 'green', name: 'Green', value: '#10B981' },
  ];

  // Categories
  const categories: Category[] = [
    { id: 'all', label: 'All', count: 24 },
    { id: 'shirts', label: 'T-Shirts', count: 12 },
    { id: 'pants', label: 'Pants', count: 8 },
    { id: 'shoes', label: 'Shoes', count: 4 },
  ];

  // Handlers
  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    setCartItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
  };

  const handleSelectItem = (itemId: number, selected: boolean) => {
    setCartItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, selected } : item
      )
    );
  };

  // Styles
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: colors.background.secondary,
    padding: spacing[8],
    fontFamily: typography.fontFamily.primary,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[8],
    textAlign: 'center',
  };

  const sectionStyle: React.CSSProperties = {
    background: colors.white,
    padding: spacing[8],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[6],
    boxShadow: shadows.base,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[6],
  };

  const codeBoxStyle: React.CSSProperties = {
    background: colors.gray[50],
    padding: spacing[4],
    borderRadius: borderRadius.base,
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginTop: spacing[4],
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
  };

  const statsBoxStyle: React.CSSProperties = {
    background: '#e0f2fe',
    padding: spacing[6],
    borderRadius: borderRadius.md,
    borderLeft: `4px solid ${colors.secondary}`,
    marginTop: spacing[6],
  };

  const demoGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[4],
    marginBottom: spacing[6],
  };

  const iconButtonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing[4],
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>🎨 Figma Practice - Scene 3 扩展组件</h1>

        {/* CategoryTabs 组件演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>1. CategoryTabs 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            分类标签组件，支持多种样式变体和计数显示
          </p>

          <div style={demoGroupStyle}>
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>默认样式</h3>
              <CategoryTabs
                items={categories}
                activeCategory={activeCategory}
                onChange={setActiveCategory}
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>Pills 样式</h3>
              <CategoryTabs
                items={categories}
                activeCategory={activeCategory}
                onChange={setActiveCategory}
                variant="pills"
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>Underline 样式</h3>
              <CategoryTabs
                items={categories}
                activeCategory={activeCategory}
                onChange={setActiveCategory}
                variant="underline"
                fullWidth
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>不同尺寸</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                <CategoryTabs
                  categories={['Small', 'Tabs', 'Demo']}
                  activeCategory="Small"
                  size="small"
                />
                <CategoryTabs
                  categories={['Medium', 'Tabs', 'Demo']}
                  activeCategory="Medium"
                  size="medium"
                />
                <CategoryTabs
                  categories={['Large', 'Tabs', 'Demo']}
                  activeCategory="Large"
                  size="large"
                />
              </div>
            </div>
          </div>

          <div style={codeBoxStyle}>
{`<CategoryTabs
  items={[
    { id: 'all', label: 'All', count: 24 },
    { id: 'shirts', label: 'T-Shirts', count: 12 },
  ]}
  activeCategory={activeCategory}
  onChange={setActiveCategory}
  variant="pills"
  size="medium"
/>`}
          </div>
        </div>

        {/* PromotionBanner 组件演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>2. PromotionBanner 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            营销横幅组件，支持多种背景样式、图标和关闭功能
          </p>

          <div style={demoGroupStyle}>
            {showBanner && (
              <PromotionBanner
                title="🎉 New Season Sale!"
                description="Get up to 50% off on all items. Limited time offer!"
                action="Shop Now"
                onActionClick={() => alert('Navigate to shop')}
                background="gradient"
                closable
                onClose={() => setShowBanner(false)}
              />
            )}

            <PromotionBanner
              title="Free Shipping"
              description="On orders over $100"
              icon="🚚"
              background="primary"
              size="small"
            />

            <PromotionBanner
              title="Member Exclusive"
              description="Extra 10% off for members. Join now!"
              action="Join"
              onActionClick={() => alert('Join membership')}
              icon="⭐"
              background="secondary"
            />

            <PromotionBanner
              title="Flash Sale Ending Soon"
              description="Only 2 hours left! Don't miss out!"
              action="View Deals"
              icon="⏰"
              background="warning"
              size="large"
            />

            <PromotionBanner
              title="Eco-Friendly Collection"
              description="Shop sustainable fashion. Better for you and the planet."
              action="Learn More"
              icon="🌱"
              background="success"
            />
          </div>

          <div style={codeBoxStyle}>
{`<PromotionBanner
  title="🎉 New Season Sale!"
  description="Get up to 50% off on all items. Limited time offer!"
  action="Shop Now"
  onActionClick={() => alert('Navigate to shop')}
  background="gradient"
  closable
  onClose={() => setShowBanner(false)}
  size="medium"
/>`}
          </div>
        </div>

        {/* ColorSelector 组件演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>3. ColorSelector 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            颜色选择器组件，支持多种颜色选项、售罄状态和悬停提示
          </p>

          <div style={demoGroupStyle}>
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>默认标签位置（顶部）</h3>
              <ColorSelector
                colors={colorOptions}
                selectedColor={selectedColor}
                onChange={setSelectedColor}
                size="medium"
                showLabel
                labelPosition="top"
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>右侧标签</h3>
              <ColorSelector
                colors={colorOptions}
                selectedColor={selectedColor}
                onChange={setSelectedColor}
                size="large"
                showLabel
                labelPosition="right"
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>底部标签</h3>
              <ColorSelector
                colors={colorOptions}
                selectedColor={selectedColor}
                onChange={setSelectedColor}
                size="small"
                showLabel
                labelPosition="bottom"
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>售罄和禁用状态</h3>
              <ColorSelector
                colors={[
                  { id: 'black', name: 'Black', value: '#000000' },
                  { id: 'white', name: 'White', value: '#FFFFFF', outOfStock: true },
                  { id: 'gray', name: 'Gray', value: '#9CA3AF', disabled: true },
                  { id: 'red', name: 'Red', value: '#EF4444' },
                ]}
                selectedColor="black"
                size="medium"
              />
            </div>
          </div>

          <div style={codeBoxStyle}>
{`const colorOptions = [
  { id: 'black', name: 'Black', value: '#000000' },
  { id: 'white', name: 'White', value: '#FFFFFF' },
  { id: 'gray', name: 'Gray', value: '#9CA3AF', outOfStock: true },
];

<ColorSelector
  colors={colorOptions}
  selectedColor={selectedColor}
  onChange={setSelectedColor}
  size="medium"
  showLabel
  labelPosition="top"
/>`}
          </div>
        </div>

        {/* QuantitySelector 组件演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>4. QuantitySelector 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            数量选择器组件，支持增减按钮、手动输入和多种样式
          </p>

          <div style={demoGroupStyle}>
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>默认样式</h3>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={99}
                variant="default"
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>Outline 样式</h3>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={99}
                variant="outline"
                size="large"
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>Rounded 样式</h3>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={99}
                variant="rounded"
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>不同尺寸</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                <QuantitySelector value={1} size="small" label="Small" />
                <QuantitySelector value={1} size="medium" label="Medium" />
                <QuantitySelector value={1} size="large" label="Large" />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>无输入框</h3>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={10}
                showInput={false}
              />
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>禁用状态</h3>
              <QuantitySelector
                value={5}
                min={1}
                max={99}
                disabled
                label="Disabled"
              />
            </div>
          </div>

          <div style={codeBoxStyle}>
{`<QuantitySelector
  value={quantity}
  onChange={setQuantity}
  min={1}
  max={99}
  variant="outline"
  size="medium"
  label="Quantity"
/>`}
          </div>
        </div>

        {/* IconButton 组件演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>5. IconButton 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            图标按钮组件，支持多种样式、形状、提示信息和加载状态
          </p>

          <div style={demoGroupStyle}>
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>样式变体</h3>
              <div style={iconButtonGroupStyle}>
                <IconButton icon="❤️" variant="default" tooltip="Default" />
                <IconButton icon="❤️" variant="primary" tooltip="Primary" />
                <IconButton icon="❤️" variant="secondary" tooltip="Secondary" />
                <IconButton icon="❤️" variant="outline" tooltip="Outline" />
                <IconButton icon="❤️" variant="ghost" tooltip="Ghost" />
                <IconButton icon="❤️" variant="danger" tooltip="Danger" />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>尺寸</h3>
              <div style={iconButtonGroupStyle}>
                <IconButton icon="⭐" size="small" tooltip="Small" />
                <IconButton icon="⭐" size="medium" tooltip="Medium" />
                <IconButton icon="⭐" size="large" tooltip="Large" />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>形状</h3>
              <div style={iconButtonGroupStyle}>
                <IconButton icon="🔔" shape="circle" variant="primary" tooltip="Circle" />
                <IconButton icon="🔔" shape="square" variant="primary" tooltip="Square" />
                <IconButton icon="🔔" shape="rounded" variant="primary" tooltip="Rounded" />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>提示位置</h3>
              <div style={iconButtonGroupStyle}>
                <IconButton icon="📍" tooltip="Top tooltip" tooltipPosition="top" />
                <IconButton icon="📍" tooltip="Bottom tooltip" tooltipPosition="bottom" />
                <IconButton icon="📍" tooltip="Left tooltip" tooltipPosition="left" />
                <IconButton icon="📍" tooltip="Right tooltip" tooltipPosition="right" />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>状态</h3>
              <div style={iconButtonGroupStyle}>
                <IconButton
                  icon="💾"
                  variant="primary"
                  tooltip="Save"
                  onClick={() => alert('Saved!')}
                />
                <IconButton
                  icon="💾"
                  variant="primary"
                  loading
                  tooltip="Loading..."
                />
                <IconButton
                  icon="💾"
                  variant="primary"
                  disabled
                  tooltip="Disabled"
                />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>常用图标</h3>
              <div style={iconButtonGroupStyle}>
                <IconButton icon="🛒" variant="primary" tooltip="Add to Cart" />
                <IconButton icon="❤️" variant="danger" tooltip="Favorite" />
                <IconButton icon="🔍" variant="secondary" tooltip="Search" />
                <IconButton icon="🔔" variant="outline" tooltip="Notifications" />
                <IconButton icon="⚙️" variant="ghost" tooltip="Settings" />
                <IconButton icon="📤" variant="default" tooltip="Share" />
                <IconButton icon="🗑️" variant="danger" shape="rounded" tooltip="Delete" />
                <IconButton icon="✏️" variant="secondary" shape="rounded" tooltip="Edit" />
              </div>
            </div>
          </div>

          <div style={codeBoxStyle}>
{`<IconButton
  icon="❤️"
  variant="primary"
  size="medium"
  shape="circle"
  tooltip="Add to favorites"
  tooltipPosition="top"
  onClick={() => console.log('Clicked!')}
/>`}
          </div>
        </div>

        {/* CartItem 组件演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>6. CartItem 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            购物车项目组件，支持选择、数量调整、删除和完整的商品信息展示
          </p>

          <div style={demoGroupStyle}>
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                quantity={item.quantity}
                color={item.color}
                size={item.size}
                icon="👕"
                selectable
                selected={item.selected}
                onSelectChange={(selected) => handleSelectItem(item.id, selected)}
                onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
                onRemove={() => handleRemoveItem(item.id)}
                onClick={() => alert(`View product: ${item.name}`)}
                currency="¥"
              />
            ))}

            {cartItems.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: spacing[8],
                color: colors.text.secondary,
              }}>
                <p style={{ fontSize: typography.fontSize.lg }}>购物车为空</p>
                <p style={{ fontSize: typography.fontSize.sm, marginTop: spacing[2] }}>
                  已删除的商品会从列表中移除
                </p>
              </div>
            )}

            <div style={{
              marginTop: spacing[4],
              padding: spacing[4],
              background: colors.gray[50],
              borderRadius: borderRadius.base,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.medium }}>
                  总计
                </span>
                <span style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.secondary }}>
                  ¥{cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                </span>
              </div>
              <div style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {cartItems.filter(item => item.selected).length} 件商品已选择
              </div>
            </div>
          </div>

          <div style={codeBoxStyle}>
{`<CartItem
  id={1}
  name="Black Crew Neck T-shirt"
  price={100}
  quantity={2}
  color="Black"
  size="M"
  icon="👕"
  selectable
  selected={false}
  onSelectChange={(selected) => console.log(selected)}
  onQuantityChange={(qty) => console.log(qty)}
  onRemove={() => console.log('Remove item')}
  onClick={() => console.log('View product')}
  currency="¥"
/>`}
          </div>
        </div>

        {/* 组件组合示例 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>7. 组件组合示例</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            展示如何组合使用多个组件创建完整的购物体验
          </p>

          <div style={demoGroupStyle}>
            <CategoryTabs
              items={categories}
              activeCategory={activeCategory}
              onChange={setActiveCategory}
              variant="pills"
            />

            <div style={{
              padding: spacing[6],
              background: colors.gray[50],
              borderRadius: borderRadius.md,
            }}>
              <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing[4] }}>
                Black Crew Neck T-shirt
              </h3>

              <div style={{ display: 'flex', gap: spacing[8], flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <ColorSelector
                    colors={colorOptions}
                    selectedColor={selectedColor}
                    onChange={setSelectedColor}
                    size="medium"
                    showLabel
                  />
                </div>

                <div style={{ flex: '1 1 300px' }}>
                  <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={99}
                    label="数量"
                    variant="outline"
                  />
                </div>
              </div>

              <div style={{
                marginTop: spacing[6],
                display: 'flex',
                gap: spacing[4],
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.secondary,
                }}>
                  ¥{100 * quantity}
                </div>

                <div style={{ display: 'flex', gap: spacing[3] }}>
                  <IconButton
                    icon="❤️"
                    variant="outline"
                    size="large"
                    tooltip="Add to favorites"
                  />
                  <IconButton
                    icon="📤"
                    variant="ghost"
                    size="large"
                    tooltip="Share"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={codeBoxStyle}>
{`// 组合使用多个组件
<CategoryTabs items={categories} activeCategory={activeCategory} onChange={setActiveCategory} />

<ColorSelector colors={colorOptions} selectedColor={selectedColor} onChange={setSelectedColor} />

<QuantitySelector value={quantity} onChange={setQuantity} min={1} max={99} />

<IconButton icon="❤️" variant="outline" tooltip="Add to favorites" />
<IconButton icon="📤" variant="ghost" tooltip="Share" />`}
          </div>
        </div>

        {/* 学习总结 */}
        <div style={statsBoxStyle}>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.secondary,
            marginBottom: spacing[4],
          }}>
            📚 Scene 3 学习总结
          </h3>

          <ul style={{ listStyle: 'none', padding: 0, color: colors.text.primary }}>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>扩展组件开发</strong>：创建 6 个高级 React 组件，支持复杂交互
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>状态管理</strong>：使用 useState 实现组件内部状态和父子通信
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>TypeScript 高级类型</strong>：定义复杂接口、联合类型和可选属性
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>CSS 动画</strong>：实现悬停效果、过渡动画和加载状态
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>可访问性增强</strong>：ARIA 属性、键盘导航、焦点管理
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>组件组合</strong>：演示如何组合多个组件创建完整功能
            </li>
          </ul>

          <div style={{
            marginTop: spacing[6],
            padding: spacing[4],
            background: 'white',
            borderRadius: borderRadius.base,
          }}>
            <h4 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>📊 组件统计</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: spacing[4],
              textAlign: 'center',
            }}>
              <div>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.secondary,
                }}>6</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  新组件
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.secondary,
                }}>9</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  总组件数
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.secondary,
                }}>200+</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  TypeScript 接口
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.secondary,
                }}>1300+</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  代码行数
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 使用指南 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>8. 使用指南</h2>

          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>导入组件</h3>
          <div style={codeBoxStyle}>
{`// 导入 Scene 3 组件
import {
  CategoryTabs,
  PromotionBanner,
  CartItem,
  ColorSelector,
  QuantitySelector,
  IconButton,
  type Category,
  type ColorOption,
} from '@/components/FigmaPractice';`}
          </div>

          <h3 style={{
            fontSize: typography.fontSize.lg,
            marginTop: spacing[6],
            marginBottom: spacing[3],
          }}>基本用法</h3>
          <div style={codeBoxStyle}>
{`function ShoppingPage() {
  const [selectedColor, setSelectedColor] = useState('black');
  const [quantity, setQuantity] = useState(1);

  return (
    <div>
      {/* 分类导航 */}
      <CategoryTabs
        items={categories}
        activeCategory="all"
        onChange={(cat) => console.log(cat)}
      />

      {/* 促销横幅 */}
      <PromotionBanner
        title="Summer Sale!"
        description="Up to 50% off"
        action="Shop Now"
        background="gradient"
      />

      {/* 颜色选择 */}
      <ColorSelector
        colors={colorOptions}
        selectedColor={selectedColor}
        onChange={setSelectedColor}
      />

      {/* 数量选择 */}
      <QuantitySelector
        value={quantity}
        onChange={setQuantity}
        min={1}
        max={99}
      />

      {/* 图标按钮 */}
      <IconButton
        icon="❤️"
        variant="primary"
        tooltip="Add to favorites"
      />
    </div>
  );
}`}
          </div>

          <h3 style={{
            fontSize: typography.fontSize.lg,
            marginTop: spacing[6],
            marginBottom: spacing[3],
          }}>购物车实现</h3>
          <div style={codeBoxStyle}>
{`function ShoppingCart() {
  const [items, setItems] = useState([...]);

  return (
    <div>
      {items.map(item => (
        <CartItem
          key={item.id}
          {...item}
          selectable
          onQuantityChange={(qty) => updateQuantity(item.id, qty)}
          onRemove={() => removeItem(item.id)}
          onSelectChange={(selected) => toggleSelect(item.id, selected)}
        />
      ))}
    </div>
  );
}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FigmaPracticeScene3Demo;
