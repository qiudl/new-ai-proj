import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Button,
  Space,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { Task, TaskRequest } from '../types/task';
import { TaskService } from '../services/taskService';
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
  parentTask?: Task;
  allowParentSelection?: boolean;
  onEditDetails?: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  task,
  projectId,
  onOk,
  onCancel,
  loading = false,
  parentTask,
  allowParentSelection = false,
  onEditDetails,
}) => {
  const [form] = Form.useForm();
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [parentTasksLoading, setParentTasksLoading] = useState(false);

  const loadParentTasks = async () => {
    if (!allowParentSelection || !projectId) return;
    
    try {
      setParentTasksLoading(true);
      const response = await TaskService.getTasks(projectId, { page: 1, page_size: 100 });
      // Filter out current task to prevent self-reference
      const availableTasks = response.data.filter(t => t.id !== task?.id);
      setParentTasks(availableTasks);
    } catch (error) {
      console.error('Error loading parent tasks:', error);
    } finally {
      setParentTasksLoading(false);
    }
  };

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
          parent_id: task.parent_id,
        });
      } else {
        // Create mode - reset form
        form.resetFields();
        form.setFieldsValue({
          status: 'todo',
          priority: 'medium',
          parent_id: parentTask?.id,
        });
      }
      
      // Load parent tasks if parent selection is allowed
      if (allowParentSelection) {
        loadParentTasks();
      }
    }
  }, [visible, task, form, allowParentSelection, projectId, parentTask]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 严格验证项目ID
      if (!projectId || projectId <= 0) {
        throw new Error('无效的项目ID，无法创建任务');
      }
      
      // 确定父任务ID - 编辑模式使用表单值，创建模式使用parentTask
      let parentId: number | undefined;
      if (task) {
        // 编辑模式：只使用表单的parent_id值
        parentId = values.parent_id;
      } else {
        // 创建模式：使用表单值或parentTask
        parentId = values.parent_id || parentTask?.id;
      }
      
      // 防止自引用：任务不能将自己设置为父任务
      if (parentId && task && parentId === task.id) {
        throw new Error('任务不能将自己设置为父任务');
      }
      
      // 如果是子任务，确保父任务ID有效（仅在创建模式下验证parentTask）
      if (parentId && !task && (!parentTask || !parentTask.project_id)) {
        throw new Error('父任务信息无效，无法创建子任务');
      }
      
      // Transform form values to TaskRequest
      const taskRequest: TaskRequest = {
        title: values.title,
        description: values.description || '',
        status: values.status,
        assignee_id: values.assignee_id || undefined,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') + 'T00:00:00Z' : undefined,
        parent_id: parentId,
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

  const getModalTitle = () => {
    if (task) return '编辑任务';
    if (parentTask) return (
      <div>
        <span>创建子任务</span>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 400, 
          color: '#8c8c8c',
          marginTop: '4px'
        }}>
          父任务: {parentTask.title}
        </div>
      </div>
    );
    return '创建任务';
  };


  // 自定义footer，编辑模式下添加"编辑详情"按钮
  const renderFooter = () => {
    const buttons: React.ReactNode[] = [];
    
    // 取消按钮
    buttons.push(
      <Button key="cancel" onClick={handleCancel}>
        取消
      </Button>
    );
    
    // 编辑详情按钮（仅在编辑模式下显示）
    if (task && onEditDetails) {
      buttons.push(
        <Button 
          key="editDetails" 
          icon={<EditOutlined />}
          onClick={onEditDetails}
        >
          编辑详情
        </Button>
      );
    }
    
    // 确定按钮
    buttons.push(
      <Button 
        key="ok" 
        type="primary" 
        loading={loading}
        onClick={handleOk}
      >
        {task ? '更新' : '创建'}
      </Button>
    );
    
    return buttons;
  };

  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      footer={renderFooter()}
      onCancel={handleCancel}
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
        {parentTask && (
          <div style={{ 
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae7ff',
            borderRadius: '6px'
          }}>
            <div style={{ color: '#1890ff', fontWeight: 500, marginBottom: '4px' }}>
              正在为以下任务创建子任务:
            </div>
            <div style={{ color: '#262626' }}>{parentTask.title}</div>
            {parentTask.description && (
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '4px' }}>
                {parentTask.description}
              </div>
            )}
          </div>
        )}

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

        {allowParentSelection && (
          <Form.Item
            name="parent_id"
            label="父任务"
            help="选择父任务，将此任务作为子任务"
          >
            <Select
              placeholder="请选择父任务（可选）"
              allowClear
              loading={parentTasksLoading}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
              }
            >
              {parentTasks.map(task => (
                <Option key={task.id} value={task.id}>
                  {task.title}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

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