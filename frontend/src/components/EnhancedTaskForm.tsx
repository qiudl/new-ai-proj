import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Card,
  Row,
  Col,
  Space,
  Tag,
  Button,
  Progress,
  Alert,
  FormInstance,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { EnhancedValidators, BusinessValidators } from '../utils/enhancedValidation';
import { Task, TaskRequest } from '../types/task';
import { taskService } from '../services/taskService';

const { Option } = Select;
const { TextArea } = Input;

interface EnhancedTaskFormProps {
  form: FormInstance;
  initialValues?: Partial<Task>;
  isEdit?: boolean;
  projectId?: number;
  parentId?: number;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  showAdvanced?: boolean;
  disabled?: boolean;
}

// 任务状态配置
const TASK_STATUS_CONFIG = {
  draft: { label: '草稿', color: 'default', icon: '📝' },
  planning: { label: '规划中', color: 'blue', icon: '📋' },
  todo: { label: '待办', color: 'orange', icon: '📌' },
  in_progress: { label: '进行中', color: 'processing', icon: '⚡' },
  testing: { label: '测试中', color: 'purple', icon: '🧪' },
  completed: { label: '已完成', color: 'success', icon: '✅' },
  cancelled: { label: '已取消', color: 'error', icon: '❌' },
  on_hold: { label: '暂停', color: 'warning', icon: '⏸️' },
  suspended: { label: '挂起', color: 'default', icon: '⏳' },
  blocked: { label: '阻塞', color: 'error', icon: '🚫' },
  archived: { label: '归档', color: 'default', icon: '📦' },
};

// 优先级配置
const PRIORITY_CONFIG = {
  low: { label: '低', color: 'green', icon: '🟢' },
  medium: { label: '中', color: 'orange', icon: '🟡' },
  high: { label: '高', color: 'red', icon: '🔴' },
  urgent: { label: '紧急', color: 'magenta', icon: '🚨' },
};

export const EnhancedTaskForm: React.FC<EnhancedTaskFormProps> = ({
  form,
  initialValues,
  isEdit = false,
  projectId,
  parentId,
  onValidationChange,
  showAdvanced = false,
  disabled = false,
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [uniqueCheckCache, setUniqueCheckCache] = useState<Record<string, boolean>>({});

  // 异步验证：检查任务标题唯一性
  const checkTitleUnique = async (title: string): Promise<boolean> => {
    if (!title || title.length < 2) return true;
    
    // 缓存检查结果
    const cacheKey = `${projectId}-${title}`;
    if (uniqueCheckCache[cacheKey] !== undefined) {
      return uniqueCheckCache[cacheKey];
    }

    try {
      // 模拟API调用检查唯一性
      const isUnique = Math.random() > 0.1; // 90%概率唯一
      setUniqueCheckCache(prev => ({ ...prev, [cacheKey]: isUnique }));
      return isUnique;
    } catch {
      return true; // 验证失败时默认通过
    }
  };

  // 表单字段配置
  const formFields = [
    {
      name: 'title',
      label: '任务标题',
      required: true,
      rules: [
        ...BusinessValidators.taskTitle(),
        EnhancedValidators.unique(checkTitleUnique, '任务标题已存在，请使用其他标题'),
      ],
      component: (
        <Input
          placeholder="请输入任务标题"
          disabled={disabled}
          maxLength={200}
          showCount
          prefix={<CheckCircleOutlined />}
        />
      ),
    },
    {
      name: 'description',
      label: '任务描述',
      rules: [
        EnhancedValidators.maxLength(2000, '任务描述不能超过2000个字符'),
      ],
      component: (
        <TextArea
          rows={4}
          placeholder="请输入任务描述"
          disabled={disabled}
          maxLength={2000}
          showCount
        />
      ),
    },
    {
      name: 'status',
      label: '任务状态',
      required: true,
      rules: BusinessValidators.taskStatus(),
      component: (
        <Select
          placeholder="请选择任务状态"
          disabled={disabled}
          suffixIcon={<FlagOutlined />}
        >
          {Object.entries(TASK_STATUS_CONFIG).map(([value, config]) => (
            <Option key={value} value={value}>
              <Space>
                <span>{config.icon}</span>
                <Tag color={config.color}>{config.label}</Tag>
              </Space>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      name: 'priority',
      label: '优先级',
      rules: BusinessValidators.taskPriority(),
      component: (
        <Select
          placeholder="请选择优先级"
          disabled={disabled}
          allowClear
          suffixIcon={<ExclamationCircleOutlined />}
        >
          {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
            <Option key={value} value={value}>
              <Space>
                <span>{config.icon}</span>
                <Tag color={config.color}>{config.label}</Tag>
              </Space>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      name: 'assignee_id',
      label: '负责人',
      rules: [
        EnhancedValidators.positiveInteger('请选择有效的负责人'),
      ],
      component: (
        <Select
          placeholder="请选择负责人"
          disabled={disabled}
          allowClear
          suffixIcon={<UserOutlined />}
          showSearch
          filterOption={(input, option) =>
            option?.children?.toString().toLowerCase().includes(input.toLowerCase())
          }
        >
          <Option value={1}>管理员</Option>
          <Option value={2}>开发者</Option>
          <Option value={3}>测试员</Option>
        </Select>
      ),
    },
    {
      name: 'due_date',
      label: '截止日期',
      rules: [
        {
          validator: (_, value) => {
            if (value && value.isBefore(new Date(), 'day')) {
              return Promise.reject(new Error('截止日期不能早于今天'));
            }
            return Promise.resolve();
          },
        },
      ],
      component: (
        <DatePicker
          placeholder="请选择截止日期"
          disabled={disabled}
          style={{ width: '100%' }}
          suffixIcon={<CalendarOutlined />}
          disabledDate={(current) => current && current.isBefore(new Date(), 'day')}
        />
      ),
    },
    {
      name: 'estimated_hours',
      label: '预估工时（小时）',
      rules: BusinessValidators.estimatedHours(),
      component: (
        <InputNumber
          placeholder="请输入预估工时"
          disabled={disabled}
          min={0.1}
          max={9999}
          step={0.5}
          precision={1}
          style={{ width: '100%' }}
          prefix={<ClockCircleOutlined />}
          onChange={(value) => setEstimatedHours(value || 0)}
        />
      ),
    },
    {
      name: 'tags',
      label: '标签',
      rules: [
        EnhancedValidators.arrayLength(0, 10, '最多只能选择10个标签'),
      ],
      component: (
        <Select
          mode="tags"
          placeholder="请输入或选择标签"
          disabled={disabled}
          style={{ width: '100%' }}
          tokenSeparators={[',', ' ']}
        >
          <Option value="frontend">前端</Option>
          <Option value="backend">后端</Option>
          <Option value="urgent">紧急</Option>
          <Option value="bug">缺陷</Option>
          <Option value="feature">功能</Option>
          <Option value="optimization">优化</Option>
        </Select>
      ),
    },
  ];

  // 高级字段配置
  const advancedFields = [
    {
      name: 'parent_id',
      label: '父任务',
      rules: [
        EnhancedValidators.positiveInteger('请选择有效的父任务'),
      ],
      component: (
        <Select
          placeholder="请选择父任务"
          disabled={disabled}
          allowClear
          showSearch
          filterOption={(input, option) =>
            option?.children?.toString().toLowerCase().includes(input.toLowerCase())
          }
        >
          {/* 这里应该从API获取可选的父任务 */}
          <Option value={1}>父任务示例1</Option>
          <Option value={2}>父任务示例2</Option>
        </Select>
      ),
    },
    {
      name: 'progress',
      label: '完成进度（%）',
      rules: BusinessValidators.progress(),
      component: (
        <InputNumber
          placeholder="请输入完成进度"
          disabled={disabled}
          min={0}
          max={100}
          style={{ width: '100%' }}
          onChange={(value) => setProgress(value || 0)}
        />
      ),
    },
    {
      name: 'complexity',
      label: '复杂度评分',
      rules: [
        EnhancedValidators.numberRange(1, 10, '复杂度评分在1-10之间'),
      ],
      component: (
        <InputNumber
          placeholder="请评估任务复杂度"
          disabled={disabled}
          min={1}
          max={10}
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  // 表单验证状态变化处理
  const handleValuesChange = () => {
    form.validateFields()
      .then(() => {
        setValidationErrors({});
        onValidationChange?.(true, {});
      })
      .catch((errorInfo) => {
        const errors: Record<string, string> = {};
        errorInfo.errorFields?.forEach((field: any) => {
          errors[field.name[0]] = field.errors[0];
        });
        setValidationErrors(errors);
        onValidationChange?.(false, errors);
      });
  };

  // 渲染表单项
  const renderFormItem = (field: any, colSpan = 24) => (
    <Col span={colSpan} key={field.name}>
      <Form.Item
        name={field.name}
        label={field.label}
        rules={field.rules}
        validateStatus={validationErrors[field.name] ? 'error' : ''}
        help={validationErrors[field.name]}
      >
        {field.component}
      </Form.Item>
    </Col>
  );

  // 初始化表单
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      setEstimatedHours(initialValues.estimated_hours || 0);
      setProgress(initialValues.progress || 0);
    }
  }, [initialValues, form]);

  return (
    <div className="enhanced-task-form">
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{
          status: 'todo',
          priority: 'medium',
          progress: 0,
          project_id: projectId,
          parent_id: parentId,
          ...initialValues,
        }}
      >
        {/* 基本信息 */}
        <Card
          title="基本信息"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            {renderFormItem(formFields[0])} {/* 标题 */}
            {renderFormItem(formFields[1])} {/* 描述 */}
            {renderFormItem(formFields[2], 12)} {/* 状态 */}
            {renderFormItem(formFields[3], 12)} {/* 优先级 */}
          </Row>
        </Card>

        {/* 分配信息 */}
        <Card
          title="分配信息"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            {renderFormItem(formFields[4], 12)} {/* 负责人 */}
            {renderFormItem(formFields[5], 12)} {/* 截止日期 */}
            {renderFormItem(formFields[6], 12)} {/* 预估工时 */}
            {renderFormItem(formFields[7], 12)} {/* 标签 */}
          </Row>
        </Card>

        {/* 进度显示 */}
        {(estimatedHours > 0 || progress > 0) && (
          <Card title="进度信息" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>预估工时</div>
                <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  <ClockCircleOutlined /> {estimatedHours} 小时
                </Tag>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>完成进度</div>
                <Progress
                  percent={progress}
                  size="small"
                  status={progress === 100 ? 'success' : 'active'}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* 高级选项 */}
        {showAdvanced && (
          <Card
            title="高级选项"
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              {advancedFields.map(field => renderFormItem(field, 12))}
            </Row>
          </Card>
        )}

        {/* 验证错误提示 */}
        {Object.keys(validationErrors).length > 0 && (
          <Alert
            message="表单验证错误"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
      </Form>
    </div>
  );
};

export default EnhancedTaskForm;