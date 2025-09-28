import React, { useState, useCallback, memo } from 'react';
import {
  Button,
  Space,
  message,
  Typography,
  Card,
  Divider,
  Alert
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Task } from '../../types/task';
import TaskMarkdownEditor from '../TaskMarkdownEditor';
import MarkdownRenderer from '../MarkdownRenderer';
import { errorLogger } from '../../utils/ErrorLogger';

const { Title, Text } = Typography;

interface TaskInfoEditorProps {
  task: Task;
  onUpdate: (taskData: Partial<Task>) => Promise<void>;
  loading?: boolean;
  style?: React.CSSProperties;
  readOnly?: boolean;
  showEditHistory?: boolean;
}

interface EditState {
  isEditing: boolean;
  description: string;
  hasChanges: boolean;
  lastSaved?: Date;
}

/**
 * 重构后的任务信息编辑器
 * 
 * 改进点:
 * 1. 使用 memo 优化性能
 * 2. 更好的状态管理结构
 * 3. 改进的错误处理
 * 4. 增强的用户体验
 * 5. 类型安全性提升
 * 6. 可配置的功能选项
 */
const TaskInfoEditor: React.FC<TaskInfoEditorProps> = memo(({
  task,
  onUpdate,
  loading = false,
  style,
  readOnly = false,
  showEditHistory = false
}) => {
  const [editState, setEditState] = useState<EditState>({
    isEditing: false,
    description: task.description || '',
    hasChanges: false
  });

  const [saveError, setSaveError] = useState<string | null>(null);

  // 开始编辑
  const handleEdit = useCallback(() => {
    if (readOnly) {
      message.warning('当前模式下不可编辑');
      return;
    }

    setEditState({
      isEditing: true,
      description: task.description || '',
      hasChanges: false
    });
    setSaveError(null);
    
    errorLogger.debug('ui', 'TaskInfoEditor: 开始编辑模式', { taskId: task.id });
  }, [task.description, task.id, readOnly]);

  // 取消编辑
  const handleCancel = useCallback(() => {
    if (editState.hasChanges) {
      // 如果有未保存的更改，显示确认对话框
      const shouldDiscard = window.confirm('有未保存的更改，确定要放弃吗？');
      if (!shouldDiscard) return;
    }

    setEditState({
      isEditing: false,
      description: task.description || '',
      hasChanges: false
    });
    setSaveError(null);
    
    errorLogger.debug('ui', 'TaskInfoEditor: 取消编辑', { taskId: task.id });
  }, [editState.hasChanges, task.description, task.id]);

  // 处理内容变化
  const handleDescriptionChange = useCallback((value: string) => {
    setEditState(prev => ({
      ...prev,
      description: value,
      hasChanges: value !== task.description
    }));
    setSaveError(null);
  }, [task.description]);

  // 保存更改
  const handleSave = useCallback(async () => {
    if (!editState.hasChanges) {
      message.info('没有需要保存的更改');
      return;
    }

    try {
      const updateData: Partial<Task> = {
        description: editState.description.trim()
      };

      await onUpdate(updateData);
      
      setEditState(prev => ({
        ...prev,
        isEditing: false,
        hasChanges: false,
        lastSaved: new Date()
      }));
      
      setSaveError(null);
      message.success('任务描述更新成功');
      
      errorLogger.info('ui', 'TaskInfoEditor: 保存成功', { 
        taskId: task.id,
        descriptionLength: updateData.description?.length 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      setSaveError(errorMessage);
      message.error(`保存失败: ${errorMessage}`);
      
      errorLogger.error('ui', 'TaskInfoEditor: 保存失败', { 
        taskId: task.id,
        error: errorMessage 
      });
    }
  }, [editState.description, editState.hasChanges, onUpdate, task.id]);

  // 快捷键处理
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 's') {
        event.preventDefault();
        handleSave();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    }
  }, [handleSave, handleCancel]);

  // 渲染编辑模式
  const renderEditMode = () => (
    <Card
      style={{ ...style }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <Title level={4} style={{ margin: 0 }}>
          <EditOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          编辑任务描述
        </Title>
        <Space>
          {editState.hasChanges && (
            <Text type="warning" style={{ fontSize: '12px' }}>
              <ExclamationCircleOutlined /> 有未保存的更改
            </Text>
          )}
          <Button 
            icon={<CloseOutlined />} 
            onClick={handleCancel}
            disabled={loading}
          >
            取消
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={loading}
            disabled={!editState.hasChanges}
          >
            保存 {editState.hasChanges && '*'}
          </Button>
        </Space>
      </div>

      {saveError && (
        <Alert
          message="保存失败"
          description={saveError}
          type="error"
          closable
          onClose={() => setSaveError(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      <div style={{ marginBottom: '16px' }}>
        <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          任务描述（支持Markdown格式，Ctrl+S保存，Esc取消）
        </Text>
        <TaskMarkdownEditor
          value={editState.description}
          onChange={handleDescriptionChange}
          placeholder="请详细描述任务内容，支持Markdown格式..."
          rows={18}
          autoFocus
        />
      </div>

      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
        <Space split={<Divider type="vertical" />}>
          <span>字符数: {editState.description.length}</span>
          <span>任务 #{task.id}</span>
          {editState.lastSaved && (
            <span>上次保存: {editState.lastSaved.toLocaleTimeString()}</span>
          )}
        </Space>
      </div>
    </Card>
  );

  // 渲染查看模式
  const renderViewMode = () => (
    <Card
      style={{ ...style }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <FileTextOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
            任务描述
          </div>
          {!readOnly && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={handleEdit}
              size="small"
            >
              编辑
            </Button>
          )}
        </div>
      }
      size="small"
    >
      {task.description ? (
        <div style={{ minHeight: '100px' }}>
          <MarkdownRenderer content={task.description} />
          
          {showEditHistory && editState.lastSaved && (
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid #f0f0f0',
              fontSize: '12px',
              color: '#8c8c8c'
            }}>
              <Space>
                <span>最后更新: {editState.lastSaved.toLocaleString()}</span>
                <span>字符数: {task.description.length}</span>
              </Space>
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#8c8c8c'
        }}>
          <FileTextOutlined style={{ fontSize: '32px', marginBottom: '16px' }} />
          <div>暂无任务描述</div>
          {!readOnly && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={handleEdit}
              style={{ marginTop: '8px' }}
            >
              点击添加描述
            </Button>
          )}
        </div>
      )}
    </Card>
  );

  return editState.isEditing ? renderEditMode() : renderViewMode();
});

TaskInfoEditor.displayName = 'TaskInfoEditor';

export default TaskInfoEditor;