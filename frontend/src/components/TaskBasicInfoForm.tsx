import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Form, 
  Card, 
  Row, 
  Col, 
  DatePicker, 
  InputNumber, 
  Radio, 
  Select, 
  Button, 
  Space, 
  Input, 
  Tag, 
  Avatar, 
  Tooltip, 
  message,
  Divider
} from 'antd';
import { 
  SaveOutlined, 
  ClockCircleOutlined, 
  UserOutlined, 
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { Task } from '../types/task';
import './TaskBasicInfoForm.css';

const { Option } = Select;

interface User {
  id: number;
  username: string;
  email?: string;
}

interface TaskBasicInfoFormProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

interface CustomField {
  key: string;
  label: string;
  value: any;
  type: 'text' | 'number' | 'select' | 'date';
}

const TaskBasicInfoForm: React.FC<TaskBasicInfoFormProps> = ({
  task,
  onUpdate,
  loading = false,
  disabled = false,
  compact = false
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<string[]>(task.tags || []);
  const [inputValue, setInputValue] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const inputRef = useRef<any>(null);

  // 表单初始值
  const initialValues = useMemo(() => ({
    due_datetime: task.due_date ? dayjs(task.due_date) : null,
    estimated_hours: Math.floor((task.estimated_minutes || 0) / 60),
    estimated_minutes_remainder: (task.estimated_minutes || 0) % 60,
    priority: task.priority || 'medium',
    status: task.status,
    assignee_id: task.assignee_id,
    tags: task.tags || []
  }), [task]);

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      // TODO: 实现用户API调用
      // const response = await api.get('/api/v1/users');
      // setUsers(response.data.users || []);
      
      // 暂时使用模拟数据
      setUsers([
        { id: 1, username: 'admin', email: 'admin@example.com' },
        { id: 2, username: 'developer', email: 'dev@example.com' },
        { id: 3, username: 'tester', email: 'test@example.com' }
      ]);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      message.error('加载用户列表失败');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 更新tags状态
  useEffect(() => {
    setTags(task.tags || []);
  }, [task.tags]);

  // 表单提交处理
  const handleSubmit = useCallback(async (values: any) => {
    setSaving(true);
    try {
      // 计算总的预估分钟数
      const estimatedMinutes = (values.estimated_hours || 0) * 60 + (values.estimated_minutes_remainder || 0);
      
      // 构建更新数据
      const updates: Partial<Task> = {
        due_date: values.due_datetime ? values.due_datetime.toISOString() : null,
        estimated_minutes: estimatedMinutes,
        priority: values.priority,
        status: values.status,
        assignee_id: values.assignee_id,
        tags: tags,
        // 自定义字段
        custom_fields: {
          ...task.custom_fields,
          ...customFields.reduce((acc, field) => ({ ...acc, [field.label]: field.value }), {})
        }
      };

      await onUpdate(updates);
      message.success('任务信息已更新');
    } catch (error) {
      console.error('更新失败:', error);
      message.error('更新失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [onUpdate, tags, customFields, task.custom_fields]);

  // 标签管理
  const handleTagClose = useCallback((removedTag: string) => {
    const newTags = tags.filter(tag => tag !== removedTag);
    setTags(newTags);
  }, [tags]);

  const handleInputConfirm = useCallback(() => {
    if (inputValue && !tags.includes(inputValue)) {
      setTags([...tags, inputValue]);
    }
    setInputValue('');
    setInputVisible(false);
  }, [inputValue, tags]);

  const showInput = useCallback(() => {
    setInputVisible(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // 自定义字段管理
  const addCustomField = useCallback(() => {
    const key = `custom_${Date.now()}`;
    setCustomFields([...customFields, {
      key,
      label: '自定义字段',
      value: '',
      type: 'text'
    }]);
  }, [customFields]);

  const removeCustomField = useCallback((key: string) => {
    setCustomFields(customFields.filter(field => field.key !== key));
  }, [customFields]);

  const updateCustomField = useCallback((key: string, updates: Partial<CustomField>) => {
    setCustomFields(customFields.map(field => 
      field.key === key ? { ...field, ...updates } : field
    ));
  }, [customFields]);

  // 实际工时显示
  const ActualTimeDisplay = useMemo(() => {
    const actualMinutes = task.actual_minutes || 0;
    const hours = Math.floor(actualMinutes / 60);
    const minutes = actualMinutes % 60;
    
    const timeText = hours > 0 
      ? `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
      : minutes > 0 
        ? `${minutes}分钟`
        : '0分钟';

    return (
      <Form.Item label="实际工时">
        <Input
          value={timeText}
          disabled
          suffix={
            <Tooltip title="从计时记录自动计算">
              <ClockCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          }
        />
      </Form.Item>
    );
  }, [task.actual_minutes]);

  // 预估工时输入组件
  const EstimatedTimeInput = () => (
    <Form.Item label="预估工时">
      <Input.Group compact>
        <Form.Item
          name="estimated_hours"
          noStyle
          rules={[{ type: 'number', min: 0, max: 999 }]}
        >
          <InputNumber
            min={0}
            max={999}
            placeholder="0"
            style={{ width: '70px' }}
            disabled={disabled}
          />
        </Form.Item>
        <span style={{ 
          display: 'inline-block', 
          lineHeight: '32px', 
          padding: '0 8px' 
        }}>
          小时
        </span>
        <Form.Item
          name="estimated_minutes_remainder"
          noStyle
          rules={[{ type: 'number', min: 0, max: 59 }]}
        >
          <InputNumber
            min={0}
            max={59}
            placeholder="0"
            style={{ width: '70px' }}
            disabled={disabled}
          />
        </Form.Item>
        <span style={{ 
          display: 'inline-block', 
          lineHeight: '32px', 
          padding: '0 8px' 
        }}>
          分钟
        </span>
      </Input.Group>
    </Form.Item>
  );

  // 标签管理组件
  const TagsManager = () => (
    <div className="tags-container">
      {tags.map(tag => (
        <Tag
          key={tag}
          closable={!disabled}
          onClose={() => handleTagClose(tag)}
          color="blue"
        >
          {tag}
        </Tag>
      ))}
      
      {inputVisible ? (
        <Input
          ref={inputRef}
          type="text"
          size="small"
          style={{ width: 100 }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleInputConfirm}
          onBlur={handleInputConfirm}
        />
      ) : (
        !disabled && (
          <Tag
            onClick={showInput}
            style={{ borderStyle: 'dashed' }}
          >
            <PlusOutlined /> 添加标签
          </Tag>
        )
      )}
    </div>
  );

  // 自定义字段编辑器
  const CustomFieldsEditor = () => (
    <div className="custom-fields-editor">
      {customFields.map(field => (
        <Row key={field.key} gutter={[8, 8]} align="middle">
          <Col flex="120px">
            <Input
              size="small"
              value={field.label}
              onChange={(e) => updateCustomField(field.key, { label: e.target.value })}
              placeholder="字段名"
              disabled={disabled}
            />
          </Col>
          <Col flex="auto">
            <Input
              size="small"
              value={field.value}
              onChange={(e) => updateCustomField(field.key, { value: e.target.value })}
              placeholder="字段值"
              disabled={disabled}
            />
          </Col>
          <Col flex="none">
            {!disabled && (
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeCustomField(field.key)}
              />
            )}
          </Col>
        </Row>
      ))}
      
      {!disabled && (
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={addCustomField}
          style={{ width: '100%', marginTop: 8 }}
        >
          添加自定义字段
        </Button>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="task-basic-info-form compact">
        <Form
          form={form}
          initialValues={initialValues}
          onFinish={handleSubmit}
          layout="inline"
          size="small"
        >
          <Form.Item name="due_datetime" label="截止">
            <DatePicker 
              showTime={false}
              format="MM-DD"
              placeholder="截止日期"
              disabled={disabled}
            />
          </Form.Item>
          
          <Form.Item name="priority" label="优先级">
            <Select style={{ width: 80 }} disabled={disabled}>
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="status" label="状态">
            <Select style={{ width: 100 }} disabled={disabled}>
              <Option value="todo">待处理</Option>
              <Option value="in_progress">进行中</Option>
              <Option value="completed">已完成</Option>
            </Select>
          </Form.Item>

          <div style={{ marginTop: 8 }}>
            <TagsManager />
          </div>
        </Form>
      </div>
    );
  }

  return (
    <div className="task-basic-info-form">
      <Form
        form={form}
        initialValues={initialValues}
        onFinish={handleSubmit}
        layout="vertical"
      >
        {/* 基本信息区域 */}
        <Card title="基本信息" size="small" className="info-section">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="截止时间"
                name="due_datetime"
                extra="选择任务的截止日期和时间"
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  placeholder="选择截止时间"
                  style={{ width: '100%' }}
                  allowClear
                  disabled={disabled}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} md={12}>
              <EstimatedTimeInput />
            </Col>
            
            <Col xs={24} md={12}>
              {ActualTimeDisplay}
            </Col>
            
            <Col xs={24} md={12}>
              <Form.Item label="优先级" name="priority">
                <Radio.Group disabled={disabled}>
                  <Radio.Button value="low">低</Radio.Button>
                  <Radio.Button value="medium">中</Radio.Button>
                  <Radio.Button value="high">高</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            
            <Col xs={24} md={12}>
              <Form.Item label="任务状态" name="status">
                <Select placeholder="选择状态" disabled={disabled}>
                  <Option value="draft">草稿</Option>
                  <Option value="todo">待处理</Option>
                  <Option value="in_progress">进行中</Option>
                  <Option value="testing">测试中</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                  <Option value="on_hold">暂停</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col xs={24} md={12}>
              <Form.Item label="负责人" name="assignee_id">
                <Select
                  placeholder="选择负责人"
                  loading={loadingUsers}
                  allowClear
                  showSearch
                  disabled={disabled}
                  filterOption={(input, option) =>
                    (option?.children as any)?.props?.children[1]?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {users.map(user => (
                    <Option key={user.id} value={user.id}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        {user.username}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 标签管理区域 */}
        <Card title="标签管理" size="small" className="info-section">
          <TagsManager />
        </Card>

        {/* 自定义字段区域 */}
        <Card title="自定义字段" size="small" className="info-section">
          <CustomFieldsEditor />
        </Card>

        {/* 操作按钮 */}
        {!disabled && (
          <div className="form-actions">
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saving || loading}
                icon={<SaveOutlined />}
              >
                保存更改
              </Button>
              <Button 
                onClick={() => {
                  form.resetFields();
                  setTags(task.tags || []);
                  setCustomFields([]);
                }}
                disabled={saving || loading}
              >
                重置
              </Button>
            </Space>
          </div>
        )}
      </Form>
    </div>
  );
};

export default TaskBasicInfoForm;