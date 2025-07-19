import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, Spin, message, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { Task } from '../types/task';
import TaskModal from '../components/TaskModal';

const TaskDetailPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    if (projectId && taskId) {
      loadTask();
    }
  }, [projectId, taskId]);

  const loadTask = async () => {
    if (!projectId || !taskId) return;
    
    try {
      setLoading(true);
      const taskData = await TaskService.getTask(parseInt(projectId), parseInt(taskId));
      setTask(taskData);
    } catch (error) {
      message.error('获取任务详情失败');
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditModalVisible(true);
  };

  const handleEditSuccess = async (values: any) => {
    if (!projectId || !task) return;
    
    try {
      await TaskService.updateTask(parseInt(projectId), task.id, values);
      message.success('任务更新成功');
      setEditModalVisible(false);
      loadTask(); // Reload task data
    } catch (error) {
      console.error('Error updating task:', error);
      message.error('更新任务失败');
    }
  };

  const handleDelete = () => {
    if (!task || !projectId) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务 "${task.title}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await TaskService.deleteTask(parseInt(projectId), task.id);
          message.success('任务删除成功');
          navigate(`/projects/${projectId}/tasks`);
        } catch (error) {
          message.error('删除任务失败');
          console.error('Error deleting task:', error);
        }
      },
    });
  };

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tasks`);
    } else {
      navigate('/task-list');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'default';
      case 'in_progress': return 'processing';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return '低';
      case 'medium': return '中';
      case 'high': return '高';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <h3>任务不存在</h3>
            <Button type="primary" onClick={handleBack}>
              返回任务列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回任务列表
        </Button>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEdit}>
            编辑任务
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除任务
          </Button>
        </Space>
      </div>

      <Card title={task.title} style={{ marginBottom: '16px' }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="任务ID">{task.id}</Descriptions.Item>
          <Descriptions.Item label="项目ID">{task.project_id}</Descriptions.Item>
          
          <Descriptions.Item label="状态">
            <Tag color={getStatusColor(task.status)}>
              {getStatusText(task.status)}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="优先级">
            {task.custom_fields?.priority && (
              <Tag color={getPriorityColor(task.custom_fields.priority as string)}>
                {getPriorityText(task.custom_fields.priority as string)}
              </Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="负责人">
            {task.assignee_id ? `用户 ${task.assignee_id}` : '未分配'}
          </Descriptions.Item>

          <Descriptions.Item label="截止时间">
            {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '未设置'}
          </Descriptions.Item>

          <Descriptions.Item label="预估工时" span={2}>
            {task.custom_fields?.estimated_hours ? `${task.custom_fields.estimated_hours} 小时` : '未设置'}
          </Descriptions.Item>

          <Descriptions.Item label="标签" span={2}>
            {task.custom_fields?.tags && Array.isArray(task.custom_fields.tags) ? (
              <Space wrap>
                {task.custom_fields.tags.map((tag: string, index: number) => (
                  <Tag key={index} color="blue">{tag}</Tag>
                ))}
              </Space>
            ) : '无标签'}
          </Descriptions.Item>

          <Descriptions.Item label="任务描述" span={2}>
            {task.description || '无描述'}
          </Descriptions.Item>

          <Descriptions.Item label="创建时间">
            {new Date(task.created_at).toLocaleString('zh-CN')}
          </Descriptions.Item>
          
          <Descriptions.Item label="更新时间">
            {new Date(task.updated_at).toLocaleString('zh-CN')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
        <Card title="自定义字段" style={{ marginBottom: '16px' }}>
          <Descriptions column={2} bordered>
            {Object.entries(task.custom_fields).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}

      <TaskModal
        visible={editModalVisible}
        task={task}
        projectId={projectId ? parseInt(projectId) : 0}
        onOk={handleEditSuccess}
        onCancel={() => setEditModalVisible(false)}
      />
    </div>
  );
};

export default TaskDetailPage;