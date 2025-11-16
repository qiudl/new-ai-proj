import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal } from 'antd';
import { ExclamationCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface PasswordExpirationStatus {
  is_expired: boolean;
  days_until_expiry: number | null;
  must_change: boolean;
  warning_threshold_reached: boolean;
}

/**
 * Password Expiration Alert Component
 * Displays warnings when password is about to expire or has expired
 * Shows modal for forced password changes
 */
const PasswordExpirationAlert: React.FC = () => {
  const [status, setStatus] = useState<PasswordExpirationStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkPasswordExpiration();
  }, []);

  const checkPasswordExpiration = async () => {
    try {
      const response = await api.get('/users/me/password-expiration-status');
      const expirationStatus = response.data?.data;

      if (expirationStatus) {
        setStatus(expirationStatus);

        // Show modal if password is expired or must be changed
        if (expirationStatus.is_expired || expirationStatus.must_change) {
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to check password expiration:', error);
      // Silently fail - this is not critical functionality
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    navigate('/change-password');
    setShowModal(false);
  };

  // Don't render anything while loading or if no status
  if (loading || !status) {
    return null;
  }

  // Force password change modal (blocking)
  if (status.is_expired || status.must_change) {
    return (
      <Modal
        title={
          <span style={{ color: '#ff4d4f' }}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            密码已过期
          </span>
        }
        open={showModal}
        closable={false}
        footer={[
          <Button
            key="change"
            type="primary"
            icon={<LockOutlined />}
            onClick={handleChangePassword}
          >
            立即修改密码
          </Button>,
        ]}
      >
        <p>
          {status.is_expired
            ? '您的密码已过期，为了账户安全，请立即修改密码。'
            : '系统要求您必须修改密码后才能继续使用。'}
        </p>
        <p style={{ color: '#8c8c8c', fontSize: '14px' }}>
          修改密码后，您需要使用新密码重新登录。
        </p>
      </Modal>
    );
  }

  // Warning for soon-to-expire password (non-blocking)
  if (status.warning_threshold_reached && status.days_until_expiry !== null) {
    return (
      <Alert
        message="密码即将过期"
        description={
          <div>
            <p>
              您的密码将在 <strong>{status.days_until_expiry}</strong> 天后过期。
              为避免影响使用，建议您尽快修改密码。
            </p>
            <Button
              type="link"
              icon={<LockOutlined />}
              onClick={handleChangePassword}
              style={{ padding: 0 }}
            >
              立即修改密码
            </Button>
          </div>
        }
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        closable
        style={{
          marginBottom: 16,
          borderColor: '#faad14',
        }}
      />
    );
  }

  return null;
};

export default PasswordExpirationAlert;
