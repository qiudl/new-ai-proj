import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spin } from 'antd';
import { useImpersonation } from '../contexts/ImpersonationContext';

const EnterpriseUsersRedirectPage: React.FC = () => {
  const navigate = useNavigate();
  const { isImpersonating, impersonationStatus, loading } = useImpersonation();

  useEffect(() => {
    if (loading) {
      // Still loading, wait
      return;
    }

    if (isImpersonating && impersonationStatus?.enterprise?.id) {
      // In impersonation mode, redirect to current enterprise users page
      navigate(`/enterprises/${impersonationStatus.enterprise.id}/users`, { replace: true });
    } else {
      // Not in impersonation mode, redirect to general user management
      navigate('/user-management', { replace: true });
    }
  }, [isImpersonating, impersonationStatus, loading, navigate]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        gap: '16px'
      }}>
        <Spin size="large" />
        <div>正在获取企业信息...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '50px',
      textAlign: 'center'
    }}>
      <Alert
        message="重定向中"
        description={
          isImpersonating 
            ? `正在跳转到${impersonationStatus?.enterprise?.name}用户管理页面...`
            : "正在跳转到用户管理页面..."
        }
        type="info"
        showIcon
      />
    </div>
  );
};

export default EnterpriseUsersRedirectPage;