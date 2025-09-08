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
  Row,
  Col,
  Input,
  Select,
  Badge
} from 'antd';
import { 
  EditOutlined, 
  ArrowLeftOutlined, 
  SaveOutlined, 
  EyeOutlined,
  DeleteOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Enterprise, EnterpriseUpdateRequest, BUSINESS_TYPE_OPTIONS, STATUS_OPTIONS, INDUSTRY_TYPE_OPTIONS } from '../types/enterprise';
import enterpriseService from '../services/enterpriseService';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const EnterpriseEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const enterpriseId = parseInt(id || '0');

  // 加载企业信息
  useEffect(() => {
    const loadEnterprise = async () => {
      if (!enterpriseId || enterpriseId <= 0) {
        message.error('无效的企业 ID');
        navigate('/enterprises');
        return;
      }

      try {
        setLoading(true);
        const enterpriseData = await enterpriseService.getEnterprise(enterpriseId);
        setEnterprise(enterpriseData);
        
        // 设置表单初始值
        form.setFieldsValue({
          name: enterpriseData.name,
          code: enterpriseData.code,
          description: enterpriseData.description,
          industry_type: enterpriseData.industry_type,
          business_type: enterpriseData.business_type,
          registration_number: enterpriseData.registration_number,
          tax_id: enterpriseData.tax_id,
          legal_representative: enterpriseData.legal_representative,
          contact_email: enterpriseData.contact_email,
          contact_phone: enterpriseData.contact_phone,
          address: enterpriseData.address,
          city: enterpriseData.city,
          province: enterpriseData.province,
          postal_code: enterpriseData.postal_code,
          website: enterpriseData.website,
          status: enterpriseData.status
        });
      } catch (error) {
        console.error('加载企业信息失败:', error);
        message.error('加载企业信息失败');
        navigate('/enterprises');
      } finally {
        setLoading(false);
      }
    };

    loadEnterprise();
  }, [enterpriseId, navigate, form]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      
      // 构建更新数据
      const updateData: EnterpriseUpdateRequest = {
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
        status: values.status
      };

      // 调用更新API
      const updatedEnterprise = await enterpriseService.updateEnterprise(enterpriseId, updateData);
      
      setEnterprise(updatedEnterprise);
      setHasChanges(false);
      message.success('企业信息更新成功！');
      
      // 跳转到企业详情页
      navigate(`/enterprises/${enterpriseId}`);
      
    } catch (error) {
      console.error('更新企业信息失败:', error);
      message.error('更新企业信息失败，请检查输入信息并重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除企业"${enterprise?.name}"吗？此操作不可恢复。`,
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await enterpriseService.deleteEnterprise(enterpriseId);
          message.success('企业删除成功');
          navigate('/enterprises');
        } catch (error) {
          console.error('删除企业失败:', error);
          message.error('删除企业失败');
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
        onOk: () => navigate('/enterprises'),
      });
    } else {
      navigate('/enterprises');
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

  if (!enterprise) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="未找到企业信息"
          description="无法加载指定的企业信息，请检查企业ID是否正确。"
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate('/enterprises')}>
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
              返回
            </Button>
            <div>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <EditOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                编辑企业
                {hasChanges && (
                  <Badge 
                    count="未保存" 
                    style={{ backgroundColor: '#faad14', marginLeft: '8px' }} 
                  />
                )}
              </Title>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                {enterprise.name} (ID: {enterprise.id})
              </div>
            </div>
          </div>
          
          <Space>
            <Button 
              icon={<EyeOutlined />}
              onClick={() => navigate(`/enterprises/${enterpriseId}`)}
            >
              查看详情
            </Button>
            <Button 
              icon={<UserOutlined />}
              onClick={() => navigate(`/enterprises/${enterpriseId}/users`)}
            >
              管理用户
            </Button>
          </Space>
        </div>
      </Card>

      {/* 表单内容 */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          onFinish={handleSubmit}
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
                rules={[{ required: true, message: '请输入企业名称' }]}
              >
                <Input placeholder="请输入企业名称" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="企业代码"
                name="code"
                rules={[{ required: true, message: '请输入企业代码' }]}
              >
                <Input placeholder="请输入企业代码" />
              </Form.Item>
            </Col>
            
            <Col span={24}>
              <Form.Item
                label="企业描述"
                name="description"
              >
                <TextArea 
                  rows={3} 
                  placeholder="请输入企业描述" 
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
                <Select placeholder="请选择行业类型" allowClear>
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
              <Divider orientation="left">法律信息</Divider>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="注册号"
                name="registration_number"
              >
                <Input placeholder="请输入注册号" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="税号"
                name="tax_id"
              >
                <Input placeholder="请输入税号" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                label="法定代表人"
                name="legal_representative"
              >
                <Input placeholder="请输入法定代表人" />
              </Form.Item>
            </Col>

            {/* 联系信息 */}
            <Col span={24}>
              <Divider orientation="left">联系信息</Divider>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button 
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
            >
              删除企业
            </Button>
            
            <Space>
              <Button onClick={handleCancel}>
                取消
              </Button>
              <Button 
                type="primary"
                icon={<SaveOutlined />}
                loading={submitting}
                onClick={handleSubmit}
                disabled={!hasChanges}
              >
                保存修改
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default EnterpriseEditPage;