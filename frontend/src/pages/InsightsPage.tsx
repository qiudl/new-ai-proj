import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Card, message } from 'antd';
import dayjs from 'dayjs';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';
import InsightsCards from '../components/InsightsCards';
import { track } from '../utils/analytics';

const InsightsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const projectIdNum = projectId ? parseInt(projectId, 10) : undefined;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (projectIdNum) {
          const res = await TaskService.getTasks(projectIdNum, { page: 1, page_size: 500, sort_by: 'updated_at', sort_order: 'desc' });
          setTasks((res as any).data || []);
        } else {
          const res = await TaskService.getAllTasks({ page: 1, page_size: 500, sort_by: 'updated_at', sort_order: 'desc' } as any);
          setTasks((res as any).data || []);
        }
        track('insights_view', { scope: projectIdNum ? 'project' : 'global', path: location.pathname });
      } catch (e: any) {
        message.error(e?.message || '加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectIdNum, location.pathname]);

  const stats = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const total = list.length;
    let completed = 0, in_progress = 0, todo = 0, overdue = 0, high = 0, medium = 0, low = 0;
    const now = dayjs();
    list.forEach(t => {
      if (t.status === 'completed') completed++; else if (t.status === 'in_progress') in_progress++; else if (t.status === 'todo') todo++;
      if (t.due_date && t.status !== 'completed' && dayjs(t.due_date).isBefore(now, 'day')) overdue++;
      const p = (t.priority || (t as any).custom_fields?.priority) as any;
      if (p === 'high') high++; else if (p === 'medium') medium++; else if (p === 'low') low++;
    });
    return { total, completed, in_progress, todo, overdue, high, medium, low };
  }, [tasks]);

  return (
    <Card title={projectIdNum ? `项目洞察（MVP）#${projectIdNum}` : '全局洞察（MVP）'} loading={loading}>
      <InsightsCards stats={stats} />
    </Card>
  );
};

export default InsightsPage;
