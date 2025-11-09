/**
 * 需求转任务对话框组件
 * Convert Requirement to Task Modal Component
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Select,
  DatePicker,
  Switch,
  Space,
  Alert,
  Divider,
} from 'antd';
import {
  CheckOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Requirement, ConvertToTaskRequest } from '../types/requirement';
import { Project } from '../types/project';
import { projectService } from '../services/projectService';
import dayjs, { Dayjs } from 'dayjs';
import { useModalConfig } from '../hooks/useModalConfig';

const { TextArea } = Input;
const { Option } = Select;

export interface ConvertToTaskModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (taskId: number) => void;
  requirement: Requirement | null;
  loading?: boolean;
  onSubmit: (convertData: ConvertToTaskRequest) => Promise<any>;
}

/**
 * 需求转任务对话框组件
 */
const ConvertToTaskModal: React.FC<ConvertToTaskModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  requirement,
  loading = false,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const modalConfig = useModalConfig({ width: 650 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  /**
   * 加载项目列表
   */
  useEffect(() => {
    if (visible) {
      loadProjects();
    }
  }, [visible]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await projectService.getProjects({ page: 1, pageSize: 100 });
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      message.error('加载项目列表失败');
    } finally {
      setLoadingProjects(false);
    }
  };

  /**
   * 初始化表单
   */
  useEffect(() => {
    if (visible && requirement) {
      // Reset form when modal opens
      form.resetFields();

      // Pre-fill with requirement data
      form.setFieldsValue({
        task_title: requirement.title,
        project_id: requirement.project_id || undefined,
        priority: requirement.priority || 'medium',
        description: requirement.description || '',
        due_date: requirement.due_date ? dayjs(requirement.due_date) : undefined,
        create_subtasks: false,
        link_requirement: true,
      });
    }
  }, [visible, requirement, form]);

  /**
   * 处理提交
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const convertData: ConvertToTaskRequest = {
        project_id: values.project_id,
        task_title: values.task_title,
        assignee_id: values.assignee_id,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
        priority: values.priority,
        description: values.description,
        create_subtasks: values.create_subtasks || false,
        link_requirement: values.link_requirement !== false, // 默认true
      };

      const result = await onSubmit(convertData);

      // Extract task ID from result
      const taskId = result?.task_id || result?.id || 0;

      message.success('需求已成功转换为任务！');
      onSuccess(taskId);
    } catch (error: any) {
      if (error instanceof Error && !error.message.includes('async-validator')) {
        message.error(error.message || '转换任务失败，请重试');
      }
    }
  };

  return (
    <Modal
      {...modalConfig}
      title={
        <Space>
          <SwapOutlined style={{ color: '#1890ff' }} />
          <span>转换为任务</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={<CheckOutlined />}
        >
          转换
        </Button>,
      ]}
      destroyOnHidden
    >
      {requirement && (
        <div style={{ marginBottom: '16px' }}>
          <Alert
            message={
              <div>
                <strong>需求编号:</strong> {requirement.display_id}
              </div>
            }
            description={
              <div>
                <strong>需求标题:</strong> {requirement.title}
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          priority: 'medium',
          create_subtasks: false,
          link_requirement: true,
        }}
      >
        {/* 基本信息 */}
        <Divider orientation="left" style={{ fontSize: '14px', margin: '8px 0' }}>
          基本信息
        </Divider>

        <Form.Item
          name="task_title"
          label="任务标题"
          rules={[
            { required: true, message: '请输入任务标题' },
            { min: 1, max: 500, message: '标题长度应在1-500字符之间' },
          ]}
        >
          <Input placeholder="请输入任务标题" maxLength={500} showCount />
        </Form.Item>

        <Form.Item
          name="project_id"
          label="所属项目"
          rules={[{ required: true, message: '请选择所属项目' }]}
        >
          <Select
            placeholder="请选择所属项目"
            loading={loadingProjects}
            showSearch
            optionFilterProp="children"
          >
            {projects.map((project) => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Space size="large" style={{ width: '100%', marginBottom: '16px' }}>
          <Form.Item
            name="priority"
            label="优先级"
            style={{ marginBottom: 0, flex: 1 }}
          >
            <Select placeholder="请选择优先级">
              <Option value="low">⬇️ 低</Option>
              <Option value="medium">➡️ 中</Option>
              <Option value="high">⬆️ 高</Option>
              <Option value="urgent">🔥 紧急</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="due_date"
            label="截止日期"
            style={{ marginBottom: 0, flex: 1 }}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择截止日期" />
          </Form.Item>
        </Space>

        <Form.Item name="description" label="任务描述">
          <TextArea
            rows={4}
            placeholder="请输入任务描述（可选）"
            maxLength={5000}
            showCount
          />
        </Form.Item>

        {/* 高级选项 */}
        <Divider orientation="left" style={{ fontSize: '14px', margin: '8px 0' }}>
          高级选项
        </Divider>

        <Form.Item
          name="assignee_id"
          label="负责人"
          tooltip="可以稍后分配负责人"
        >
          <Select
            placeholder="请选择负责人（可选）"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {/* TODO: 从用户服务加载用户列表 */}
            <Option value={1}>Admin</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="create_subtasks"
          label="根据验收标准创建子任务"
          valuePropName="checked"
          tooltip="如果需求包含验收标准，可以自动创建子任务"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="link_requirement"
          label="关联原需求"
          valuePropName="checked"
          tooltip="保留需求与任务的关联关系"
        >
          <Switch />
        </Form.Item>

        {/* 提示信息 */}
        <Alert
          message={
            <div>
              <strong>提示：</strong>
              转换后，需求状态将变为"已转任务"，可在任务详情中查看关联的需求
            </div>
          }
          type="success"
          showIcon
        />
      </Form>
    </Modal>
  );
};

export default ConvertToTaskModal;
