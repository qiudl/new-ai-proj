import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Space, Modal, message, Popconfirm, Typography } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { SystemService, RecycledProject, RecycledTask, PaginatedResponse } from '../services/systemService';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';

const { Title } = Typography;

const RecycleBinPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Projects state
  const [recycledProjects, setRecycledProjects] = useState<RecycledProject[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectsCurrentPage, setProjectsCurrentPage] = useState(1);
  const projectsPageSize = 20;
  
  // Tasks state
  const [recycledTasks, setRecycledTasks] = useState<RecycledTask[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksCurrentPage, setTasksCurrentPage] = useState(1);
  const tasksPageSize = 20;

  // Load recycled projects
  const loadRecycledProjects = async (page = 1) => {
    setProjectsLoading(true);
    try {
      const response: PaginatedResponse<RecycledProject> = await SystemService.getRecycledProjects(page, projectsPageSize);
      setRecycledProjects(response.data);
      setProjectsTotal(response.pagination.total);
      setProjectsCurrentPage(page);
    } catch (error) {
      message.error('加载回收站项目失败');
      console.error('Error loading recycled projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Load recycled tasks
  const loadRecycledTasks = async (page = 1) => {
    setTasksLoading(true);
    try {
      const response: PaginatedResponse<RecycledTask> = await SystemService.getRecycledTasks(page, tasksPageSize);
      setRecycledTasks(response.data);
      setTasksTotal(response.pagination.total);
      setTasksCurrentPage(page);
    } catch (error) {
      message.error('加载回收站任务失败');
      console.error('Error loading recycled tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  // Restore project
  const handleRestoreProject = async (id: number) => {
    try {
      await SystemService.restoreProject(id);
      message.success('项目恢复成功');
      loadRecycledProjects(projectsCurrentPage);
    } catch (error) {
      message.error('项目恢复失败');
      console.error('Error restoring project:', error);
    }
  };

  // Permanently delete project
  const handleHardDeleteProject = async (id: number) => {
    try {
      await SystemService.hardDeleteProject(id);
      message.success('项目已永久删除');
      loadRecycledProjects(projectsCurrentPage);
    } catch (error) {
      message.error('永久删除项目失败');
      console.error('Error hard deleting project:', error);
    }
  };

  // Restore task
  const handleRestoreTask = async (id: number) => {
    try {
      await SystemService.restoreTask(id);
      message.success('任务恢复成功');
      loadRecycledTasks(tasksCurrentPage);
    } catch (error) {
      message.error('任务恢复失败');
      console.error('Error restoring task:', error);
    }
  };

  // Permanently delete task
  const handleHardDeleteTask = async (id: number) => {
    try {
      await SystemService.hardDeleteTask(id);
      message.success('任务已永久删除');
      loadRecycledTasks(tasksCurrentPage);
    } catch (error) {
      message.error('永久删除任务失败');
      console.error('Error hard deleting task:', error);
    }
  };

  // Project columns
  const projectColumns: ColumnsType<RecycledProject> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建者',
      dataIndex: 'owner_username',
      key: 'owner_username',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '已删除任务数',
      dataIndex: 'deleted_tasks_count',
      key: 'deleted_tasks_count',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRestoreProject(record.id)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认永久删除"
            description="此操作不可撤销，确定要永久删除这个项目吗？"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleHardDeleteProject(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Task columns
  const taskColumns: ColumnsType<RecycledTask> = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          todo: '待办',
          in_progress: '进行中',
          completed: '已完成',
          cancelled: '已取消',
        };
        return statusMap[status as keyof typeof statusMap] || status;
      },
    },
    {
      title: '负责人',
      dataIndex: 'assignee_username',
      key: 'assignee_username',
      render: (text) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '删除时间',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRestoreTask(record.id)}
          >
            恢复
          </Button>
          <Popconfirm
            title="确认永久删除"
            description="此操作不可撤销，确定要永久删除这个任务吗？"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleHardDeleteTask(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              永久删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'projects') {
      loadRecycledProjects(1);
    } else if (activeTab === 'tasks') {
      loadRecycledTasks(1);
    }
  }, [activeTab]);

  const tabItems: TabsProps['items'] = [
    {
      key: 'projects',
      label: '项目回收站',
      children: (
        <Table
          columns={projectColumns}
          dataSource={recycledProjects}
          loading={projectsLoading}
          rowKey="id"
          pagination={{
            current: projectsCurrentPage,
            pageSize: projectsPageSize,
            total: projectsTotal,
            onChange: loadRecycledProjects,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key: 'tasks',
      label: '任务回收站',
      children: (
        <Table
          columns={taskColumns}
          dataSource={recycledTasks}
          loading={tasksLoading}
          rowKey="id"
          pagination={{
            current: tasksCurrentPage,
            pageSize: tasksPageSize,
            total: tasksTotal,
            onChange: loadRecycledTasks,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>回收站</Title>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />
    </div>
  );
};

export default RecycleBinPage;