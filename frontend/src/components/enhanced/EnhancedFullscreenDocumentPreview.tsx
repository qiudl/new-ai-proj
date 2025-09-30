import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Space, Tooltip, Slider, Typography, message } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  ExpandOutlined, 
  CompressOutlined,
  BookOutlined,
  FontSizeOutlined,
  SettingOutlined,
  CloseOutlined
} from '@ant-design/icons';
import UnifiedTaskDocumentArea from '../UnifiedTaskDocumentArea';
import './EnhancedFullscreenDocumentPreview.css';

const { Title } = Typography;


// 新的简化接口
export interface EnhancedFullscreenDocumentPreviewProps {
  taskId?: number;
  projectId?: number;
  initialViewMode?: 'preview' | 'edit';
  onClose?: () => void;
  
  // 简化的配置选项
  showSidebar?: boolean;
  enableAllFeatures?: boolean;  // 是否启用所有高级功能
  customToolbar?: React.ReactNode;
}

const EnhancedFullscreenDocumentPreview: React.FC<EnhancedFullscreenDocumentPreviewProps> = ({
  taskId: propTaskId,
  projectId: propProjectId,
  initialViewMode = 'preview',
  onClose,
  showSidebar = true,
  enableAllFeatures = true,
  customToolbar
}) => {
  const navigate = useNavigate();
  
  // URL参数处理（保持兼容性）
  const { projectId: paramProjectId, taskId: paramTaskId } = useParams<{ 
    projectId: string; 
    taskId: string; 
  }>();
  
  const projectId = propProjectId || (paramProjectId ? parseInt(paramProjectId) : undefined);
  const taskId = propTaskId || (paramTaskId ? parseInt(paramTaskId) : undefined);
  
  // UI状态
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [documentSidebarVisible, setDocumentSidebarVisible] = useState(showSidebar);
  const [compactMode, setCompactMode] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  
  // 自动选择第一个文档（如果没有指定currentDocumentId）
  const [autoSelectedDocumentId, setAutoSelectedDocumentId] = useState<string | null>(null);
  
  // 自动隐藏工具栏
  useEffect(() => {
    const hideTimer = setTimeout(() => {
      if (Date.now() - lastActivity > 3000) { // 3秒无活动则隐藏工具栏
        setToolbarVisible(false);
      }
    }, 3000);

    return () => clearTimeout(hideTimer);
  }, [lastActivity]);

  // 鼠标活动监听
  useEffect(() => {
    const handleMouseMove = () => {
      setLastActivity(Date.now());
      setToolbarVisible(true);
    };

    const handleMouseLeave = () => {
      setTimeout(() => {
        setToolbarVisible(false);
      }, 1000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 任何键盘活动都显示工具栏
      setLastActivity(Date.now());
      setToolbarVisible(true);

      // Ctrl/Cmd + 快捷键
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            setFontSize(prev => Math.min(20, prev + 1));
            message.info(`字体大小: ${Math.min(20, fontSize + 1)}px`);
            break;
          case '-':
            e.preventDefault();
            setFontSize(prev => Math.max(12, prev - 1));
            message.info(`字体大小: ${Math.max(12, fontSize - 1)}px`);
            break;
          case '0':
            e.preventDefault();
            setFontSize(14);
            message.info('字体大小已重置为 14px');
            break;
          case 'b':
            e.preventDefault();
            setDocumentSidebarVisible(prev => !prev);
            message.info(documentSidebarVisible ? '隐藏文档列表' : '显示文档列表');
            break;
          case 'h':
            e.preventDefault();
            setToolbarVisible(prev => !prev);
            message.info(toolbarVisible ? '隐藏工具栏' : '显示工具栏');
            break;
          case 'm':
            e.preventDefault();
            setCompactMode(prev => !prev);
            message.info(compactMode ? '切换到正常模式' : '切换到紧凑模式');
            break;
        }
      }
      
      // ESC 键关闭
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [fontSize, documentSidebarVisible, toolbarVisible, compactMode]);

  // 关闭处理
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      // 默认返回任务详情页
      navigate(`/projects/${projectId}/tasks/${taskId}`);
    }
  }, [onClose, navigate, projectId, taskId]);

  // 错误检查
  if (!projectId || !taskId) {
    return (
      <Alert
        message="参数错误"
        description={`缺少必要的项目ID或任务ID。URL参数: projectId=${paramProjectId}, taskId=${paramTaskId}, 解析结果: projectId=${projectId}, taskId=${taskId}`}
        type="error"
        showIcon
      />
    );
  }
  
  // 工具栏渲染函数
  const renderToolbar = () => (
    <div className="enhanced-document-toolbar">
      {/* 左侧 - 显示控制 */}
      <div className="toolbar-left">
        <Space size="middle">
          <Tooltip title="切换文档列表 (Ctrl+B)">
            <Button
              size="small"
              icon={documentSidebarVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={() => setDocumentSidebarVisible(!documentSidebarVisible)}
            >
              文档列表
            </Button>
          </Tooltip>
          
          <Tooltip title="紧凑模式 (Ctrl+M)">
            <Button
              size="small"
              icon={compactMode ? <ExpandOutlined /> : <CompressOutlined />}
              onClick={() => setCompactMode(!compactMode)}
            >
              {compactMode ? '正常模式' : '紧凑模式'}
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* 中间 - 文档标题 */}
      <div className="toolbar-center">
        <div className="document-title-section">
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            <BookOutlined style={{ marginRight: 8 }} />
            任务文档预览
          </Title>
        </div>
      </div>

      {/* 右侧 - 工具控制 */}
      <div className="toolbar-right">
        <Space size="small">
          {/* 字体大小调节 */}
          <div className="font-size-control">
            <Tooltip title="字体大小 (Ctrl +/-)">
              <FontSizeOutlined style={{ color: '#fff', marginRight: 8 }} />
            </Tooltip>
            <div style={{ width: 80 }}>
              <Slider
                min={12}
                max={20}
                value={fontSize}
                onChange={setFontSize}
                tooltip={{ formatter: (value) => `${value}px` }}
                style={{ margin: 0 }}
              />
            </div>
          </div>

          <Tooltip title="设置">
            <Button
              size="small"
              icon={<SettingOutlined />}
              style={{ color: '#fff', borderColor: '#fff' }}
            />
          </Tooltip>

          <Tooltip title="关闭 (ESC)">
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={handleClose}
              style={{ color: '#fff', borderColor: '#fff' }}
            />
          </Tooltip>
        </Space>
      </div>
    </div>
  );

  // 如果没有指定文档ID，我们需要让组件自动选择第一个
  const effectiveCurrentDocumentId = currentDocumentId || autoSelectedDocumentId;
  
  
  return (
    <div className="enhanced-fullscreen-document-preview">
      {/* 自定义工具栏容器 */}
      <div 
        className={`toolbar-container ${!toolbarVisible ? 'toolbar-hidden' : ''}`}
        onMouseEnter={() => {
          setToolbarVisible(true);
          setLastActivity(Date.now());
        }}
      >
        {customToolbar || renderToolbar()}
      </div>
      
      {/* 文档内容区域 */}
      <div className="enhanced-document-body">
        <UnifiedTaskDocumentArea 
          key={`${projectId}-${taskId}-${effectiveCurrentDocumentId}`}
          projectId={projectId} 
          taskId={taskId}
          currentDocumentId={effectiveCurrentDocumentId}
          defaultViewMode={initialViewMode}
          fullscreenMode={true}
          showToolbar={false}
          showDocumentList={documentSidebarVisible}
          headerVisible={false}
          compactMode={compactMode}
          enableComments={enableAllFeatures}
          enableSearch={enableAllFeatures}
          enableShare={enableAllFeatures}
          fullscreenExitOnEsc={false}
          onDocumentSelect={(docId: string) => {
            setCurrentDocumentId(docId);
            setAutoSelectedDocumentId(docId);
          }}
          onDocumentChange={(documents: any[]) => {
            // 如果没有选中的文档且文档列表不为空，自动选择第一个
            if (!effectiveCurrentDocumentId && documents.length > 0) {
              const firstDocId = documents[0].id?.toString();
              if (firstDocId) {
                setAutoSelectedDocumentId(firstDocId);
                // 同时设置当前文档ID，确保立即生效
                setCurrentDocumentId(firstDocId);
              }
            }
          }}
          onFullscreenToggle={(isFullscreen: boolean) => {
            if (!isFullscreen) {
              handleClose();
            }
          }}
        />
      </div>
      
      {/* 工具栏隐藏时的提示 */}
      {!toolbarVisible && (
        <div className="keyboard-hint">
          <div className="hint-content">
            <span>移动鼠标或按任意键显示工具栏</span>
            <div className="hint-keys">
              <kbd>Ctrl+H</kbd> 切换工具栏
              <kbd>Ctrl+B</kbd> 文档列表
              <kbd>Ctrl+M</kbd> 紧凑模式
              <kbd>ESC</kbd> 关闭
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default EnhancedFullscreenDocumentPreview;