import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Tag, Avatar, Typography, Spin, message, Button, Select } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserName } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface Project {
  id: string;
  name: string;
}

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
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(routeProjectId);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (!routeProjectId) {
      // 如果没有项目ID，先获取项目列表
      fetchProjects();
    } else {
      // 如果有项目ID，直接获取任务
      setSelectedProjectId(routeProjectId);
      fetchTasks();
    }
  }, [routeProjectId]);

  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== routeProjectId) {
      fetchTasks();
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const response = await fetch('/api/projects?page=1&page_size=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const apiResponse = await response.json();
        console.log('Projects API response:', apiResponse); // 调试日志
        
        // 检查响应结构并提取项目数组
        let projectsArray = [];
        if (apiResponse.success && apiResponse.data) {
          if (Array.isArray(apiResponse.data)) {
            // 直接是数组
            projectsArray = apiResponse.data;
          } else if (apiResponse.data.data && Array.isArray(apiResponse.data.data)) {
            // 分页响应格式
            projectsArray = apiResponse.data.data;
          }
        }
        
        setProjects(projectsArray);
        
        // 如果有项目，默认选择第一个
        if (projectsArray.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectsArray[0].id);
        }
      } else {
        console.error('Failed to fetch projects:', response.status, response.statusText);
        message.error('获取项目列表失败');
        setProjects([]); // 设置为空数组
      }
    } catch (error) {
      console.error('获取项目列表错误:', error);
      message.error('获取项目列表失败');
      setProjects([]); // 设置为空数组
    } finally {
      setProjectsLoading(false);
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!selectedProjectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${selectedProjectId}/tasks?page=1&page_size=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const apiResponse = await response.json();
        console.log('Tasks API response:', apiResponse); // 调试日志
        
        // 检查响应结构并提取任务数组
        let tasksArray = [];
        if (apiResponse.success && apiResponse.data) {
          if (Array.isArray(apiResponse.data)) {
            // 直接是数组
            tasksArray = apiResponse.data;
          } else if (apiResponse.data.data && Array.isArray(apiResponse.data.data)) {
            // 分页响应格式
            tasksArray = apiResponse.data.data;
          }
        }
        
        const tasksWithNames = await Promise.all(
          tasksArray.map(async (task: Task) => {
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
      } else {
        console.error('Failed to fetch tasks:', response.status, response.statusText);
        message.error('获取任务失败');
      }
    } catch (error) {
      console.error('获取任务错误:', error);
      message.error('获取任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    // 如果在路由模式下，更新URL
    if (routeProjectId) {
      navigate(`/projects/${projectId}/task-board`);
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
      styles={{ body: { padding: '12px' } }}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>任务看板</Title>
        
        {/* 项目选择器 - 只在非路由模式下显示 */}
        {!routeProjectId && (
          <div style={{ width: '300px' }}>
            <Select
              placeholder="选择项目"
              value={selectedProjectId}
              onChange={handleProjectChange}
              loading={projectsLoading}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {!selectedProjectId ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <Text type="secondary">请选择一个项目查看任务</Text>
        </div>
      ) : (
        <Row gutter={16}>
          {columns.map(column => (
            <Col span={8} key={column.id}>
              <Card 
                title={`${column.title} (${getTasksByStatus(column.status).length})`}
                style={{ minHeight: '600px' }}
                styles={{ body: { padding: '16px' } }}
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
      )}
    </div>
  );
};

export default TaskBoardPage;