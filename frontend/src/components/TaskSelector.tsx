import React, { useState, useEffect } from 'react';
import { Select, Spin } from 'antd';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';

const { Option } = Select;

interface TaskSelectorProps {
  projectId?: number;
  value?: number;
  onChange?: (taskId: number | undefined, task?: Task) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
  disabled?: boolean;
  filterTaskIds?: number[]; // 需要过滤掉的任务ID列表
}

const TaskSelector: React.FC<TaskSelectorProps> = ({
  projectId,
  value,
  onChange,
  placeholder = "选择任务",
  style,
  allowClear = true,
  disabled = false,
  filterTaskIds = []
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = async () => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    setLoading(true);
    try {
      const response = await TaskService.getTasks(projectId, { 
        page: 1, 
        page_size: 100 
      });
      
      // 过滤掉指定的任务ID
      const availableTasks = response.data.filter(task => 
        !filterTaskIds.includes(task.id)
      );
      
      setTasks(availableTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId, filterTaskIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (selectedTaskId: number | undefined) => {
    const selectedTask = tasks.find(task => task.id === selectedTaskId);
    onChange?.(selectedTaskId, selectedTask);
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

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={style}
      allowClear={allowClear}
      disabled={disabled || !projectId}
      loading={loading}
      showSearch
      filterOption={(input, option) => {
        const task = tasks.find(t => t.id === option?.value);
        return task?.title?.toLowerCase().includes(input.toLowerCase()) || false;
      }}
      notFoundContent={
        loading ? <Spin size="small" /> : 
        !projectId ? "请先选择项目" : 
        "暂无任务"
      }
    >
      {tasks.map(renderTaskOption)}
    </Select>
  );
};

export default TaskSelector;