import React from 'react';
import { Button, Table, Tag, Space, Dropdown, Menu } from 'antd';
import { PlusOutlined, ImportOutlined, MoreOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

const TasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Mock data - will be replaced with API calls
  const tasks = [
    {
      id: 1,
      title: '项目环境搭建',
      description: '搭建开发环境，包括Docker配置',
      status: 'completed',
      assignee: '开发者1',
      dueDate: '2025-07-20',
      customFields: {
        priority: 'high',
        estimatedHours: 8,
      },
    },
    {
      id: 2,
      title: '数据库设计',
      description: '设计项目数据库表结构',
      status: 'in_progress',
      assignee: '开发者1',
      dueDate: '2025-07-21',
      customFields: {
        priority: 'high',
        estimatedHours: 16,
      },
    },
    {
      id: 3,
      title: 'API接口开发',
      description: '开发后端RESTful API接口',
      status: 'todo',
      assignee: '开发者2',
      dueDate: '2025-07-25',
      customFields: {
        priority: 'medium',
        estimatedHours: 32,
      },
    },
  ];

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
      render: (text: string, record: any) => (
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
      dataIndex: 'assignee',
      key: 'assignee',
    },
    {
      title: '截止时间',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
    {
      title: '优先级',
      key: 'priority',
      render: (_, record) => (
        <Tag color={getPriorityColor(record.customFields.priority)}>
          {getPriorityText(record.customFields.priority)}
        </Tag>
      ),
    },
    {
      title: '预估工时',
      key: 'estimatedHours',
      render: (_, record) => `${record.customFields.estimatedHours}h`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                label: '编辑',
              },
              {
                key: 'delete',
                label: '删除',
                danger: true,
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
            <Button type="primary" icon={<PlusOutlined />}>
              创建任务
            </Button>
          </Space>
        </div>
      </div>

      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        pagination={{
          total: tasks.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
        }}
      />
    </div>
  );
};

export default TasksPage;