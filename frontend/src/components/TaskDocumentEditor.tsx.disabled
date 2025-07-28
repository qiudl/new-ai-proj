import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Space, message, Spin, Alert } from 'antd';
import { SaveOutlined, EditOutlined, EyeOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

const { TextArea } = Input;

interface TaskDocumentEditorProps {
  taskId: number;
  projectId: number;
  onSave?: (content: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

interface DocumentResponse {
  content: string;
}

interface DocumentRequest {
  content: string;
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
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
      if (response && response.data) {
        setContent(response.data.content || '');
        setOriginalContent(response.data.content || '');
        setHasChanges(false);
      } else {
        // 如果没有文档，创建空内容
        setContent('');
        setOriginalContent('');
        setHasChanges(false);
      }
    } catch (error: any) {
      console.error('加载文档失败:', error);
      console.error('Error details:', {
        status: error.status,
        response: error.response,
        message: error.message
      });
      
      if (error.status === 401) {
        setError('未授权访问，请重新登录');
        message.error('未授权访问，请重新登录');
      } else if (error.status === 404) {
        // 404表示文档不存在，创建空文档
        setContent('');
        setOriginalContent('');
        setHasChanges(false);
        setError(null);
      } else {
        setError(`加载文档失败 (${error.status || 'Unknown'}): ${error.message || '未知错误'}`);
        message.error('加载文档失败');
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId]);

  // 保存文档内容
  const saveDocument = useCallback(async (isAutoSave = false) => {
    if (isAutoSave) {
      setAutoSaving(true);
    } else {
      setSaving(true);
    }

    try {
      const requestData: DocumentRequest = { content };
      const response = await api.put(`/projects/${projectId}/tasks/${taskId}/document`, requestData);
      
      if (response) {
        setOriginalContent(content);
        setHasChanges(false);
        setLastSavedTime(new Date());
        setError(null);
        
        if (isAutoSave) {
          // 自动保存不显示消息
        } else {
          message.success('文档保存成功');
        }
        onSave?.(content);
      }
    } catch (error: any) {
      console.error('保存文档失败:', error);
      if (error.status === 401) {
        setError('未授权访问，请重新登录');
        if (!isAutoSave) {
          message.error('未授权访问，请重新登录');
        }
      } else if (error.status === 413) {
        setError('文档内容过大');
        if (!isAutoSave) {
          message.error('文档内容过大，请减少内容后重试');
        }
      } else {
        setError(`保存失败 (${error.status || 'Unknown'})`);
        if (!isAutoSave) {
          message.error('保存文档失败');
        }
      }
    } finally {
      if (isAutoSave) {
        setAutoSaving(false);
      } else {
        setSaving(false);
      }
    }
  }, [content, taskId, projectId, onSave]);

  // 检查内容是否有变化
  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  // 自动保存逻辑 - 内容变化后5秒自动保存
  useEffect(() => {
    if (!hasChanges || saving || autoSaving) return;

    const autoSaveTimer = setTimeout(() => {
      saveDocument(true);
    }, 5000); // 5秒后自动保存

    return () => clearTimeout(autoSaveTimer);
  }, [hasChanges, saving, autoSaving, saveDocument]);

  // 初始加载
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: 保存文档
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) {
          saveDocument();
        }
      }
      
      // Ctrl/Cmd + E: 切换编辑/预览模式
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setPreview(!preview);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasChanges, saving, preview, saveDocument]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleSave = () => {
    saveDocument();
  };

  const togglePreview = () => {
    setPreview(!preview);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        ...style 
      }} className={className}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
          加载文档中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        padding: '24px',
        ...style 
      }} className={className}>
        <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
        <div style={{ fontSize: '16px', color: '#262626', marginBottom: '8px' }}>
          文档加载失败
        </div>
        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '16px' }}>
          {error}
        </div>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />}
          onClick={loadDocument}
        >
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', ...style }} className={className}>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Button 
            type={preview ? 'default' : 'primary'}
            icon={<EditOutlined />}
            onClick={() => setPreview(false)}
            disabled={saving}
          >
            编辑
          </Button>
          <Button 
            type={preview ? 'primary' : 'default'}
            icon={<EyeOutlined />}
            onClick={togglePreview}
            disabled={saving}
          >
            预览
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges || saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
          {autoSaving && (
            <span style={{ color: '#1890ff', fontSize: '12px' }}>
              🔄 自动保存中...
            </span>
          )}
          {hasChanges && !autoSaving && (
            <span style={{ color: '#faad14', fontSize: '12px' }}>
              * 文档有未保存的更改
            </span>
          )}
          {lastSavedTime && !hasChanges && !autoSaving && (
            <span style={{ color: '#52c41a', fontSize: '11px' }}>
              ✓ 已保存 {lastSavedTime.toLocaleTimeString()}
            </span>
          )}
          <span style={{ color: '#8c8c8c', fontSize: '11px', marginLeft: '12px' }}>
            💡 快捷键：Ctrl/Cmd + S 保存，Ctrl/Cmd + E 切换预览
          </span>
        </Space>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <Alert
          message="操作失败"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* 内容区域 */}
      <div style={{ 
        flex: 1, 
        border: '1px solid #d9d9d9', 
        borderRadius: 6,
        overflow: 'hidden',
        minHeight: 400
      }}>
        {preview ? (
          <div style={{ 
            padding: 16, 
            height: '100%', 
            overflow: 'auto',
            backgroundColor: '#fafafa'
          }}>
            <ReactMarkdown>
              {content || '暂无内容'}
            </ReactMarkdown>
          </div>
        ) : (
          <TextArea
            value={content}
            onChange={handleChange}
            placeholder="开始编写任务文档..."
            style={{ 
              height: '100%', 
              border: 'none', 
              resize: 'none',
              borderRadius: 0,
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            disabled={saving}
          />
        )}
      </div>

      {/* 提示信息 */}
      {!content && !preview && (
        <div style={{ 
          padding: '8px 12px',
          marginTop: 8,
          backgroundColor: '#f0f9ff',
          borderRadius: 6,
          border: '1px solid #bae7ff'
        }}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            💡 提示：支持 Markdown 语法，可以使用 **粗体**、*斜体*、`代码`、列表等格式
          </span>
        </div>
      )}
    </div>
  );
};

export default TaskDocumentEditor;