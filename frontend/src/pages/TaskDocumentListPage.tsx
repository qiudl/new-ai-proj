import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Tooltip,
  message,
  Badge,
  Typography,
  Select,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  FileTextOutlined, 
  EditOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { Task } from '../types/task';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface TaskDocumentInfo extends Task {
  documentExists?: boolean;
  lastModified?: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
}

const TaskDocumentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskDocumentInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskDocumentInfo[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [documentFilter, setDocumentFilter] = useState<string | undefined>();

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    try {
      const response = await projectService.getProjects();
      // projectService.getProjects可能返回分页响应，需要检查结构
      const projectList = Array.isArray(response) ? response : response.data || [];
      setProjects(projectList);
    } catch (error) {
      console.error('加载项目列表失败:', error);
      message.error('加载项目列表失败');
    }
  }, []);

  // 加载所有任务
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      // 获取所有项目的任务
      const allTasks: TaskDocumentInfo[] = [];
      
      for (const project of projects) {
        try {
          const response = await TaskService.getTasks(project.id);
          // TaskService.getTasks返回分页响应，需要访问data属性
          const projectTasks = response.data || [];
          // 为每个任务添加项目信息
          const tasksWithProject = projectTasks.map(task => ({
            ...task,
            projectName: project.name,
            projectId: project.id
          }));
          allTasks.push(...tasksWithProject);
        } catch (error) {
          console.error(`加载项目 ${project.name} 的任务失败:`, error);
        }
      }

      // 检查每个任务的文档状态
      const tasksWithDocumentStatus = await Promise.all(
        allTasks.map(async (task) => {
          try {
            // 使用API服务检查文档状态
            const response = await fetch(`/api/v1/projects/${task.project_id}/tasks/${task.id}/document`, {
              method: 'HEAD',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
            return {
              ...task,
              documentExists: response.ok
            };
          } catch (error) {
            return {
              ...task,
              documentExists: false
            };
          }
        })
      );

      setTasks(tasksWithDocumentStatus);
      setFilteredTasks(tasksWithDocumentStatus);
    } catch (error) {
      console.error('加载任务列表失败:', error);
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [projects]);

  // 筛选任务
  const filterTasks = useCallback(() => {
    let filtered = [...tasks];

    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(keyword) ||
        task.description?.toLowerCase().includes(keyword)
      );
    }

    // 项目筛选
    if (selectedProject) {
      filtered = filtered.filter(task => task.project_id === selectedProject);
    }

    // 状态筛选
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // 文档状态筛选
    if (documentFilter === 'with-doc') {
      filtered = filtered.filter(task => task.documentExists);
    } else if (documentFilter === 'without-doc') {
      filtered = filtered.filter(task => !task.documentExists);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchKeyword, selectedProject, statusFilter, documentFilter]);

  // 初始化加载
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length > 0) {
      loadTasks();
    }
  }, [projects, loadTasks]);

  // 筛选条件变化时重新筛选
  useEffect(() => {
    filterTasks();
  }, [filterTasks]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' };
      case 'in_progress':
        return { color: 'processing', icon: <SyncOutlined spin />, text: '进行中' };
      case 'todo':
        return { color: 'default', icon: <ClockCircleOutlined />, text: '待开始' };
      case 'cancelled':
        return { color: 'error', icon: <ExclamationCircleOutlined />, text: '已取消' };
      default:
        return { color: 'default', icon: <ClockCircleOutlined />, text: status };
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text: string, record: TaskDocumentInfo) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {text}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {(record as any).projectName}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '文档状态',
      key: 'documentStatus',
      width: 120,
      render: (_: any, record: TaskDocumentInfo) => (
        <Space>
          {record.documentExists ? (
            <Badge status="success" text="有文档" />
          ) : (
            <Badge status="default" text="无文档" />
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: TaskDocumentInfo) => (
        <Space>
          <Tooltip title="查看任务详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑任务文档">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}?tab=document`)}
            />
          </Tooltip>
          <Tooltip title="打开项目">
            <Button
              type="text"
              size="small"
              icon={<FolderOpenOutlined />}
              onClick={() => navigate(`/projects/${record.project_id}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const documentStats = {
    total: filteredTasks.length,
    withDoc: filteredTasks.filter(task => task.documentExists).length,
    withoutDoc: filteredTasks.filter(task => !task.documentExists).length,
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          任务文档管理
        </Title>
        <Text type="secondary">
          管理和查看所有任务的文档，快速访问任务详情和文档编辑
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                {documentStats.total}
              </div>
              <div style={{ color: '#666' }}>总任务数</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {documentStats.withDoc}
              </div>
              <div style={{ color: '#666' }}>有文档任务</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                {documentStats.withoutDoc}
              </div>
              <div style={{ color: '#666' }}>无文档任务</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="300px">
            <Search
              placeholder="搜索任务名称或描述"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col flex="150px">
            <Select
              placeholder="选择项目"
              value={selectedProject}
              onChange={setSelectedProject}
              allowClear
              style={{ width: '100%' }}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col flex="120px">
            <Select
              placeholder="任务状态"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="todo">待开始</Option>
              <Option value="in_progress">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col flex="120px">
            <Select
              placeholder="文档状态"
              value={documentFilter}
              onChange={setDocumentFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="with-doc">有文档</Option>
              <Option value="without-doc">无文档</Option>
            </Select>
          </Col>
          <Col>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchKeyword('');
                setSelectedProject(undefined);
                setStatusFilter(undefined);
                setDocumentFilter(undefined);
              }}
            >
              清空筛选
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 任务列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredTasks.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个任务`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default TaskDocumentListPage;