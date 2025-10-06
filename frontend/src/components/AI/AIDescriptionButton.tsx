import React, { useState } from 'react';
import { Button, Dropdown, Space, Tooltip } from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface AIDescriptionButtonProps {
  onGenerate: (mode: 'quick' | 'custom' | 'suggestions') => void;
  onHistory?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
}

/**
 * AI描述生成按钮组件
 * 提供快速生成、自定义生成、多方案建议等选项
 */
const AIDescriptionButton: React.FC<AIDescriptionButtonProps> = ({
  onGenerate,
  onHistory,
  loading = false,
  disabled = false,
  size = 'middle',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const menuItems: MenuProps['items'] = [
    {
      key: 'quick',
      icon: <ThunderboltOutlined />,
      label: '快速生成',
      onClick: () => {
        onGenerate('quick');
        setDropdownOpen(false);
      },
    },
    {
      key: 'custom',
      icon: <BulbOutlined />,
      label: '自定义生成',
      onClick: () => {
        onGenerate('custom');
        setDropdownOpen(false);
      },
    },
    {
      key: 'suggestions',
      icon: <FileTextOutlined />,
      label: '多方案建议',
      onClick: () => {
        onGenerate('suggestions');
        setDropdownOpen(false);
      },
    },
  ];

  if (onHistory) {
    menuItems.push(
      {
        type: 'divider',
      },
      {
        key: 'history',
        icon: <HistoryOutlined />,
        label: '查看历史',
        onClick: () => {
          onHistory();
          setDropdownOpen(false);
        },
      }
    );
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      disabled={disabled || loading}
    >
      <Tooltip title="使用AI生成任务描述">
        <Button
          type="primary"
          icon={<RobotOutlined />}
          loading={loading}
          disabled={disabled}
          size={size}
        >
          AI生成
        </Button>
      </Tooltip>
    </Dropdown>
  );
};

export default AIDescriptionButton;
