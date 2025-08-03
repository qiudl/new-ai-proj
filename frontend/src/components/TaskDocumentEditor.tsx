import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Space, message, Spin } from 'antd';
import { SaveOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

// 简化的类型定义 - 直接从API返回的数据结构
interface TaskDocumentResponse {
  content: string;
}

interface DocumentRequest {
  content: string;
}

const { TextArea } = Input;

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
  const [preview, setPreview] = useState(true); // 默认为预览模式
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 跟踪是否为初始加载

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/documents`) as TaskDocumentResponse;
      if (response && response.content !== undefined) {
        const documentContent = response.content || '';
        setContent(documentContent);
        setOriginalContent(documentContent);
        
        // 智能默认状态：空文档时自动进入编辑模式
        if (isInitialLoad) {
          const isEmpty = !documentContent.trim();
          setPreview(!isEmpty); // 空文档时进入编辑模式(preview=false)，有内容时保持预览模式(preview=true)
          setIsInitialLoad(false);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '加载文档失败';
      setError(errorMsg);
      console.error('Error loading document:', err);
      
      // 加载失败时默认进入编辑模式，方便用户创建新文档
      if (isInitialLoad) {
        setPreview(false);
        setIsInitialLoad(false);
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId, isInitialLoad]);

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
    } catch (err: any) {
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
      
      // ESC键：从编辑模式返回预览模式
      if (e.key === 'Escape' && !preview) {
        e.preventDefault();
        setPreview(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument, preview]);

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
          <Button
            icon={preview ? <EditOutlined /> : <EyeOutlined />}
            onClick={() => setPreview(!preview)}
          >
            {preview ? '编辑' : '预览'}
          </Button>
          {hasChanges && (
            <span style={{ color: '#faad14', fontSize: '12px' }}>
              📝 有未保存的更改
            </span>
          )}
        </Space>
      </div>

      {/* 内容区域 */}
      {preview ? (
        <div 
          style={{ 
            minHeight: '300px',
            padding: '16px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            backgroundColor: '#fafafa',
            cursor: 'pointer',
            position: 'relative'
          }}
          onDoubleClick={() => setPreview(false)}
          title="双击进入编辑模式"
        >
          <ReactMarkdown>{content || '*暂无内容*'}</ReactMarkdown>
          {!content.trim() && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#8c8c8c',
              fontSize: '14px',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ marginBottom: '8px' }}>📝 暂无文档内容</div>
              <div style={{ fontSize: '12px' }}>双击此处开始编写文档</div>
            </div>
          )}
        </div>
      ) : (
        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在此输入任务文档内容（支持Markdown格式）..."
          rows={15}
          style={{ 
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '14px'
          }}
        />
      )}

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
          字符数: {content.length} | Ctrl+S 快速保存{!preview && ' | ESC 返回预览'}
        </span>
      </div>
    </div>
  );
};

export default TaskDocumentEditor;