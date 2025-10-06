import React, { useState } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

/**
 * 旧版按钮 Props（向后兼容）
 * @deprecated 使用 UnifiedAIDescriptionModal 时请使用简化的 onClick 回调
 */
interface LegacyAIDescriptionButtonProps {
  onGenerate: (mode: 'quick' | 'custom' | 'suggestions') => void;
  onHistory?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
}

/**
 * 新版按钮 Props（推荐用于 UnifiedAIDescriptionModal）
 */
interface UnifiedAIDescriptionButtonProps {
  onClick: () => void;
  onHistory?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
}

type AIDescriptionButtonProps =
  | LegacyAIDescriptionButtonProps
  | UnifiedAIDescriptionButtonProps;

/**
 * AI描述生成按钮组件
 *
 * 支持两种使用方式：
 * 1. 新版（推荐）：与 UnifiedAIDescriptionModal 配合使用，只需 onClick
 * 2. 旧版（向后兼容）：与旧的 AIDescriptionModal 配合使用，需要 onGenerate
 *
 * @example
 * // 新版用法（推荐）
 * <AIDescriptionButton onClick={() => setModalVisible(true)} />
 * <UnifiedAIDescriptionModal visible={modalVisible} ... />
 *
 * @example
 * // 旧版用法（向后兼容）
 * <AIDescriptionButton onGenerate={(mode) => openModal(mode)} />
 */
const AIDescriptionButton: React.FC<AIDescriptionButtonProps> = (props) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { loading = false, disabled = false, size = 'middle', onHistory } = props;

  // 检测是新版还是旧版用法
  const isUnifiedMode = 'onClick' in props;

  // 新版：简单按钮（推荐）
  if (isUnifiedMode) {
    return (
      <Tooltip title="使用AI生成任务描述">
        <Button
          type="primary"
          icon={<RobotOutlined />}
          loading={loading}
          disabled={disabled}
          size={size}
          onClick={props.onClick}
        >
          AI生成描述
        </Button>
      </Tooltip>
    );
  }

  // 旧版：下拉菜单（向后兼容）
  const { onGenerate } = props as LegacyAIDescriptionButtonProps;

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
