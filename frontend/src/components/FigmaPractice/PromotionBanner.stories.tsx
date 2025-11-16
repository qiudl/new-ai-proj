import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PromotionBanner } from './PromotionBanner';

const meta = {
  title: 'FigmaPractice/Scene3/PromotionBanner',
  component: PromotionBanner,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PromotionBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    title: 'Special Offer!',
    description: 'Get 20% off on all items this week',
    action: 'Shop Now',
    background: 'primary',
  },
};

export const Gradient: Story = {
  args: {
    title: '🎉 New Season Sale!',
    description: 'Get up to 50% off on all items. Limited time offer!',
    action: 'Shop Now',
    background: 'gradient',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Free Shipping',
    description: 'On orders over $100',
    icon: '🚚',
    background: 'secondary',
    size: 'small',
  },
};

export const Closable: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    if (!visible) {
      return <button onClick={() => setVisible(true)}>Show Banner Again</button>;
    }
    return (
      <PromotionBanner
        title="🎉 New Season Sale!"
        description="Get up to 50% off on all items"
        action="Shop Now"
        background="gradient"
        closable
        onClose={() => setVisible(false)}
      />
    );
  },
};

export const AllBackgrounds: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PromotionBanner title="Primary" description="Primary background" background="primary" />
      <PromotionBanner title="Secondary" description="Secondary background" background="secondary" />
      <PromotionBanner title="Gradient" description="Gradient background" background="gradient" />
      <PromotionBanner title="Success" description="Success background" background="success" />
      <PromotionBanner title="Warning" description="Warning background" background="warning" />
      <PromotionBanner title="Error" description="Error background" background="error" />
    </div>
  ),
};

export const DifferentSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PromotionBanner title="Small Banner" description="This is a small banner" size="small" background="primary" />
      <PromotionBanner title="Medium Banner" description="This is a medium banner" size="medium" background="secondary" />
      <PromotionBanner title="Large Banner" description="This is a large banner" size="large" background="gradient" />
    </div>
  ),
};
