import React, { useState, useEffect, useCallback } from 'react';
import { Card, Descriptions, Tag, Button, Space, Spin, message, Modal, Tabs, Table, Breadcrumb } from 'antd';
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined, PlusOutlined, BranchesOutlined, HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { Task, TaskUpdate, TimelineEvent } from '../types/task';
import TaskModal from '../components/TaskModal';
import TaskTimeline from '../components/TaskTimeline';

const TaskDetailPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  const [subtasksLoading, setSubtasksLoading] = useState(false);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const loadTask = useCallback(async () => {
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
  }, [projectId, taskId]);

  const loadSubtasks = useCallback(async () => {
    if (!projectId || !taskId) return;
    
    try {
      setSubtasksLoading(true);
      const children = await TaskService.getTaskChildren(parseInt(projectId), parseInt(taskId));
      // Ensure children is an array
      setSubtasks(Array.isArray(children) ? children : []);
    } catch (error) {
      message.error('获取子任务失败');
      console.error('Error loading subtasks:', error);
      setSubtasks([]); // Set empty array on error
    } finally {
      setSubtasksLoading(false);
    }
  }, [projectId, taskId]);

  const loadTaskUpdates = useCallback(async () => {
    if (!projectId || !taskId) return;
    
    try {
      setUpdatesLoading(true);
      const response = await TaskService.getTaskUpdates(parseInt(projectId), parseInt(taskId), { page: 1, page_size: 20 });
      // Ensure response.data is an array
      setTaskUpdates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error('获取更新历史失败');
      console.error('Error loading task updates:', error);
      setTaskUpdates([]); // Set empty array on error
    } finally {
      setUpdatesLoading(false);
    }
  }, [projectId, taskId]);

  const loadTaskTimeline = useCallback(async () => {
    if (!projectId || !taskId) return;
    
    try {
      setTimelineLoading(true);
      const response = await TaskService.getTaskTimeline(parseInt(projectId), parseInt(taskId), { page: 1, page_size: 50 });
      // Ensure response.data is an array
      setTimelineEvents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error('获取时间线失败');
      console.error('Error loading task timeline:', error);
      setTimelineEvents([]); // Set empty array on error
    } finally {
      setTimelineLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    if (projectId && taskId) {
      loadTask();
      
      // Auto-load data based on tab parameter
      const tab = searchParams.get('tab');
      if (tab === 'history') {
        loadTaskUpdates();
      } else if (tab === 'subtasks') {
        loadSubtasks();
      } else if (tab === 'timeline') {
        loadTaskTimeline();
      }
    }
  }, [projectId, taskId, searchParams, loadTask, loadTaskUpdates, loadSubtasks, loadTaskTimeline]);

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

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'subtasks' && subtasks.length === 0) {
      loadSubtasks();
    } else if (key === 'history' && taskUpdates.length === 0) {
      loadTaskUpdates();
    } else if (key === 'timeline' && timelineEvents.length === 0) {
      loadTaskTimeline();
    }
  };

  const handleDeleteSubtask = (subtask: Task) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除子任务 "${subtask.title}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await TaskService.deleteTask(parseInt(projectId!), subtask.id);
          message.success('子任务删除成功');
          loadSubtasks(); // Reload subtasks
        } catch (error) {
          message.error('删除子任务失败');
          console.error('Error deleting subtask:', error);
        }
      },
    });
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

  const subtaskColumns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Task) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.description}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      render: (name: string) => name || '未分配',
    },
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => date || '无',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Task) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/projects/${projectId}/tasks/${record.id}`)}
          >
            查看
          </Button>
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteSubtask(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const updateHistoryColumns = [
    {
      title: '更新类型',
      dataIndex: 'update_type',
      key: 'update_type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          status: '状态',
          progress: '进度',
          notes: '备注',
          parent: '父任务',
          title: '标题',
          description: '描述',
          assignee: '负责人',
          due_date: '截止时间',
          custom_fields: '自定义字段',
        };
        return (
          <Tag color="blue" style={{ fontWeight: 500 }}>
            {typeMap[type] || type}
          </Tag>
        );
      },
    },
    {
      title: '原值',
      dataIndex: 'old_value',
      key: 'old_value',
      render: (value: string, record: TaskUpdate) => {
        if (!value) return <span style={{ color: '#999' }}>无</span>;
        
        // Format status values
        if (record.update_type === 'status') {
          const statusMap: Record<string, { text: string; color: string }> = {
            todo: { text: '待办', color: 'default' },
            in_progress: { text: '进行中', color: 'processing' },
            completed: { text: '已完成', color: 'success' },
            cancelled: { text: '已取消', color: 'error' },
          };
          const status = statusMap[value];
          return status ? <Tag color={status.color}>{status.text}</Tag> : value;
        }
        
        return <span style={{ color: '#666' }}>{value}</span>;
      },
    },
    {
      title: '新值',
      dataIndex: 'new_value',
      key: 'new_value',
      render: (value: string, record: TaskUpdate) => {
        if (!value) return <span style={{ color: '#999' }}>无</span>;
        
        // Format status values
        if (record.update_type === 'status') {
          const statusMap: Record<string, { text: string; color: string }> = {
            todo: { text: '待办', color: 'default' },
            in_progress: { text: '进行中', color: 'processing' },
            completed: { text: '已完成', color: 'success' },
            cancelled: { text: '已取消', color: 'error' },
          };
          const status = statusMap[value];
          return status ? <Tag color={status.color}>{status.text}</Tag> : value;
        }
        
        return <span style={{ color: '#333', fontWeight: 500 }}>{value}</span>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => {
        const updateTime = new Date(date);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));
        
        let timeAgo = '';
        if (diffInMinutes < 1) {
          timeAgo = '刚刚';
        } else if (diffInMinutes < 60) {
          timeAgo = `${diffInMinutes}分钟前`;
        } else if (diffInMinutes < 1440) {
          timeAgo = `${Math.floor(diffInMinutes / 60)}小时前`;
        } else {
          timeAgo = `${Math.floor(diffInMinutes / 1440)}天前`;
        }
        
        return (
          <div>
            <div style={{ fontSize: 12, color: '#999' }}>{timeAgo}</div>
            <div style={{ fontSize: 11, color: '#ccc' }}>
              {updateTime.toLocaleString('zh-CN')}
            </div>
          </div>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
    },
  ];

  const tabItems = [
    {
      key: 'details',
      label: '任务详情',
      children: (
        <>
          <Card title={task?.title} style={{ marginBottom: '16px' }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="任务ID">{task?.id}</Descriptions.Item>
              <Descriptions.Item label="项目ID">{task?.project_id}</Descriptions.Item>
              
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(task?.status || '')}>
                  {getStatusText(task?.status || '')}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="优先级">
                {task?.custom_fields?.priority && (
                  <Tag color={getPriorityColor(task.custom_fields.priority as string)}>
                    {getPriorityText(task.custom_fields.priority as string)}
                  </Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="负责人">
                {task?.assignee_id ? `用户 ${task.assignee_id}` : '未分配'}
              </Descriptions.Item>

              <Descriptions.Item label="截止时间">
                {task?.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '未设置'}
              </Descriptions.Item>

              <Descriptions.Item label="预估工时" span={2}>
                {task?.custom_fields?.estimated_hours ? `${task.custom_fields.estimated_hours} 小时` : '未设置'}
              </Descriptions.Item>

              <Descriptions.Item label="标签" span={2}>
                {task?.custom_fields?.tags && Array.isArray(task.custom_fields.tags) ? (
                  <Space wrap>
                    {task.custom_fields.tags.map((tag: string, index: number) => (
                      <Tag key={index} color="blue">{tag}</Tag>
                    ))}
                  </Space>
                ) : '无标签'}
              </Descriptions.Item>

              <Descriptions.Item label="任务描述" span={2}>
                {task?.description || '无描述'}
              </Descriptions.Item>

              <Descriptions.Item label="创建时间">
                {task?.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : ''}
              </Descriptions.Item>
              
              <Descriptions.Item label="更新时间">
                {task?.updated_at ? new Date(task.updated_at).toLocaleString('zh-CN') : ''}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {task?.custom_fields && Object.keys(task.custom_fields).length > 0 && (
            <Card title="自定义字段">
              <Descriptions column={2} bordered>
                {Object.entries(task.custom_fields).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}
        </>
      ),
    },
    {
      key: 'subtasks',
      label: (
        <span>
          <BranchesOutlined /> 子任务
          {subtasks.length > 0 && (
            <Tag style={{ marginLeft: 8 }}>{subtasks.length}</Tag>
          )}
        </span>
      ),
      children: (
        <Card 
          title="子任务列表" 
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate(`/projects/${projectId}/tasks?parent=${taskId}`)}
            >
              添加子任务
            </Button>
          }
        >
          <Table
            dataSource={Array.isArray(subtasks) ? subtasks : []}
            columns={subtaskColumns}
            rowKey="id"
            loading={subtasksLoading}
            size="small"
            pagination={false}
            locale={{ emptyText: '暂无子任务' }}
            expandable={{
              childrenColumnName: 'nonExistentField' // 禁用默认的展开功能
            }}
          />
        </Card>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> 更新历史
        </span>
      ),
      children: (
        <Card title="更新历史">
          <Table
            dataSource={Array.isArray(taskUpdates) ? taskUpdates : []}
            columns={updateHistoryColumns}
            rowKey="id"
            loading={updatesLoading}
            size="small"
            pagination={false}
            locale={{ emptyText: '暂无更新记录' }}
            expandable={{
              childrenColumnName: 'nonExistentField' // 禁用默认的展开功能
            }}
          />
        </Card>
      ),
    },
    {
      key: 'timeline',
      label: (
        <span>
          <ClockCircleOutlined /> 时间线
        </span>
      ),
      children: (
        <Card title="任务时间线">
          <TaskTimeline
            events={timelineEvents}
            loading={timelineLoading}
            onRefresh={loadTaskTimeline}
            showFilters={true}
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumb
          items={[
            {
              title: (
                <Button type="link" icon={<ArrowLeftOutlined />} onClick={handleBack}>
                  任务列表
                </Button>
              )
            },
            {
              title: task?.title
            }
          ]}
        />
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEdit}>
            编辑任务
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除任务
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
      />

      <TaskModal
        visible={editModalVisible}
        task={task}
        projectId={projectId ? parseInt(projectId) : 0}
        onOk={handleEditSuccess}
        onCancel={() => setEditModalVisible(false)}
        allowParentSelection={true}
      />
    </div>
  );
};

export default TaskDetailPage;