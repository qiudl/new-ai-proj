import React, { useState } from 'react';
import { Button, Card, Form, Input } from 'antd';
import { UnifiedAIDescriptionModal, AIDescriptionButton } from '@/components/AI';

/**
 * UnifiedAIDescriptionModal 使用示例
 *
 * 展示如何在任务编辑页面中集成新的统一AI描述生成对话框
 */
const UnifiedAIDescriptionModalExample: React.FC = () => {
  const [form] = Form.useForm();
  const [aiModalVisible, setAiModalVisible] = useState(false);

  // 模拟任务数据
  const taskId = 1234;
  const taskTitle = '实现用户登录功能';

  /**
   * 应用AI生成的描述
   * @param newDescription 新生成的描述
   * @param mode replace: 替换当前描述, append: 追加到当前描述
   */
  const handleApplyDescription = (newDescription: string, mode: 'replace' | 'append') => {
    const currentDescription = form.getFieldValue('description') || '';

    if (mode === 'replace') {
      // 替换模式：直接使用新描述
      form.setFieldsValue({ description: newDescription });
    } else {
      // 追加模式：在当前描述后追加新内容
      const updatedDescription = currentDescription
        ? `${currentDescription}\n\n${newDescription}`
        : newDescription;
      form.setFieldsValue({ description: updatedDescription });
    }
  };

  const handleSubmit = (values: any) => {
    console.log('提交表单:', values);
    // 这里实现保存任务的逻辑
  };

  return (
    <Card title="任务编辑示例">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          title: taskTitle,
          description: '',
        }}
      >
        <Form.Item
          label="任务标题"
          name="title"
          rules={[{ required: true, message: '请输入任务标题' }]}
        >
          <Input placeholder="请输入任务标题" />
        </Form.Item>

        <Form.Item
          label="任务描述"
          name="description"
          extra={
            <div style={{ marginTop: 8 }}>
              {/* 方式1: 使用配套的 AIDescriptionButton */}
              <AIDescriptionButton onClick={() => setAiModalVisible(true)} />

              {/* 方式2: 使用自定义按钮 */}
              <Button
                type="dashed"
                style={{ marginLeft: 8 }}
                onClick={() => setAiModalVisible(true)}
              >
                自定义AI按钮
              </Button>
            </div>
          }
        >
          <Input.TextArea
            rows={10}
            placeholder="请输入任务描述，或使用AI生成"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            保存任务
          </Button>
        </Form.Item>
      </Form>

      {/* 统一AI描述生成对话框 */}
      <UnifiedAIDescriptionModal
        visible={aiModalVisible}
        taskId={taskId}
        taskTitle={form.getFieldValue('title') || taskTitle}
        currentDescription={form.getFieldValue('description')}
        onCancel={() => setAiModalVisible(false)}
        onApply={handleApplyDescription}
      />
    </Card>
  );
};

export default UnifiedAIDescriptionModalExample;
