import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, ColorPicker, Switch, InputNumber, message, Space, Typography } from 'antd';
import { ClockCircleOutlined, TagOutlined } from '@ant-design/icons';
import { personalTimerService } from '../services/personalTimerService';
import type { Color } from 'antd/es/color-picker';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface UserTimerTaskResponse {
  id?: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  color: string;
  is_favorite: boolean;
  total_time_seconds: number;
  target_time_seconds: number;
  formatted_total_time: string;
  formatted_target_time: string;
  completion_percent: number;
  created_at?: string;
  updated_at?: string;
}

interface PersonalTimerTaskFormProps {
  visible: boolean;
  task?: UserTimerTaskResponse | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const PersonalTimerTaskForm: React.FC<PersonalTimerTaskFormProps> = ({
  visible,
  task,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('personal');

  const isEditing = task && task.id;

  // 表单初始化
  useEffect(() => {
    if (visible) {
      if (isEditing && task) {
        form.setFieldsValue({
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          color: task.color,
          is_favorite: task.is_favorite,
          target_time_seconds: task.target_time_seconds > 0 ? Math.floor(task.target_time_seconds / 3600) : undefined
        });
        setSelectedCategory(task.category);
      } else {
        form.resetFields();
        const defaultColor = personalTimerService.getDefaultColorForCategory('personal');
        form.setFieldsValue({
          category: 'personal',
          priority: 'medium',
          color: defaultColor,
          is_favorite: false
        });
        setSelectedCategory('personal');
      }
    }
  }, [visible, task, isEditing, form]);

  // 分类变化时更新默认颜色
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const defaultColor = personalTimerService.getDefaultColorForCategory(category);
    form.setFieldValue('color', defaultColor);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 转换目标时间为秒（如果设置了）
      const targetTimeSeconds = values.target_time_seconds ? values.target_time_seconds * 3600 : 0;

      const requestData = {
        title: values.title,
        description: values.description || '',
        category: values.category,
        priority: values.priority,
        color: typeof values.color === 'string' ? values.color : values.color.toHexString(),
        is_favorite: values.is_favorite || false,
        target_time_seconds: targetTimeSeconds,
        tags: [], // 暂时不支持标签
        metadata: {} // 暂时不支持元数据
      };

      if (isEditing && task?.id) {
        await personalTimerService.updateUserTimerTask(task.id, requestData);
        message.success('任务更新成功');
      } else {
        await personalTimerService.createUserTimerTask(requestData);
        message.success('任务创建成功');
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save task:', error);
      message.error(isEditing ? '更新任务失败' : '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined />
          <span>{isEditing ? '编辑个人计时任务' : '创建个人计时任务'}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          category: 'personal',
          priority: 'medium',
          is_favorite: false
        }}
      >
        <Form.Item
          name="title"
          label="任务标题"
          rules={[
            { required: true, message: '请输入任务标题' },
            { min: 1, max: 255, message: '标题长度应在1-255字符之间' }
          ]}
        >
          <Input placeholder="例如：学习React、健身锻炼、工作项目..." />
        </Form.Item>

        <Form.Item
          name="description"
          label="任务描述"
          rules={[
            { max: 500, message: '描述最多500字符' }
          ]}
        >
          <TextArea 
            rows={3} 
            placeholder="详细描述这个计时任务的内容和目标..."
            showCount
            maxLength={500}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item
            name="category"
            label="任务分类"
            style={{ flex: 1 }}
            rules={[{ required: true, message: '请选择任务分类' }]}
          >
            <Select 
              placeholder="选择分类"
              onChange={handleCategoryChange}
            >
              {personalTimerService.getCategories().map(cat => (
                <Option key={cat.value} value={cat.value}>
                  <Space>
                    <div 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: cat.color
                      }}
                    />
                    {cat.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            style={{ flex: 1 }}
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="选择优先级">
              {personalTimerService.getPriorities().map(priority => (
                <Option key={priority.value} value={priority.value}>
                  <Space>
                    <div 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: priority.color
                      }}
                    />
                    {priority.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
          <Form.Item
            name="color"
            label="任务颜色"
            style={{ flex: 1 }}
          >
            <ColorPicker
              showText
              format="hex"
              presets={[
                {
                  label: '推荐颜色',
                  colors: [
                    '#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96',
                    '#f5222d', '#faad14', '#13c2c2', '#a0d911', '#2f54eb'
                  ]
                }
              ]}
            />
          </Form.Item>

          <Form.Item
            name="target_time_seconds"
            label="目标时长（小时）"
            style={{ flex: 1 }}
          >
            <InputNumber
              min={0}
              max={24}
              step={0.5}
              placeholder="例如：2"
              style={{ width: '100%' }}
              addonAfter="小时"
            />
          </Form.Item>
        </div>

        <Form.Item
          name="is_favorite"
          label="收藏设置"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren="收藏" 
            unCheckedChildren="普通"
          />
        </Form.Item>

        {/* 提示信息 */}
        <div style={{ 
          background: '#f6f8fa', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #e1e4e8'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 <strong>使用提示：</strong>
            <br />
            • 创建后可以在个人计时页面开始计时
            <br />
            • 设置目标时长有助于跟踪进度
            <br />
            • 收藏的任务会显示在快速访问区域
            <br />
            • 不同分类用不同颜色区分，便于管理
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

export default PersonalTimerTaskForm;