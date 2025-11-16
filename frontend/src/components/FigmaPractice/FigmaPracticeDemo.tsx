import React, { useState } from 'react';
import { Button, ProductCard, SearchBar, designTokens } from './index';

const { colors, spacing, typography, borderRadius, shadows } = designTokens;

/**
 * Figma Practice 组件演示页面
 * 展示从 Figma Clothes Store UI 提取并转换的 React 组件
 */
export const FigmaPracticeDemo: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  // 示例商品数据
  const products = [
    { id: 1, name: 'Black Crew Neck T-shirt', price: 100, colorTheme: 'black' as const },
    { id: 2, name: 'Black Crew Neck T-shirt', price: 100, colorTheme: 'black' as const },
    { id: 3, name: 'Pink Crew Neck T-shirt', price: 100, colorTheme: 'pink' as const },
    { id: 4, name: 'Pink Crew Neck T-shirt', price: 100, colorTheme: 'pink' as const },
  ];

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

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: spacing[5],
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing[4],
    flexWrap: 'wrap',
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
  };

  const statsBoxStyle: React.CSSProperties = {
    background: '#fff3cd',
    padding: spacing[6],
    borderRadius: borderRadius.md,
    borderLeft: `4px solid ${colors.warning}`,
    marginTop: spacing[6],
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>🎨 Figma Practice - React 组件库</h1>

        {/* 搜索栏演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>1. SearchBar 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            从 Figma Clothes Store UI 提取的搜索栏组件
          </p>

          <SearchBar
            placeholder="Search clothes..."
            value={searchValue}
            onChange={setSearchValue}
            onSearch={(value) => alert(`搜索: ${value}`)}
          />

          <div style={codeBoxStyle}>
            {`<SearchBar
  placeholder="Search clothes..."
  value={searchValue}
  onChange={setSearchValue}
  onSearch={(value) => alert(\`搜索: \${value}\`)}
/>`}
          </div>
        </div>

        {/* 按钮组件演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>2. Button 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            支持多种样式和尺寸的按钮组件
          </p>

          <div style={buttonGroupStyle}>
            <Button variant="primary" onClick={() => alert('Primary clicked')}>
              Primary Button
            </Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="text">Text Button</Button>
          </div>

          <div style={{ marginTop: spacing[6] }}>
            <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
              不同尺寸：
            </p>
            <div style={buttonGroupStyle}>
              <Button size="small">Small</Button>
              <Button size="medium">Medium</Button>
              <Button size="large">Large</Button>
            </div>
          </div>

          <div style={{ marginTop: spacing[6] }}>
            <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
              特殊状态：
            </p>
            <div style={buttonGroupStyle}>
              <Button loading>Loading...</Button>
              <Button disabled>Disabled</Button>
              <Button block>Block Button (100% width)</Button>
            </div>
          </div>

          <div style={codeBoxStyle}>
            {`<Button variant="primary">Primary Button</Button>
<Button variant="outline" size="small">Small Outline</Button>
<Button loading>Loading...</Button>`}
          </div>
        </div>

        {/* 商品卡片演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>3. ProductCard 组件</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            商品卡片组件，支持多种颜色主题和悬停效果
          </p>

          <div style={gridStyle}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                colorTheme={product.colorTheme}
                icon="👕"
                onClick={(id) => {
                  setSelectedProduct(id as number);
                  alert(`选择了商品 ID: ${id}`);
                }}
              />
            ))}
          </div>

          {selectedProduct && (
            <p style={{ marginTop: spacing[4], color: colors.secondary, fontWeight: typography.fontWeight.medium }}>
              ✓ 已选择商品 ID: {selectedProduct}
            </p>
          )}

          <div style={codeBoxStyle}>
            {`<ProductCard
  id={1}
  name="Black Crew Neck T-shirt"
  price={100}
  colorTheme="black"
  icon="👕"
  onClick={(id) => console.log('Clicked:', id)}
/>`}
          </div>
        </div>

        {/* 设计 Token 演示 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>4. 设计 Token 系统</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            从 Figma 提取的设计规范，包括颜色、字体、间距等
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing[4] }}>
            {/* 颜色展示 */}
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>主色调</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <div style={{ background: colors.primary, color: colors.white, padding: spacing[3], borderRadius: borderRadius.base }}>
                  Primary
                </div>
                <div style={{ background: colors.secondary, color: colors.white, padding: spacing[3], borderRadius: borderRadius.base }}>
                  Secondary
                </div>
              </div>
            </div>

            {/* 渐变展示 */}
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>渐变色</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <div style={{ background: colors.gradients.productBlack, color: colors.white, padding: spacing[3], borderRadius: borderRadius.base }}>
                  Black Gradient
                </div>
                <div style={{ background: colors.gradients.productPink, color: colors.white, padding: spacing[3], borderRadius: borderRadius.base }}>
                  Pink Gradient
                </div>
              </div>
            </div>

            {/* 字体展示 */}
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>字体尺寸</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <div style={{ fontSize: typography.fontSize.sm }}>Small (13px)</div>
                <div style={{ fontSize: typography.fontSize.base }}>Base (14px)</div>
                <div style={{ fontSize: typography.fontSize.lg }}>Large (18px)</div>
              </div>
            </div>

            {/* 间距展示 */}
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>间距</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{ width: spacing[2], height: spacing[2], background: colors.secondary }} />
                  spacing[2] = 8px
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{ width: spacing[4], height: spacing[4], background: colors.secondary }} />
                  spacing[4] = 16px
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{ width: spacing[8], height: spacing[8], background: colors.secondary }} />
                  spacing[8] = 32px
                </div>
              </div>
            </div>
          </div>

          <div style={codeBoxStyle}>
            {`import { colors, typography, spacing } from './designTokens';

const buttonStyle = {
  background: colors.primary,
  fontSize: typography.fontSize.base,
  padding: spacing[4],
};`}
          </div>
        </div>

        {/* 学习总结 */}
        <div style={statsBoxStyle}>
          <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.warning, marginBottom: spacing[4] }}>
            📚 场景2学习总结
          </h3>

          <ul style={{ listStyle: 'none', padding: 0, color: colors.text.primary }}>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>设计 Token 提取</strong>：从 Figma 设计中提取颜色、字体、间距等规范
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>TypeScript 类型定义</strong>：为所有组件添加完整的类型支持
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>React 组件封装</strong>：将设计转换为可复用的 React 组件
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>样式管理</strong>：使用 inline styles 配合 CSS-in-JS 实现样式隔离
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>交互实现</strong>：添加 hover、focus 等交互效果
            </li>
            <li style={{ marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
              ✅ <strong>可访问性</strong>：添加 ARIA 属性和键盘导航支持
            </li>
          </ul>

          <div style={{ marginTop: spacing[6], padding: spacing[4], background: 'white', borderRadius: borderRadius.base }}>
            <h4 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>📊 组件统计</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4], textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.secondary }}>3</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>React 组件</div>
              </div>
              <div>
                <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.secondary }}>100+</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>TypeScript 类型</div>
              </div>
              <div>
                <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.secondary }}>50+</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>设计 Token</div>
              </div>
            </div>
          </div>
        </div>

        {/* 使用指南 */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>5. 使用指南</h2>

          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing[3] }}>安装导入</h3>
          <div style={codeBoxStyle}>
            {`// 导入组件
import { Button, ProductCard, SearchBar, designTokens } from '@/components/FigmaPractice';

// 导入设计 Token
import { colors, typography, spacing } from '@/components/FigmaPractice/designTokens';`}
          </div>

          <h3 style={{ fontSize: typography.fontSize.lg, marginTop: spacing[6], marginBottom: spacing[3] }}>快速开始</h3>
          <div style={codeBoxStyle}>
            {`function MyComponent() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div>
      <SearchBar
        value={searchValue}
        onChange={setSearchValue}
        onSearch={(value) => console.log(value)}
      />

      <ProductCard
        id={1}
        name="Product Name"
        price={99}
        colorTheme="black"
        onClick={(id) => console.log(id)}
      />

      <Button variant="primary" onClick={() => {}}>
        Add to Cart
      </Button>
    </div>
  );
}`}
          </div>

          <h3 style={{ fontSize: typography.fontSize.lg, marginTop: spacing[6], marginBottom: spacing[3] }}>自定义主题</h3>
          <div style={codeBoxStyle}>
            {`// 使用设计 Token 自定义样式
const customStyle = {
  background: colors.gradients.productPink,
  padding: spacing[6],
  borderRadius: borderRadius.lg,
  fontSize: typography.fontSize.xl,
};`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FigmaPracticeDemo;
