import React from 'react';
import { Dropdown, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';

// 测试不同的Dropdown使用方式来重现React.Children.only错误

const DropdownTestPage: React.FC = () => {
  const menuItems = [
    { key: '1', label: 'Option 1' },
    { key: '2', label: 'Option 2' },
    { key: '3', label: 'Option 3' }
  ];

  // 可能引起错误的情况1：多个子元素
  const MultipleChildrenDropdown = () => (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button>Test 1</Button>
      <Button>Test 2</Button> {/* 这可能是问题所在 */}
    </Dropdown>
  );

  // 可能引起错误的情况2：条件渲染返回数组
  const ConditionalDropdown = ({ showIcon }: { showIcon: boolean }) => (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      {showIcon && <DownOutlined />}
      <Button>Test with condition</Button>
    </Dropdown>
  );

  // 可能引起错误的情况3：Fragment包装
  const FragmentDropdown = () => (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <>
        <Button>Fragment Test</Button>
      </>
    </Dropdown>
  );

  // 正确的使用方式
  const CorrectDropdown = () => (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button>Correct Usage <DownOutlined /></Button>
    </Dropdown>
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dropdown Error Test Page</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>正确使用：</h3>
        <CorrectDropdown />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>可能错误1 - 多个子元素（会报错）：</h3>
        {/* <MultipleChildrenDropdown /> */}
        <p style={{ color: 'red' }}>已注释，会导致错误</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>可能错误2 - 条件渲染（可能报错）：</h3>
        <ConditionalDropdown showIcon={true} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Fragment包装：</h3>
        <FragmentDropdown />
      </div>
    </div>
  );
};

export default DropdownTestPage;
