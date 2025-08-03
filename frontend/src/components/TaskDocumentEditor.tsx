import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, message, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import TaskMarkdownEditor from './TaskMarkdownEditor';
import api from '../services/api';

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

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
      
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument]);

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

  return (
    <div style={{ ...style }} className={className}>
      {/* 工具栏 */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
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
          {hasChanges && (
            <span style={{ color: '#faad14', fontSize: '12px' }}>
              📝 有未保存的更改 (Ctrl+S 快速保存)
            </span>
          )}
        </Space>
      </div>

      {/* 使用TaskMarkdownEditor组件 */}
      <TaskMarkdownEditor
        value={content}
        onChange={setContent}
        placeholder="请输入任务文档内容（支持Markdown格式）..."
        rows={20}
      />

      {/* 底部信息 */}
      <div style={{ 
        marginTop: '8px', 
        fontSize: '12px', 
        color: '#8c8c8c',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>
          任务ID: {taskId} | 项目ID: {projectId}
        </span>
        <span>
          字符数: {content.length} | Ctrl+S 快速保存
        </span>
      </div>
    </div>
  );
};

export default TaskDocumentEditor;