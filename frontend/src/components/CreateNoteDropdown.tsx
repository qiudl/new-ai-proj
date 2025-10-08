import React from 'react';
import { Button, Dropdown, Space, Tag } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';

interface CreateNoteDropdownProps {
  onQuickCreate: () => void;
  onFullCreate: () => void;
  onTemplateCreate?: () => void;
  onImport?: () => void;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default';
  disabled?: boolean;
}

const CreateNoteDropdown: React.FC<CreateNoteDropdownProps> = ({
  onQuickCreate,
  onFullCreate,
  onTemplateCreate,
  onImport,
  size = 'middle',
  type = 'primary',
  disabled = false
}) => {
  const menuItems = [
    {
      key: 'quick-create',
      label: (
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span style={{ fontSize: '16px' }}>🚀</span>
            <span>快速创建</span>
          </Space>
          <span style={{ 
            color: '#999', 
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            Ctrl+N
          </span>
        </Space>
      ),
      onClick: onQuickCreate,
    },
    {
      key: 'full-create',
      label: (
        <Space>
          <span style={{ fontSize: '16px' }}>📝</span>
          <span>完整创建</span>
        </Space>
      ),
      onClick: onFullCreate,
    },
    {
      key: 'template-create',
      label: (
        <Space>
          <span style={{ fontSize: '16px' }}>📋</span>
          <span>从模板创建</span>
          <Tag color="blue" style={{ marginLeft: 8, fontSize: '11px' }}>
            即将推出
          </Tag>
        </Space>
      ),
      disabled: true,
      onClick: onTemplateCreate,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'import',
      label: (
        <Space>
          <span style={{ fontSize: '16px' }}>📎</span>
          <span>导入笔记</span>
        </Space>
      ),
      disabled: true,
      onClick: onImport,
    },
  ];

  const dropdownButton = (
    <Button 
      type={type}
      size={size}
      disabled={disabled}
      icon={<PlusOutlined />}
      style={{
        fontWeight: 500,
        height: size === 'small' ? 24 : size === 'large' ? 40 : 32,
        minWidth: size === 'small' ? 80 : 120,
      }}
    >
      新建笔记
      <DownOutlined style={{ fontSize: '10px', marginLeft: 4 }} />
    </Button>
  );

  return (
    <Dropdown 
      menu={{ items: menuItems }} 
      trigger={['click']}
      placement="bottomRight"
      overlayStyle={{
        minWidth: 200,
      }}
    >
      {dropdownButton}
    </Dropdown>
  );
};

export default CreateNoteDropdown;