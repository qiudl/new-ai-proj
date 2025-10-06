import React, { useState } from 'react';
import {
  Button,
  Space,
  message,
  Typography
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import TaskMarkdownEditor from './TaskMarkdownEditor';
import MarkdownRenderer from './MarkdownRenderer';
import AIDescriptionButton from './AI/AIDescriptionButton';
import AIDescriptionModal from './AI/AIDescriptionModal';

const { Title, Text } = Typography;

interface TaskInfoEditorProps {
  task: Task;
  onUpdate: (taskData: unknown) => Promise<void>;
  loading?: boolean;
  style?: React.CSSProperties;
}

const TaskInfoEditor: React.FC<TaskInfoEditorProps> = ({
  task,
  onUpdate,
  loading = false,
  style
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description || '');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiGenerateMode, setAiGenerateMode] = useState<'quick' | 'custom' | 'suggestions'>('quick');

  const handleEdit = () => {
    setDescription(task.description || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDescription(task.description || '');
  };

  const handleSave = async () => {
    try {
      const updateData = {
        description: description
      };

      await onUpdate(updateData);
      setIsEditing(false);
      message.success('任务描述更新成功');
    } catch (error) {
      console.error('Save failed:', error);
      message.error('保存失败');
    }
  };

  const handleAIGenerate = (mode: 'quick' | 'custom' | 'suggestions') => {
    setAiGenerateMode(mode);
    setAiModalVisible(true);
  };

  const handleAIApply = async (generatedDesc: string, mode: 'replace' | 'append') => {
    let newDescription = generatedDesc;

    if (mode === 'append' && description) {
      newDescription = description + '\n\n' + generatedDesc;
    }

    setDescription(newDescription);

    // 如果在编辑模式，只更新文本框；否则直接保存
    if (!isEditing) {
      try {
        const updateData = { description: newDescription };
        await onUpdate(updateData);
        message.success('AI生成的描述已应用并保存');
      } catch (error) {
        console.error('Save failed:', error);
        message.error('保存失败');
      }
    } else {
      message.success('AI生成的描述已应用到编辑器');
    }
  };

  if (isEditing) {
    return (
      <div style={{ ...style, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={4} style={{ margin: 0 }}>
            <EditOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            编辑任务描述
          </Title>
          <Space>
            <AIDescriptionButton
              onGenerate={handleAIGenerate}
              loading={loading}
              size="middle"
            />
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              取消
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
            >
              保存
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            任务描述（支持Markdown格式）
          </Text>
          <TaskMarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="请详细描述任务内容，支持Markdown格式..."
            rows={18} // 原来是6行，现在增加到18行（3倍）
          />
        </div>
      </div>
    );
  }

  // 展示模式
  return (
    <div style={{ ...style, padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          任务描述
        </Title>
        <Space>
          <AIDescriptionButton
            onGenerate={handleAIGenerate}
            loading={loading}
            size="middle"
          />
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            编辑描述
          </Button>
        </Space>
      </div>

      <div>
        {task.description ? (
          <div style={{ 
            background: '#fafafa', 
            padding: '20px', 
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
            minHeight: '400px' // 给查看模式也提供更大的显示空间
          }}>
            <MarkdownRenderer content={task.description} />
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#8c8c8c',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px dashed #d9d9d9',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
            <Text type="secondary" style={{ fontSize: '16px', marginBottom: '12px' }}>
              暂无任务描述
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              点击上方"编辑描述"按钮添加详细的任务描述
            </Text>
          </div>
        )}
      </div>

      {/* AI生成描述对话框 */}
      <AIDescriptionModal
        visible={aiModalVisible}
        taskId={task.id}
        taskTitle={task.title}
        currentDescription={task.description}
        mode={aiGenerateMode}
        onCancel={() => setAiModalVisible(false)}
        onApply={handleAIApply}
      />
    </div>
  );
};

export default TaskInfoEditor;