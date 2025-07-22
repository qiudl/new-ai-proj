import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Form, 
  message, 
  Spin,
  Alert,
  Modal,
  Divider,
  Tabs,
  Badge
} from 'antd';
import { 
  EditOutlined, 
  ArrowLeftOutlined, 
  SaveOutlined, 
  EyeOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Company, CompanyRequest } from '../types/company';
import companyService from '../services/companyService';
import CompanyForm from '../components/CompanyForm';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TabPane } = Tabs;

const CompanyEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);

  const companyId = parseInt(id || '0');

  // 加载企业信息
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId || companyId <= 0) {
        message.error('无效的企业 ID');
        navigate('/companies');
        return;
      }

      try {
        setLoading(true);
        const companyData = await companyService.getCompany(companyId);
        setCompany(companyData);
      } catch (error) {
        console.error('加载企业信息失败:', error);
        if (error instanceof Error) {
          message.error(`加载失败: ${error.message}`);
        } else {
          message.error('加载企业信息失败');
        }
        navigate('/companies');
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companyId, navigate]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      
      // 处理日期格式
      const companyData: Partial<CompanyRequest> = {
        ...values,
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined,
      };

      // 调用更新API
      const updatedCompany = await companyService.updateCompany(companyId, companyData);
      
      setCompany(updatedCompany);
      setHasChanges(false);
      message.success('企业信息更新成功！');
      
    } catch (error) {
      console.error('更新企业信息失败:', error);
      if (error instanceof Error) {
        message.error(`更新失败: ${error.message}`);
      } else {
        message.error('更新企业信息失败，请检查输入信息并重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除企业“${company?.companyName}”吗？此操作不可恢复。`,
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await companyService.deleteCompany(companyId);
          message.success('企业删除成功');
          navigate('/companies');
        } catch (error) {
          console.error('删除企业失败:', error);
          if (error instanceof Error) {
            message.error(`删除失败: ${error.message}`);
          } else {
            message.error('删除企业失败');
          }
        }
      },
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      Modal.confirm({
        title: '确认离开',
        content: '您有未保存的修改，确定要离开吗？',
        okText: '确定离开',
        cancelText: '继续编辑',
        onOk: () => navigate('/companies'),
      });
    } else {
      navigate('/companies');
    }
  };

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '24px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="加载企业信息...">
          <div style={{ height: '200px', width: '100%' }} />
        </Spin>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="未找到企业信息"
          description="无法加载指定的企业信息，请检查企业ID是否正确。"
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate('/companies')}>
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面头部 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleCancel}
              style={{ marginRight: '16px' }}
            >
              返回列表
            </Button>
            <div>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <EditOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                编辑企业客户
                {hasChanges && (
                  <Badge 
                    count="已修改" 
                    style={{ backgroundColor: '#fa8c16', marginLeft: '8px' }} 
                  />
                )}
              </Title>
              <p style={{ margin: '4px 0 0 0', color: '#8c8c8c', fontSize: '14px' }}>
                {company.companyName} - {company.companyTypeText} - {company.statusText}
              </p>
            </div>
          </div>
          
          <Space>
            <Button 
              icon={<EyeOutlined />}
              onClick={() => navigate('/companies')}
            >
              查看列表
            </Button>
            <Button 
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              删除企业
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={submitting}
              disabled={!hasChanges}
            >
              {hasChanges ? '保存修改' : '无修改'}
            </Button>
          </Space>
        </div>
      </Card>

      {/* 标签页内容 */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        style={{ background: '#fff' }}
      >
        <TabPane 
          tab={
            <span>
              <EditOutlined />
              基本信息
            </span>
          } 
          key="basic"
        >
          <div style={{ padding: '16px' }}>
            <CompanyForm 
              form={form}
              company={company}
              onValuesChange={handleValuesChange}
            />
            
            {/* 底部操作栏 */}
            <Card size="small" style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <Space size="large">
                  <Button size="large" onClick={handleCancel}>
                    取消修改
                  </Button>
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<SaveOutlined />}
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!hasChanges}
                  >
                    {hasChanges ? '保存修改' : '无修改'}
                  </Button>
                </Space>
              </div>
              
              <div style={{ 
                marginTop: '16px', 
                textAlign: 'center', 
                color: '#8c8c8c', 
                fontSize: '12px' 
              }}>
                <p style={{ margin: 0 }}>
                  最后更新时间: {dayjs(company.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                </p>
                <p style={{ margin: '4px 0 0 0' }}>
                  创建时间: {dayjs(company.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </p>
              </div>
            </Card>
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <UserOutlined />
              联系人管理
            </span>
          } 
          key="contacts"
          disabled
        >
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Alert
              message="功能开发中"
              description="联系人管理功能正在开发中，将支持添加、编辑和管理企业联系人信息。"
              type="info"
              showIcon
            />
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <PhoneOutlined />
              沟通记录
            </span>
          } 
          key="communications"
          disabled
        >
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Alert
              message="功能开发中"
              description="沟通记录功能正在开发中，将支持记录和管理与企业的所有沟通历史。"
              type="info"
              showIcon
            />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default CompanyEditPage;