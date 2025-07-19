import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, Dropdown, message, Modal } from 'antd';
import { PlusOutlined, ImportOutlined, MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskRequest, PaginatedResponse } from '../types/task';
import { TaskService } from '../services/taskService';
import TaskModal from '../components/TaskModal';

const TasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [modalLoading, setModalLoading] = useState(false);

  const projectIdNum = parseInt(projectId || '0');

  // Load tasks from API
  const loadTasks = async (page = 1, pageSize = 20) => {
    if (!projectIdNum) return;
    
    setLoading(true);
    try {
      const response = await TaskService.getTasks(projectIdNum, {
        page,
        page_size: pageSize,
      });
      
      setTasks(response.data);
      setPagination({
        current: response.pagination.page,
        pageSize: response.pagination.page_size,
        total: response.pagination.total,
      });
    } catch (error: any) {
      message.error(error.message || '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // Load tasks on component mount and when projectId changes
  useEffect(() => {
    loadTasks();
  }, [projectIdNum]);

  // Handle task creation
  const handleCreateTask = async (taskData: TaskRequest) => {
    setModalLoading(true);
    try {
      await TaskService.createTask(projectIdNum, taskData);
      message.success('任务创建成功');
      setTaskModalVisible(false);
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      message.error(error.message || '任务创建失败');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskData: TaskRequest) => {
    if (!editingTask) return;
    
    setModalLoading(true);
    try {
      await TaskService.updateTask(projectIdNum, editingTask.id, taskData);
      message.success('任务更新成功');
      setTaskModalVisible(false);
      setEditingTask(undefined);
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      message.error(error.message || '任务更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = (task: Task) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务"${task.title}"吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await TaskService.deleteTask(projectIdNum, task.id);
          message.success('任务删除成功');
          loadTasks(pagination.current, pagination.pageSize);
        } catch (error: any) {
          message.error(error.message || '任务删除失败');
        }
      },
    });
  };

  // Handle edit task
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalVisible(true);
  };

  // Handle create new task
  const handleNewTask = () => {
    setEditingTask(undefined);
    setTaskModalVisible(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setTaskModalVisible(false);
    setEditingTask(undefined);
  };

  // Handle pagination change
  const handleTableChange = (paginationParams: any) => {
    loadTasks(paginationParams.current, paginationParams.pageSize);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'processing';
      case 'todo':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '进行中';
      case 'todo':
        return '待办';
      default:
        return '未知';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '未知';
    }
  };

  const columns = [
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
      title: '优先级',
      key: 'priority',
      render: (_: any, record: Task) => {
        const priority = record.custom_fields?.priority || 'medium';
        return (
          <Tag color={getPriorityColor(priority)}>
            {getPriorityText(priority)}
          </Tag>
        );
      },
    },
    {
      title: '标签',
      key: 'tags',
      render: (_: any, record: Task) => {
        const tags = record.custom_fields?.tags || [];
        return (
          <div>
            {tags.slice(0, 2).map((tag: string) => (
              <Tag key={tag} style={{ marginBottom: 2, fontSize: '12px' }}>
                {tag}
              </Tag>
            ))}
            {tags.length > 2 && <Tag style={{ fontSize: '12px' }}>+{tags.length - 2}</Tag>}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Task) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                label: '编辑',
                icon: <EditOutlined />,
                onClick: () => handleEditTask(record),
              },
              {
                key: 'delete',
                label: '删除',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => handleDeleteTask(record),
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">任务列表</h1>
            <p className="page-description">项目ID: {projectId}</p>
          </div>
          <Space>
            <Button
              type="default"
              icon={<ImportOutlined />}
              onClick={() => navigate(`/projects/${projectId}/bulk-import`)}
            >
              批量导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewTask}>
              创建任务
            </Button>
          </Space>
        </div>
      </div>

      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
        onChange={handleTableChange}
      />

      <TaskModal
        visible={taskModalVisible}
        task={editingTask}
        projectId={projectIdNum}
        onOk={editingTask ? handleUpdateTask : handleCreateTask}
        onCancel={handleModalClose}
        loading={modalLoading}
      />
    </div>
  );
};

export default TasksPage;