import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Card, Statistic, Row, Col, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import SubtaskPreviewItem from './SubtaskPreviewItem';

export interface SubtaskPreview {
  temp_id: string;
  title: string;
  description: string;
  estimated_hours: number;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  editing?: boolean;
}

interface SubtaskPreviewModalProps {
  visible: boolean;
  parentTask: {
    id: number;
    title: string;
  } | null;
  aiModel: string;
  initialSubtasks: SubtaskPreview[];
  onClose: () => void;
  onConfirm: (subtasks: SubtaskPreview[]) => Promise<void>;
  onRegenerate: () => void;
  loading?: boolean;
  creating?: boolean;
}

const SubtaskPreviewModal: React.FC<SubtaskPreviewModalProps> = ({
  visible,
  parentTask,
  aiModel,
  initialSubtasks,
  onClose,
  onConfirm,
  onRegenerate,
  loading = false,
  creating = false
}) => {
  const [subtasks, setSubtasks] = useState<SubtaskPreview[]>(initialSubtasks);

  useEffect(() => {
    setSubtasks(initialSubtasks);
  }, [initialSubtasks]);

  // 编辑子任务
  const handleEdit = (tempId: string, updates: Partial<SubtaskPreview>) => {
    setSubtasks(prev =>
      prev.map(task =>
        task.temp_id === tempId ? { ...task, ...updates } : task
      )
    );
  };

  // 删除子任务
  const handleDelete = (tempId: string) => {
    setSubtasks(prev => prev.filter(task => task.temp_id !== tempId));
  };

  // 添加新子任务
  const handleAdd = () => {
    const newTask: SubtaskPreview = {
      temp_id: `temp_${Date.now()}`,
      title: '',
      description: '',
      estimated_hours: 1,
      priority: 'medium',
      editing: true
    };
    setSubtasks(prev => [...prev, newTask]);
  };

  // 重新生成
  const handleRegenerate = () => {
    Modal.confirm({
      title: '确认重新生成？',
      content: '当前编辑的内容将丢失，是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        onRegenerate();
      }
    });
  };

  // 确认创建
  const handleConfirm = async () => {
    // 验证
    const invalidTasks = subtasks.filter(t => !t.title.trim());
    if (invalidTasks.length > 0) {
      message.warning('请填写所有子任务的标题');
      return;
    }

    if (subtasks.length === 0) {
      message.warning('至少需要一个子任务');
      return;
    }

    try {
      await onConfirm(subtasks);
    } catch (error) {
      // 错误已在父组件处理
    }
  };

  // 计算统计信息
  const statistics = {
    total: subtasks.length,
    totalHours: subtasks.reduce((sum, t) => sum + t.estimated_hours, 0),
    highPriority: subtasks.filter(t => t.priority === 'high').length,
    mediumPriority: subtasks.filter(t => t.priority === 'medium').length,
    lowPriority: subtasks.filter(t => t.priority === 'low').length
  };

  return (
    <Modal
      title={
        <Space>
          🤖 AI生成的子任务预览
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnHidden
    >
      {/* 任务信息 */}
      <Card size="small" style={{ marginBottom: 16, background: '#f8f9fa' }}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ fontSize: '14px' }}>
              📝 <strong>父任务:</strong> {parentTask?.title}
            </div>
          </Col>
          <Col span={8}>
            <div style={{ fontSize: '14px' }}>
              🤖 <strong>AI模型:</strong> {aiModel}
            </div>
          </Col>
          <Col span={4}>
            <div style={{ fontSize: '14px' }}>
              📊 <strong>数量:</strong> {subtasks.length}个
            </div>
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加更多
        </Button>
      </div>

      {/* 子任务列表 */}
      <div style={{ maxHeight: '450px', overflowY: 'auto', marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {subtasks.map((task, index) => (
            <SubtaskPreviewItem
              key={task.temp_id}
              index={index + 1}
              subtask={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </Space>
      </div>

      {/* 提示信息 */}
      <div style={{
        padding: '12px',
        background: '#e6f7ff',
        border: '1px solid #91d5ff',
        borderRadius: '4px',
        marginBottom: 16,
        fontSize: '13px',
        color: '#0050b3'
      }}>
        💡 提示: 您可以直接编辑任何子任务的标题、描述、工时和优先级
      </div>

      {/* 统计信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总计"
              value={statistics.total}
              suffix="个子任务"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="预估总工时"
              value={statistics.totalHours}
              suffix="小时"
            />
          </Col>
          <Col span={12}>
            <div style={{ fontSize: '14px', lineHeight: '22px' }}>
              <div><strong>优先级分布:</strong></div>
              <div>
                🔴 高优先级: {statistics.highPriority}个 |
                🟡 中优先级: {statistics.mediumPriority}个 |
                🟢 低优先级: {statistics.lowPriority}个
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 底部按钮 */}
      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onClose}>
            取消
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRegenerate}
            disabled={loading}
          >
            重新生成
          </Button>
          <Button
            type="primary"
            loading={creating}
            onClick={handleConfirm}
          >
            确认创建全部
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default SubtaskPreviewModal;
