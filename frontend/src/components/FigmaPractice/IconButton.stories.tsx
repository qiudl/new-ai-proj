import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from './IconButton';

/**
 * IconButton 组件 - 图标按钮
 *
 * 支持多种样式变体、尺寸、形状和提示信息的图标按钮组件。
 */
const meta = {
  title: 'FigmaPractice/Scene3/IconButton',
  component: IconButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '图标按钮组件，支持6种样式变体、3种尺寸、3种形状、加载状态和提示信息。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: '图标内容',
    },
    onClick: {
      action: 'clicked',
      description: '点击事件',
    },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: '样式变体',
      table: {
        defaultValue: { summary: 'default' },
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
    shape: {
      control: 'select',
      options: ['circle', 'square', 'rounded'],
      description: '形状',
      table: {
        defaultValue: { summary: 'circle' },
      },
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    loading: {
      control: 'boolean',
      description: '是否加载中',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    tooltip: {
      control: 'text',
      description: '提示信息',
    },
    tooltipPosition: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: '提示位置',
      table: {
        defaultValue: { summary: 'top' },
      },
    },
    ariaLabel: {
      control: 'text',
      description: 'aria-label 无障碍标签',
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认样式
 */
export const Default: Story = {
  args: {
    icon: '❤️',
    tooltip: 'Add to favorites',
  },
};

/**
 * Primary 样式
 */
export const Primary: Story = {
  args: {
    icon: '🛒',
    variant: 'primary',
    tooltip: 'Add to cart',
  },
};

/**
 * Secondary 样式
 */
export const Secondary: Story = {
  args: {
    icon: '🔔',
    variant: 'secondary',
    tooltip: 'Notifications',
  },
};

/**
 * Outline 样式
 */
export const Outline: Story = {
  args: {
    icon: '⚙️',
    variant: 'outline',
    tooltip: 'Settings',
  },
};

/**
 * Ghost 样式
 */
export const Ghost: Story = {
  args: {
    icon: '🔍',
    variant: 'ghost',
    tooltip: 'Search',
  },
};

/**
 * Danger 样式
 */
export const Danger: Story = {
  args: {
    icon: '🗑️',
    variant: 'danger',
    tooltip: 'Delete',
  },
};

/**
 * Small 尺寸
 */
export const SmallSize: Story = {
  args: {
    icon: '❤️',
    size: 'small',
    tooltip: 'Like',
  },
};

/**
 * Medium 尺寸（默认）
 */
export const MediumSize: Story = {
  args: {
    icon: '❤️',
    size: 'medium',
    tooltip: 'Like',
  },
};

/**
 * Large 尺寸
 */
export const LargeSize: Story = {
  args: {
    icon: '❤️',
    size: 'large',
    tooltip: 'Like',
  },
};

/**
 * Circle 形状（默认）
 */
export const CircleShape: Story = {
  args: {
    icon: '❤️',
    shape: 'circle',
    variant: 'primary',
  },
};

/**
 * Square 形状
 */
export const SquareShape: Story = {
  args: {
    icon: '❤️',
    shape: 'square',
    variant: 'primary',
  },
};

/**
 * Rounded 形状
 */
export const RoundedShape: Story = {
  args: {
    icon: '❤️',
    shape: 'rounded',
    variant: 'primary',
  },
};

/**
 * 加载状态
 */
export const Loading: Story = {
  args: {
    icon: '🛒',
    variant: 'primary',
    loading: true,
    tooltip: 'Adding to cart...',
  },
};

/**
 * 禁用状态
 */
export const Disabled: Story = {
  args: {
    icon: '❤️',
    variant: 'primary',
    disabled: true,
    tooltip: 'Not available',
  },
};

/**
 * 提示位置 - 顶部
 */
export const TooltipTop: Story = {
  args: {
    icon: '❤️',
    variant: 'primary',
    tooltip: 'Add to favorites',
    tooltipPosition: 'top',
  },
};

/**
 * 提示位置 - 底部
 */
export const TooltipBottom: Story = {
  args: {
    icon: '❤️',
    variant: 'primary',
    tooltip: 'Add to favorites',
    tooltipPosition: 'bottom',
  },
};

/**
 * 提示位置 - 左侧
 */
export const TooltipLeft: Story = {
  args: {
    icon: '❤️',
    variant: 'primary',
    tooltip: 'Add to favorites',
    tooltipPosition: 'left',
  },
};

/**
 * 提示位置 - 右侧
 */
export const TooltipRight: Story = {
  args: {
    icon: '❤️',
    variant: 'primary',
    tooltip: 'Add to favorites',
    tooltipPosition: 'right',
  },
};

/**
 * 所有变体展示
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" variant="default" tooltip="Default" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Default</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" variant="primary" tooltip="Primary" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Primary</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" variant="secondary" tooltip="Secondary" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Secondary</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" variant="outline" tooltip="Outline" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Outline</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" variant="ghost" tooltip="Ghost" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Ghost</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" variant="danger" tooltip="Danger" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Danger</div>
      </div>
    </div>
  ),
};

/**
 * 所有尺寸展示
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" size="small" variant="primary" tooltip="Small" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Small</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" size="medium" variant="primary" tooltip="Medium" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Medium</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" size="large" variant="primary" tooltip="Large" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Large</div>
      </div>
    </div>
  ),
};

/**
 * 所有形状展示
 */
export const AllShapes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" shape="circle" variant="primary" tooltip="Circle" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Circle</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" shape="square" variant="primary" tooltip="Square" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Square</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="❤️" shape="rounded" variant="primary" tooltip="Rounded" />
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Rounded</div>
      </div>
    </div>
  ),
};

/**
 * 常用图标按钮示例
 */
export const CommonIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      <IconButton icon="❤️" variant="primary" tooltip="Like" />
      <IconButton icon="🛒" variant="primary" tooltip="Add to Cart" />
      <IconButton icon="🔍" variant="ghost" tooltip="Search" />
      <IconButton icon="🔔" variant="secondary" tooltip="Notifications" />
      <IconButton icon="⚙️" variant="outline" tooltip="Settings" />
      <IconButton icon="📤" variant="ghost" tooltip="Share" />
      <IconButton icon="🗑️" variant="danger" tooltip="Delete" />
      <IconButton icon="✏️" variant="ghost" tooltip="Edit" />
      <IconButton icon="👁️" variant="ghost" tooltip="View" />
      <IconButton icon="⭐" variant="primary" tooltip="Favorite" />
      <IconButton icon="💬" variant="ghost" tooltip="Comment" />
      <IconButton icon="🔒" variant="secondary" tooltip="Lock" />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/**
 * 实际使用场景 - 商品卡片
 */
export const ProductCardExample: Story = {
  render: () => (
    <div style={{
      width: '280px',
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      {/* 商品图片区 */}
      <div style={{
        position: 'relative',
        height: '280px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '80px' }}>👕</span>

        {/* 右上角按钮 */}
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <IconButton
            icon="❤️"
            variant="default"
            tooltip="Add to favorites"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          />
        </div>
      </div>

      {/* 商品信息 */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Premium T-Shirt</h3>
        <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: '14px' }}>
          High-quality cotton blend
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
            ¥299
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <IconButton
              icon="📤"
              variant="outline"
              size="medium"
              tooltip="Share"
            />
            <IconButton
              icon="🛒"
              variant="primary"
              size="medium"
              tooltip="Add to cart"
            />
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * 实际使用场景 - 工具栏
 */
export const ToolbarExample: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      width: '600px',
    }}>
      {/* 左侧按钮组 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <IconButton icon="🔍" variant="ghost" tooltip="Search" size="small" />
        <IconButton icon="🔔" variant="ghost" tooltip="Notifications" size="small" />
        <IconButton icon="💬" variant="ghost" tooltip="Messages" size="small" />
      </div>

      {/* 标题 */}
      <h3 style={{ margin: 0, fontSize: '16px' }}>Dashboard</h3>

      {/* 右侧按钮组 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <IconButton icon="⚙️" variant="ghost" tooltip="Settings" size="small" />
        <IconButton icon="❓" variant="ghost" tooltip="Help" size="small" />
        <IconButton icon="👤" variant="primary" tooltip="Profile" size="small" />
      </div>
    </div>
  ),
};
