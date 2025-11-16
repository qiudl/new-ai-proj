import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColorSelector, type ColorOption } from './ColorSelector';

/**
 * ColorSelector 组件 - 颜色选择器
 *
 * 支持多种颜色选项、禁用状态、售罄状态和悬停提示。
 */
const meta = {
  title: 'FigmaPractice/Scene3/ColorSelector',
  component: ColorSelector,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '颜色选择器组件，支持多种尺寸、标签位置和状态显示。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    colors: {
      control: 'object',
      description: '颜色选项列表',
    },
    selectedColor: {
      control: 'text',
      description: '当前选中的颜色ID',
    },
    onChange: {
      action: 'color changed',
      description: '颜色变化回调',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: '尺寸',
      table: {
        defaultValue: { summary: 'medium' },
      },
    },
    showLabel: {
      control: 'boolean',
      description: '显示颜色名称',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    labelPosition: {
      control: 'select',
      options: ['top', 'bottom', 'right'],
      description: '标签位置',
      table: {
        defaultValue: { summary: 'top' },
      },
    },
  },
} satisfies Meta<typeof ColorSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicColors: ColorOption[] = [
  { id: 'black', name: '黑色', value: '#000000' },
  { id: 'white', name: '白色', value: '#FFFFFF' },
  { id: 'gray', name: '灰色', value: '#808080' },
  { id: 'red', name: '红色', value: '#FF0000' },
  { id: 'blue', name: '蓝色', value: '#0000FF' },
];

/**
 * 默认颜色选择器
 */
export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState('black');
    return (
      <ColorSelector
        colors={basicColors}
        selectedColor={selected}
        onChange={setSelected}
      />
    );
  },
};

/**
 * 小尺寸
 */
export const SmallSize: Story = {
  render: () => {
    const [selected, setSelected] = useState('red');
    return (
      <ColorSelector
        colors={basicColors}
        selectedColor={selected}
        onChange={setSelected}
        size="small"
      />
    );
  },
};

/**
 * 大尺寸
 */
export const LargeSize: Story = {
  render: () => {
    const [selected, setSelected] = useState('blue');
    return (
      <ColorSelector
        colors={basicColors}
        selectedColor={selected}
        onChange={setSelected}
        size="large"
      />
    );
  },
};

/**
 * 不显示标签
 */
export const NoLabel: Story = {
  render: () => {
    const [selected, setSelected] = useState('black');
    return (
      <ColorSelector
        colors={basicColors}
        selectedColor={selected}
        onChange={setSelected}
        showLabel={false}
      />
    );
  },
};

/**
 * 标签在右侧
 */
export const LabelRight: Story = {
  render: () => {
    const [selected, setSelected] = useState('red');
    return (
      <ColorSelector
        colors={basicColors}
        selectedColor={selected}
        onChange={setSelected}
        labelPosition="right"
      />
    );
  },
};

/**
 * 标签在底部
 */
export const LabelBottom: Story = {
  render: () => {
    const [selected, setSelected] = useState('blue');
    return (
      <ColorSelector
        colors={basicColors}
        selectedColor={selected}
        onChange={setSelected}
        labelPosition="bottom"
      />
    );
  },
};

/**
 * 带禁用和售罄状态
 */
export const WithDisabledAndOutOfStock: Story = {
  render: () => {
    const [selected, setSelected] = useState('black');
    const colorsWithStatus: ColorOption[] = [
      { id: 'black', name: '黑色', value: '#000000' },
      { id: 'white', name: '白色', value: '#FFFFFF', outOfStock: true },
      { id: 'gray', name: '灰色', value: '#808080', disabled: true },
      { id: 'red', name: '红色', value: '#FF0000' },
      { id: 'blue', name: '蓝色', value: '#0000FF', outOfStock: true },
    ];

    return (
      <ColorSelector
        colors={colorsWithStatus}
        selectedColor={selected}
        onChange={setSelected}
      />
    );
  },
};

/**
 * 更多颜色选项
 */
export const ManyColors: Story = {
  render: () => {
    const [selected, setSelected] = useState('navy');
    const manyColors: ColorOption[] = [
      { id: 'black', name: '黑色', value: '#000000' },
      { id: 'white', name: '白色', value: '#FFFFFF' },
      { id: 'gray', name: '灰色', value: '#808080' },
      { id: 'red', name: '红色', value: '#FF0000' },
      { id: 'orange', name: '橙色', value: '#FFA500' },
      { id: 'yellow', name: '黄色', value: '#FFFF00' },
      { id: 'green', name: '绿色', value: '#00FF00' },
      { id: 'blue', name: '蓝色', value: '#0000FF' },
      { id: 'purple', name: '紫色', value: '#800080' },
      { id: 'pink', name: '粉色', value: '#FFC0CB' },
      { id: 'brown', name: '棕色', value: '#A52A2A' },
      { id: 'navy', name: '海军蓝', value: '#000080' },
    ];

    return (
      <ColorSelector
        colors={manyColors}
        selectedColor={selected}
        onChange={setSelected}
      />
    );
  },
};

/**
 * 渐变色选项
 */
export const GradientColors: Story = {
  render: () => {
    const [selected, setSelected] = useState('sunset');
    const gradientColors: ColorOption[] = [
      { id: 'sunset', name: '日落', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { id: 'ocean', name: '海洋', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { id: 'fire', name: '火焰', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
      { id: 'forest', name: '森林', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
      { id: 'rainbow', name: '彩虹', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    ];

    return (
      <ColorSelector
        colors={gradientColors}
        selectedColor={selected}
        onChange={setSelected}
        size="large"
      />
    );
  },
};

/**
 * 所有尺寸对比
 */
export const AllSizes: Story = {
  render: () => {
    const [small, setSmall] = useState('black');
    const [medium, setMedium] = useState('red');
    const [large, setLarge] = useState('blue');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <h4 style={{ marginBottom: '12px' }}>Small</h4>
          <ColorSelector
            colors={basicColors}
            selectedColor={small}
            onChange={setSmall}
            size="small"
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '12px' }}>Medium</h4>
          <ColorSelector
            colors={basicColors}
            selectedColor={medium}
            onChange={setMedium}
            size="medium"
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '12px' }}>Large</h4>
          <ColorSelector
            colors={basicColors}
            selectedColor={large}
            onChange={setLarge}
            size="large"
          />
        </div>
      </div>
    );
  },
};

/**
 * 所有标签位置
 */
export const AllLabelPositions: Story = {
  render: () => {
    const [top, setTop] = useState('black');
    const [bottom, setBottom] = useState('red');
    const [right, setRight] = useState('blue');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <h4 style={{ marginBottom: '12px' }}>Label Top</h4>
          <ColorSelector
            colors={basicColors}
            selectedColor={top}
            onChange={setTop}
            labelPosition="top"
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '12px' }}>Label Bottom</h4>
          <ColorSelector
            colors={basicColors}
            selectedColor={bottom}
            onChange={setBottom}
            labelPosition="bottom"
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '12px' }}>Label Right</h4>
          <ColorSelector
            colors={basicColors}
            selectedColor={right}
            onChange={setRight}
            labelPosition="right"
          />
        </div>
      </div>
    );
  },
};

/**
 * 实际使用场景 - 商品详情页
 */
export const ProductDetailExample: Story = {
  render: () => {
    const [selectedColor, setSelectedColor] = useState('black');
    const [selectedSize, setSelectedSize] = useState('M');

    const productColors: ColorOption[] = [
      { id: 'black', name: '经典黑', value: '#000000' },
      { id: 'white', name: '纯白', value: '#FFFFFF' },
      { id: 'navy', name: '海军蓝', value: '#000080', outOfStock: true },
      { id: 'gray', name: '烟灰', value: '#808080' },
      { id: 'beige', name: '米色', value: '#F5F5DC' },
    ];

    const sizes = ['XS', 'S', 'M', 'L', 'XL'];

    return (
      <div style={{
        maxWidth: '400px',
        padding: '24px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Premium Cotton T-Shirt</h3>
        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 24px 0' }}>
          经典圆领设计，100% 纯棉面料，舒适透气
        </p>

        {/* 颜色选择 */}
        <div style={{ marginBottom: '24px' }}>
          <ColorSelector
            colors={productColors}
            selectedColor={selectedColor}
            onChange={setSelectedColor}
            size="large"
          />
        </div>

        {/* 尺寸选择 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
            尺寸: {selectedSize}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                style={{
                  padding: '8px 16px',
                  border: `2px solid ${selectedSize === size ? '#1890ff' : '#d9d9d9'}`,
                  background: selectedSize === size ? '#e6f7ff' : 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* 价格和购买 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid #f0f0f0',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
            ¥299
          </div>
          <button style={{
            padding: '12px 32px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}>
            加入购物车
          </button>
        </div>
      </div>
    );
  },
};
