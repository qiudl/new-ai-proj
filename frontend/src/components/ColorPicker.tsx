import React from 'react';
import { Space } from 'antd';

export interface ColorPickerProps {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 颜色选择器组件
 *
 * 提供预设颜色选择功能，用于文件夹颜色标识
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
}) => {
  const presetColors = [
    { color: '#1890ff', name: '蓝色' },
    { color: '#52c41a', name: '绿色' },
    { color: '#faad14', name: '橙色' },
    { color: '#f5222d', name: '红色' },
    { color: '#722ed1', name: '紫色' },
    { color: '#13c2c2', name: '青色' },
    { color: '#eb2f96', name: '粉色' },
    { color: '#fa8c16', name: '金色' },
    { color: '#8c8c8c', name: '灰色' },
    { color: '#595959', name: '深灰' },
  ];

  return (
    <Space wrap size={8}>
      {presetColors.map(({ color, name }) => (
        <div
          key={color}
          onClick={() => onChange?.(color)}
          title={name}
          style={{
            width: 32,
            height: 32,
            background: color,
            border: value === color ? '3px solid #000' : '1px solid #d9d9d9',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: value === color ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (value !== color) {
              e.currentTarget.style.border = '2px solid #000';
            }
          }}
          onMouseLeave={(e) => {
            if (value !== color) {
              e.currentTarget.style.border = '1px solid #d9d9d9';
            }
          }}
        />
      ))}
    </Space>
  );
};

export default ColorPicker;
