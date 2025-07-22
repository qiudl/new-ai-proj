import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Spin, Alert } from 'antd';
import CustomerForm from '../components/CustomerForm';
import { Customer } from '../types/customer';
import customerService from '../services/customerService';

const CustomerEditPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      if (!customerId) {
        setError('未找到客户ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const customerData = await customerService.getCustomer(parseInt(customerId));
        setCustomer(customerData);
        setError(null);
      } catch (err) {
        console.error('Error loading customer:', err);
        setError('加载客户信息失败');
        message.error('加载客户信息失败');
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [customerId]);

  const handleSave = (updatedCustomer: Customer) => {
    message.success('客户信息更新成功');
    navigate('/customers');
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
          加载客户信息中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <div style={{ marginTop: '8px' }}>
              <button onClick={() => navigate('/customers')}>返回客户列表</button>
            </div>
          }
        />
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="客户不存在"
          description="未找到指定的客户信息"
          type="warning"
          showIcon
          action={
            <div style={{ marginTop: '8px' }}>
              <button onClick={() => navigate('/customers')}>返回客户列表</button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <CustomerForm
        customer={customer}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default CustomerEditPage;