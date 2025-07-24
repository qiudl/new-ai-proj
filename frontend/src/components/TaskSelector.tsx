import React, { useState, useEffect } from 'react';
import { Select, Spin, Tag, Typography } from 'antd';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';
import TimerService from '../services/timerService';
import { TaskOption } from '../types/timer';

const { Option } = Select;
const { Text } = Typography;

interface TaskSelectorProps {
  projectId?: number;
  value?: number;
  onChange?: (taskId: number | undefined, task?: Task | TaskOption) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
  disabled?: boolean;
  filterTaskIds?: number[]; // 需要过滤掉的任务ID列表
  // Timer mode props
  timerMode?: boolean; // 是否为计时器模式
  showProjectNames?: boolean; // 是否显示项目名称
}

const TaskSelector: React.FC<TaskSelectorProps> = ({
  projectId,
  value,
  onChange,
  placeholder = "选择任务",
  style,
  allowClear = true,
  disabled = false,
  filterTaskIds = [],
  timerMode = false,
  showProjectNames = false
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timerTasks, setTimerTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      if (timerMode) {
        // 计时器模式：加载所有可计时的任务
        const availableTasks = await TimerService.getAvailableTasks();
        setTimerTasks(availableTasks.filter(task => !filterTaskIds.includes(task.id)));
      } else {
        // 普通模式：按项目加载任务
        if (!projectId) {
          setTasks([]);
          return;
        }

        const response = await TaskService.getTasks(projectId, { 
          page: 1, 
          page_size: 100 
        });
        
        // 过滤掉指定的任务ID
        const availableTasks = response.data.filter(task => 
          !filterTaskIds.includes(task.id)
        );
        
        setTasks(availableTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      if (timerMode) {
        setTimerTasks([]);
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId, filterTaskIds, timerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (selectedTaskId: number | undefined) => {
    if (timerMode) {
      const selectedTask = timerTasks.find(task => task.id === selectedTaskId);
      onChange?.(selectedTaskId, selectedTask);
    } else {
      const selectedTask = tasks.find(task => task.id === selectedTaskId);
      onChange?.(selectedTaskId, selectedTask);
    }
  };

  // Get status tag for timer mode
  const getStatusTag = (status: string) => {
    const statusMap = {
      'todo': { text: '待办', color: 'blue' },
      'in_progress': { text: '进行中', color: 'orange' },
      'completed': { text: '已完成', color: 'green' },
      'cancelled': { text: '已取消', color: 'red' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default' };
    return <Tag color={statusInfo.color} style={{ fontSize: '12px' }}>{statusInfo.text}</Tag>;
  };

  const renderTaskOption = (task: Task) => {
    const hasChildren = (task.custom_fields?.children_count || 0) > 0;
    const isSubTask = !!task.parent_id;
    
    return (
      <Option key={task.id} value={task.id}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasChildren && <span style={{ color: '#52c41a' }}>📁</span>}
          {isSubTask && <span style={{ color: '#1890ff' }}>└─</span>}
          <span>{task.title}</span>
          {task.status === 'completed' && (
            <span style={{ color: '#52c41a', fontSize: '12px' }}>✓</span>
          )}
          {task.status === 'in_progress' && (
            <span style={{ color: '#fa8c16', fontSize: '12px' }}>⏳</span>
          )}
        </div>
      </Option>
    );
  };

  const renderTimerTaskOption = (task: TaskOption) => {
    return (
      <Option key={task.id} value={task.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{task.title}</div>
            {showProjectNames && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {task.project_name}
              </Text>
            )}
          </div>
          <div>
            {getStatusTag(task.status)}
          </div>
        </div>
      </Option>
    );
  };

  const currentTasks = timerMode ? timerTasks : tasks;
  const canSearch = timerMode || !!projectId;

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={style}
      allowClear={allowClear}
      disabled={disabled || (!canSearch && !timerMode)}
      loading={loading}
      showSearch
      filterOption={(input, option) => {
        if (timerMode) {
          const task = timerTasks.find(t => t.id === option?.value);
          const searchText = input.toLowerCase();
          return (
            task?.title?.toLowerCase().includes(searchText) ||
            task?.project_name?.toLowerCase().includes(searchText)
          ) || false;
        } else {
          const task = tasks.find(t => t.id === option?.value);
          return task?.title?.toLowerCase().includes(input.toLowerCase()) || false;
        }
      }}
      notFoundContent={
        loading ? <Spin size="small" /> : 
        (!projectId && !timerMode) ? "请先选择项目" : 
        "暂无任务"
      }
    >
      {timerMode ? timerTasks.map(renderTimerTaskOption) : tasks.map(renderTaskOption)}
    </Select>
  );
};

export default TaskSelector;