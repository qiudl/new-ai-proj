import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from 'antd';

const EnterpriseDepartmentsRedirectPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to organization structure page which handles departments
    navigate('/organization-structure', { replace: true });
  }, [navigate]);

  return (
    <div style={{ 
      padding: '50px',
      textAlign: 'center'
    }}>
      <Alert
        message="重定向中"
        description="正在跳转到组织架构页面..."
        type="info"
        showIcon
      />
    </div>
  );
};

export default EnterpriseDepartmentsRedirectPage;