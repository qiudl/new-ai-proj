import React, { useState } from 'react';
import { FloatButton, Badge } from 'antd';
import { BugOutlined } from '@ant-design/icons';
import JWTDebugPanel from './JWTDebugPanel';
import { jwtDebugger } from '../utils/jwtDebugger';

const JWTDebugButton: React.FC = () => {
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);

  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleClick = () => {
    // 记录调试按钮点击
    jwtDebugger.logModuleJWTStatus('DebugButton');
    setDebugPanelVisible(true);
  };

  // 检查JWT状态以显示徽章
  const jwtStatus = jwtDebugger.checkJWTStatus();
  const hasIssues = !jwtStatus.isValid || jwtStatus.isExpired || jwtStatus.errors.length > 0;

  return (
    <>
      <Badge dot={hasIssues} color="red">
        <FloatButton
          icon={<BugOutlined />}
          tooltip="JWT调试"
          onClick={handleClick}
          style={{
            right: 24,
            bottom: 80, // Position above other float buttons
          }}
        />
      </Badge>
      
      <JWTDebugPanel
        visible={debugPanelVisible}
        onClose={() => setDebugPanelVisible(false)}
      />
    </>
  );
};

export default JWTDebugButton;