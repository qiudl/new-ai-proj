import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { Project, ProjectRequest } from '../types/project';

interface ProjectModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  project?: Project;
  loading?: boolean;
  onSubmit: (values: ProjectRequest) => Promise<void>;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  project,
  loading = false,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (project) {
        // Edit mode
        form.setFieldsValue({
          name: project.name,
          description: project.description,
        });
      } else {
        // Create mode
        form.resetFields();
      }
    }
  }, [visible, project, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      message.success(project ? '项目更新成功' : '项目创建成功');
      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('操作失败，请重试');
      }
    }
  };

  return (
    <Modal
      title={project ? '编辑项目' : '创建项目'}
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
        >
          {project ? '更新' : '创建'}
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="name"
          label="项目名称"
          rules={[
            { required: true, message: '请输入项目名称' },
            { max: 100, message: '项目名称不能超过100个字符' },
          ]}
        >
          <Input placeholder="请输入项目名称" />
        </Form.Item>

        <Form.Item
          name="description"
          label="项目描述"
          rules={[
            { max: 500, message: '项目描述不能超过500个字符' },
          ]}
        >
          <Input.TextArea
            placeholder="请输入项目描述（可选）"
            rows={4}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProjectModal;