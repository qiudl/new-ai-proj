import React, { useState } from 'react';
import { Modal, Form, Input, message, Space, Button, Typography, Alert } from 'antd';
import { InboxOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { archiveTask, archiveTasks } from '../services/archiveService';

const { TextArea } = Input;
const { Text } = Typography;

interface TaskArchiveModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  projectId: number;
  tasks: Array<{
    id: number;
    title: string;
  }>;
  mode: 'single' | 'bulk';
}

const TaskArchiveModal: React.FC<TaskArchiveModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  projectId,
  tasks,
  mode
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleArchive = async (values: { reason?: string }) => {
    try {
      setLoading(true);
      
      if (mode === 'single' && tasks.length === 1) {
        await archiveTask(projectId, tasks[0].id, values.reason);
        message.success('任务归档成功');
      } else {
        const taskIds = tasks.map(task => task.id);
        await archiveTasks(projectId, taskIds, values.reason);
        message.success(`成功归档 ${tasks.length} 个任务`);
      }
      
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '归档失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <InboxOutlined />
          <span>{mode === 'single' ? '归档任务' : `批量归档任务 (${tasks.length}个)`}</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div style={{ marginBottom: '16px' }}>
        <Alert
          message="归档说明"
          description={
            <div>
              <p>• 归档后的任务将从任务列表中隐藏</p>
              <p>• 归档的任务可以在"归档任务"页面查看和管理</p>
              <p>• 归档操作可以撤销，任务可以恢复到活跃状态</p>
              <p>• 归档不会删除任务数据</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        <div style={{ marginBottom: '16px' }}>
          <Text strong>将要归档的任务：</Text>
          <div style={{ 
            maxHeight: '120px', 
            overflowY: 'auto',
            background: '#fafafa',
            padding: '8px 12px',
            borderRadius: '6px',
            marginTop: '8px'
          }}>
            {tasks.map((task, index) => (
              <div key={task.id} style={{ marginBottom: '4px' }}>
                <Text>
                  {index + 1}. {task.title}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleArchive}
        preserve={false}
      >
        <Form.Item
          name="reason"
          label="归档原因（可选）"
          help="记录归档原因有助于后续管理和查找"
        >
          <TextArea
            placeholder="例如：任务已完成、需求变更、暂时搁置等..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<InboxOutlined />}
              danger
            >
              确认归档
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TaskArchiveModal;