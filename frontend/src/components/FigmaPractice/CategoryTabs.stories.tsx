import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CategoryTabs, type Category } from './CategoryTabs';

const meta = {
  title: 'FigmaPractice/Scene3/CategoryTabs',
  component: CategoryTabs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '分类标签导航组件，支持多种样式变体、计数显示和全宽布局。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'pills', 'underline'],
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
    fullWidth: {
      control: 'boolean',
      description: '是否全宽布局',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
} satisfies Meta<typeof CategoryTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const categories: Category[] = [
  { id: 'all', label: 'All', count: 24 },
  { id: 'shirts', label: 'T-Shirts', count: 12 },
  { id: 'pants', label: 'Pants', count: 8 },
  { id: 'shoes', label: 'Shoes', count: 4 },
];

export const Default: Story = {
  render: () => {
    const [active, setActive] = useState('all');
    return (
      <CategoryTabs
        items={categories}
        activeCategory={active}
        onChange={setActive}
      />
    );
  },
};

export const Pills: Story = {
  render: () => {
    const [active, setActive] = useState('all');
    return (
      <CategoryTabs
        items={categories}
        activeCategory={active}
        onChange={setActive}
        variant="pills"
      />
    );
  },
};

export const Underline: Story = {
  render: () => {
    const [active, setActive] = useState('all');
    return (
      <CategoryTabs
        items={categories}
        activeCategory={active}
        onChange={setActive}
        variant="underline"
        fullWidth
      />
    );
  },
};

export const SmallSize: Story = {
  render: () => {
    const [active, setActive] = useState('all');
    return (
      <CategoryTabs
        items={categories}
        activeCategory={active}
        onChange={setActive}
        size="small"
      />
    );
  },
};

export const LargeSize: Story = {
  render: () => {
    const [active, setActive] = useState('all');
    return (
      <CategoryTabs
        items={categories}
        activeCategory={active}
        onChange={setActive}
        size="large"
      />
    );
  },
};

export const SimpleMode: Story = {
  render: () => {
    const [active, setActive] = useState('All');
    return (
      <CategoryTabs
        categories={['All', 'New', 'Featured', 'Sale']}
        activeCategory={active}
        onChange={setActive}
        variant="pills"
      />
    );
  },
};

export const FullWidth: Story = {
  render: () => {
    const [active, setActive] = useState('all');
    return (
      <CategoryTabs
        items={categories}
        activeCategory={active}
        onChange={setActive}
        fullWidth
      />
    );
  },
};

export const AllVariants: Story = {
  render: () => {
    const [active1, setActive1] = useState('all');
    const [active2, setActive2] = useState('all');
    const [active3, setActive3] = useState('all');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <h4 style={{ marginBottom: '12px' }}>Default</h4>
          <CategoryTabs
            items={categories}
            activeCategory={active1}
            onChange={setActive1}
            variant="default"
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '12px' }}>Pills</h4>
          <CategoryTabs
            items={categories}
            activeCategory={active2}
            onChange={setActive2}
            variant="pills"
          />
        </div>

        <div>
          <h4 style={{ marginBottom: '12px' }}>Underline</h4>
          <CategoryTabs
            items={categories}
            activeCategory={active3}
            onChange={setActive3}
            variant="underline"
          />
        </div>
      </div>
    );
  },
};

export const ManyCategories: Story = {
  render: () => {
    const [active, setActive] = useState('all');
    const manyCategories: Category[] = [
      { id: 'all', label: 'All Products', count: 156 },
      { id: 'shirts', label: 'T-Shirts', count: 42 },
      { id: 'pants', label: 'Pants & Jeans', count: 38 },
      { id: 'shoes', label: 'Footwear', count: 24 },
      { id: 'accessories', label: 'Accessories', count: 28 },
      { id: 'sale', label: 'Sale Items', count: 24 },
    ];

    return (
      <CategoryTabs
        items={manyCategories}
        activeCategory={active}
        onChange={setActive}
        variant="pills"
      />
    );
  },
};
