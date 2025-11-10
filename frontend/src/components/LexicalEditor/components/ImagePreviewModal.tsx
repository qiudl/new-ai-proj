/**
 * 图片预览模态框组件
 * 支持放大、缩小、旋转、全屏等功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  UndoOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import './ImagePreviewModal.css';

export interface ImagePreviewModalProps {
  visible: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  src,
  alt = '图片预览',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 重置状态
  useEffect(() => {
    if (visible) {
      setScale(1);
      setRotate(0);
      setIsFullscreen(false);
    }
  }, [visible]);

  // 放大
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3)); // 最大3倍
  }, []);

  // 缩小
  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5)); // 最小0.5倍
  }, []);

  // 左旋转
  const handleRotateLeft = useCallback(() => {
    setRotate(prev => prev - 90);
  }, []);

  // 右旋转
  const handleRotateRight = useCallback(() => {
    setRotate(prev => prev + 90);
  }, []);

  // 重置
  const handleReset = useCallback(() => {
    setScale(1);
    setRotate(0);
  }, []);

  // 全屏切换
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // 键盘快捷键
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleReset();
          break;
        case 'f':
        case 'F':
          handleToggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose, handleZoomIn, handleZoomOut, handleReset, handleToggleFullscreen]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="90vw"
      centered
      className={`image-preview-modal ${isFullscreen ? 'fullscreen' : ''}`}
      styles={{
        body: {
          height: isFullscreen ? '100vh' : '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          background: '#000',
        },
      }}
      destroyOnClose
    >
      {/* 工具栏 */}
      <div className="image-preview-toolbar">
        <div className="toolbar-btn" onClick={handleZoomIn} title="放大 (+)">
          <ZoomInOutlined />
        </div>
        <div className="toolbar-btn" onClick={handleZoomOut} title="缩小 (-)">
          <ZoomOutOutlined />
        </div>
        <div className="toolbar-scale">
          {Math.round(scale * 100)}%
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-btn" onClick={handleRotateLeft} title="左旋转">
          <RotateLeftOutlined />
        </div>
        <div className="toolbar-btn" onClick={handleRotateRight} title="右旋转">
          <RotateRightOutlined />
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-btn" onClick={handleReset} title="重置 (R)">
          <UndoOutlined />
        </div>
        <div className="toolbar-btn" onClick={handleToggleFullscreen} title="全屏 (F)">
          {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </div>
      </div>

      {/* 图片容器 */}
      <div className="image-preview-container">
        <img
          src={src}
          alt={alt}
          className="preview-image"
          style={{
            transform: `scale(${scale}) rotate(${rotate}deg)`,
            transition: 'transform 0.3s ease',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
          draggable={false}
        />
      </div>

      {/* 操作提示 */}
      <div className="image-preview-tips">
        <span>快捷键：</span>
        <span>+/- 缩放</span>
        <span>R 重置</span>
        <span>F 全屏</span>
        <span>ESC 关闭</span>
      </div>
    </Modal>
  );
};

export default ImagePreviewModal;
