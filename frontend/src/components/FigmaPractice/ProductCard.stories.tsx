import type { Meta, StoryObj } from '@storybook/react';
import { ProductCard } from './ProductCard';

/**
 * ProductCard 组件 - 商品卡片组件
 *
 * 展示商品信息，支持多种颜色主题和渐变背景效果。
 */
const meta = {
  title: 'FigmaPractice/Scene2/ProductCard',
  component: ProductCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '可复用的商品卡片组件，支持3种颜色主题、悬停动画和点击交互。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    id: {
      control: 'number',
      description: '商品ID',
    },
    name: {
      control: 'text',
      description: '商品名称',
    },
    price: {
      control: 'number',
      description: '商品价格',
    },
    colorTheme: {
      control: 'select',
      options: ['black', 'pink', 'default'],
      description: '颜色主题',
      table: {
        defaultValue: { summary: 'default' },
        type: { summary: 'black | pink | default' },
      },
    },
    image: {
      control: 'text',
      description: '商品图片URL',
    },
    icon: {
      control: 'text',
      description: '商品图标（无图片时显示）',
      table: {
        defaultValue: { summary: '👕' },
      },
    },
    onClick: {
      action: 'clicked',
      description: '点击事件处理函数',
    },
  },
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认主题的商品卡片
 */
export const Default: Story = {
  args: {
    id: 1,
    name: 'Crew Neck T-shirt',
    price: 100,
    colorTheme: 'default',
    icon: '👕',
  },
};

/**
 * Black 主题商品卡片
 */
export const BlackTheme: Story = {
  args: {
    id: 1,
    name: 'Black Crew Neck T-shirt',
    price: 100,
    colorTheme: 'black',
    icon: '👕',
  },
};

/**
 * Pink 主题商品卡片
 */
export const PinkTheme: Story = {
  args: {
    id: 2,
    name: 'Pink Crew Neck T-shirt',
    price: 100,
    colorTheme: 'pink',
    icon: '👕',
  },
};

/**
 * 带自定义图片的商品卡片
 */
export const WithImage: Story = {
  args: {
    id: 3,
    name: 'Custom Image T-shirt',
    price: 120,
    colorTheme: 'black',
    image: 'https://via.placeholder.com/200x200/000000/FFFFFF?text=T-Shirt',
  },
};

/**
 * 不同价格的商品
 */
export const DifferentPrices: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      <ProductCard
        id={1}
        name="Budget T-shirt"
        price={50}
        colorTheme="default"
        icon="👕"
      />
      <ProductCard
        id={2}
        name="Standard T-shirt"
        price={100}
        colorTheme="black"
        icon="👕"
      />
      <ProductCard
        id={3}
        name="Premium T-shirt"
        price={200}
        colorTheme="pink"
        icon="👕"
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/**
 * 所有主题展示
 */
export const AllThemes: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      <ProductCard
        id={1}
        name="Black Theme"
        price={100}
        colorTheme="black"
        icon="👕"
      />
      <ProductCard
        id={2}
        name="Pink Theme"
        price={100}
        colorTheme="pink"
        icon="👕"
      />
      <ProductCard
        id={3}
        name="Default Theme"
        price={100}
        colorTheme="default"
        icon="👕"
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/**
 * 不同商品类型
 */
export const DifferentProducts: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      <ProductCard id={1} name="T-Shirt" price={100} colorTheme="black" icon="👕" />
      <ProductCard id={2} name="Jeans" price={150} colorTheme="pink" icon="👖" />
      <ProductCard id={3} name="Sneakers" price={200} colorTheme="default" icon="👟" />
      <ProductCard id={4} name="Cap" price={50} colorTheme="black" icon="🧢" />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/**
 * 商品网格布局示例
 */
export const GridLayout: Story = {
  render: () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '20px',
      padding: '20px',
      maxWidth: '1000px',
    }}>
      {[
        { id: 1, name: 'Black Crew Neck T-shirt', price: 100, theme: 'black' as const },
        { id: 2, name: 'Black Crew Neck T-shirt', price: 100, theme: 'black' as const },
        { id: 3, name: 'Pink Crew Neck T-shirt', price: 100, theme: 'pink' as const },
        { id: 4, name: 'Pink Crew Neck T-shirt', price: 100, theme: 'pink' as const },
        { id: 5, name: 'Gray Crew Neck T-shirt', price: 100, theme: 'default' as const },
        { id: 6, name: 'White Crew Neck T-shirt', price: 100, theme: 'default' as const },
      ].map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          price={product.price}
          colorTheme={product.theme}
          icon="👕"
          onClick={(id) => console.log(`Clicked product ${id}`)}
        />
      ))}
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
