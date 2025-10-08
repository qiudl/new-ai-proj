import React from 'react';
import { Space } from 'antd';

export interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 图标选择器组件
 *
 * 提供预设Emoji图标选择功能，用于文件夹图标标识
 */
const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
}) => {
  const icons = [
    { icon: '📁', name: '文件夹' },
    { icon: '📂', name: '打开文件夹' },
    { icon: '🗂️', name: '卡片盒' },
    { icon: '📋', name: '剪贴板' },
    { icon: '📊', name: '图表' },
    { icon: '💼', name: '公文包' },
    { icon: '🎯', name: '靶心' },
    { icon: '⭐', name: '星星' },
    { icon: '💡', name: '灯泡' },
    { icon: '🚀', name: '火箭' },
    { icon: '📝', name: '记事本' },
    { icon: '🔖', name: '书签' },
    { icon: '📌', name: '图钉' },
    { icon: '🏷️', name: '标签' },
    { icon: '📦', name: '包裹' },
    { icon: '🎨', name: '调色板' },
  ];

  return (
    <Space wrap size={8}>
      {icons.map(({ icon, name }) => (
        <div
          key={icon}
          onClick={() => onChange?.(icon)}
          title={name}
          style={{
            fontSize: 24,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: value === icon ? '2px solid #1890ff' : '1px solid #d9d9d9',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: value === icon ? '#e6f7ff' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (value !== icon) {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.border = '1px solid #1890ff';
            }
          }}
          onMouseLeave={(e) => {
            if (value !== icon) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.border = '1px solid #d9d9d9';
            }
          }}
        >
          {icon}
        </div>
      ))}
    </Space>
  );
};

export default IconPicker;
