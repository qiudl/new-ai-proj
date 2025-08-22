import React, { useMemo } from 'react';
import { Select, Input } from 'antd';
import type { TaskListFilters } from '../hooks/useUrlState';

export interface TasksFilterBarProps {
  value: TaskListFilters;
  onChange: (next: TaskListFilters) => void;
  compact?: boolean;
}

const statusOptions = [
  { value: undefined, label: '全部状态' },
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'planning', label: '规划中' },
  { value: 'on_hold', label: '搁置' },
  { value: 'blocked', label: '阻塞' },
  { value: 'cancelled', label: '已取消' },
];

const priorityOptions = [
  { value: undefined, label: '全部优先级' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export const TasksFilterBar: React.FC<TasksFilterBarProps> = ({ value, onChange, compact = false }) => {
  const merged = useMemo(() => value || {}, [value]);

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: compact ? 'nowrap' : 'wrap',
        overflowX: compact ? 'auto' : 'visible'
      }}
    >
      <Select
        allowClear
        placeholder="状态"
        value={merged.status}
        style={{ minWidth: 140 }}
        onChange={(v) => onChange({ ...merged, status: (v as any) || undefined })}
        options={statusOptions}
      />
      <Select
        allowClear
        placeholder="优先级"
        value={merged.priority}
        style={{ minWidth: 120 }}
        onChange={(v) => onChange({ ...merged, priority: (v as any) || undefined })}
        options={priorityOptions}
      />
      <Input
        allowClear
        placeholder="任务ID"
        value={merged.task_id?.toString()}
        onChange={(e) => {
          const v = e.target.value.trim();
          const n = v === '' ? undefined : Number(v);
          onChange({ ...merged, task_id: Number.isFinite(n) ? (n as number) : undefined });
        }}
        style={{ width: 120 }}
        inputMode="numeric"
        pattern="[0-9]*"
      />
      <Input
        allowClear
        placeholder="搜索关键词"
        value={merged.q}
        onChange={(e) => onChange({ ...merged, q: e.target.value || undefined })}
        style={{ minWidth: 220 }}
      />
    </div>
  );
};

export default TasksFilterBar;
