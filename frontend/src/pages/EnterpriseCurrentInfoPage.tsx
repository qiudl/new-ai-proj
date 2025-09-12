import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Alert, Result } from 'antd';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { permissionService } from '../services/permissionService';
import { ENTERPRISE_PERMISSIONS } from '../constants/permissions';

const EnterpriseCurrentInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { isImpersonating, impersonationStatus, loading } = useImpersonation();
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Check permissions
  useEffect(() => {
    const checkPermission = async () => {
      try {
        setPermissionLoading(true);
        setPermissionError(null);

        // During impersonation, admin should have access
        if (isImpersonating) {
          setHasPermission(true);
          return;
        }

        // For non-impersonation access, check actual permissions
        const allowed = await permissionService.hasPermission(ENTERPRISE_PERMISSIONS.READ);
        setHasPermission(allowed);
      } catch (error) {
        console.error('Permission check failed:', error);
        setPermissionError('权限检查失败');
        setHasPermission(false);
      } finally {
        setPermissionLoading(false);
      }
    };

    if (!loading) {
      checkPermission();
    }
  }, [isImpersonating, loading]);

  // Perform redirect after permission check
  useEffect(() => {
    if (loading || permissionLoading) {
      return;
    }

    if (!hasPermission) {
      // No permission, don't redirect
      return;
    }

    if (isImpersonating && impersonationStatus?.enterprise?.id) {
      // In impersonation mode, redirect to current enterprise detail page
      navigate(`/enterprises/${impersonationStatus.enterprise.id}`, { replace: true });
    } else {
      // Not in impersonation mode, redirect to enterprises list
      navigate('/enterprises', { replace: true });
    }
  }, [isImpersonating, impersonationStatus, loading, permissionLoading, hasPermission, navigate]);

  if (loading || permissionLoading) {
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

  if (permissionError) {
    return (
      <Result
        status="error"
        title="权限检查失败"
        subTitle={permissionError}
        extra={
          <div style={{ fontSize: '14px', color: '#666' }}>
            请刷新页面重试，或联系管理员
          </div>
        }
      />
    );
  }

  if (!hasPermission) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问企业信息"
        extra={
          <div style={{ fontSize: '14px', color: '#666' }}>
            需要权限: 企业信息查看
          </div>
        }
      />
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
            ? `正在跳转到${impersonationStatus?.enterprise?.name}详情页面...`
            : "正在跳转到企业管理页面..."
        }
        type="info"
        showIcon
      />
    </div>
  );
};

export default EnterpriseCurrentInfoPage;