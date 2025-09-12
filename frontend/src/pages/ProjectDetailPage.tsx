import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Avatar,
  Button,
  Divider,
  Timeline,
  Table,
  Tabs,
  Badge,
  Tooltip,
  message,
  Spin,
  Empty,
  List,
  Modal,
  Form,
  Select,
  Input
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  CodeOutlined,
  SafetyCertificateOutlined,
  CrownOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PhoneOutlined,
  MailOutlined,
  NumberOutlined,
  BankOutlined,
  BuildOutlined,
  FundProjectionScreenOutlined,
  LinkOutlined,
  HomeOutlined,
  BarChartOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { projectService } from '../services/projectService';
// import companyService from '../services/companyService'; // Removed - company service no longer exists
import enterpriseService from '../services/enterpriseService';
import { ProjectDetail, ProjectUser, ProjectActivity, ProjectUserRole } from '../types/project';
import { Enterprise } from '../types/enterprise';
import { useTimer } from '../contexts/TimerContext';
import { ProjectProgressDisplay } from '../components/ProjectProgressDisplay';
// 🎯 移除：不再需要SimplifiedTimerProvider，使用统一定时器系统
// import DocumentList from '../components/DocumentList'; // 已归档，保持MVP简洁
import EnhancedProjectTaskManager from '../components/EnhancedProjectTaskManager';
import '../styles/timer-components.css';

const { Title, Text, Paragraph } = Typography;
// const { TabPane } = Tabs; // Deprecated, using items instead

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { timerState } = useTimer();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [enterpriseInfo, setEnterpriseInfo] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks-enhanced');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userForm] = Form.useForm();

  // Helper functions for status, priority, etc.
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

  // Tabs configuration using items (modern approach)
  const tabItems = [
    {
      key: 'tasks-enhanced',
      label: (
        <span>
          <CheckCircleOutlined />
          任务管理
        </span>
      ),
      children: projectId ? (
        <EnhancedProjectTaskManager 
          projectId={Number(projectId)} 
          projectName={project?.name}
        />
      ) : null
    },
    {
      key: 'overview',
      label: '项目概览',
      children: (
        <Row gutter={[24, 24]}>
          {/* 项目进度总览 */}
          <Col xs={24}>
            <Card title="项目进度总览" extra={<BarChartOutlined />}>
              {projectId && (
                <ProjectProgressDisplay 
                  projectId={Number(projectId)}
                  showStats={true}
                />
              )}
            </Card>
          </Col>
          {/* 项目基础信息 */}
          <Col xs={24} lg={16}>
            <Card title="项目基础信息" extra={<FundProjectionScreenOutlined />}>
              {/* 项目编号与状态 */}
              <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                <Col span={12}>
                  <Space direction="vertical" >
                    <Text type="secondary"><NumberOutlined /> 项目编号</Text>
                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                      {project?.project_number || '未设置'}
                    </Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space direction="vertical" >
                    <Text type="secondary">项目状态</Text>
                    <Tag color={getStatusColor(project?.status)} style={{ fontSize: '14px', padding: '4px 12px' }}>
                      {getStatusText(project?.status)}
                    </Tag>
                  </Space>
                </Col>
              </Row>
              
              {/* 项目描述 */}
              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary" style={{ marginBottom: '8px', display: 'block' }}>项目描述</Text>
                <Paragraph style={{ fontSize: '14px', lineHeight: '1.8', backgroundColor: '#fafafa', padding: '12px', borderRadius: '6px' }}>
                  {project?.description || '暂无项目描述'}
                </Paragraph>
              </div>
              
              {/* 项目时间线 */}
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Space direction="vertical" >
                    <Text type="secondary"><CalendarOutlined /> 开始日期</Text>
                    <Text strong>
                      {project?.start_date ? new Date(project.start_date).toLocaleDateString() : '未设置'}
                    </Text>
                  </Space>
                </Col>
                <Col span={8}>
                  <Space direction="vertical" >
                    <Text type="secondary"><CalendarOutlined /> 结束日期</Text>
                    <Text strong>
                      {project?.end_date ? new Date(project.end_date).toLocaleDateString() : '未设置'}
                    </Text>
                  </Space>
                </Col>
                <Col span={8}>
                  <Space direction="vertical" >
                    <Text type="secondary">优先级</Text>
                    <Tag color={getPriorityColor(project?.priority)}>
                      {getPriorityText(project?.priority)}
                    </Tag>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Col>
          {/* 企业信息 */}
          {project?.company_id ? (
            <Col xs={24}>
              <Card 
                title={
                  <Space>
                    <BankOutlined style={{ color: '#52c41a' }} />
                    <span>关联企业信息</span>
                  </Space>
                }
                extra={
                  <Space>
                    <Button 
                      type="link" 
                      icon={<LinkOutlined />}
                      onClick={() => navigate(`/enterprises/${project.enterprise_id}`)}
                    >
                      查看企业详情
                    </Button>
                    <Button 
                      type="link" 
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/enterprises/${project.company_id}/edit`)}
                    >
                      编辑企业信息
                    </Button>
                  </Space>
                }
              >
                <Row gutter={[24, 16]}>
                  <Col xs={24} lg={12}>
                    <Card  style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                      <Space direction="vertical" style={{ width: '100%' }} size={16}>
                        <Space align="center">
                          <Avatar 
                            size="large" 
                            icon={<BankOutlined />} 
                            style={{ backgroundColor: '#52c41a' }} 
                          />
                          <div>
<Text strong style={{ color: enterpriseInfo?.status === 'suspended' ? '#f5222d' : '#389e0d', fontSize: '16px' }}>
                              {enterpriseInfo?.name || '加载中...'}
                              {enterpriseInfo?.status === 'suspended' && '（已暂停）'}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>企业ID: #{project.company_id}</Text>
                          </div>
                        </Space>
                        
                        {enterpriseInfo && (
                          <>
                            <Divider style={{ margin: '8px 0' }} />
                            <Row gutter={[8, 8]}>
                              <Col span={12}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>行业</Text>
                                <br />
                                <Text style={{ fontSize: '13px' }}>{enterpriseInfo.industry_type_text || enterpriseInfo.industry_type || '未设置'}</Text>
                              </Col>
                              <Col span={12}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>企业类型</Text>
                                <br />
                                <Text style={{ fontSize: '13px' }}>{enterpriseInfo.business_type_text || '未设置'}</Text>
                              </Col>
                              <Col span={12}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>企业状态</Text>
                                <br />
<Tag color={enterpriseInfo.status === 'active' ? 'green' : enterpriseInfo.status === 'suspended' ? 'red' : 'orange'}>
                                  {enterpriseInfo.status_text || '未设置'}
                                </Tag>
                              </Col>
                              <Col span={12}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>优先级</Text>
                                <br />
                                <Text style={{ fontSize: '13px' }}>
                                  {enterpriseInfo.legal_representative || '未设置'}
                                </Text>
                              </Col>
                            </Row>
                          </>
                        )}
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card  title="联系方式" extra={<PhoneOutlined />}>
                      {enterpriseInfo ? (
                        <Space direction="vertical" style={{ width: '100%' }} >
                          <Row gutter={[16, 8]}>
                            <Col span={24}>
                              <Space>
                                <MailOutlined style={{ color: '#1890ff' }} />
                                <Text strong>邮箱：</Text>
                                <Text copyable={{ text: enterpriseInfo.contact_email }}>
                                  {enterpriseInfo.contact_email || '未设置'}
                                </Text>
                              </Space>
                            </Col>
                            <Col span={24}>
                              <Space>
                                <PhoneOutlined style={{ color: '#52c41a' }} />
                                <Text strong>电话：</Text>
                                <Text copyable={{ text: enterpriseInfo.contact_phone }}>
                                  {enterpriseInfo.contact_phone || '未设置'}
                                </Text>
                              </Space>
                            </Col>
                            <Col span={24}>
                              <Space>
                                <HomeOutlined style={{ color: '#fa8c16' }} />
                                <Text strong>地址：</Text>
                                <Text style={{ wordBreak: 'break-all' }}>
                                  {enterpriseInfo.address || '未设置'}
                                </Text>
                              </Space>
                            </Col>
                            {enterpriseInfo.website && (
                              <Col span={24}>
                                <Space>
                                  <LinkOutlined style={{ color: '#722ed1' }} />
                                  <Text strong>网站：</Text>
                                  <Button 
                                    type="link" 
                                     
                                    href={enterpriseInfo.website} 
                                    target="_blank"
                                    style={{ padding: 0, height: 'auto' }}
                                  >
                                    {enterpriseInfo.website}
                                  </Button>
                                </Space>
                              </Col>
                            )}
                          </Row>
                        </Space>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <Text type="secondary" style={{ fontSize: '14px' }}>
                            {loading ? '正在加载企业联系方式...' : '暂无企业联系方式信息'}
                          </Text>
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
                
                <Divider />
                
                <div style={{ textAlign: 'center' }}>
                  <Space size="large">
                    <Button 
                      type="primary" 
                      icon={<LinkOutlined />}
                      onClick={() => navigate(`/enterprises/${project.enterprise_id}`)}
                    >
                      查看完整企业资料
                    </Button>
                    <Button 
                      icon={<UserOutlined />}
                      onClick={() => navigate(`/enterprises/${project.enterprise_id}`)}
                    >
                      企业联系人管理
                    </Button>
                    <Button 
                      icon={<PhoneOutlined />}
                      onClick={() => navigate(`/enterprises/${project.enterprise_id}`)}
                    >
                      沟通记录
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
          ) : (
            <Col xs={24}>
              <Card title={<Space><BankOutlined style={{ color: '#faad14' }} /><span>企业信息</span></Space>}>
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: '16px', color: '#8c8c8c' }}>该项目暂未关联企业信息</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px' }}>
                        关联企业客户后，可以查看企业详细信息、联系方式等
                      </Text>
                    </div>
                  }
                >
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/projects/${project?.id}/edit`)}
                    >
                      编辑项目信息
                    </Button>
                    <Button 
                      icon={<BankOutlined />}
                      onClick={() => navigate('/enterprises')}
                    >
                      查看企业列表
                    </Button>
                  </Space>
                </Empty>
              </Card>
            </Col>
          )}
        </Row>
      )
    },
    {
      key: 'users',
      label: '项目成员',
      children: (
        <Card 
          title="成员管理" 
          extra={
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={() => setUserModalVisible(true)}
            >
              添加成员
            </Button>
          }
        >
          {/* 成员列表内容 */}
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            成员管理功能开发中...
          </div>
        </Card>
      )
    },
    {
      key: 'documents',
      label: (
        <span>
          <FileTextOutlined />
          项目文档
        </span>
      ),
      children: projectId ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            📄 项目文档管理功能正在简化重构中...
          </div>
          <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
            项目ID: {projectId} | 项目名称: {project?.name || '加载中...'}
          </div>
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              onClick={() => navigate(`/projects/${projectId}/documents/new`)}
            >
              创建文档
            </Button>
          </div>
          {/* TODO: 实现简化的项目文档列表 */}
        </div>
      ) : null
    },
    {
      key: 'activities',
      label: '项目动态',
      children: (
        <Card title="项目动态时间线">
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            项目动态功能开发中...
          </div>
        </Card>
      )
    }
  ];

  useEffect(() => {
    if (projectId) {
      loadProjectDetail();
    }
  }, [projectId]);

  const loadProjectDetail = async () => {
    try {
      setLoading(true);
      
      // 获取项目详情（现在使用组合API调用）
      const projectDetail = await projectService.getProjectDetail(Number(projectId));
      setProject(projectDetail);
      
      // 如果项目有关联企业，获取完整的企业信息
      // 注意：数据迁移后，项目API返回的是enterprise_id而不是company_id
      const enterpriseId = projectDetail.enterprise_id || projectDetail.company_id;
      if (enterpriseId) {
        try {
          const enterprise = await enterpriseService.getEnterprise(enterpriseId);
          setEnterpriseInfo(enterprise);
        } catch (error) {
          console.error('获取企业信息失败:', error);
          message.warning('获取企业信息失败，部分信息可能无法显示');
          // 企业信息获取失败不影响主流程
        }
      }
    } catch (error) {
      console.error('获取项目详情失败:', error);
      message.error('获取项目详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };


  const getRoleIcon = (role: ProjectUserRole) => {
    const iconMap = {
      customer: <CustomerServiceOutlined style={{ color: '#1890ff' }} />,
      consultant: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
      developer: <CodeOutlined style={{ color: '#722ed1' }} />,
      manager: <CrownOutlined style={{ color: '#fa8c16' }} />,
      designer: <FundProjectionScreenOutlined style={{ color: '#eb2f96' }} />
    };
    return iconMap[role] || <UserOutlined />;
  };

  const getActivityIcon = (type: string) => {
    const iconMap = {
      created: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      updated: <EditOutlined style={{ color: '#1890ff' }} />,
      user_added: <TeamOutlined style={{ color: '#722ed1' }} />,
      user_removed: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      task_created: <PlusOutlined style={{ color: '#52c41a' }} />,
      task_completed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      milestone_reached: <CrownOutlined style={{ color: '#fa8c16' }} />,
      status_changed: <ClockCircleOutlined style={{ color: '#1890ff' }} />
    };
    return iconMap[type as keyof typeof iconMap] || <ClockCircleOutlined />;
  };

  const getTaskStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'todo': 'default',
      'in_progress': 'processing',
      'completed': 'success',
      'cancelled': 'error'
    };
    return colorMap[status] || 'default';
  };

  const getTaskStatusText = (status: string): string => {
    const textMap: Record<string, string> = {
      'todo': '待开始',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return textMap[status] || '未知';
  };

  const handleAddUser = () => {
    setUserModalVisible(true);
  };

  const handleUserModalOk = async () => {
    try {
      const values = await userForm.validateFields();
      
      // 调用API添加用户
      await projectService.addProjectUser(Number(projectId), {
        user_id: values.user_id,
        role: values.role,
        is_primary: values.is_primary || false
      });
      
      message.success('用户添加成功');
      setUserModalVisible(false);
      userForm.resetFields();
      loadProjectDetail(); // 重新加载项目详情
    } catch (error) {
      console.error('Error adding user:', error);
      message.error('添加用户失败');
    }
  };

  const handleUserModalCancel = () => {
    setUserModalVisible(false);
    userForm.resetFields();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载项目详情中...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Empty description="项目不存在或已被删除" />
        <Button type="primary" onClick={() => navigate('/projects')}>
          返回项目列表
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/projects')}
          style={{ marginBottom: '16px' }}
        >
          返回项目列表
        </Button>
        
        <Card>
          <Row gutter={[24, 16]} align="middle">
            <Col flex="auto">
              <Space direction="vertical" >
                <Space align="center">
                  <NumberOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                  <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                    {project.project_number || '未设置编号'}
                  </Text>
                  <Tag color={getStatusColor(project.status)}>
                    {getStatusText(project.status)}
                  </Tag>
                  <Tag color={getPriorityColor(project.priority)}>
                    优先级: {getPriorityText(project.priority)}
                  </Tag>
                </Space>
                <Title level={2} style={{ margin: 0 }}>
                  {project.name}
                </Title>
                {/* 企业信息展示 */}
                {project.company_id && (
                  <Card 
                     
                    style={{ 
                      background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f7ef 100%)',
                      border: '1px solid #d9f7be',
                      borderRadius: '8px',
                      maxWidth: '400px'
                    }}
                  >
                    <Space align="center" size="middle">
                      <Avatar 
                         
                        style={{ 
                          backgroundColor: '#52c41a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        icon={<BankOutlined />}
                      />
                      <div>
                        <Space align="center" >
                          <Text strong style={{ color: '#389e0d' }}>所属企业：</Text>
                          <Button
                            type="link"
                            
                            style={{ 
                              padding: 0, 
                              height: 'auto',
                              color: '#1890ff',
                              fontWeight: 500
                            }}
                            icon={<LinkOutlined style={{ fontSize: '12px' }} />}
                            onClick={() => navigate(`/enterprises/${project.enterprise_id}`)}
                          >
                            {enterpriseInfo?.name || '加载中...'}
                          </Button>
                        </Space>
              
                      </div>
                    </Space>
                  </Card>
                )}
              </Space>
            </Col>
            <Col>
              <Space direction="vertical"  align="end">
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/projects/${project.id}/edit`)}
                >
                  编辑项目
                </Button>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>创建时间</Text>
                  <br />
                  <Text style={{ fontSize: '14px' }}>
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '未知'}
                  </Text>
                </div>
              </Space>
            </Col>
          </Row>         
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      {/* 添加成员模态框 */}
      <Modal
        title="添加项目成员"
        open={userModalVisible}
        onOk={handleUserModalOk}
        onCancel={handleUserModalCancel}
        width={600}
      >
        <Form form={userForm} layout="vertical">
          <Form.Item
            name="user_id"
            label="选择用户"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select placeholder="请选择要添加的用户" showSearch>
              <Select.Option value={201}>张三 - 前端开发</Select.Option>
              <Select.Option value={202}>李四 - 后端开发</Select.Option>
              <Select.Option value={203}>王五 - UI设计师</Select.Option>
              <Select.Option value={204}>赵六 - 测试工程师</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value="customer">客户方负责人</Select.Option>
              <Select.Option value="consultant">项目实施顾问</Select.Option>
              <Select.Option value="developer">研发工程师</Select.Option>
              <Select.Option value="manager">项目经理</Select.Option>
              <Select.Option value="designer">设计师</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="is_primary" valuePropName="checked">
            <input type="checkbox" /> 设为主要负责人
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;