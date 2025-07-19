import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Row,
  Col,
} from 'antd';
import { Task, TaskRequest, TaskStatus } from '../types/task';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface TaskModalProps {
  visible: boolean;
  task?: Task;
  projectId: number;
  onOk: (values: TaskRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  projectId,
  onOk,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (task) {
        // Edit mode - populate form with task data
        form.setFieldsValue({
          title: task.title,
          description: task.description,
          status: task.status,
          assignee_id: task.assignee_id,
          due_date: task.due_date ? dayjs(task.due_date) : null,
          priority: task.custom_fields?.priority || 'medium',
          tags: task.custom_fields?.tags?.join(', ') || '',
          estimated_hours: task.custom_fields?.estimated_hours,
        });
      } else {
        // Create mode - reset form
        form.resetFields();
        form.setFieldsValue({
          status: 'todo',
          priority: 'medium',
        });
      }
    }
  }, [visible, task, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Transform form values to TaskRequest
      const taskRequest: TaskRequest = {
        title: values.title,
        description: values.description || '',
        status: values.status,
        assignee_id: values.assignee_id || undefined,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') + 'T00:00:00Z' : undefined,
        custom_fields: {
          priority: values.priority,
          tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
          estimated_hours: values.estimated_hours || undefined,
        },
      };

      await onOk(taskRequest);
      form.resetFields();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={task ? '编辑任务' : '创建任务'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'todo',
          priority: 'medium',
        }}
      >
        <Form.Item
          name="title"
          label="任务标题"
          rules={[
            { required: true, message: '请输入任务标题' },
            { max: 255, message: '标题不能超过255个字符' },
          ]}
        >
          <Input placeholder="请输入任务标题" />
        </Form.Item>

        <Form.Item
          name="description"
          label="任务描述"
        >
          <TextArea
            rows={3}
            placeholder="请输入任务描述"
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="status"
              label="任务状态"
              rules={[{ required: true, message: '请选择任务状态' }]}
            >
              <Select placeholder="请选择任务状态">
                <Option value="todo">待办</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="priority"
              label="优先级"
            >
              <Select placeholder="请选择优先级">
                <Option value="low">低</Option>
                <Option value="medium">中</Option>
                <Option value="high">高</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="due_date"
              label="截止时间"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="请选择截止时间"
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="estimated_hours"
              label="预估工时(小时)"
            >
              <Input
                type="number"
                min={0}
                max={1000}
                placeholder="请输入预估工时"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="tags"
          label="标签"
          help="多个标签用逗号分隔"
        >
          <Input placeholder="例如：前端,API,紧急" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TaskModal;