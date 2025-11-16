import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchBar } from './SearchBar';

const meta = {
  title: 'FigmaPractice/Scene2/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '搜索栏组件，支持受控和非受控模式，包含搜索图标和回车提交功能。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: '占位符文本',
      table: {
        defaultValue: { summary: 'Search clothes...' },
      },
    },
    value: {
      control: 'text',
      description: '搜索值（受控模式）',
    },
    onChange: {
      action: 'changed',
      description: '值变化回调',
    },
    onSearch: {
      action: 'searched',
      description: '搜索提交回调',
    },
  },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Search clothes...',
  },
};

export const WithCustomPlaceholder: Story = {
  args: {
    placeholder: 'Search for products, brands, or categories...',
  },
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div style={{ width: '400px' }}>
        <SearchBar
          value={value}
          onChange={setValue}
          onSearch={(val) => alert(`Searching for: ${val}`)}
        />
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
          Current value: {value || '(empty)'}
        </p>
      </div>
    );
  },
};

export const WithInitialValue: Story = {
  render: () => {
    const [value, setValue] = useState('T-shirt');
    return (
      <SearchBar
        value={value}
        onChange={setValue}
        onSearch={(val) => alert(`Searching for: ${val}`)}
      />
    );
  },
};

export const RealWorldExample: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);

    const handleSearch = (searchTerm: string) => {
      // Simulate search
      const mockResults = [
        'Black T-Shirt',
        'Pink T-Shirt',
        'Blue Jeans',
        'White Sneakers',
        'Red Cap',
      ].filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()));

      setSearchResults(mockResults);
    };

    return (
      <div style={{ width: '400px' }}>
        <SearchBar
          value={value}
          onChange={setValue}
          onSearch={handleSearch}
          placeholder="Search products..."
        />

        {searchResults.length > 0 && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#f5f5f5',
            borderRadius: '8px',
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px' }}>
              Results ({searchResults.length}):
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {searchResults.map((result, index) => (
                <li key={index} style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {result}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
};
