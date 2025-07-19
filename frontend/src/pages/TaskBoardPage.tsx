import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Tag, Avatar, Typography, Spin, message, Button } from 'antd';
import { useParams } from 'react-router-dom';
import { getUserName } from '../services/api';

const { Title, Text } = Typography;

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee_id?: string;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
}

const TaskBoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const tasksWithNames = await Promise.all(
          data.map(async (task: Task) => {
            if (task.assignee_id) {
              try {
                const assigneeName = await getUserName(task.assignee_id);
                return { ...task, assignee_name: assigneeName };
              } catch (error) {
                return task;
              }
            }
            return task;
          })
        );
        setTasks(tasksWithNames);
      }
    } catch (error) {
      message.error('获取任务失败');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
        message.success('任务状态更新成功');
      } else {
        message.error('更新任务状态失败');
      }
    } catch (error) {
      message.error('更新任务状态失败');
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  const columns = [
    { id: 'pending', title: '待处理', status: 'pending' as const },
    { id: 'in_progress', title: '进行中', status: 'in_progress' as const },
    { id: 'completed', title: '已完成', status: 'completed' as const },
  ];

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 100 }} />;
  }

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <Card
      size="small"
      style={{ marginBottom: '8px', cursor: 'pointer' }}
      bodyStyle={{ padding: '12px' }}
    >
      <div>
        <Text strong>{task.title}</Text>
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {task.description}
          </Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Tag color={getPriorityColor(task.priority)}>
            {getPriorityText(task.priority)}
          </Tag>
          {task.assignee_name && (
            <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
              {task.assignee_name.charAt(0)}
            </Avatar>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {task.status !== 'pending' && (
            <Button 
              size="small" 
              onClick={() => updateTaskStatus(task.id, 'pending')}
            >
              → 待处理
            </Button>
          )}
          {task.status !== 'in_progress' && (
            <Button 
              size="small" 
              onClick={() => updateTaskStatus(task.id, 'in_progress')}
            >
              → 进行中
            </Button>
          )}
          {task.status !== 'completed' && (
            <Button 
              size="small" 
              onClick={() => updateTaskStatus(task.id, 'completed')}
            >
              → 已完成
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>任务看板</Title>
      
      <Row gutter={16}>
        {columns.map(column => (
          <Col span={8} key={column.id}>
            <Card 
              title={`${column.title} (${getTasksByStatus(column.status).length})`}
              style={{ minHeight: '600px' }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ minHeight: '500px' }}>
                {getTasksByStatus(column.status).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default TaskBoardPage;