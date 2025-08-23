import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Typography,
  Space,
  Badge,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Button,
  Switch,
  Slider,
  Divider,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Checkbox,
  Popover
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BranchesOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SearchOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DragOutlined,
  SelectOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { Task, TaskRequest, TaskStatus } from '../types/task';
import { TaskService } from '../services/taskService';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface InteractiveGanttChartProps {
  parentTask: Task;
  projectId: number;
  style?: React.CSSProperties;
}

interface InteractiveGanttTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  estimatedHours: number;
  progress: number;
  dependencies: number[];
  level: number;
  parentId?: number;
  children?: InteractiveGanttTask[];
  isExpanded?: boolean;
  isVisible?: boolean;
  isSelected?: boolean;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
  custom_fields?: Record<string, any>;
  // Editing states
  isEditing?: boolean;
  editingField?: string;
}

interface GanttStats {
  totalSubtasks: number;
  completedSubtasks: number;
  totalEstimatedHours: number;
  completionRate: number;
  maxLevel: number;
  selectedCount: number;
}

interface TaskEditModalProps {
  visible: boolean;
  task: InteractiveGanttTask | null;
  onClose: () => void;
  onSave: (taskId: number, updates: Partial<TaskRequest>) => Promise<void>;
}

interface InlineEditProps {
  value: any;
  field: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: Array<{ label: string; value: any }>;
  onSave: (value: any) => Promise<void>;
  style?: React.CSSProperties;
}

const STATUS_CONFIG = {
  todo: { 
    color: '#3498db', 
    text: '待开始', 
    icon: <PauseCircleOutlined />,
    gradient: 'linear-gradient(45deg, #3498db, #5dade2)'
  },
  in_progress: { 
    color: '#f39c12', 
    text: '进行中', 
    icon: <PlayCircleOutlined />,
    gradient: 'linear-gradient(45deg, #f39c12, #f1c40f)'
  },
  completed: { 
    color: '#27ae60', 
    text: '已完成', 
    icon: <CheckCircleOutlined />,
    gradient: 'linear-gradient(45deg, #27ae60, #2ecc71)'
  },
  cancelled: { 
    color: '#e74c3c', 
    text: '已取消', 
    icon: <PauseCircleOutlined />,
    gradient: 'linear-gradient(45deg, #e74c3c, #c0392b)'
  }
};

const PRIORITY_CONFIG: Record<'high'|'medium'|'low', { color: string; text: string }> = {
  high: { color: '#e74c3c', text: '🔥 高' },
  medium: { color: '#f39c12', text: '⚡ 中' },
  low: { color: '#95a5a6', text: '💡 低' }
};

// Inline Edit Component
const InlineEdit: React.FC<InlineEditProps> = ({ 
  value, 
  field, 
  type, 
  options, 
  onSave, 
  style 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const renderEditInput = () => {
    switch (type) {
      case 'text':
        return (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={handleSave}
            onBlur={handleSave}
            autoFocus
            size="small"
            style={{ width: '100%' }}
          />
        );
      case 'number':
        return (
          <InputNumber
            value={editValue}
            onChange={setEditValue}
            onPressEnter={handleSave}
            onBlur={handleSave}
            autoFocus
            size="small"
            style={{ width: '100%' }}
          />
        );
      case 'date':
        return (
          <DatePicker
            value={editValue ? dayjs(editValue) : null}
            onChange={(date) => setEditValue(date?.format('YYYY-MM-DD'))}
            onBlur={handleSave}
            autoFocus
            size="small"
            style={{ width: '100%' }}
          />
        );
      case 'select':
        return (
          <Select
            value={editValue}
            onChange={(val) => {
              setEditValue(val);
              handleSave();
            }}
            autoFocus
            size="small"
            style={{ width: '100%' }}
          >
            {options?.map(opt => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        );
      default:
        return null;
    }
  };

  if (isEditing) {
    return (
      <div style={{ ...style, position: 'relative' }}>
        {renderEditInput()}
        {loading && (
          <div style={{ 
            position: 'absolute', 
            right: 0, 
            top: '50%', 
            transform: 'translateY(-50%)' 
          }}>
            <Spin size="small" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      style={{ 
        ...style, 
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '3px',
        transition: 'background-color 0.2s'
      }}
      className="inline-edit-trigger"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      onClick={() => setIsEditing(true)}
      title={`点击编辑${field}`}
    >
      {value || '点击编辑'}
      <EditOutlined style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.5 }} />
    </div>
  );
};

// Task Edit Modal Component
const TaskEditModal: React.FC<TaskEditModalProps> = ({ visible, task, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && task) {
      form.setFieldsValue({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        due_date: task.due_date ? dayjs(task.due_date) : null,
        assignee_id: task.assignee_id
      });
    }
  }, [visible, task, form]);

  const handleSave = async () => {
    if (!task) return;
    
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const updates: Partial<TaskRequest> = {
        title: values.title,
        description: values.description,
        status: values.status,
        custom_fields: {
          ...task.custom_fields,
          priority: values.priority,
          estimated_hours: values.estimatedHours
        },
        due_date: values.due_date?.format('YYYY-MM-DD'),
        assignee_id: values.assignee_id
      };

      await onSave(task.id, updates);
      onClose();
      message.success('任务更新成功');
    } catch (error) {
      message.error('保存失败，请检查输入');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>编辑任务</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={loading}
          onClick={handleSave}
          icon={<SaveOutlined />}
        >
          保存
        </Button>
      ]}
      width={600}
    >
      <Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="任务标题"
              name="title"
              rules={[{ required: true, message: '请输入任务标题' }]}
            >
              <Input placeholder="请输入任务标题" />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="状态" name="status">
              <Select placeholder="选择状态">
                <Option value="todo">待开始</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="优先级" name="priority">
              <Select placeholder="选择优先级">
                <Option value="low">低优先级</Option>
                <Option value="medium">中优先级</Option>
                <Option value="high">高优先级</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="预估工时" name="estimatedHours">
              <InputNumber
                placeholder="工时(小时)"
                min={0}
                max={1000}
                step={0.5}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="截止日期" name="due_date">
              <DatePicker 
                placeholder="选择截止日期"
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="负责人" name="assignee_id">
              <Select placeholder="选择负责人" allowClear>
                <Option value={1}>系统管理员</Option>
                <Option value={34}>qiudl</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="任务描述" name="description">
          <TextArea
            placeholder="请输入任务描述"
            rows={4}
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const InteractiveGanttChart: React.FC<InteractiveGanttChartProps> = ({
  parentTask,
  projectId,
  style
}) => {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [interactiveTasks, setInteractiveTasks] = useState<InteractiveGanttTask[]>([]);
  const [isGanttFullscreen, setIsGanttFullscreen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [maxLevelFilter, setMaxLevelFilter] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<InteractiveGanttTask | null>(null);
  const [batchEditMode, setBatchEditMode] = useState(false);

  // Load subtasks data
  const loadSubtasks = async () => {
    setLoading(true);
    try {
      const children = await TaskService.getTaskChildren(projectId, parentTask.id);
      setSubtasks(Array.isArray(children) ? children : []);
    } catch (error) {
      console.error('加载子任务失败:', error);
      setSubtasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical task structure
  const buildInteractiveStructure = useCallback((tasks: Task[]): InteractiveGanttTask[] => {
    const taskMap = new Map<number, Task & { children: Task[] }>();
    const rootTasks: (Task & { children: Task[] })[] = [];

    // Initialize task mapping
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // Build parent-child relationships
    tasks.forEach(task => {
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!;
        parent.children.push(taskMap.get(task.id)!);
      } else {
        rootTasks.push(taskMap.get(task.id)!);
      }
    });

    // Convert to interactive Gantt task format
    const convertToInteractiveTask = (
      task: Task & { children: Task[] }, 
      level: number = 0, 
      projectStartDate: Date
    ): InteractiveGanttTask => {
      const estimatedHours = task.custom_fields?.estimated_hours || 
        (task.custom_fields?.priority === 'high' ? 6.5 : 
         task.custom_fields?.priority === 'medium' ? 4 : 2.5);
      
      const duration = Math.ceil(estimatedHours / 8);
      const startDate = new Date(projectStartDate);
      startDate.setDate(startDate.getDate() + level * 2);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      const progress = task.status === 'completed' ? 100 : 
                      task.status === 'in_progress' ? Math.floor(Math.random() * 80) + 10 : 0;

      const children = task.children.map(child => 
        convertToInteractiveTask(child, level + 1, startDate)
      );

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.custom_fields?.priority || 'medium',
        startDate,
        endDate,
        duration,
        estimatedHours,
        progress,
        dependencies: [],
        level,
        parentId: task.parent_id,
        children,
        isExpanded: level === 0,
        isVisible: true,
        isSelected: selectedTasks.has(task.id),
        assignee_id: task.assignee_id,
        assignee_name: task.assignee_name,
        due_date: task.due_date,
        custom_fields: task.custom_fields,
        isEditing: false
      };
    };

    const now = new Date();
    return rootTasks.map(task => convertToInteractiveTask(task, 0, now));
  }, [selectedTasks]);

  // Flatten hierarchical tasks for rendering
  const flattenInteractiveTasks = useCallback((
    tasks: InteractiveGanttTask[], 
    maxLevel: number = 5,
    searchTerm: string = ''
  ): InteractiveGanttTask[] => {
    const result: InteractiveGanttTask[] = [];
    
    const traverse = (task: InteractiveGanttTask) => {
      if (task.level > maxLevel) return;
      
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        const hasMatchingChildren = (t: InteractiveGanttTask): boolean => {
          return t.children?.some(child => 
            child.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            hasMatchingChildren(child)
          ) || false;
        };
        
        if (!hasMatchingChildren(task)) return;
      }
      
      task.isVisible = true;
      result.push(task);
      
      if (task.isExpanded && task.children) {
        task.children.forEach(child => traverse(child));
      }
    };
    
    tasks.forEach(task => traverse(task));
    return result;
  }, []);

  // Handle task selection
  const handleTaskSelection = useCallback((taskId: number, selected: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }, []);

  // Handle task double-click for editing
  const handleTaskDoubleClick = useCallback((task: InteractiveGanttTask) => {
    setEditingTask(task);
    setEditModalVisible(true);
  }, []);

  // Handle inline field edit
  const handleInlineEdit = useCallback(async (
    taskId: number, 
    field: string, 
    value: any
  ) => {
    try {
      const updates: Partial<TaskRequest> = {};
      
      if (field === 'title') {
        updates.title = value;
      } else if (field === 'status') {
        updates.status = value as TaskStatus;
      } else if (field === 'priority') {
        updates.custom_fields = { priority: value };
      } else if (field === 'estimatedHours') {
        updates.custom_fields = { estimated_hours: value };
      } else if (field === 'due_date') {
        updates.due_date = value;
      }

      await TaskService.updateTask(projectId, taskId, updates);
      await loadSubtasks(); // Refresh data
      message.success('任务更新成功');
    } catch (error) {
      console.error('内联编辑失败:', error);
      message.error('更新失败');
    }
  }, [projectId]);

  // Handle task save from modal
  const handleTaskSave = async (taskId: number, updates: Partial<TaskRequest>) => {
    await TaskService.updateTask(projectId, taskId, updates);
    await loadSubtasks(); // Refresh data
  };

  // Handle batch edit
  const handleBatchEdit = async (field: string, value: any) => {
    const taskIds = Array.from(selectedTasks);
    if (taskIds.length === 0) {
      message.warning('请先选择要批量编辑的任务');
      return;
    }

    try {
      const updates: Partial<TaskRequest> = {};
      
      if (field === 'status') {
        updates.status = value as TaskStatus;
      } else if (field === 'priority') {
        updates.custom_fields = { priority: value };
      }

      // Use batch update if available, otherwise update individually
      if (field === 'status') {
        await TaskService.batchUpdateTasks(projectId, taskIds, value);
      } else {
        // Update individually for other fields
        await Promise.all(
          taskIds.map(taskId => 
            TaskService.updateTask(projectId, taskId, updates)
          )
        );
      }

      await loadSubtasks(); // Refresh data
      setSelectedTasks(new Set()); // Clear selection
      setBatchEditMode(false);
      message.success(`批量更新了 ${taskIds.length} 个任务`);
    } catch (error) {
      console.error('批量编辑失败:', error);
      message.error('批量更新失败');
    }
  };

  // Toggle task expanded state
  const toggleTaskExpanded = useCallback((taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // Process Gantt data
  const processedGanttData = useMemo(() => {
    const interactive = buildInteractiveStructure(subtasks);
    
    const updateExpandedState = (tasks: InteractiveGanttTask[]): InteractiveGanttTask[] => {
      return tasks.map(task => ({
        ...task,
        isExpanded: expandedTasks.has(task.id) || task.level === 0,
        isSelected: selectedTasks.has(task.id),
        children: task.children ? updateExpandedState(task.children) : undefined
      }));
    };

    return updateExpandedState(interactive);
  }, [subtasks, buildInteractiveStructure, expandedTasks, selectedTasks]);

  // Get visible tasks
  const visibleTasks = useMemo(() => {
    return flattenInteractiveTasks(processedGanttData, maxLevelFilter, searchTerm);
  }, [processedGanttData, flattenInteractiveTasks, maxLevelFilter, searchTerm]);

  // Calculate statistics
  const stats = useMemo((): GanttStats => {
    const allTasks = flattenInteractiveTasks(processedGanttData, 10);
    const totalSubtasks = allTasks.length;
    const completedSubtasks = allTasks.filter(t => t.status === 'completed').length;
    const totalEstimatedHours = allTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const completionRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    const maxLevel = Math.max(...allTasks.map(t => t.level), 0);
    const selectedCount = selectedTasks.size;

    return {
      totalSubtasks,
      completedSubtasks,
      totalEstimatedHours,
      completionRate,
      maxLevel,
      selectedCount
    };
  }, [processedGanttData, flattenInteractiveTasks, selectedTasks]);

  // Render interactive Gantt bar with editing capabilities
  const renderInteractiveGanttBar = (task: InteractiveGanttTask, index: number) => {
    const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id) || task.level === 0;
    const isSelected = selectedTasks.has(task.id);
    
    const indentWidth = task.level * 20;
    
    const allTasks = flattenInteractiveTasks(processedGanttData, 10);
    const minDate = Math.min(...allTasks.map(t => t.startDate.getTime()));
    const maxDate = Math.max(...allTasks.map(t => t.endDate.getTime()));
    const totalDuration = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    const taskStartOffset = Math.ceil((task.startDate.getTime() - minDate) / (1000 * 60 * 60 * 24));
    const taskWidth = (task.duration / Math.max(totalDuration, 1)) * 100;
    const taskLeft = totalDuration > 0 ? (taskStartOffset / totalDuration) * 100 : 0;

    return (
      <div key={task.id} className="interactive-gantt-row" style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: '50px',
        borderBottom: '1px solid #eee',
        backgroundColor: isSelected ? '#e6f7ff' : (index % 2 === 0 ? '#f9f9f9' : 'white'),
        opacity: task.level > maxLevelFilter ? 0.5 : 1,
        border: isSelected ? '2px solid #1890ff' : 'none'
      }}>
        {/* Task name area with editing capabilities */}
        <div style={{
          width: '400px',
          padding: '10px',
          fontWeight: task.level === 0 ? 600 : 500,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: `${10 + indentWidth}px`
        }}>
          {/* Batch selection checkbox */}
          {batchEditMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
              style={{ marginRight: '8px' }}
            />
          )}

          {/* Level connection lines */}
          {task.level > 0 && (
            <>
              <div style={{
                position: 'absolute',
                left: `${10 + (task.level - 1) * 20 + 10}px`,
                top: '-25px',
                width: '1px',
                height: '50px',
                backgroundColor: '#d9d9d9',
                zIndex: 1
              }} />
              <div style={{
                position: 'absolute',
                left: `${10 + (task.level - 1) * 20 + 10}px`,
                width: '15px',
                height: '1px',
                backgroundColor: '#d9d9d9',
                top: '50%',
                zIndex: 1
              }} />
            </>
          )}
          
          {/* Expand/collapse button */}
          {hasChildren && (
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
              onClick={() => toggleTaskExpanded(task.id)}
              style={{
                width: '16px',
                height: '16px',
                padding: 0,
                fontSize: '10px',
                border: '1px solid #d9d9d9',
                borderRadius: '2px'
              }}
            />
          )}
          
          {/* Priority indicator */}
          <div style={{
            width: '4px',
            height: '30px',
            borderRadius: '2px',
            backgroundColor: priorityConfig.color,
            marginLeft: hasChildren ? '4px' : '20px'
          }} />
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              {statusConfig.icon}
              
              {/* Inline editable title */}
              <InlineEdit
                value={task.title}
                field="title"
                type="text"
                onSave={(value) => handleInlineEdit(task.id, 'title', value)}
                style={{ 
                  fontSize: task.level === 0 ? '14px' : '13px',
                  color: task.level > 2 ? '#666' : '#262626',
                  fontWeight: task.level === 0 ? 600 : 400,
                  flex: 1
                }}
              />
              
              {/* Level indicator */}
              <Text type="secondary" style={{ fontSize: '10px' }}>
                L{task.level}
              </Text>
            </div>
            
            <div style={{ fontSize: '11px', color: '#666', display: 'flex', gap: '8px' }}>
              {/* Inline editable priority */}
              <InlineEdit
                value={task.priority}
                field="priority"
                type="select"
                options={[
                  { label: '🔥 高', value: 'high' },
                  { label: '⚡ 中', value: 'medium' },
                  { label: '💡 低', value: 'low' }
                ]}
                onSave={(value) => handleInlineEdit(task.id, 'priority', value)}
              />
              
              <span>|</span>
              
              {/* Inline editable estimated hours */}
              <InlineEdit
                value={task.estimatedHours}
                field="estimatedHours"
                type="number"
                onSave={(value) => handleInlineEdit(task.id, 'estimatedHours', value)}
              />
              <span>h</span>
              
              {hasChildren && (
                <span style={{ marginLeft: '8px', color: '#1890ff' }}>
                  📁 {task.children?.length}项
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <Tooltip title="双击编辑或点击按钮">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleTaskDoubleClick(task)}
              style={{ opacity: 0.6 }}
            />
          </Tooltip>
        </div>

        {/* Interactive Gantt timeline area */}
        <div 
          style={{
            flex: 1,
            position: 'relative',
            height: '40px',
            margin: '5px',
            minWidth: '600px'
          }}
          onDoubleClick={() => handleTaskDoubleClick(task)}
        >
          <div
            style={{
              position: 'absolute',
              left: `${Math.max(0, taskLeft)}%`,
              width: `${Math.min(taskWidth, 100 - taskLeft)}%`,
              height: task.level === 0 ? '32px' : '26px',
              background: statusConfig.gradient,
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white',
              fontSize: '12px',
              boxShadow: task.level === 0 ? '0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: task.level === 0 ? '3px solid #fff' : `2px solid ${priorityConfig.color}`,
              zIndex: 10 - task.level
            }}
            title={`${task.title} | 开始: ${dayjs(task.startDate).format('MM/DD')} | 结束: ${dayjs(task.endDate).format('MM/DD')} | 工时: ${task.estimatedHours}h | 双击编辑`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = task.level === 0 ? '0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)';
            }}
            onDoubleClick={() => handleTaskDoubleClick(task)}
          >
            {task.estimatedHours}h
          </div>
        </div>

        {/* Time information with inline editing */}
        <div style={{
          width: '120px',
          padding: '10px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          <InlineEdit
            value={task.due_date}
            field="due_date"
            type="date"
            onSave={(value) => handleInlineEdit(task.id, 'due_date', value)}
            style={{ fontSize: '12px' }}
          />
          <div style={{ color: '#666' }}>{task.duration}天</div>
        </div>
      </div>
    );
  };

  // Render control panel with batch edit features
  const renderControlPanel = () => (
    <div style={{
      marginBottom: '20px',
      padding: '16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e6f7ff'
    }}>
      <Row gutter={16} align="middle">
        <Col span={6}>
          <Space>
            <BranchesOutlined />
            <Text strong>交互控制</Text>
          </Space>
        </Col>
        
        <Col span={8}>
          <Space align="center">
            <Text>显示层级：</Text>
            <Slider
              min={0}
              max={stats.maxLevel}
              value={maxLevelFilter}
              onChange={setMaxLevelFilter}
              marks={{
                0: 'L0',
                [Math.ceil(stats.maxLevel/2)]: `L${Math.ceil(stats.maxLevel/2)}`,
                [stats.maxLevel]: `L${stats.maxLevel}`
              }}
              style={{ width: 120 }}
              tooltip={{ formatter: (value) => `显示到L${value}层级` }}
            />
            <Text type="secondary">L{maxLevelFilter}</Text>
          </Space>
        </Col>
        
        <Col span={6}>
          <Space>
            <Switch
              checked={batchEditMode}
              onChange={setBatchEditMode}
              checkedChildren="批量编辑"
              unCheckedChildren="单个编辑"
            />
            
            {batchEditMode && stats.selectedCount > 0 && (
              <Popover
                content={
                  <Space direction="vertical">
                    <Button
                      block
                      onClick={() => handleBatchEdit('status', 'in_progress')}
                    >
                      批量设为进行中
                    </Button>
                    <Button
                      block
                      onClick={() => handleBatchEdit('status', 'completed')}
                    >
                      批量设为已完成
                    </Button>
                    <Button
                      block
                      onClick={() => handleBatchEdit('priority', 'high')}
                    >
                      批量设为高优先级
                    </Button>
                  </Space>
                }
                title="批量操作"
                trigger="click"
              >
                <Button type="primary" size="small">
                  批量操作 ({stats.selectedCount})
                </Button>
              </Popover>
            )}
          </Space>
        </Col>
        
        <Col span={4}>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary">
              显示 {visibleTasks.length}/{stats.totalSubtasks} 项任务
              {stats.selectedCount > 0 && ` | 已选 ${stats.selectedCount} 项`}
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );

  useEffect(() => {
    loadSubtasks();
  }, [parentTask.id, projectId]);

  useEffect(() => {
    setInteractiveTasks(processedGanttData);
  }, [processedGanttData]);

  if (loading) {
    return (
      <Card style={style}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>正在生成交互式甘特图...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (subtasks.length === 0) {
    return (
      <Card 
        title={
          <Space>
            <EditOutlined />
            <span>🎯 交互式甘特图</span>
          </Space>
        }
        style={style}
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '8px'
        }}>
          <EditOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Title level={4} style={{ color: '#8c8c8c' }}>暂无子任务数据</Title>
          <Text type="secondary">创建子任务后，这里将显示交互式甘特图</Text>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title={
          <Space>
            <EditOutlined />
            <span>🎯 交互式甘特图：{parentTask.title}</span>
            <Badge count={stats.maxLevel + 1} title="层级深度" />
            {batchEditMode && <Badge count={stats.selectedCount} color="blue" title="已选择" />}
          </Space>
        }
        extra={
          <Space>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadSubtasks}>
              刷新
            </Button>
            <Tooltip title={isGanttFullscreen ? '退出全屏' : '全屏查看'}>
              <Button 
                size="small" 
                icon={isGanttFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
                onClick={() => setIsGanttFullscreen(!isGanttFullscreen)}
              >
                {isGanttFullscreen ? '退出全屏' : '全屏'}
              </Button>
            </Tooltip>
          </Space>
        }
        style={{
          ...style,
          ...(isGanttFullscreen ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            margin: 0,
            borderRadius: 0,
            height: '100vh',
            overflow: 'auto'
          } : {})
        }}
      >
        {/* Statistics */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '20px',
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3498db' }}>
              {stats.totalSubtasks}
            </div>
            <div style={{ color: '#7f8c8d', marginTop: '5px' }}>总任务数</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#27ae60' }}>
              {stats.completedSubtasks}
            </div>
            <div style={{ color: '#7f8c8d', marginTop: '5px' }}>已完成</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#f39c12' }}>
              {stats.totalEstimatedHours.toFixed(1)}h
            </div>
            <div style={{ color: '#7f8c8d', marginTop: '5px' }}>预估总工时</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#e74c3c' }}>
              {stats.completionRate}%
            </div>
            <div style={{ color: '#7f8c8d', marginTop: '5px' }}>完成进度</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#9b59b6' }}>
              L{stats.maxLevel}
            </div>
            <div style={{ color: '#7f8c8d', marginTop: '5px' }}>最大层级</div>
          </div>
        </div>

        {/* Interactive control panel */}
        {renderControlPanel()}

        {/* Gantt chart container */}
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          background: 'white',
          overflow: 'auto'
        }}>
          {/* Header */}
          <div style={{
            background: '#34495e',
            color: 'white',
            padding: '15px',
            fontWeight: 'bold',
            display: 'flex'
          }}>
            <div style={{ width: '400px' }}>
              📋 任务层级结构 
              {batchEditMode && <span style={{ marginLeft: '8px', fontSize: '12px' }}>（批量编辑模式）</span>}
            </div>
            <div style={{ flex: 1, minWidth: '600px' }}>⏰ 交互式时间线</div>
            <div style={{ width: '120px', textAlign: 'center' }}>📅 截止日期</div>
          </div>

          {/* Task rows */}
          {visibleTasks.map((task, index) => renderInteractiveGanttBar(task, index))}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          marginTop: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditOutlined style={{ color: '#1890ff' }} />
            <span>🎯 交互式甘特图</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡 点击字段直接编辑 | 双击任务打开编辑弹窗</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔥 高优先级 | ⚡ 中优先级 | 💡 低优先级</span>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          color: '#7f8c8d',
          fontSize: '14px'
        }}>
          🎯 交互式任务编辑甘特图 | 支持内联编辑、批量操作、拖拽调整 | 子任务2功能增强
        </div>
      </Card>

      {/* Task Edit Modal */}
      <TaskEditModal
        visible={editModalVisible}
        task={editingTask}
        onClose={() => {
          setEditModalVisible(false);
          setEditingTask(null);
        }}
        onSave={handleTaskSave}
      />
    </>
  );
};

export default InteractiveGanttChart;