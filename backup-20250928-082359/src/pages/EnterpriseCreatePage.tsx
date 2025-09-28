import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Form, 
  message, 
  Row,
  Col,
  Input,
  Select,
  Divider
} from 'antd';
import { 
  BuildOutlined, 
  ArrowLeftOutlined, 
  SaveOutlined, 
  PlusOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { EnterpriseRequest, BUSINESS_TYPE_OPTIONS, STATUS_OPTIONS, INDUSTRY_TYPE_OPTIONS } from '../types/enterprise';
import enterpriseService from '../services/enterpriseService';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const EnterpriseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      
      // 构建创建数据
      const enterpriseData: EnterpriseRequest = {
        name: values.name,
        code: values.code,
        description: values.description,
        industry_type: values.industry_type,
        business_type: values.business_type,
        registration_number: values.registration_number,
        tax_id: values.tax_id,
        legal_representative: values.legal_representative,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        address: values.address,
        city: values.city,
        province: values.province,
        postal_code: values.postal_code,
        website: values.website,
        status: values.status || 'active' // 默认状态为活跃
      };

      // 调用创建API
      const newEnterprise = await enterpriseService.createEnterprise(enterpriseData);
      
      message.success('企业创建成功！');
      
      // 跳转到企业详情页面
      navigate(`/enterprises/${newEnterprise.id}`);
      
    } catch (error) {
      console.error('创建企业失败:', error);
      message.error('创建企业失败，请检查输入信息并重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    message.info('表单已重置');
  };

  const handleCancel = () => {
    navigate('/enterprises');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面头部 */}
      <Card  style={{ marginBottom: '16px' }}>
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
                <PlusOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                创建企业
              </Title>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                填写企业基本信息
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 表单内容 */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'active'
          }}
        >
          <Row gutter={24}>
            {/* 基本信息 */}
            <Col span={24}>
              <Divider orientation="left">基本信息</Divider>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="企业名称"
                name="name"
                rules={[
                  { required: true, message: '请输入企业名称' },
                  { min: 2, max: 255, message: '企业名称长度应在2-255字符之间' }
                ]}
              >
                <Input placeholder="请输入企业名称" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="企业代码"
                name="code"
                rules={[
                  { required: true, message: '请输入企业代码' },
                  { min: 2, max: 100, message: '企业代码长度应在2-100字符之间' }
                ]}
              >
                <Input placeholder="请输入企业代码（唯一标识）" />
              </Form.Item>
            </Col>
            
            <Col span={24}>
              <Form.Item
                label="企业描述"
                name="description"
              >
                <TextArea 
                  rows={3} 
                  placeholder="请输入企业描述（可选）" 
                  maxLength={1000}
                />
              </Form.Item>
            </Col>

            {/* 企业类型信息 */}
            <Col span={24}>
              <Divider orientation="left">企业类型</Divider>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="业务类型"
                name="business_type"
                rules={[{ required: true, message: '请选择业务类型' }]}
              >
                <Select placeholder="请选择业务类型">
                  {BUSINESS_TYPE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="行业类型"
                name="industry_type"
              >
                <Select placeholder="请选择行业类型（可选）" allowClear>
                  {INDUSTRY_TYPE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* 法律信息 */}
            <Col span={24}>
              <Divider orientation="left">法律信息（可选）</Divider>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="注册号"
                name="registration_number"
              >
                <Input placeholder="请输入注册号（可选）" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="税号"
                name="tax_id"
              >
                <Input placeholder="请输入税号（可选）" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="法定代表人"
                name="legal_representative"
              >
                <Input placeholder="请输入法定代表人（可选）" />
              </Form.Item>
            </Col>

            {/* 联系信息 */}
            <Col span={24}>
              <Divider orientation="left">联系信息（可选）</Divider>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="联系邮箱"
                name="contact_email"
                rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
              >
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="contact_phone"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            
            <Col span={24}>
              <Form.Item
                label="地址"
                name="address"
              >
                <Input placeholder="请输入地址" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="城市"
                name="city"
              >
                <Input placeholder="请输入城市" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="省份"
                name="province"
              >
                <Input placeholder="请输入省份" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="邮政编码"
                name="postal_code"
              >
                <Input placeholder="请输入邮政编码" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="网站"
                name="website"
                rules={[{ type: 'url', message: '请输入有效的网站地址' }]}
              >
                <Input placeholder="请输入网站地址" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 操作按钮 */}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel}>
                取消
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
              <Button 
                type="primary"
                icon={<SaveOutlined />}
                loading={submitting}
                htmlType="submit"
              >
                创建企业
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default EnterpriseCreatePage;