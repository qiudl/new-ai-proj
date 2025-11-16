import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

/**
 * Button 组件 - 从 Figma Clothes Store UI 提取的按钮组件
 *
 * 支持多种样式变体、尺寸和状态，适用于各种场景。
 */
const meta = {
  title: 'FigmaPractice/Scene2/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '可复用的按钮组件，支持4种样式变体、3种尺寸、加载状态和禁用状态。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'text'],
      description: '按钮样式变体',
      table: {
        defaultValue: { summary: 'primary' },
        type: { summary: 'primary | secondary | outline | text' },
      },
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: '按钮尺寸',
      table: {
        defaultValue: { summary: 'medium' },
        type: { summary: 'small | medium | large' },
      },
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用按钮',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    loading: {
      control: 'boolean',
      description: '是否显示加载状态',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    block: {
      control: 'boolean',
      description: '是否为块级按钮（100%宽度）',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    icon: {
      control: 'text',
      description: '按钮图标（可以是emoji或React节点）',
    },
    onClick: {
      action: 'clicked',
      description: '点击事件处理函数',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认的 Primary 按钮样式
 */
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

/**
 * Secondary 样式按钮
 */
export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

/**
 * Outline 样式按钮
 */
export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

/**
 * Text 样式按钮（无背景）
 */
export const Text: Story = {
  args: {
    children: 'Text Button',
    variant: 'text',
  },
};

/**
 * Small 尺寸按钮
 */
export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'small',
  },
};

/**
 * Medium 尺寸按钮（默认）
 */
export const Medium: Story = {
  args: {
    children: 'Medium Button',
    size: 'medium',
  },
};

/**
 * Large 尺寸按钮
 */
export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'large',
  },
};

/**
 * 带图标的按钮
 */
export const WithIcon: Story = {
  args: {
    children: 'Add to Cart',
    icon: '🛒',
    variant: 'primary',
  },
};

/**
 * 加载状态的按钮
 */
export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
    variant: 'primary',
  },
};

/**
 * 禁用状态的按钮
 */
export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
    variant: 'primary',
  },
};

/**
 * 块级按钮（100%宽度）
 */
export const Block: Story = {
  args: {
    children: 'Block Button',
    block: true,
    variant: 'primary',
  },
  parameters: {
    layout: 'padded',
  },
};

/**
 * 所有变体组合展示
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="text">Text</Button>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};

/**
 * 所有尺寸组合展示
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
      <Button size="small">Small Button</Button>
      <Button size="medium">Medium Button</Button>
      <Button size="large">Large Button</Button>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};

/**
 * 实际使用场景示例
 */
export const RealWorldExample: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="primary" icon="🛒">Add to Cart</Button>
      <Button variant="secondary" icon="❤️">Add to Favorites</Button>
      <Button variant="outline">View Details</Button>
      <Button variant="text">Cancel</Button>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};
