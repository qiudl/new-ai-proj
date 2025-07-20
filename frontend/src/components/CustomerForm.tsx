import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Space,
  message,
  Divider,
  Typography
} from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { Customer, CustomerRequest, CustomerFormData } from '../types/customer';
import customerService from '../services/customerService';
import { isValidEmail, isValidPhone, isValidUrl } from '../utils/formatters';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

interface CustomerFormProps {
  customer?: Customer;
  onSave: (customer: Customer) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onSave,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!customer;

  useEffect(() => {
    if (customer) {
      // Convert customer data to form data
      const formData: CustomerFormData = {
        ...customer,
        startDate: customer.startDate ? dayjs(customer.startDate).toDate() : null,
        endDate: customer.endDate ? dayjs(customer.endDate).toDate() : null,
        contractValue: customer.contractValue || null,
      };
      form.setFieldsValue(formData);
    }
  }, [customer, form]);

  const handleSubmit = async (values: CustomerFormData) => {
    setSubmitting(true);
    try {
      // Convert form data to API request format
      const requestData: CustomerRequest = {
        ...values,
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined,
        endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : undefined,
        contractValue: values.contractValue || undefined,
      };

      let savedCustomer: Customer;
      if (isEditing) {
        savedCustomer = await customerService.updateCustomer(customer.id, requestData);
        message.success('客户信息更新成功');
      } else {
        savedCustomer = await customerService.createCustomer(requestData);
        message.success('客户创建成功');
      }

      onSave(savedCustomer);
    } catch (error) {
      console.error('Failed to save customer:', error);
      message.error(isEditing ? '更新客户信息失败' : '创建客户失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>
          {isEditing ? '编辑客户' : '新建客户'}
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'potential',
          priority: 'medium',
        }}
      >
        <Row gutter={24}>
          {/* 基本信息 */}
          <Col span={24}>
            <Title level={4}>基本信息</Title>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              label="客户名称"
              name="name"
              rules={[
                { required: true, message: '请输入客户名称' },
                { max: 100, message: '客户名称不能超过100字符' }
              ]}
            >
              <Input placeholder="请输入客户名称" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="公司名称"
              name="company"
              rules={[
                { required: true, message: '请输入公司名称' },
                { max: 200, message: '公司名称不能超过200字符' }
              ]}
            >
              <Input placeholder="请输入公司名称" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="行业"
              name="industry"
              rules={[
                { required: true, message: '请输入行业' },
                { max: 100, message: '行业不能超过100字符' }
              ]}
            >
              <Input placeholder="请输入行业" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="联系人"
              name="contactPerson"
              rules={[
                { required: true, message: '请输入联系人' },
                { max: 100, message: '联系人不能超过100字符' }
              ]}
            >
              <Input placeholder="请输入联系人" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { 
                  validator: (_, value) => {
                    if (!value || isValidEmail(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('请输入有效的邮箱地址'));
                  }
                }
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="联系电话"
              name="phone"
              rules={[
                { required: true, message: '请输入联系电话' },
                {
                  validator: (_, value) => {
                    if (!value || isValidPhone(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('请输入有效的手机号码'));
                  }
                }
              ]}
            >
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="地址"
              name="address"
              rules={[
                { required: true, message: '请输入地址' },
                { max: 500, message: '地址不能超过500字符' }
              ]}
            >
              <TextArea
                placeholder="请输入地址"
                rows={3}
                showCount
                maxLength={500}
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="网站"
              name="website"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || isValidUrl(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('请输入有效的网站URL'));
                  }
                }
              ]}
            >
              <Input placeholder="请输入网站URL" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Row gutter={24}>
          {/* 业务信息 */}
          <Col span={24}>
            <Title level={4}>业务信息</Title>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="客户状态"
              name="status"
              rules={[{ required: true, message: '请选择客户状态' }]}
            >
              <Select placeholder="请选择客户状态">
                {customerService.getStatusOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="优先级"
              name="priority"
              rules={[{ required: true, message: '请选择优先级' }]}
            >
              <Select placeholder="请选择优先级">
                {customerService.getPriorityOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="合同金额（元）"
              name="contractValue"
            >
              <InputNumber
                placeholder="请输入合同金额"
                style={{ width: '100%' }}
                min={0}
                max={999999999}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => {
                  const parsed = parseFloat(value!.replace(/\$\s?|(,*)/g, ''));
                  return (isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 999999999)) as any;
                }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="合同开始日期"
              name="startDate"
            >
              <DatePicker
                placeholder="请选择开始日期"
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="合同结束日期"
              name="endDate"
              dependencies={['startDate']}
              rules={[
                {
                  validator: (_, value) => {
                    const startDate = form.getFieldValue('startDate');
                    if (!value || !startDate || value.isAfter(startDate)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('结束日期必须晚于开始日期'));
                  }
                }
              ]}
            >
              <DatePicker
                placeholder="请选择结束日期"
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 表单操作按钮 */}
        <Row justify="end" style={{ marginTop: '32px' }}>
          <Col>
            <Space>
              <Button
                onClick={onCancel}
                disabled={submitting}
                icon={<CloseOutlined />}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting || loading}
                icon={<SaveOutlined />}
              >
                {isEditing ? '更新' : '创建'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default CustomerForm;