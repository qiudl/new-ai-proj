import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingOverlayProps {
  tip?: string;
  visible: boolean;
}

/**
 * 加载遮罩组件
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  tip = '处理中...',
  visible,
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
        tip={tip}
        size="large"
      />
    </div>
  );
};

export default LoadingOverlay;
