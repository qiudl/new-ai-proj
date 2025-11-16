import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CartItem } from './CartItem';

/**
 * CartItem 组件 - 购物车项目组件
 *
 * 展示购物车中的单个商品，支持数量选择、删除和选择功能。
 */
const meta = {
  title: 'FigmaPractice/Scene3/CartItem',
  component: CartItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '购物车项目组件，支持数量调整、商品选择、删除功能和响应式设计。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    id: {
      control: 'text',
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
    quantity: {
      control: 'number',
      description: '购买数量',
      table: {
        defaultValue: { summary: '1' },
      },
    },
    image: {
      control: 'text',
      description: '商品图片URL',
    },
    icon: {
      control: 'text',
      description: '商品图标（无图片时使用）',
      table: {
        defaultValue: { summary: '🛍️' },
      },
    },
    color: {
      control: 'text',
      description: '商品颜色',
    },
    size: {
      control: 'text',
      description: '商品尺寸',
    },
    selectable: {
      control: 'boolean',
      description: '是否可选中',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    selected: {
      control: 'boolean',
      description: '是否已选中',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    currency: {
      control: 'text',
      description: '货币符号',
      table: {
        defaultValue: { summary: '¥' },
      },
    },
    onQuantityChange: {
      action: 'quantity changed',
      description: '数量变化回调',
    },
    onRemove: {
      action: 'removed',
      description: '删除回调',
    },
    onClick: {
      action: 'clicked',
      description: '点击商品回调',
    },
    onSelectChange: {
      action: 'selection changed',
      description: '选中状态变化回调',
    },
  },
} satisfies Meta<typeof CartItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认购物车项目
 */
export const Default: Story = {
  args: {
    id: '1',
    name: 'Black Crew Neck T-shirt',
    price: 100,
    quantity: 2,
    icon: '👕',
  },
};

/**
 * 带图片的购物车项目
 */
export const WithImage: Story = {
  args: {
    id: '2',
    name: 'White Sneakers',
    price: 299,
    quantity: 1,
    image: 'https://via.placeholder.com/80x80/FFFFFF/000000?text=Sneakers',
  },
};

/**
 * 带颜色和尺寸信息
 */
export const WithAttributes: Story = {
  args: {
    id: '3',
    name: 'Premium Cotton T-shirt',
    price: 150,
    quantity: 2,
    color: '黑色',
    size: 'L',
    icon: '👕',
  },
};

/**
 * 可选择的购物车项目
 */
export const Selectable: Story = {
  render: () => {
    const [selected, setSelected] = useState(false);
    return (
      <CartItem
        id="4"
        name="Blue Jeans"
        price={199}
        quantity={1}
        color="蓝色"
        size="32"
        icon="👖"
        selectable
        selected={selected}
        onSelectChange={setSelected}
      />
    );
  },
};

/**
 * 可删除的购物车项目
 */
export const WithRemove: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    if (!visible) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>商品已删除</p>
          <button onClick={() => setVisible(true)} style={{ marginTop: '12px' }}>
            恢复
          </button>
        </div>
      );
    }
    return (
      <CartItem
        id="5"
        name="Red Cap"
        price={89}
        quantity={1}
        icon="🧢"
        onRemove={() => setVisible(false)}
      />
    );
  },
};

/**
 * 交互式数量调整
 */
export const InteractiveQuantity: Story = {
  render: () => {
    const [quantity, setQuantity] = useState(1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <CartItem
          id="6"
          name="Black T-Shirt"
          price={100}
          quantity={quantity}
          icon="👕"
          onQuantityChange={setQuantity}
        />
        <div style={{ fontSize: '14px', color: '#666' }}>
          当前数量: {quantity} | 小计: ¥{100 * quantity}
        </div>
      </div>
    );
  },
};

/**
 * 完整功能示例
 */
export const FullFeatured: Story = {
  render: () => {
    const [selected, setSelected] = useState(true);
    const [quantity, setQuantity] = useState(2);

    return (
      <div style={{ maxWidth: '600px' }}>
        <CartItem
          id="7"
          name="Premium Cotton T-shirt"
          price={150}
          quantity={quantity}
          color="白色"
          size="M"
          icon="👕"
          selectable
          selected={selected}
          onSelectChange={setSelected}
          onQuantityChange={setQuantity}
          onRemove={() => alert('商品已删除')}
          onClick={() => console.log('Clicked cart item')}
        />
        <div style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
          选中状态: {selected ? '✓ 已选中' : '✗ 未选中'} |
          数量: {quantity} |
          小计: ¥{150 * quantity}
        </div>
      </div>
    );
  },
};

/**
 * 购物车列表示例
 */
export const CartList: Story = {
  render: () => {
    const [items, setItems] = useState([
      { id: '1', name: 'Black T-Shirt', price: 100, quantity: 2, color: '黑色', size: 'L', icon: '👕', selected: true },
      { id: '2', name: 'Blue Jeans', price: 199, quantity: 1, color: '蓝色', size: '32', icon: '👖', selected: true },
      { id: '3', name: 'White Sneakers', price: 299, quantity: 1, color: '白色', size: '42', icon: '👟', selected: false },
      { id: '4', name: 'Red Cap', price: 89, quantity: 3, color: '红色', size: 'Free', icon: '🧢', selected: true },
    ]);

    const handleQuantityChange = (id: string, newQuantity: number) => {
      setItems(items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    };

    const handleSelectChange = (id: string, selected: boolean) => {
      setItems(items.map(item =>
        item.id === id ? { ...item, selected } : item
      ));
    };

    const handleRemove = (id: string) => {
      setItems(items.filter(item => item.id !== id));
    };

    const selectedItems = items.filter(item => item.selected);
    const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
      <div style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map(item => (
            <CartItem
              key={item.id}
              id={item.id}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
              color={item.color}
              size={item.size}
              icon={item.icon}
              selectable
              selected={item.selected}
              onSelectChange={(selected) => handleSelectChange(item.id, selected)}
              onQuantityChange={(quantity) => handleQuantityChange(item.id, quantity)}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>

        {/* 总计 */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f5f5f5',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              已选择 {selectedItems.length} 件商品
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
              总计: ¥{totalPrice}
            </div>
          </div>
          <button style={{
            padding: '12px 32px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
            opacity: selectedItems.length > 0 ? 1 : 0.5,
          }}>
            结算 ({selectedItems.length})
          </button>
        </div>
      </div>
    );
  },
};

/**
 * 不同货币符号
 */
export const DifferentCurrencies: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <CartItem id="1" name="Product (CNY)" price={100} quantity={1} icon="🛍️" currency="¥" />
      <CartItem id="2" name="Product (USD)" price={15} quantity={1} icon="🛍️" currency="$" />
      <CartItem id="3" name="Product (EUR)" price={12} quantity={1} icon="🛍️" currency="€" />
      <CartItem id="4" name="Product (GBP)" price={10} quantity={1} icon="🛍️" currency="£" />
    </div>
  ),
};
