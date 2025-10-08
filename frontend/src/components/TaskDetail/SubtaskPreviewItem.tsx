import React, { useState } from 'react';
import { Card, Input, Select, InputNumber, Button, Space, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { SubtaskPreview } from './SubtaskPreviewModal';

const { TextArea } = Input;

interface SubtaskPreviewItemProps {
  index: number;
  subtask: SubtaskPreview;
  onEdit: (tempId: string, updates: Partial<SubtaskPreview>) => void;
  onDelete: (tempId: string) => void;
}

const SubtaskPreviewItem: React.FC<SubtaskPreviewItemProps> = ({
  index,
  subtask,
  onEdit,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(subtask.editing || false);
  const [editingData, setEditingData] = useState(subtask);

  const handleSave = () => {
    onEdit(subtask.temp_id, editingData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingData(subtask);
    setIsEditing(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '中';
    }
  };

  if (isEditing) {
    return (
      <Card size="small" style={{ border: '2px solid #1890ff' }}>
        <div style={{ marginBottom: 8 }}>
          <strong>{index}. </strong>
          <Input
            value={editingData.title}
            onChange={e => setEditingData({ ...editingData, title: e.target.value })}
            placeholder="子任务标题"
            style={{ width: 'calc(100% - 30px)' }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>描述:</div>
          <TextArea
            value={editingData.description}
            onChange={e => setEditingData({ ...editingData, description: e.target.value })}
            placeholder="子任务描述"
            rows={2}
          />
        </div>

        <Space>
          <div>
            <span style={{ fontSize: '12px', color: '#666' }}>预估工时:</span>
            <InputNumber
              min={0.5}
              max={100}
              step={0.5}
              value={editingData.estimated_hours}
              onChange={value => setEditingData({ ...editingData, estimated_hours: value || 1 })}
              style={{ marginLeft: 8, width: 80 }}
            />
            <span style={{ marginLeft: 4 }}>小时</span>
          </div>

          <div>
            <span style={{ fontSize: '12px', color: '#666' }}>优先级:</span>
            <Select
              value={editingData.priority}
              onChange={value => setEditingData({ ...editingData, priority: value })}
              style={{ marginLeft: 8, width: 100 }}
            >
              <Select.Option value="high">🔴 高</Select.Option>
              <Select.Option value="medium">🟡 中</Select.Option>
              <Select.Option value="low">🟢 低</Select.Option>
            </Select>
          </div>
        </Space>

        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Space>
            <Button size="small" icon={<CloseOutlined />} onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSave}>
              保存
            </Button>
          </Space>
        </div>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      hoverable
      extra={
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setIsEditing(true)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(subtask.temp_id)}
          />
        </Space>
      }
    >
      <div style={{ marginBottom: 8 }}>
        <strong>{index}. ☐ {subtask.title}</strong>
      </div>

      {subtask.description && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: 8 }}>
          📝 {subtask.description}
        </div>
      )}

      <Space>
        <Tag>⏱️ {subtask.estimated_hours}小时</Tag>
        <Tag color={getPriorityColor(subtask.priority)}>
          🎯 {getPriorityText(subtask.priority)}优先级
        </Tag>
        {subtask.tags?.map(tag => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </Space>
    </Card>
  );
};

export default SubtaskPreviewItem;
