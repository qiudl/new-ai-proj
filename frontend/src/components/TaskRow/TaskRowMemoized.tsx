/**
 * TaskRowMemoized - 优化的任务行组件
 *
 * 性能优化策略:
 * 1. 使用React.memo防止不必要的重渲染
 * 2. 将复杂的render逻辑提取为独立组件
 * 3. 优化事件处理器避免内联函数
 */

import React from 'react';
import { Select, DatePicker, Tag, Button, Tooltip, Checkbox } from 'antd';
import { EyeOutlined, ProjectOutlined } from '@ant-design/icons';
import { Task, TaskStatus } from '../../types/task';
import { ProjectUser } from '../../types/project';
import { formatTaskStatus } from '../../utils/formatters';
import { TASK_STATUS_OPTIONS } from '../../utils/bulkSubTaskConfig';
import dayjs from 'dayjs';

// 状态选择器组件 - memo化
export const TaskStatusSelect = React.memo<{
  taskId: number;
  status: TaskStatus;
  onStatusChange: (taskId: number, newStatus: string, task: Task) => void;
  task: Task;
}>(({ taskId, status, onStatusChange, task }) => {
  const handleChange = React.useCallback((newStatus: string) => {
    onStatusChange(taskId, newStatus, task);
  }, [taskId, onStatusChange, task]);

  return (
    <Select
      value={status}
      onChange={handleChange}
      style={{
        width: '100%',
        borderRadius: '4px',
        backgroundColor: '#fafafa'
      }}
      variant="borderless"
      suffixIcon={null}
    >
      {TASK_STATUS_OPTIONS.map(opt => (
        <Select.Option key={opt.value as string} value={opt.value as string}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>{opt.label}</span>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
});

TaskStatusSelect.displayName = 'TaskStatusSelect';

// 负责人选择器组件 - memo化
export const TaskAssigneeSelect = React.memo<{
  task: Task;
  projectUsers: ProjectUser[];
  loading: boolean;
  onAssigneeChange: (task: Task, assigneeId: number | null) => void;
  onLoadUsers: (projectId: number) => void;
}>(({ task, projectUsers, loading, onAssigneeChange, onLoadUsers }) => {
  const handleChange = React.useCallback((val: number | undefined) => {
    onAssigneeChange(task, val ?? null);
  }, [task, onAssigneeChange]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open) {
      onLoadUsers(task.project_id);
    }
  }, [task.project_id, onLoadUsers]);

  return (
    <Select
      value={task.assignee_id ?? undefined}
      placeholder="未分配"
      allowClear
      variant="borderless"
      style={{ width: '100%' }}
      loading={loading}
      onOpenChange={handleOpenChange}
      onChange={handleChange}
      options={projectUsers.map(u => ({ label: u.user_name, value: u.user_id }))}
    />
  );
});

TaskAssigneeSelect.displayName = 'TaskAssigneeSelect';

// 截止日期选择器组件 - memo化
export const TaskDueDatePicker = React.memo<{
  task: Task;
  date: string;
  onDueDateChange: (taskId: number, newDate: string | null, task: Task) => void;
}>(({ task, date, onDueDateChange }) => {
  const currentDate = date ? dayjs(date) : null;
  const now = dayjs();
  const isOverdue = currentDate && currentDate.isBefore(now, 'day');
  const isUpcoming = currentDate && currentDate.diff(now, 'day') <= 3 && currentDate.diff(now, 'day') >= 0;

  let bgColor = '#fafafa';
  let textColor = '#8c8c8c';
  let icon = '📅';

  if (isOverdue) {
    bgColor = '#fff2f0';
    textColor = '#ff4d4f';
    icon = '⚠️';
  } else if (isUpcoming) {
    bgColor = '#fff7e6';
    textColor = '#fa8c16';
    icon = '⏰';
  }

  const handleChange = React.useCallback((newDate: dayjs.Dayjs | null) => {
    const dateString = newDate ? newDate.format('YYYY-MM-DD') : null;
    onDueDateChange(task.id, dateString, task);
  }, [task, onDueDateChange]);

  return (
    <DatePicker
      value={currentDate}
      onChange={handleChange}
      style={{
        width: '100%',
        backgroundColor: bgColor,
        borderRadius: '4px',
        color: textColor,
        fontWeight: 500
      }}
      variant="borderless"
      placeholder="设置截止日期"
      format="YYYY-MM-DD"
      allowClear
      suffixIcon={<span style={{ fontSize: '12px' }}>{icon}</span>}
    />
  );
});

TaskDueDatePicker.displayName = 'TaskDueDatePicker';

// 优先级选择器组件 - memo化
export const TaskPrioritySelect = React.memo<{
  task: Task;
  priority: 'low' | 'medium' | 'high';
  onPriorityChange: (task: Task, newPriority: 'low' | 'medium' | 'high') => void;
}>(({ task, priority, onPriorityChange }) => {
  const handleChange = React.useCallback((val: 'low' | 'medium' | 'high') => {
    onPriorityChange(task, val);
  }, [task, onPriorityChange]);

  return (
    <Select
      value={priority}
      variant="borderless"
      style={{ width: '100%' }}
      onChange={handleChange}
      options={[
        { label: '高', value: 'high' },
        { label: '中', value: 'medium' },
        { label: '低', value: 'low' },
      ]}
    />
  );
});

TaskPrioritySelect.displayName = 'TaskPrioritySelect';

// 标签组件 - memo化
export const TaskTags = React.memo<{
  tags: string[];
}>(({ tags }) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return <span style={{ color: '#8c8c8c', fontSize: '12px' }}>无标签</span>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
      {tags.slice(0, 2).map((tag: string) => (
        <Tag
          key={tag}
          style={{
            marginBottom: 2,
            fontSize: '11px',
            padding: '0 6px',
            lineHeight: '18px',
            borderRadius: '9px'
          }}
          color="blue"
        >
          {tag}
        </Tag>
      ))}
      {tags.length > 2 && (
        <Tag style={{
          fontSize: '11px',
          padding: '0 6px',
          lineHeight: '18px',
          borderRadius: '9px'
        }}>
          +{tags.length - 2}
        </Tag>
      )}
    </div>
  );
});

TaskTags.displayName = 'TaskTags';

// 项目名称链接组件 - memo化
export const TaskProjectLink = React.memo<{
  projectId: number;
  projectName: string;
  onNavigate: (projectId: number) => void;
}>(({ projectId, projectName, onNavigate }) => {
  const handleClick = React.useCallback(() => {
    onNavigate(projectId);
  }, [projectId, onNavigate]);

  return (
    <Button
      type="link"
      size="small"
      style={{
        padding: 0,
        height: 'auto',
        fontSize: '13px',
        color: '#1890ff'
      }}
      onClick={handleClick}
      title={`查看项目: ${projectName}`}
    >
      <ProjectOutlined style={{ marginRight: 4, fontSize: '12px' }} />
      {projectName}
    </Button>
  );
});

TaskProjectLink.displayName = 'TaskProjectLink';

// 行选择框组件 - memo化
export const TaskRowCheckbox = React.memo<{
  taskId: number;
  checked: boolean;
  onChange: (taskId: number, checked: boolean) => void;
}>(({ taskId, checked, onChange }) => {
  const handleChange = React.useCallback((e: any) => {
    onChange(taskId, e.target.checked);
  }, [taskId, onChange]);

  return (
    <Checkbox
      checked={checked}
      onChange={handleChange}
    />
  );
});

TaskRowCheckbox.displayName = 'TaskRowCheckbox';

// 操作按钮组件 - memo化
export const TaskRowActions = React.memo<{
  task: Task;
  onView: (task: Task) => void;
}>(({ task, onView }) => {
  const handleView = React.useCallback(() => {
    onView(task);
  }, [task, onView]);

  return (
    <Button
      type="text"
      icon={<EyeOutlined />}
      onClick={handleView}
      title="查看详情"
    />
  );
});

TaskRowActions.displayName = 'TaskRowActions';
