import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { QuantitySelector } from './QuantitySelector';

/**
 * QuantitySelector 组件 - 数量选择器
 *
 * 支持数量增减、手动输入、最小最大值限制和多种样式变体。
 */
const meta = {
  title: 'FigmaPractice/Scene3/QuantitySelector',
  component: QuantitySelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '数量选择器组件，支持3种样式变体、3种尺寸、输入验证和边界控制。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'number',
      description: '当前值',
    },
    onChange: {
      action: 'value changed',
      description: '值变化回调',
    },
    min: {
      control: 'number',
      description: '最小值',
      table: {
        defaultValue: { summary: '1' },
      },
    },
    max: {
      control: 'number',
      description: '最大值',
      table: {
        defaultValue: { summary: '99' },
      },
    },
    step: {
      control: 'number',
      description: '步长',
      table: {
        defaultValue: { summary: '1' },
      },
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: '尺寸',
      table: {
        defaultValue: { summary: 'medium' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'outline', 'rounded'],
      description: '样式变体',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    showInput: {
      control: 'boolean',
      description: '是否显示输入框',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    label: {
      control: 'text',
      description: '标签文本',
    },
  },
} satisfies Meta<typeof QuantitySelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认样式
 */
export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(1);
    return <QuantitySelector value={value} onChange={setValue} />;
  },
};

/**
 * Outline 样式
 */
export const Outline: Story = {
  render: () => {
    const [value, setValue] = useState(5);
    return <QuantitySelector value={value} onChange={setValue} variant="outline" />;
  },
};

/**
 * Rounded 样式
 */
export const Rounded: Story = {
  render: () => {
    const [value, setValue] = useState(3);
    return <QuantitySelector value={value} onChange={setValue} variant="rounded" />;
  },
};

/**
 * Small 尺寸
 */
export const SmallSize: Story = {
  render: () => {
    const [value, setValue] = useState(1);
    return <QuantitySelector value={value} onChange={setValue} size="small" />;
  },
};

/**
 * Medium 尺寸（默认）
 */
export const MediumSize: Story = {
  render: () => {
    const [value, setValue] = useState(1);
    return <QuantitySelector value={value} onChange={setValue} size="medium" />;
  },
};

/**
 * Large 尺寸
 */
export const LargeSize: Story = {
  render: () => {
    const [value, setValue] = useState(1);
    return <QuantitySelector value={value} onChange={setValue} size="large" />;
  },
};

/**
 * 带标签
 */
export const WithLabel: Story = {
  render: () => {
    const [value, setValue] = useState(2);
    return <QuantitySelector value={value} onChange={setValue} label="数量" />;
  },
};

/**
 * 不显示输入框
 */
export const NoInput: Story = {
  render: () => {
    const [value, setValue] = useState(5);
    return <QuantitySelector value={value} onChange={setValue} showInput={false} />;
  },
};

/**
 * 自定义最小最大值
 */
export const CustomMinMax: Story = {
  render: () => {
    const [value, setValue] = useState(10);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <QuantitySelector
          value={value}
          onChange={setValue}
          min={5}
          max={20}
          label="数量 (5-20)"
        />
        <div style={{ fontSize: '14px', color: '#666' }}>
          最小值: 5, 最大值: 20, 当前值: {value}
        </div>
      </div>
    );
  },
};

/**
 * 自定义步长
 */
export const CustomStep: Story = {
  render: () => {
    const [value, setValue] = useState(10);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <QuantitySelector
          value={value}
          onChange={setValue}
          step={5}
          min={5}
          max={50}
          label="数量 (步长: 5)"
        />
        <div style={{ fontSize: '14px', color: '#666' }}>
          步长: 5, 当前值: {value}
        </div>
      </div>
    );
  },
};

/**
 * 禁用状态
 */
export const Disabled: Story = {
  args: {
    value: 5,
    disabled: true,
  },
};

/**
 * 所有变体
 */
export const AllVariants: Story = {
  render: () => {
    const [value1, setValue1] = useState(1);
    const [value2, setValue2] = useState(1);
    const [value3, setValue3] = useState(1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: '0 0 12px 0' }}>Default</h4>
          <QuantitySelector value={value1} onChange={setValue1} variant="default" />
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px 0' }}>Outline</h4>
          <QuantitySelector value={value2} onChange={setValue2} variant="outline" />
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px 0' }}>Rounded</h4>
          <QuantitySelector value={value3} onChange={setValue3} variant="rounded" />
        </div>
      </div>
    );
  },
};

/**
 * 所有尺寸
 */
export const AllSizes: Story = {
  render: () => {
    const [value1, setValue1] = useState(1);
    const [value2, setValue2] = useState(1);
    const [value3, setValue3] = useState(1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: '0 0 12px 0' }}>Small</h4>
          <QuantitySelector value={value1} onChange={setValue1} size="small" />
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px 0' }}>Medium</h4>
          <QuantitySelector value={value2} onChange={setValue2} size="medium" />
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px 0' }}>Large</h4>
          <QuantitySelector value={value3} onChange={setValue3} size="large" />
        </div>
      </div>
    );
  },
};

/**
 * 样式和尺寸组合
 */
export const VariantSizeCombinations: Story = {
  render: () => {
    const [values, setValues] = useState({
      defaultSmall: 1,
      defaultMedium: 1,
      defaultLarge: 1,
      outlineSmall: 1,
      outlineMedium: 1,
      outlineLarge: 1,
      roundedSmall: 1,
      roundedMedium: 1,
      roundedLarge: 1,
    });

    const updateValue = (key: string, value: number) => {
      setValues(prev => ({ ...prev, [key]: value }));
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {/* Default */}
        <div>
          <h4>Default - Small</h4>
          <QuantitySelector value={values.defaultSmall} onChange={(v) => updateValue('defaultSmall', v)} variant="default" size="small" />
        </div>
        <div>
          <h4>Default - Medium</h4>
          <QuantitySelector value={values.defaultMedium} onChange={(v) => updateValue('defaultMedium', v)} variant="default" size="medium" />
        </div>
        <div>
          <h4>Default - Large</h4>
          <QuantitySelector value={values.defaultLarge} onChange={(v) => updateValue('defaultLarge', v)} variant="default" size="large" />
        </div>

        {/* Outline */}
        <div>
          <h4>Outline - Small</h4>
          <QuantitySelector value={values.outlineSmall} onChange={(v) => updateValue('outlineSmall', v)} variant="outline" size="small" />
        </div>
        <div>
          <h4>Outline - Medium</h4>
          <QuantitySelector value={values.outlineMedium} onChange={(v) => updateValue('outlineMedium', v)} variant="outline" size="medium" />
        </div>
        <div>
          <h4>Outline - Large</h4>
          <QuantitySelector value={values.outlineLarge} onChange={(v) => updateValue('outlineLarge', v)} variant="outline" size="large" />
        </div>

        {/* Rounded */}
        <div>
          <h4>Rounded - Small</h4>
          <QuantitySelector value={values.roundedSmall} onChange={(v) => updateValue('roundedSmall', v)} variant="rounded" size="small" />
        </div>
        <div>
          <h4>Rounded - Medium</h4>
          <QuantitySelector value={values.roundedMedium} onChange={(v) => updateValue('roundedMedium', v)} variant="rounded" size="medium" />
        </div>
        <div>
          <h4>Rounded - Large</h4>
          <QuantitySelector value={values.roundedLarge} onChange={(v) => updateValue('roundedLarge', v)} variant="rounded" size="large" />
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'padded',
  },
};

/**
 * 实际使用场景 - 购物车
 */
export const ShoppingCartExample: Story = {
  render: () => {
    const [items, setItems] = useState([
      { id: 1, name: 'Black T-Shirt', price: 100, quantity: 2 },
      { id: 2, name: 'Blue Jeans', price: 199, quantity: 1 },
      { id: 3, name: 'White Sneakers', price: 299, quantity: 1 },
    ]);

    const updateQuantity = (id: number, quantity: number) => {
      setItems(items.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
      <div style={{ width: '400px', padding: '20px', background: '#f5f5f5', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>购物车</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: 'white',
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.name}</div>
                <div style={{ color: '#666', fontSize: '14px' }}>¥{item.price}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <QuantitySelector
                  value={item.quantity}
                  onChange={(q) => updateQuantity(item.id, q)}
                  min={1}
                  max={10}
                  size="small"
                  variant="outline"
                />
                <div style={{ fontWeight: 'bold', color: '#1890ff', minWidth: '60px', textAlign: 'right' }}>
                  ¥{item.price * item.quantity}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>总计:</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>¥{total}</div>
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'centered',
  },
};
