import React, { useEffect, useState } from 'react';
import { Modal, Progress, Space } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

interface AIGeneratingModalProps {
  visible: boolean;
  modelName: string;
}

const AIGeneratingModal: React.FC<AIGeneratingModalProps> = ({
  visible,
  modelName
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (visible) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [visible]);

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }} size="large">
        <RobotOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
        <div style={{ fontSize: '16px', fontWeight: 600 }}>
          🤖 {modelName} 正在分析任务并生成子任务...
        </div>
        <Progress percent={progress} status="active" />
        <div style={{ fontSize: '13px', color: '#999' }}>
          这可能需要几秒钟，请稍候
        </div>
      </Space>
    </Modal>
  );
};

export default AIGeneratingModal;
