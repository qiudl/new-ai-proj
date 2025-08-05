import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, message, Spin } from 'antd';
import { SaveOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import TaskMarkdownEditor from './TaskMarkdownEditor';
import api from '../services/api';
import '../styles/TaskDocumentEditor.css';

// API返回的数据结构 - 匹配后端统一响应格式
interface TaskDocumentResponse {
  data: {
    content: string;
    task_id: number;
    project_id: number;
    format: string;
    size?: number;
    last_updated?: string;
  };
}

interface DocumentRequest {
  content: string;
}


interface TaskDocumentEditorProps {
  taskId: number;
  projectId: number;
  onSave?: (content: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

const TaskDocumentEditor: React.FC<TaskDocumentEditorProps> = ({
  taskId,
  projectId,
  onSave,
  style = {},
  className = ''
}) => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/documents`) as TaskDocumentResponse;
      if (response && response.data && response.data.content !== undefined) {
        const documentContent = response.data.content || '';
        setContent(documentContent);
        setOriginalContent(documentContent);
        
      }
    } catch (err: unknown) {
      const errorMsg = err.response?.data?.error || err.message || '加载文档失败';
      setError(errorMsg);
      console.error('Error loading document:', err);
      
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  // 保存文档
  const saveDocument = useCallback(async () => {
    if (!hasChanges) {
      message.info('没有需要保存的更改');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const requestData: DocumentRequest = { content };
      await api.put(`/projects/${projectId}/tasks/${taskId}/documents`, requestData);
      
      setOriginalContent(content);
      setHasChanges(false);
      message.success('文档保存成功');
      
      if (onSave) {
        onSave(content);
      }
    } catch (err: unknown) {
      const errorMsg = err.response?.data?.error || err.message || '保存文档失败';
      setError(errorMsg);
      message.error(errorMsg);
      console.error('Error saving document:', err);
    } finally {
      setSaving(false);
    }
  }, [content, taskId, projectId, onSave, hasChanges]);

  // 检查内容是否有变化
  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  // 初始加载
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 全屏切换功能
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
      
      // F11 或 Ctrl+Shift+F 切换全屏
      if (e.key === 'F11' || (e.ctrlKey && e.shiftKey && e.key === 'F')) {
        e.preventDefault();
        toggleFullscreen();
      }
      
      // ESC 键退出全屏
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument, toggleFullscreen, isFullscreen]);

  // 全屏状态变化时的副作用
  useEffect(() => {
    if (isFullscreen) {
      // 全屏时隐藏页面滚动条并添加全屏CSS类
      document.body.style.overflow = 'hidden';
      document.body.classList.add('fullscreen-editor-active');
      
      // 更精确地隐藏页面布局元素 - 使用更广泛的选择器
      const hideSelectors = [
        // Ant Design Layout 组件
        '.ant-layout-header',
        '.ant-layout-sider', 
        '.ant-layout-footer',
        
        // 通用布局类名
        'header', 'nav', 'aside', 'footer',
        '.header', '.nav', '.sidebar', '.footer',
        '.navigation', '.menu', '.topbar',
        
        // 可能的自定义类名
        '[class*="layout"]', 
        '[class*="Layout"]',
        '[class*="sidebar"]',
        '[class*="Sidebar"]', 
        '[class*="navigation"]',
        '[class*="Navigation"]',
        '[class*="header"]',
        '[class*="Header"]',
        
        // 主应用容器的直接子元素（除了我们的全屏编辑器）
        '#root > *:not([data-fullscreen-editor])',
        '.App > *:not([data-fullscreen-editor])',
        '[class*="App"] > *:not([data-fullscreen-editor])'
      ];
      
      // 隐藏所有匹配的元素
      hideSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLElement && !element.hasAttribute('data-fullscreen-editor')) {
            element.style.display = 'none';
            element.setAttribute('data-hidden-by-fullscreen', 'true');
          }
        });
      });
      
    } else {
      // 退出全屏时恢复body样式并显示其他元素
      document.body.style.overflow = 'auto';
      document.body.classList.remove('fullscreen-editor-active');
      
      // 恢复被隐藏的元素
      const hiddenElements = document.querySelectorAll('[data-hidden-by-fullscreen="true"]');
      hiddenElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.style.display = '';
          element.removeAttribute('data-hidden-by-fullscreen');
        }
      });
    }

    // 清理函数
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('fullscreen-editor-active');
      // 确保退出时恢复所有元素
      const hiddenElements = document.querySelectorAll('[data-hidden-by-fullscreen="true"]');
      hiddenElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.style.display = '';
          element.removeAttribute('data-hidden-by-fullscreen');
        }
      });
    };
  }, [isFullscreen]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>加载文档中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>
          ❌ {error}
        </div>
        <Button onClick={loadDocument}>重新加载</Button>
      </div>
    );
  }

  // 全屏样式
  const fullscreenStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 999999, // 更高的层级确保在最上层
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxSizing: 'border-box',
    margin: 0,
    border: 'none',
    outline: 'none',
    overflow: 'hidden' // 防止内容溢出
  };

  const containerStyle: React.CSSProperties = isFullscreen 
    ? fullscreenStyle 
    : { ...style };

  // 渲染编辑器内容
  const renderEditor = () => (
    <div 
      style={containerStyle} 
      className={className}
      data-fullscreen-editor={isFullscreen ? 'true' : 'false'}
    >
      {/* 工具栏 */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
        <Space split={<div style={{ width: '1px', height: '20px', background: '#f0f0f0' }} />}>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!hasChanges}
              onClick={saveDocument}
            >
              保存 {hasChanges && '*'}
            </Button>
            <Button
              type="default"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              title={isFullscreen ? '退出全屏 (ESC / F11)' : '全屏编辑 (F11 / Ctrl+Shift+F)'}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </Space>
          
          {hasChanges && (
            <span style={{ color: '#faad14', fontSize: '12px' }}>
              📝 有未保存的更改 (Ctrl+S 快速保存)
            </span>
          )}
          
          {isFullscreen && (
            <span style={{ color: '#1890ff', fontSize: '12px' }}>
              💡 F11、Ctrl+Shift+F 或 ESC 键可切换全屏模式
            </span>
          )}
        </Space>
      </div>

      {/* 使用TaskMarkdownEditor组件 */}
      <div style={{ 
        flex: isFullscreen ? 1 : 'none', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden', // 防止编辑器溢出
        minHeight: isFullscreen ? 0 : 'auto' // 全屏时允许弹性高度
      }}>
        <TaskMarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="请输入任务文档内容（支持Markdown格式）..."
          rows={isFullscreen ? undefined : 20}
          style={isFullscreen ? { 
            height: '100%', 
            minHeight: '500px', // 设置最小高度
            flex: 1, // 占用所有可用空间
            border: 'none', // 移除边框
            resize: 'none' // 禁用手动调整大小
          } : {}}
        />
      </div>

      {/* 底部信息 */}
      <div style={{ 
        marginTop: isFullscreen ? '12px' : '8px', 
        paddingTop: isFullscreen ? '12px' : '0',
        borderTop: isFullscreen ? '1px solid #f0f0f0' : 'none',
        fontSize: '12px', 
        color: '#8c8c8c',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span>
          任务ID: {taskId} | 项目ID: {projectId}
          {isFullscreen && ' | 全屏编辑模式'}
        </span>
        <span>
          字符数: {content.length} | Ctrl+S 快速保存
          {isFullscreen && ' | ESC 退出全屏'}
        </span>
      </div>
    </div>
  );

  // 如果是全屏模式，使用Portal渲染到body
  if (isFullscreen) {
    return createPortal(renderEditor(), document.body);
  }

  // 正常模式直接渲染
  return renderEditor();
};

export default TaskDocumentEditor;