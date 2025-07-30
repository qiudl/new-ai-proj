import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Space, message, Spin, Alert } from 'antd';
import { SaveOutlined, EditOutlined, EyeOutlined, ExclamationCircleOutlined, ReloadOutlined, HistoryOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

// 类型定义
interface TaskDocumentResponse {
  content: string;
}

interface AdvancedTaskDocumentResponse {
  id: number;
  task_id: number;
  project_id: number;
  document_id: number;
  title: string;
  content: string;
  type: string;
  status: string;
  version: number;
  metadata: Record<string, any>;
  owner_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  task_title: string;
  project_name: string;
  owner_name: string;
  creator_name: string;
  document_exists: boolean;
  can_edit: boolean;
  can_delete: boolean;
  relations: any[];
  last_modified?: string;
}

const { TextArea } = Input;

interface TaskDocumentEditorProps {
  taskId: number;
  projectId: number;
  onSave?: (content: string) => void;
  style?: React.CSSProperties;
  className?: string;
  useAdvancedAPI?: boolean; // 是否使用增强版API
}

interface DocumentRequest {
  content: string;
}

const TaskDocumentEditor: React.FC<TaskDocumentEditorProps> = ({
  taskId,
  projectId,
  onSave,
  style = {},
  className = '',
  useAdvancedAPI = false
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
  const [documentInfo, setDocumentInfo] = useState<AdvancedTaskDocumentResponse | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // 本地存储键名
  const localStorageKey = `task_document_${projectId}_${taskId}`;
  const backupKey = `task_document_backup_${projectId}_${taskId}`;

  // 从本地存储加载备份内容
  const loadFromLocalStorage = useCallback(() => {
    try {
      const backupContent = localStorage.getItem(backupKey);
      if (backupContent) {
        const backup = JSON.parse(backupContent);
        const now = Date.now();
        // 备份有效期24小时
        if (now - backup.timestamp < 24 * 60 * 60 * 1000) {
          return backup.content;
        } else {
          // 清除过期备份
          localStorage.removeItem(backupKey);
        }
      }
    } catch (error) {
      console.error('读取本地备份失败:', error);
    }
    return null;
  }, [backupKey]);

  // 保存备份到本地存储
  const saveToLocalStorage = useCallback((content: string) => {
    try {
      const backup = {
        content,
        timestamp: Date.now(),
        taskId,
        projectId
      };
      localStorage.setItem(backupKey, JSON.stringify(backup));
      localStorage.setItem(localStorageKey, content);
    } catch (error) {
      console.error('保存本地备份失败:', error);
    }
  }, [backupKey, localStorageKey, taskId, projectId]);

  // 带重试机制的文档加载
  const loadDocumentWithRetry = useCallback(async (maxRetries = 3): Promise<boolean> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let response;
        
        if (useAdvancedAPI) {
          response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/advanced`);
          if (response && response.data) {
            const docData = response.data as AdvancedTaskDocumentResponse;
            setDocumentInfo(docData);
            setContent(docData.content || '');
            setOriginalContent(docData.content || '');
            setCanEdit(docData.can_edit);
            setHasChanges(false);
            // 保存到本地存储
            if (docData.content) {
              saveToLocalStorage(docData.content);
            }
            return true;
          }
        } else {
          response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
          if (response && response.data) {
            const docData = response.data as TaskDocumentResponse;
            const documentContent = docData.content || '';
            setContent(documentContent);
            setOriginalContent(documentContent);
            setHasChanges(false);
            // 保存到本地存储
            if (documentContent) {
              saveToLocalStorage(documentContent);
            }
            return true;
          }
        }
        
        return true; // 空响应也算成功
      } catch (error: any) {
        console.error(`加载文档失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (error.status === 401) {
          setError('未授权访问，请重新登录');
          message.error('未授权访问，请重新登录');
          return false;
        } else if (error.status === 404) {
          if (attempt === maxRetries) {
            // 最后一次重试仍然404，检查本地备份
            const backupContent = loadFromLocalStorage();
            if (backupContent) {
              setContent(backupContent);
              setOriginalContent(backupContent);
              setHasChanges(false);
              setError(null);
              message.info('已从本地备份恢复文档内容');
              return true;
            } else {
              // 确实没有文档，创建空文档
              setContent('');
              setOriginalContent('');
              setHasChanges(false);
              setError(null);
              return true;
            }
          }
          // 404但还有重试机会，等待后重试
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        } else {
          // 其他错误，如果还有重试机会就重试
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          } else {
            setError(`加载文档失败 (${error.status || 'Unknown'}): ${error.message || '未知错误'}`);
            message.error('加载文档失败');
            // 尝试从本地备份恢复
            const backupContent = loadFromLocalStorage();
            if (backupContent) {
              setContent(backupContent);
              setOriginalContent(backupContent);
              setHasChanges(false);
              message.warning('网络异常，已从本地备份恢复内容');
              return true;
            }
          }
        }
      }
    }
    return false;
  }, [taskId, projectId, useAdvancedAPI, saveToLocalStorage, loadFromLocalStorage]);

  // 加载文档内容
  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
    
    const success = await loadDocumentWithRetry(2);
    if (!success) {
      console.error('文档加载完全失败');
    }
    
    setLoading(false);
  }, [loadDocumentWithRetry]);

  // 保存文档内容
  const saveDocument = useCallback(async (isAutoSave = false) => {
    if (!canEdit) {
      message.warning('您没有编辑权限');
      return;
    }

    // 先保存到本地备份
    saveToLocalStorage(content);

    if (isAutoSave) {
      setAutoSaving(true);
    } else {
      setSaving(true);
    }

    try {
      let response;
      
      if (useAdvancedAPI) {
        // 使用增强版API
        const requestData = { content };
        response = await api.patch(`/projects/${projectId}/tasks/${taskId}/document/advanced`, requestData);
        
        if (response && response.data) {
          const docData = response.data as AdvancedTaskDocumentResponse;
          setDocumentInfo(docData);
          setCanEdit(docData.can_edit);
        }
      } else {
        // 使用兼容版API
        const requestData: DocumentRequest = { content };
        response = await api.put(`/projects/${projectId}/tasks/${taskId}/document`, requestData);
      }
      
      if (response) {
        setOriginalContent(content);
        setHasChanges(false);
        setLastSavedTime(new Date());
        setError(null);
        
        // 保存成功后清除备份（因为已经同步到服务器）
        try {
          localStorage.removeItem(backupKey);
        } catch (e) {
          console.warn('清除备份失败:', e);
        }
        
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
      } else if (error.status === 403) {
        setError('权限不足，无法保存');
        setCanEdit(false);
        if (!isAutoSave) {
          message.error('权限不足，无法保存文档');
        }
      } else if (error.status === 413) {
        setError('文档内容过大');
        if (!isAutoSave) {
          message.error('文档内容过大，请减少内容后重试');
        }
      } else {
        setError(`保存失败 (${error.status || 'Unknown'})`);
        if (!isAutoSave) {
          message.error('保存文档失败，但已保存到本地备份');
        }
      }
    } finally {
      if (isAutoSave) {
        setAutoSaving(false);
      } else {
        setSaving(false);
      }
    }
  }, [content, taskId, projectId, onSave, canEdit, useAdvancedAPI, saveToLocalStorage, backupKey]);

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

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 如果没有未保存的更改，清除备份
      if (!hasChanges) {
        try {
          localStorage.removeItem(backupKey);
        } catch (e) {
          console.warn('清除备份失败:', e);
        }
      }
    };
  }, [hasChanges, backupKey]);

  // 页面可见性检测，当页面重新获得焦点时检查是否需要重新加载
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && error && !loading) {
        // 页面重新可见且之前有错误，尝试重新加载
        console.log('页面重新可见，尝试重新加载文档');
        setTimeout(() => loadDocument(), 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [error, loading, loadDocument]);

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
    const newContent = e.target.value;
    setContent(newContent);
    
    // 内容变更时实时保存到本地备份
    if (newContent !== originalContent) {
      saveToLocalStorage(newContent);
    }
  };

  const handleSave = () => {
    saveDocument();
  };

  const togglePreview = () => {
    setPreview(!preview);
  };

  // 手动重新加载文档
  const handleReload = () => {
    loadDocument();
  };

  // 从本地备份恢复
  const handleRestoreFromBackup = () => {
    const backupContent = loadFromLocalStorage();
    if (backupContent) {
      setContent(backupContent);
      setError(null);
      message.success('已从本地备份恢复内容');
    } else {
      message.warning('未找到本地备份');
    }
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
    const hasBackup = loadFromLocalStorage() !== null;
    
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
        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
        
        <Space direction="vertical" align="center">
          <Space wrap>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={handleReload}
              loading={loading}
            >
              重新加载
            </Button>
            
            {hasBackup && (
              <Button 
                type="default" 
                icon={<HistoryOutlined />}
                onClick={handleRestoreFromBackup}
              >
                从备份恢复
              </Button>
            )}
            
            <Button 
              type="dashed" 
              onClick={() => {
                setError(null);
                setContent('');
                setOriginalContent('');
                setHasChanges(false);
              }}
            >
              创建新文档
            </Button>
          </Space>
          
          {hasBackup && (
            <div style={{ 
              fontSize: '12px', 
              color: '#52c41a', 
              textAlign: 'center',
              marginTop: '8px',
              padding: '8px 12px',
              background: '#f6ffed',
              borderRadius: '4px',
              border: '1px solid #b7eb8f'
            }}>
              ✓ 检测到本地备份，可以尝试恢复
            </div>
          )}
        </Space>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', ...style }} className={className}>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
        <Space wrap>
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
            disabled={!hasChanges || saving || !canEdit}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={handleReload}
            disabled={loading || saving}
            title="重新加载文档"
          >
            重新加载
          </Button>
          <Button 
            icon={<HistoryOutlined />}
            onClick={handleRestoreFromBackup}
            disabled={saving}
            title="从本地备份恢复"
          >
            恢复备份
          </Button>
          
          {/* 状态指示器 */}
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
          {!canEdit && (
            <span style={{ color: '#ff4d4f', fontSize: '12px' }}>
              🔒 只读模式 - 您没有编辑权限
            </span>
          )}
          {documentInfo && useAdvancedAPI && (
            <span style={{ color: '#8c8c8c', fontSize: '11px' }}>
              📄 版本 {documentInfo.version} | 状态: {documentInfo.status}
            </span>
          )}
          
          {/* 快捷键提示 */}
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
            disabled={saving || !canEdit}
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