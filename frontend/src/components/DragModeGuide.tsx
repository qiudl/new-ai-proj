import React, { useEffect, useState } from 'react';
import { Typography, Space } from 'antd';
import { DragOutlined, SettingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DragModeGuideProps {
  isDragMode: boolean;
  onDismiss: () => void;
}

const DragModeGuide: React.FC<DragModeGuideProps> = ({ isDragMode, onDismiss }) => {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isDragMode) {
      setShowGuide(true);
      // 5秒后自动隐藏
      const timer = setTimeout(() => {
        setShowGuide(false);
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowGuide(false);
    }
  }, [isDragMode, onDismiss]);

  if (!showGuide) return null;

  return (
    <div className={`drag-mode-indicator ${showGuide ? 'active' : ''}`}>
      <Space direction="vertical" align="center" size="small">
        <Text style={{ color: 'white', fontWeight: 'bold' }}>拖拽模式已启用</Text>
        <Space align="center" size="middle">
          <Space align="center" size="small">
            <DragOutlined style={{ color: '#40a9ff' }} />
            <Text style={{ color: 'white', fontSize: '12px' }}>拖拽移动</Text>
          </Space>
          <Space align="center" size="small">
            <SettingOutlined style={{ color: '#52c41a' }} />
            <Text style={{ color: 'white', fontSize: '12px' }}>调整设置</Text>
          </Space>
        </Space>
        <Text style={{ color: '#ccc', fontSize: '11px' }}>点击组件右上角的图标进行操作</Text>
      </Space>
    </div>
  );
};

export default DragModeGuide;
