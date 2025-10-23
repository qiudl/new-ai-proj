import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Spin, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
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

  // ESC 键退出全屏
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  // 禁止背景滚动 + 隐藏 header 和 sidebar
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('fullscreen-doc-active');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('fullscreen-doc-active');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('fullscreen-doc-active');
    };
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => {
    onClose();
  };

  return createPortal(
    <div
      className="fullscreen-document-overlay z-fullscreen-absolute"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 右上角关闭按钮 */}
      <Tooltip title="退出全屏 (ESC)">
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleClose}
          size="large"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 100000,
            fontSize: '20px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.06)',
            borderRadius: '4px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
          }}
        />
      </Tooltip>

      {/* 文档内容区域 - 占满整个屏幕 */}
      <div style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: '#fff'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <Spin size="large" tip="加载文档中...">
              <div style={{ minHeight: '100px' }} />
            </Spin>
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
    </div>,
    document.body
  );
};

export default FullscreenDocumentModal;