import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, message } from 'antd';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';
import SmartSwimlanes from '../components/SmartSwimlanes';

import { track } from '../utils/analytics';

const SmartSwimlanesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const projectIdNum = parseInt(projectId || '0');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!projectIdNum) return;
      setLoading(true);
      try {
        const res = await TaskService.getTasks(projectIdNum, { page: 1, page_size: 100, sort_by: 'updated_at', sort_order: 'desc' });
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

  const handleShare = () => {
    try {
      const url = window.location.href;
      navigator.clipboard?.writeText(url);
      message.success('已复制当前视图链接');
      track('share_view', { page: 'swimlanes', projectId: projectIdNum || undefined });
    } catch (e) {
      message.warning('无法复制到剪贴板');
    }
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>智能泳道（MVP）</span>
          <Button onClick={handleShare}>复制分享链接</Button>
        </div>
      }
      loading={loading}
    >
      <SmartSwimlanes tasks={tasks} />
    </Card>
  );
};

export default SmartSwimlanesPage;
