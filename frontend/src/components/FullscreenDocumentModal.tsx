import React, { useState, useEffect } from 'react';
import { Modal, Spin, message } from 'antd';
import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import UnifiedTaskDocumentArea from './UnifiedTaskDocumentArea';

interface FullscreenDocumentModalProps {
  visible: boolean;
  projectId: number;
  taskId: number;
  onClose: () => void;
}

const FullscreenDocumentModal: React.FC<FullscreenDocumentModalProps> = ({
  visible,
  projectId,
  taskId,
  onClose
}) => {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      width="100vw"
      style={{
        top: 0,
        paddingBottom: 0,
        maxWidth: 'none'
      }}
      bodyStyle={{
        padding: 0,
        height: '100vh',
        overflow: 'hidden'
      }}
      destroyOnClose={true}
      centered={false}
      maskClosable={false}
      keyboard={true}
      title={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 8px'
        }}>
          <span>任务文档全屏预览</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            按 ESC 键退出全屏
          </span>
        </div>
      }
      className="fullscreen-document-modal"
    >
      <div style={{ height: '100%', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh' 
          }}>
            <Spin size="large" />
          </div>
        ) : (
          <UnifiedTaskDocumentArea
            projectId={projectId}
            taskId={taskId}
            height="100%"
            defaultViewMode="preview"
            showToolbar={true}
            showDocumentList={true}
            compactMode={false}
            headerVisible={true}
            includeSubtaskDocuments={false}
            style={{ 
              height: '100%',
              border: 'none'
            }}
          />
        )}
      </div>
    </Modal>
  );
};

export default FullscreenDocumentModal;