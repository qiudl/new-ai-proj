import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Tabs,
  message,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  BankOutlined,
  InfoCircleOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import enterpriseService from '../services/enterpriseService';
import { Enterprise } from '../types/enterprise';
import { formatDate } from '../utils/formatters';
import EnterpriseProjectManager from '../components/EnterpriseProjectManager';
import EnterpriseDepartmentManagement from '../components/EnterpriseDepartmentManagement';
import EnterprisePersonnelManagement from '../components/EnterprisePersonnelManagement';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const EnterpriseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEnterpriseDetail();
    }
  }, [id]);

  const loadEnterpriseDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const enterpriseId = parseInt(id);
      const result = await enterpriseService.getEnterprise(enterpriseId);
      setEnterprise(result);
    } catch (error) {
      console.error('加载企业详情失败:', error);
      message.error('加载企业详情失败');
      navigate('/enterprises');
    } finally {
      setLoading(false);
    }
  };

  const handleManageUsers = () => {
    navigate(`/enterprises/${id}/users`);
  };

  const handleManageDepartments = () => {
    navigate(`/enterprises/${id}/organization`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'suspended': return 'red';
      default: return 'default';
    }
  };

  const getBusinessTypeColor = (businessType: string) => {
    switch (businessType) {
      case 'corporation': return 'blue';
      case 'llc': return 'cyan';
      case 'partnership': return 'purple';
      case 'individual': return 'orange';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Title level={3}>企业不存在或已删除</Title>
        <Button type="primary" onClick={() => navigate('/enterprises')}>
          返回企业列表
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/enterprises')}
          >
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>{enterprise.name}</Title>
          <Tag color={getStatusColor(enterprise.status)}>
            {enterprise.status_text}
          </Tag>
        </Space>

        <div style={{ marginTop: '16px' }}>
          <Space>
            <Button 
              type="primary"
              icon={<UserOutlined />}
              onClick={handleManageUsers}
            >
              管理用户 ({enterprise.user_count || 0})
            </Button>
            <Button 
              icon={<EditOutlined />}
              onClick={() => navigate(`/enterprises/${enterprise.id}/edit`)}
            >
              编辑企业
            </Button>
          </Space>
        </div>
      </div>

      {/* 主要内容Tabs */}
      <Tabs defaultActiveKey="departments" size="large">
        <Tabs.TabPane
          tab={
            <span>
              <InfoCircleOutlined />
              企业信息
            </span>
          }
          key="basic"
        >
          <Row gutter={[24, 24]}>
        {/* 企业基本信息 */}
        <Col span={24}>
          <Card title="基本信息" >
            <Descriptions column={2} layout="horizontal" bordered>
              <Descriptions.Item label="企业ID">{enterprise.id}</Descriptions.Item>
              <Descriptions.Item label="企业代码">{enterprise.code}</Descriptions.Item>
              
              <Descriptions.Item label="企业名称">{enterprise.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(enterprise.status)}>
                  {enterprise.status_text}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="业务类型">
                <Tag color={getBusinessTypeColor(enterprise.business_type)}>
                  {enterprise.business_type_text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="行业类型">
                {enterprise.industry_type_text ? (
                  <Tag color="geekblue">{enterprise.industry_type_text}</Tag>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="描述" span={2}>
                {enterprise.description || <Text type="secondary">暂无描述</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 联系信息和地址 */}
        <Col span={12}>
          <Card title={<><PhoneOutlined /> 联系信息</>} >
            <Descriptions column={1} layout="horizontal">
              <Descriptions.Item label="邮箱">
                {enterprise.contact_email ? (
                  <Space>
                    <MailOutlined />
                    <Text copyable>{enterprise.contact_email}</Text>
                  </Space>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>
              
              <Descriptions.Item label="电话">
                {enterprise.contact_phone ? (
                  <Space>
                    <PhoneOutlined />
                    <Text copyable>{enterprise.contact_phone}</Text>
                  </Space>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>
              
              <Descriptions.Item label="网站">
                {enterprise.website ? (
                  <Space>
                    <GlobalOutlined />
                    <a href={enterprise.website} target="_blank" rel="noopener noreferrer">
                      {enterprise.website}
                    </a>
                  </Space>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={12}>
          <Card title={<><EnvironmentOutlined /> 地址信息</>} >
            <Descriptions column={1} layout="horizontal">
              <Descriptions.Item label="地址">
                {enterprise.address || <Text type="secondary">未设置</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="城市">
                {enterprise.city || <Text type="secondary">未设置</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="省份">
                {enterprise.province || <Text type="secondary">未设置</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="邮政编码">
                {enterprise.postal_code || <Text type="secondary">未设置</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 法律和注册信息 */}
        <Col span={12}>
          <Card title={<><BankOutlined /> 法律信息</>} >
            <Descriptions column={1} layout="horizontal">
              <Descriptions.Item label="注册号">
                {enterprise.registration_number ? (
                  <Text copyable>{enterprise.registration_number}</Text>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="税号">
                {enterprise.tax_id ? (
                  <Text copyable>{enterprise.tax_id}</Text>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="法定代表人">
                {enterprise.legal_representative || <Text type="secondary">未设置</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 统计信息 */}
        <Col span={12}>
          <Card title={<><TeamOutlined /> 统计信息</>} >
            <Row gutter={16} style={{ textAlign: 'center' }}>
              <Col span={12}>
                <div style={{ padding: '16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                    {enterprise.user_count || 0}
                  </div>
                  <div style={{ color: '#666' }}>企业用户</div>
                </div>
              </Col>
              <Col span={12}>
                <div 
                  style={{ 
                    padding: '16px', 
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  onClick={handleManageDepartments}
                  title="点击查看组织架构"
                >
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                    {enterprise.department_count || 0}
                  </div>
                  <div style={{ color: '#666' }}>部门数量</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 创建和更新信息 */}
        <Col span={24}>
          <Card title="系统信息" >
            <Descriptions column={2} layout="horizontal">
              <Descriptions.Item label="创建时间">
                {formatDate(enterprise.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDate(enterprise.updated_at)}
              </Descriptions.Item>
              <Descriptions.Item label="创建者ID">
                {enterprise.created_by || <Text type="secondary">系统</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="更新者ID">
                {enterprise.updated_by || <Text type="secondary">系统</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <TeamOutlined />
              部门管理
            </span>
          }
          key="departments"
        >
          <EnterpriseDepartmentManagement
            enterpriseId={enterprise.id}
            enterpriseName={enterprise.name}
          />
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <UserOutlined />
              人员管理
            </span>
          }
          key="personnel"
        >
          <EnterprisePersonnelManagement
            enterpriseId={enterprise.id}
            enterpriseName={enterprise.name}
          />
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <ProjectOutlined />
              项目管理
            </span>
          }
          key="projects"
        >
          <EnterpriseProjectManager
            enterpriseId={enterprise.id}
            enterpriseName={enterprise.name}
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default EnterpriseDetailPage;