import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Form, 
  message, 
  Spin,
  Result
} from 'antd';
import { 
  BuildOutlined, 
  ArrowLeftOutlined, 
  SaveOutlined, 
  PlusOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { CompanyRequest } from '../types/company';
import companyService from '../services/companyService';
import CompanyForm from '../components/CompanyForm';
import dayjs from 'dayjs';

const { Title } = Typography;

const CompanyCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      
      // 处理日期格式
      const companyData: CompanyRequest = {
        ...values,
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined,
      };

      // 调用创建API
      const newCompany = await companyService.createCompany(companyData);
      
      message.success('企业客户创建成功！');
      
      // 跳转到编辑页面或列表页面
      navigate(`/companies/${newCompany.id}/edit`);
      
    } catch (error) {
      console.error('创建企业客户失败:', error);
      if (error instanceof Error) {
        message.error(`创建失败: ${error.message}`);
      } else {
        message.error('创建企业客户失败，请检查输入信息并重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    message.info('表单已重置');
  };

  const handleCancel = () => {
    navigate('/companies');
  };

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
                <BuildOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                创建企业客户
              </Title>
              <p style={{ margin: '4px 0 0 0', color: '#8c8c8c', fontSize: '14px' }}>
                填写完整的企业信息，建立新的客户档案
              </p>
            </div>
          </div>
          
          <Space>
            <Button onClick={handleReset}>
              重置表单
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={submitting}
            >
              保存企业信息
            </Button>
          </Space>
        </div>
      </Card>

      {/* 表单内容 */}
      <Spin spinning={loading}>
        <CompanyForm 
          form={form}
          onValuesChange={(changedValues, allValues) => {
            // 可以在这里处理表单值变化
          }}
        />
      </Spin>

      {/* 底部操作栏 */}
      <Card size="small" style={{ marginTop: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button size="large" onClick={handleCancel}>
              取消创建
            </Button>
            <Button 
              type="primary" 
              size="large"
              icon={<PlusOutlined />}
              onClick={handleSubmit}
              loading={submitting}
            >
              创建企业客户
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
            * 标记为必填项，企业名称、类型、状态和优先级为必需信息
          </p>
          <p style={{ margin: '4px 0 0 0' }}>
            创建成功后可以继续编辑企业详细信息和添加联系人
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CompanyCreatePage;