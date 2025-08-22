import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, Calendar, message, Tooltip } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';

import { track } from '../utils/analytics';

const TaskCalendarPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const projectIdNum = parseInt(projectId || '0');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!projectIdNum) return;
      setLoading(true);
      try {
        const res = await TaskService.getTasks(projectIdNum, {
          page: 1, page_size: 500, sort_by: 'due_date', sort_order: 'asc'
        });
        const list = Array.isArray((res as any).data) ? (res as any).data : [];
        setTasks(list);
      } catch (e: any) {
        message.error(e?.message || '加载任务失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectIdNum]);

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    (tasks || []).forEach(t => {
      const d = t.due_date ? dayjs(t.due_date).format('YYYY-MM-DD') : '';
      if (!d) return;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return map;
  }, [tasks]);

  const dateCellRender = (value: Dayjs) => {
    const key = value.format('YYYY-MM-DD');
    const list = byDate.get(key) || [];
    if (!list.length) return null;
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {list.slice(0, 4).map(t => (
          <li key={t.id} style={{ marginBottom: 4 }}>
            <Tooltip title={`${t.title}${t.assignee_name ? ` · ${t.assignee_name}` : ''}`}>
              <Badge status={t.status === 'completed' ? 'success' : (t.status === 'in_progress' ? 'processing' : 'default')} text={t.title} />
            </Tooltip>
          </li>
        ))}
        {list.length > 4 && <li style={{ color: '#8c8c8c' }}>+{list.length - 4} 更多</li>}
      </ul>
    );
  };

  const handleShare = () => {
    try {
      const url = window.location.href;
      navigator.clipboard?.writeText(url);
      message.success('已复制当前视图链接');
      track('share_view', { page: 'task_calendar', projectId: projectIdNum || undefined });
    } catch (e) {
      message.warning('无法复制到剪贴板');
    }
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>任务日历（MVP）</span>
          <Button onClick={handleShare}>复制分享链接</Button>
        </div>
      }
      loading={loading}
    >
      <Calendar dateCellRender={dateCellRender} />
    </Card>
  );
};

export default TaskCalendarPage;
