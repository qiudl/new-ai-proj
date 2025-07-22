import React from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import CustomerForm from '../components/CustomerForm';
import { Customer } from '../types/customer';

const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSave = (customer: Customer) => {
    message.success('客户创建成功');
    navigate('/customers');
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  return (
    <div style={{ padding: '24px' }}>
      <CustomerForm
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default CustomerCreatePage;