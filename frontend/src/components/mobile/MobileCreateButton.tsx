import React, { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

interface MobileCreateButtonProps {
  onQuickCreate: () => void;
  onFullCreate: () => void;
}

const MobileCreateButton: React.FC<MobileCreateButtonProps> = ({ 
  onQuickCreate, 
  onFullCreate 
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleOptionClick = (action: () => void) => {
    action();
    setShowOptions(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '16px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '12px',
    }}>
      {/* 展开的选项 */}
      {showOptions && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            opacity: showOptions ? 1 : 0,
            transform: showOptions ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <Button
            type="primary"
            size="large"
            onClick={() => handleOptionClick(onQuickCreate)}
            style={{
              borderRadius: '24px',
              padding: '8px 16px',
              height: '48px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px' }}>🚀</span>
            <span>快速创建</span>
          </Button>
          <Button
            size="large"
            onClick={() => handleOptionClick(onFullCreate)}
            style={{
              borderRadius: '24px',
              padding: '8px 16px',
              height: '48px',
              backgroundColor: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px' }}>📝</span>
            <span>详细创建</span>
          </Button>
        </div>
      )}
      
      {/* 主按钮 */}
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={showOptions ? <CloseOutlined /> : <PlusOutlined />}
        onClick={() => setShowOptions(!showOptions)}
        style={{
          width: '56px',
          height: '56px',
          fontSize: '20px',
          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
          border: 'none',
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </div>
  );
};

export default MobileCreateButton;