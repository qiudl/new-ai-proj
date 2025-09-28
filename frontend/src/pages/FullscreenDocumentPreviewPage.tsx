import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button, Spin, Alert, message } from 'antd';
import { CloseOutlined, ArrowLeftOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import UnifiedTaskDocumentArea from '../components/UnifiedTaskDocumentArea';
import { TaskService } from '../services/taskService';
import { Task } from '../types/task';
import '../styles/FullscreenDocumentPreviewPage.css';

const FullscreenDocumentPreviewPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const [searchParams] = useSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [saving, setSaving] = useState(false);
  const documentAreaRef = useRef<any>(null);

  // 从URL参数获取任务标题（备用）
  const taskTitle = searchParams.get('title') || '';

  useEffect(() => {
    const loadTaskInfo = async () => {
      if (!projectId || !taskId) {
        setError('缺少必要的参数');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const taskData = await TaskService.getTask(parseInt(projectId), parseInt(taskId));
        setTask(taskData);
        
        // 设置页面标题
        document.title = `文档预览 - ${taskData.title || taskTitle}`;
      } catch (err: any) {
        console.error('加载任务信息失败:', err);
        setError(`加载任务信息失败: ${err.message || '未知错误'}`);
        
        // 如果有备用标题，仍然设置页面标题
        if (taskTitle) {
          document.title = `文档预览 - ${taskTitle}`;
        }
      } finally {
        setLoading(false);
      }
    };

    loadTaskInfo();
  }, [projectId, taskId, taskTitle]);

  // 关闭窗口
  const handleClose = () => {
    window.close();
  };

  // 返回主页面
  const handleGoBack = () => {
    if (window.opener) {
      window.close();
    } else {
      // 如果不是通过window.open打开的，跳转到任务详情页
      window.location.href = `/projects/${projectId}/tasks/${taskId}`;
    }
  };

  // 保存文档
  const handleSave = async () => {
    try {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟保存延迟
      message.success('文档保存成功');
      setViewMode('preview');
    } catch (error: any) {
      console.error('保存文档失败:', error);
      message.error(`保存失败: ${error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 错误页面
  if (error) {
    return (
      <div className="fullscreen-document-preview-page error-page">
        <div className="error-container">
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleGoBack}>
                返回
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // 加载页面
  if (loading) {
    return (
      <div className="fullscreen-document-preview-page loading-page">
        <div className="loading-container">
          <Spin size="large" />
          <p style={{ marginTop: 16, color: '#666' }}>正在加载文档...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen-document-preview-page">
      {/* 顶部工具栏 */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <h3 className="task-title">
            {task?.title || taskTitle || '文档预览'}
          </h3>
          {task && (
            <span className="task-info">
              项目ID: {projectId} | 任务ID: {taskId}
            </span>
          )}
        </div>
        <div className="toolbar-right">
          {viewMode === 'preview' ? (
            <Button
              icon={<EditOutlined />}
              onClick={() => setViewMode('edit')}
              style={{ marginRight: 8 }}
            >
              编辑
            </Button>
          ) : (
            <Button
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              type="primary"
              style={{ marginRight: 8 }}
            >
              保存
            </Button>
          )}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleGoBack}
            style={{ marginRight: 8 }}
          >
            返回
          </Button>
          <Button
            icon={<CloseOutlined />}
            onClick={handleClose}
            type="primary"
            danger
          >
            关闭
          </Button>
        </div>
      </div>

      {/* 文档预览区域 */}
      <div className="preview-content">
        {projectId && taskId && (
          <UnifiedTaskDocumentArea
            projectId={parseInt(projectId)}
            taskId={parseInt(taskId)}
            height="100%"
            defaultViewMode={viewMode}
            showToolbar={true}
            showDocumentList={true}
            compactMode={false}
            headerVisible={false} // 隐藏头部，因为我们有自己的工具栏
            includeSubtaskDocuments={false}
            onSaveDocument={handleSave}
            style={{
              height: '100%',
              border: 'none',
              borderRadius: 0
            }}
          />
        )}
      </div>

      {/* 键盘快捷键提示 */}
      <div className="keyboard-hint">
        按 ESC 键关闭窗口
      </div>
    </div>
  );
};

export default FullscreenDocumentPreviewPage;