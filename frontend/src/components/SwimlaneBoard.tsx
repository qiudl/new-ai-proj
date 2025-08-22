import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Tag, Typography, Input, Space, Badge, Empty, Spin, message, Button, Tooltip } from 'antd';
import { CheckCircleOutlined, PlayCircleOutlined, PauseCircleOutlined, StopOutlined, UserOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';
import dayjs from 'dayjs';
import '../styles/SwimlaneBoard.css';

const { Title, Text } = Typography;

type GroupBy = 'status' | 'assignee';

interface SwimlaneBoardProps {
  projectId?: number;
  tasks?: Task[]; // 可选：外部传入任务列表
  loading?: boolean;
  initialGroupBy?: GroupBy;
  onUpdated?: (taskId?: number) => void; // 任务成功更新后的回调
}

interface Lane<T = string | number> {
  key: T;
  title: string;
  color?: string;
  bgColor?: string;
  icon?: React.ReactNode;
}

const statusConfigMap: Record<string, { color: string; text: string; icon: React.ReactNode; bgColor: string }> = {
  draft: { color: '#bfbfbf', text: '草稿', icon: <PauseCircleOutlined />, bgColor: '#fafafa' },
  planning: { color: '#722ed1', text: '规划中', icon: <PlayCircleOutlined />, bgColor: '#f9f0ff' },
  todo: { color: '#d9d9d9', text: '待开始', icon: <PauseCircleOutlined />, bgColor: '#fafafa' },
  in_progress: { color: '#1890ff', text: '进行中', icon: <PlayCircleOutlined />, bgColor: '#e6f7ff' },
  testing: { color: '#2f54eb', text: '测试中', icon: <PlayCircleOutlined />, bgColor: '#f0f5ff' },
  completed: { color: '#52c41a', text: '已完成', icon: <CheckCircleOutlined />, bgColor: '#f6ffed' },
  on_hold: { color: '#faad14', text: '搁置', icon: <PauseCircleOutlined />, bgColor: '#fff7e6' },
  blocked: { color: '#ff4d4f', text: '阻塞', icon: <StopOutlined />, bgColor: '#fff2f0' },
  cancelled: { color: '#ff7875', text: '已取消', icon: <StopOutlined />, bgColor: '#fff2f0' },
  suspended: { color: '#595959', text: '已挂起', icon: <PauseCircleOutlined />, bgColor: '#f5f5f5' },
  archived: { color: '#8c8c8c', text: '已归档', icon: <StopOutlined />, bgColor: '#f5f5f5' },
};

function getStatusAppearance(statusKey: string) {
  const cfg = statusConfigMap[statusKey];
  if (cfg) return cfg;
  return { color: '#d9d9d9', text: statusKey, icon: <PauseCircleOutlined />, bgColor: '#fafafa' };
}

const STATUS_LANES: Lane<string>[] = [
  { key: 'todo', title: statusConfigMap.todo.text, color: statusConfigMap.todo.color, bgColor: statusConfigMap.todo.bgColor, icon: statusConfigMap.todo.icon },
  { key: 'in_progress', title: statusConfigMap.in_progress.text, color: statusConfigMap.in_progress.color, bgColor: statusConfigMap.in_progress.bgColor, icon: statusConfigMap.in_progress.icon },
  { key: 'completed', title: statusConfigMap.completed.text, color: statusConfigMap.completed.color, bgColor: statusConfigMap.completed.bgColor, icon: statusConfigMap.completed.icon },
  { key: 'cancelled', title: statusConfigMap.cancelled.text, color: statusConfigMap.cancelled.color, bgColor: statusConfigMap.cancelled.bgColor, icon: statusConfigMap.cancelled.icon },
];

function formatAssigneeLabel(task: Task): string {
  const anyTask = task as any;
  return anyTask.assignee_name || (task.assignee_id ? `用户 ${task.assignee_id}` : '未指派');
}

const SwimlaneBoard: React.FC<SwimlaneBoardProps> = ({ projectId, tasks = [], loading = false, initialGroupBy = 'status', onUpdated }) => {
  const [groupBy] = useState<GroupBy>('status'); // 固定为按状态分组
  const [query, setQuery] = useState('');
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<number>>(new Set());
  const [fetching, setFetching] = useState<boolean>(false);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localTasks;
    return localTasks.filter((t) => `${t.title} ${t.description || ''}`.toLowerCase().includes(q));
  }, [localTasks, query]);

  const assigneeLanes = useMemo((): Lane<string | number>[] => {
    const map = new Map<string | number, string>();
    map.set('unassigned', '未指派');
    filteredTasks.forEach((t) => {
      if (t.assignee_id) {
        const name = (t as any).assignee_name || `用户 ${t.assignee_id}`;
        map.set(t.assignee_id, name);
      }
    });
    // 未指派在最前，其余按名称排序
    const lanes: Lane<string | number>[] = [
      { key: 'unassigned', title: '未指派', color: '#d9d9d9', bgColor: '#fafafa', icon: <UserOutlined /> },
      ...Array.from(map.entries())
        .filter(([k]) => k !== 'unassigned')
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'zh-CN'))
        .map(([key, title]) => ({ key, title, color: '#1890ff', bgColor: '#e6f7ff', icon: <UserOutlined /> })),
    ];
    return lanes;
  }, [filteredTasks]);

  const lanes = useMemo((): Lane<string | number>[] => {
    // 仅按状态分组（暂不支持负责人分组）。
    // 为避免遗漏，自动补齐当前数据集中出现但不在默认列表中的状态。
    const base = [...STATUS_LANES];
    const known = new Set(base.map((l) => l.key));
    const extraKeys = Array.from(new Set(filteredTasks.map((t) => String(t.status)))).filter((k) => !known.has(k));
    const extras: Lane<string>[] = extraKeys.map((k) => {
      const ap = getStatusAppearance(k);
      return { key: k, title: ap.text, color: ap.color, bgColor: ap.bgColor, icon: ap.icon };
    });
    return [...base, ...extras];
  }, [filteredTasks]);

  const tasksByLane = useMemo(() => {
    const map = new Map<string | number, Task[]>();
    lanes.forEach((l) => map.set(l.key, []));
    filteredTasks.forEach((t) => {
      if (groupBy === 'status') {
        const key = (t.status as string) || 'todo';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      } else {
        const key = t.assignee_id ?? 'unassigned';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    });
    return map;
  }, [filteredTasks, lanes, groupBy]);

  const onDragStart = useCallback((ev: React.DragEvent, task: Task) => {
    ev.dataTransfer.setData('text/task-id', String(task.id));
    ev.dataTransfer.setData('text/group-by', groupBy);
  }, [groupBy]);

  const onDragOverLane = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
  }, []);

  const optimisticUpdate = useCallback((taskId: number, patch: Partial<Task>) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }, []);

  const handleDropToLane = useCallback(async (laneKey: string | number, ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const dataTaskId = ev.dataTransfer.getData('text/task-id');
    const taskId = Number(dataTaskId);
    if (!taskId || !projectId) return;

    const task = localTasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      setUpdatingTaskIds((s) => new Set(s).add(taskId));
      if (groupBy === 'status') {
        const newStatus = String(laneKey);
        if (task.status === newStatus) return; // 无变更
        optimisticUpdate(taskId, { status: newStatus as any });
        await TaskService.updateTask(projectId, taskId, { status: newStatus as unknown });
        message.success('状态已更新');
      } else {
        // assignee 分组
        const newAssigneeId = laneKey === 'unassigned' ? null : Number(laneKey);
        if ((task.assignee_id || null) === (newAssigneeId || null)) return;
        optimisticUpdate(taskId, { assignee_id: newAssigneeId as any });
        await TaskService.updateTask(projectId, taskId, { assignee_id: newAssigneeId as unknown });
        message.success('负责人已更新');
      }
      onUpdated?.(taskId);
    } catch (err: any) {
      message.error(err?.message || '更新失败');
      // 回退：重新拉取或简单刷新
    } finally {
      setUpdatingTaskIds((s) => {
        const next = new Set(s);
        next.delete(taskId);
        return next;
      });
    }
  }, [groupBy, localTasks, optimisticUpdate, onUpdated, projectId]);

  const renderTaskCard = useCallback((t: Task) => {
    const statusCfg = getStatusAppearance(String(t.status));
    const anyTask = t as any;
    return (
      <div
        key={t.id}
        className={`sb-task-card ${updatingTaskIds.has(t.id) ? 'updating' : ''}`}
        draggable
        onDragStart={(ev) => onDragStart(ev, t)}
        title={`#${t.id} ${t.title}`}
      >
        <div className="sb-task-title">
          <span className="sb-id">#{t.id}</span>
          <span className="sb-title-text">{t.title}</span>
        </div>
        <div className="sb-task-meta">
          <Tag color={statusCfg.color} style={{ marginInlineStart: 0 }}>{statusCfg.text}</Tag>
          <span className="sb-assignee">
            <UserOutlined /> {anyTask.assignee_name || (t.assignee_id ? `用户 ${t.assignee_id}` : '未指派')}
          </span>
        </div>
        <div className="sb-task-dates">
          {t.due_date ? (
            <span className="sb-due" title={`截止：${dayjs(t.due_date).format('YYYY-MM-DD')}`}>
              截止 {dayjs(t.due_date).format('MM-DD')}
            </span>
          ) : (
            <span className="sb-due none">无截止</span>
          )}
          <span className="sb-updated" title={`更新：${dayjs(t.updated_at).format('YYYY-MM-DD HH:mm')}`}>
            更新 {dayjs(t.updated_at).fromNow?.() || dayjs(t.updated_at).format('MM-DD HH:mm')}
          </span>
        </div>
      </div>
    );
  }, [onDragStart, updatingTaskIds]);

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    if (!projectId) return;
    try {
      setFetching(true);
      const res = await TaskService.getTasks(projectId, { page: 1, page_size: 200, sort_by: 'updated_at', sort_order: 'desc' } as any);
      const data = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res as any) ? (res as any) : [];
      setLocalTasks(data as Task[]);
      message.success('已刷新');
    } catch (e: any) {
      message.error(e?.message || '刷新失败');
    } finally {
      setFetching(false);
    }
  }, [projectId]);

  return (
    <div className="swimlane-board-wrapper">
      <Card className="sb-toolbar" size="small">
        <Space wrap>
          <Badge color="#1890ff" text={<span>视图：按状态</span>} />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索任务标题/描述"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 260 }}
            size="small"
          />
          <Badge color="#d9d9d9" text={<span>任务数：{filteredTasks.length}</span>} />
          {projectId && (
            <Tooltip title="从服务器拉取最新任务">
<Button size="small" icon={<SyncOutlined />} loading={fetching} onClick={handleRefresh}>
                刷新
              </Button>
            </Tooltip>
          )}
        </Space>
      </Card>

      {loading || fetching ? (
        <div className="sb-loading"><Spin /></div>
      ) : (
        <div className="swimlane-board">
          {lanes.map((lane) => {
            const list = tasksByLane.get(lane.key) || [];
            return (
              <div key={String(lane.key)} className="sb-lane" onDragOver={onDragOverLane} onDrop={(ev) => handleDropToLane(lane.key, ev)}>
                <div className="sb-lane-header" style={{ borderBottomColor: lane.color }}>
                  <div className="sb-lane-title">
                    {lane.icon}
                    <span>{lane.title}</span>
                  </div>
                  <Badge count={list.length} style={{ backgroundColor: lane.color || '#999' }} />
                </div>
                <div className="sb-lane-body" style={{ background: lane.bgColor }}>
                  {list.length === 0 ? (
                    <div className="sb-empty">拖拽任务到此</div>
                  ) : (
                    list.map((t) => renderTaskCard(t))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SwimlaneBoard;
