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
  Tag,
  Tooltip,
  Spin,
  Grid,
  Typography,
} from 'antd';
import { EditOutlined, FolderOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Task, TaskRequest } from '../types/task';
import { TaskService } from '../services/taskService';
import { TaskParentSelectorModal } from './TaskParentSelectorModal';
import TaskMarkdownEditor from './TaskMarkdownEditor';
import TimeInput from './TimeInput';
import dayjs from 'dayjs';
import { TASK_STATUS_OPTIONS } from '../utils/bulkSubTaskConfig';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

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
  mode?: 'create' | 'edit' | 'createSubtask' | 'createSibling';
  siblingTask?: Task; // 用于兄弟任务创建时的参考任务
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
  mode = 'create',
  siblingTask,
}) => {
  const [form] = Form.useForm();
  const [parentSelectorVisible, setParentSelectorVisible] = useState(false);
  const [selectedParentTask, setSelectedParentTask] = useState<Task | null>(null);
  const [loadingParentTask, setLoadingParentTask] = useState(false);

  // 响应式检测
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // md以下认为是移动端 (< 768px)

  // Load parent task information when we have parent_id but no parent_title
  const loadParentTaskInfo = async (parentId: number) => {
    if (!projectId || parentId <= 0) {
      console.warn('⚠️ [TaskModal] Invalid parameters - projectId:', projectId, 'parentId:', parentId);
      return;
    }
    
    try {
      setLoadingParentTask(true);
      
      const response = await TaskService.getTask(projectId, parentId);
      if (response) {
        setSelectedParentTask(response);
      } else {
        console.warn('⚠️ [TaskModal] No response received, setting parent task to null');
        setSelectedParentTask(null);
      }
    } catch (error) {
      console.error('❌ [TaskModal] Failed to load parent task info:', error);
      // Reset to null if we can't load parent task info
      setSelectedParentTask(null);
    } finally {
      setLoadingParentTask(false);
    }
  };

  useEffect(() => {
    if (visible) {
      if (task) {
        // Edit mode - populate form with task data
        const formValues = {
          title: task.title,
          description: task.description,
          status: task.status,
          assignee_id: task.assignee_id,
          due_date: task.due_date ? dayjs(task.due_date) : null,
          priority: task.custom_fields?.priority || 'medium',
          tags: task.custom_fields?.tags?.join(', ') || '',
          estimated_hours: task.custom_fields?.estimated_hours,
          parent_id: task.parent_id,
          // 新的时间管理字段
          timeInput: {
            estimatedMinutes: task.estimated_minutes,
            timeUnitPreference: task.time_unit_preference || 'auto',
            workHoursPerDay: task.work_hours_per_day || 8,
            timeTrackingMode: task.time_tracking_mode || 'manual',
            startDatetime: task.start_datetime,
            dueDatetime: task.due_datetime,
          },
        };
        form.setFieldsValue(formValues);
        
        // Set selected parent task for display
        if (task.parent_id && task.parent_title) {
          // Only set if we have complete parent task information
          const parentTaskData = {
            id: task.parent_id,
            title: task.parent_title,
            task_level: 0, // Will be updated by parent selector if needed
            project_id: projectId,
            status: 'unknown', // Placeholder status
            created_at: '',
            updated_at: '',
            description: '',
          } as Task;
          setSelectedParentTask(parentTaskData);
        } else if (task.parent_id && !task.parent_title) {
          // If we have parent_id but no title, fetch parent task information
          loadParentTaskInfo(task.parent_id);
        } else {
          setSelectedParentTask(null);
        }
      } else if (mode === 'createSibling' && siblingTask) {
        // Sibling creation mode - use sibling's parent_id
        form.resetFields();
        form.setFieldsValue({
          status: 'todo',
          priority: siblingTask.custom_fields?.priority || 'medium', // 继承兄弟任务的优先级
          parent_id: siblingTask.parent_id, // 相同的父任务ID
          assignee_id: siblingTask.assignee_id, // 继承负责人
        });
        
        // Set parent task if sibling has one
        if (siblingTask.parent_id && siblingTask.parent_title) {
          setSelectedParentTask({
            id: siblingTask.parent_id,
            title: siblingTask.parent_title,
            task_level: 0, // Will be updated by parent selector if needed
          } as Task);
        } else {
          setSelectedParentTask(null);
        }
      } else {
        // Regular create mode - reset form
        form.resetFields();
        form.setFieldsValue({
          status: 'todo',
          priority: 'medium',
          parent_id: parentTask?.id,
        });
        
        // Set initial parent task if provided
        setSelectedParentTask(parentTask || null);
      }
    } else {
      // Reset state when modal closes
      setSelectedParentTask(null);
      setParentSelectorVisible(false);
    }
  }, [visible, task, form, parentTask, mode, siblingTask]);

  // Handle parent task selection
  const handleParentSelect = (parentId: number | null, parentTask: Task | null) => {
    form.setFieldValue('parent_id', parentId);
    setSelectedParentTask(parentTask);
    setParentSelectorVisible(false);
    };

  // Handle opening parent selector
  const handleOpenParentSelector = () => {
    setParentSelectorVisible(true);
  };

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
      
      // Circular dependency validation is now handled by TaskParentSelectorModal
      
      // 验证父任务信息的有效性
      if (parentId && !task) {
        // 如果是创建子任务模式，验证parentTask
        if (mode === 'createSubtask' && (!parentTask || !parentTask.project_id)) {
          console.error('❌ [TaskModal] createSubtask validation failed - parentTask:', parentTask);
          throw new Error('父任务信息无效，无法创建子任务');
        }
        // 如果是创建兄弟任务模式，验证siblingTask及其父任务信息
        else if (mode === 'createSibling') {
          if (!siblingTask) {
            console.error('❌ [TaskModal] createSibling validation failed - siblingTask is null');
            throw new Error('兄弟任务信息无效，无法创建兄弟任务');
          }
          // 如果兄弟任务有父任务，但父任务信息不完整，则可能有问题
          // 但允许创建，因为parent_id可能为null（根任务）
        }
        // 其他创建模式，如果指定了parent_id但没有parentTask，也要验证
        else if (mode !== 'createSibling' && (!parentTask || !parentTask.project_id)) {
          console.error('❌ [TaskModal] general create validation failed - parentTask:', parentTask);
          throw new Error('父任务信息无效，无法创建任务');
        }
      }
      
      // Transform form values to TaskRequest
      const timeInput = values.timeInput || {};
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
        // 新的时间管理字段
        estimated_minutes: timeInput.estimatedMinutes || undefined,
        time_unit_preference: timeInput.timeUnitPreference || 'auto',
        work_hours_per_day: timeInput.workHoursPerDay || 8,
        time_tracking_mode: timeInput.timeTrackingMode || 'manual',
        start_datetime: timeInput.startDatetime || undefined,
        due_datetime: timeInput.dueDatetime || undefined,
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
    
    if (mode === 'createSibling' && siblingTask) {
      return (
        <div>
          <span>创建兄弟任务</span>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 400, 
            color: '#8c8c8c',
            marginTop: '4px'
          }}>
            参考任务: {siblingTask.title}
            {siblingTask.parent_title && (
              <div>父任务: {siblingTask.parent_title}</div>
            )}
          </div>
        </div>
      );
    }
    
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
      width={isMobile ? '95vw' : 600}
      style={isMobile ? { top: 20, paddingBottom: 0, margin: 'auto' } : undefined}
      styles={isMobile ? { body: { maxHeight: 'calc(100vh - 120px)', overflow: 'auto' } } : undefined}
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

        {mode === 'createSibling' && siblingTask && (
          <div style={{ 
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '6px'
          }}>
            <div style={{ color: '#fa8c16', fontWeight: 500, marginBottom: '4px' }}>
              正在创建兄弟任务，参考任务:
            </div>
            <div style={{ color: '#262626' }}>{siblingTask.title}</div>
            {siblingTask.parent_title && (
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '4px' }}>
                父任务: {siblingTask.parent_title}
              </div>
            )}
            {!siblingTask.parent_title && (
              <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '4px' }}>
                根任务级别
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
          help="支持Markdown格式，可以使用**粗体**、*斜体*、[链接](url)、列表等"
        >
          <TaskMarkdownEditor
            value={form.getFieldValue('description') || ''}
            onChange={(value) => form.setFieldValue('description', value)}
            placeholder="请输入任务描述（支持Markdown格式）"
            rows={4}
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
                {TASK_STATUS_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
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
              name="timeInput"
              label={
                <span>
                  <ClockCircleOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                  预估时间
                </span>
              }
              tooltip={
                <div>
                  <div><strong>🎯 精准时间管理功能：</strong></div>
                  <div>• 支持分钟、小时、天等多种单位</div>
                  <div>• 快速设置按钮：30分钟、1小时、1天等</div>
                  <div>• 智能统计：时间效率分析、工作分布</div>
                  <div>• 点击"显示高级选项"配置工作模式</div>
                </div>
              }
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  💡 使用精准时间管理提升工作效率统计
                </Text>
              }
            >
              <TimeInput
                placeholder="点击输入预估时间，支持智能单位转换"
                mode="estimate"
                compact={isMobile}
                showAdvanced={!isMobile} // 非移动端默认显示高级选项按钮
              />
            </Form.Item>
          </Col>
        </Row>

        {allowParentSelection && (
          <Form.Item
            name="parent_id"
            label="父任务"
            help="选择父任务，将此任务作为子任务。支持搜索和层级显示。"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(() => {
                if (loadingParentTask) {
                  return (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8,
                      padding: '4px 8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      backgroundColor: '#fafafa'
                    }}>
                      <Spin size="small" />
                      <span style={{ color: '#8c8c8c' }}>正在加载父任务信息...</span>
                    </div>
                  );
                } else if (selectedParentTask) {
                  return (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8,
                      padding: '4px 8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      backgroundColor: '#fafafa'
                    }}>
                      <FolderOutlined style={{ color: '#1890ff' }} />
                      <span style={{ flex: 1 }}>{selectedParentTask.title}</span>
                      <Tag color="blue">
                        L{selectedParentTask.task_level + 1}
                      </Tag>
                      <Tooltip title="清除选择">
                        <Button 
                          type="text" 
                          size="small" 
                          onClick={() => handleParentSelect(null, null)}
                        >
                          ✕
                        </Button>
                      </Tooltip>
                    </div>
                  );
                } else {
                  return (
                    <div style={{ 
                      flex: 1, 
                      padding: '4px 8px',
                      border: '1px dashed #d9d9d9',
                      borderRadius: 6,
                      color: '#8c8c8c',
                      textAlign: 'center'
                    }}>
                      未选择父任务（根任务）
                    </div>
                  );
                }
              })()}
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleOpenParentSelector}
              >
                {selectedParentTask ? '修改' : '选择'}
              </Button>
            </div>
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

      {/* Parent Task Selection Modal */}
      {allowParentSelection && (
        <TaskParentSelectorModal
          open={parentSelectorVisible}
          projectId={projectId}
          currentTaskId={task?.id}
          currentParentId={selectedParentTask?.id || null}
          onOk={handleParentSelect}
          onCancel={() => setParentSelectorVisible(false)}
          title="选择父任务"
          allowClear={true}
        />
      )}
    </Modal>
  );
};

export default TaskModal;