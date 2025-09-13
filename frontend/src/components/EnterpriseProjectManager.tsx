import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  message,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Typography,
  Row,
  Col,
  Tooltip,
  Progress,
  Spin,
  Empty,
  Radio
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  UserOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { projectService, type CreateProjectForEnterpriseRequest } from '../services/projectService';
import { Project } from '../types/project';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

type ViewMode = 'list' | 'card';

interface EnterpriseProjectManagerProps {
  enterpriseId: number;
  enterpriseName?: string;
}

// 工具函数
const getStatusColor = (status?: string): string => {
  const colorMap: Record<string, string> = {
    'planning': 'blue',
    'active': 'green',
    'on_hold': 'orange',
    'completed': 'purple',
    'cancelled': 'red'
  };
  return colorMap[status || 'active'] || 'green';
};

const getStatusText = (status?: string): string => {
  const textMap: Record<string, string> = {
    'planning': '规划中',
    'active': '进行中',
    'on_hold': '暂停',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return textMap[status || 'active'] || '进行中';
};

const getPriorityColor = (priority?: string): string => {
  const colorMap: Record<string, string> = {
    'high': 'red',
    'medium': 'orange',
    'low': 'green'
  };
  return colorMap[priority || 'medium'] || 'orange';
};

const getPriorityText = (priority?: string): string => {
  const textMap: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低'
  };
  return textMap[priority || 'medium'] || '中';
};

const EnterpriseProjectManager: React.FC<EnterpriseProjectManagerProps> = ({
  enterpriseId,
  enterpriseName
}) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 个项目`,
  });
  
  const [form] = Form.useForm();

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await projectService.getProjectsByEnterprise(enterpriseId, {
        page: pagination.current,
        pageSize: pagination.pageSize
      });
      
      setProjects(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('加载企业项目失败:', error);
      message.error('加载项目列表失败');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [enterpriseId, pagination.current, pagination.pageSize]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 处理分页变化
  const handleTableChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  };

  // 创建项目
  const handleCreateProject = async (values: any) => {
    setCreateLoading(true);
    try {
      const projectData: CreateProjectForEnterpriseRequest = {
        name: values.name,
        description: values.description,
        project_number: values.project_number,
        status: values.status || 'planning',
        priority: values.priority || 'medium',
        start_date: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      await projectService.createProjectForEnterprise(enterpriseId, projectData);
      message.success('项目创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadProjects();
    } catch (error) {
      console.error('创建项目失败:', error);
      message.error('创建项目失败');
    } finally {
      setCreateLoading(false);
    }
  };

  // 表格列定义
  const columns: ColumnsType<Project> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          {record.project_number && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.project_number}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
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
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityText(priority)}
        </Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress || 0}  />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: Project) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/projects/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/projects/${record.id}/edit`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 渲染卡片视图
  const renderCardView = () => (
    <Row gutter={[16, 16]}>
      {projects.map((project) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
          <Card
            
            hoverable
            actions={[
              <Tooltip title="查看详情" key="view">
                <EyeOutlined onClick={() => navigate(`/projects/${project.id}`)} />
              </Tooltip>,
              <Tooltip title="编辑" key="edit">
                <EditOutlined onClick={() => navigate(`/projects/${project.id}/edit`)} />
              </Tooltip>
            ]}
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: 4 }}>
                {project.name}
              </div>
              {project.project_number && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {project.project_number}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <Space  wrap>
                <Tag color={getStatusColor(project.status)}>
                  {getStatusText(project.status)}
                </Tag>
                <Tag color={getPriorityColor(project.priority)}>
                  {getPriorityText(project.priority)}
                </Tag>
              </Space>
            </div>

            {project.description && (
              <div style={{ marginBottom: 12 }}>
                <Tooltip title={project.description}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.description}
                  </div>
                </Tooltip>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <Progress percent={project.progress || 0}  />
            </div>

            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              创建: {dayjs(project.created_at).format('YYYY-MM-DD')}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  return (
    <div>
      {/* 操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <span style={{ color: '#8c8c8c' }}>视图模式:</span>
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
              
            >
              <Radio.Button value="list">
                <UnorderedListOutlined /> 列表
              </Radio.Button>
              <Radio.Button value="card">
                <AppstoreOutlined /> 卡片
              </Radio.Button>
            </Radio.Group>
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建项目
          </Button>
        </Col>
      </Row>

      {/* 项目列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : projects.length === 0 ? (
        <Empty 
          description="暂无项目"
          style={{ padding: '50px' }}
        />
      ) : (
        <>
          {viewMode === 'card' ? renderCardView() : (
            <Table
              columns={columns}
              dataSource={projects}
              rowKey="id"
              pagination={{
                ...pagination,
                onChange: handleTableChange,
                onShowSizeChange: handleTableChange,
              }}
              size="middle"
            />
          )}
        </>
      )}

      {/* 创建项目模态框 */}
      <Modal
        title="新建项目"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
        destroyOnHidden={true}
        centered={true}
        maskClosable={true}
        keyboard={true}
        forceRender={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
        >
          <Form.Item
            label="项目名称"
            name="name"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item
            label="项目编号"
            name="project_number"
          >
            <Input placeholder="请输入项目编号（可选）" />
          </Form.Item>

          <Form.Item
            label="项目描述"
            name="description"
          >
            <Input.TextArea
              placeholder="请输入项目描述"
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="planning"
              >
                <Select>
                  <Option value="planning">规划中</Option>
                  <Option value="active">进行中</Option>
                  <Option value="on_hold">暂停</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="优先级"
                name="priority"
                initialValue="medium"
              >
                <Select>
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="项目时间"
            name="dateRange"
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseProjectManager;