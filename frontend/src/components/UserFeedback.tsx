import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Space,
  Tag,
  Typography,
  Collapse,
  Divider,
  Progress,
  Spin,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  BugOutlined,
  SecurityScanOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ErrorType, ErrorLevel, AppError } from '../utils/errorHandler';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 错误类型图标映射
const ERROR_TYPE_ICONS = {
  [ErrorType.VALIDATION]: <ExclamationCircleOutlined />,
  [ErrorType.NETWORK]: <ApiOutlined />,
  [ErrorType.SERVER]: <DatabaseOutlined />,
  [ErrorType.PERMISSION]: <SecurityScanOutlined />,
  [ErrorType.NOT_FOUND]: <InfoCircleOutlined />,
  [ErrorType.TIMEOUT]: <LoadingOutlined />,
  [ErrorType.UNKNOWN]: <BugOutlined />,
};

// 错误类型颜色映射
const ERROR_TYPE_COLORS = {
  [ErrorType.VALIDATION]: 'warning',
  [ErrorType.NETWORK]: 'error',
  [ErrorType.SERVER]: 'error', 
  [ErrorType.PERMISSION]: 'error',
  [ErrorType.NOT_FOUND]: 'info',
  [ErrorType.TIMEOUT]: 'warning',
  [ErrorType.UNKNOWN]: 'default',
};

// 错误级别颜色映射
const ERROR_LEVEL_COLORS = {
  [ErrorLevel.SUCCESS]: 'success',
  [ErrorLevel.INFO]: 'info',
  [ErrorLevel.WARNING]: 'warning',
  [ErrorLevel.ERROR]: 'error',
};

// 用户反馈卡片组件
interface UserFeedbackCardProps {
  error?: AppError | null;
  loading?: boolean;
  success?: boolean;
  title?: string;
  children?: React.ReactNode;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const UserFeedbackCard: React.FC<UserFeedbackCardProps> = ({
  error,
  loading = false,
  success = false,
  title,
  children,
  onRetry,
  onDismiss,
  showDetails = false,
  className = '',
}) => {
  const [showDetailedInfo, setShowDetailedInfo] = useState(showDetails);

  // 确定Alert类型
  const getAlertType = (): 'success' | 'info' | 'warning' | 'error' => {
    if (success) return 'success';
    if (error) {
      switch (error.level) {
        case ErrorLevel.SUCCESS:
          return 'success';
        case ErrorLevel.INFO:
          return 'info';
        case ErrorLevel.WARNING:
          return 'warning';
        case ErrorLevel.ERROR:
        default:
          return 'error';
      }
    }
    return 'info';
  };

  // 获取消息内容
  const getMessage = () => {
    if (success) return title || '操作成功';
    if (error) return error.message;
    if (loading) return title || '正在处理中...';
    return title || '系统消息';
  };

  // 获取图标
  const getIcon = () => {
    if (loading) return <LoadingOutlined spin />;
    if (success) return <CheckCircleOutlined />;
    if (error) return ERROR_TYPE_ICONS[error.type] || <CloseCircleOutlined />;
    return <InfoCircleOutlined />;
  };

  // 渲染操作按钮
  const renderActions = () => {
    const actions = [];

    if (onRetry && error && (error.type === ErrorType.NETWORK || error.type === ErrorType.TIMEOUT)) {
      actions.push(
        <Button
          key="retry"
          type="primary"
          
          icon={<ReloadOutlined />}
          onClick={onRetry}
        >
          重试
        </Button>
      );
    }

    if (onDismiss) {
      actions.push(
        <Button key="dismiss"  onClick={onDismiss}>
          知道了
        </Button>
      );
    }

    if (error && error.details) {
      actions.push(
        <Button
          key="details"
          type="link"
          
          onClick={() => setShowDetailedInfo(!showDetailedInfo)}
        >
          {showDetailedInfo ? '隐藏详情' : '查看详情'}
        </Button>
      );
    }

    return actions.length > 0 ? actions : undefined;
  };

  return (
    <div className={`user-feedback-card ${className}`}>
      <Alert
        type={getAlertType()}
        icon={getIcon()}
        message={getMessage()}
        action={renderActions()}
        showIcon
        closable={!!onDismiss}
        onClose={onDismiss}
        style={{ marginBottom: showDetailedInfo || children ? 16 : 0 }}
      />

      {/* 详细信息展示 */}
      {showDetailedInfo && error && (
        <Card  style={{ marginBottom: children ? 16 : 0 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 错误基本信息 */}
            <div>
              <Text strong>错误类型：</Text>
              <Tag
                color={ERROR_TYPE_COLORS[error.type] as any}
                icon={ERROR_TYPE_ICONS[error.type]}
              >
                {error.type}
              </Tag>
            </div>

            {error.code && (
              <div>
                <Text strong>错误代码：</Text>
                <Text code>{error.code}</Text>
              </div>
            )}

            {error.field && (
              <div>
                <Text strong>相关字段：</Text>
                <Tag color="blue">{error.field}</Tag>
              </div>
            )}

            {error.details && (
              <div>
                <Text strong>详细信息：</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  <Text type="secondary">{error.details}</Text>
                </Paragraph>
              </div>
            )}

            {error.timestamp && (
              <div>
                <Text strong>发生时间：</Text>
                <Text type="secondary">
                  {new Date(error.timestamp).toLocaleString()}
                </Text>
              </div>
            )}

            {/* 验证错误详情 */}
            {error.context?.validationErrors && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong>验证错误详情：</Text>
                  <div style={{ marginTop: 8 }}>
                    {Object.entries(error.context.validationErrors).map(([field, errors]) => (
                      <div key={field} style={{ marginBottom: 8 }}>
                        <Tag color="orange">{field}</Tag>
                        <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                          {Array.isArray(errors) ? errors.map((err, index) => (
                            <li key={index}>
                              <Text type="secondary">{err}</Text>
                            </li>
                          )) : (
                            <li>
                              {/* ✅ FIXED - Type assertion for unknown to ReactNode (TS2322) */}
                              <Text type="secondary">{String(errors)}</Text>
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Space>
        </Card>
      )}

      {/* 自定义内容 */}
      {children}
    </div>
  );
};

// 操作进度反馈组件
interface OperationProgressProps {
  title: string;
  progress: number;
  status?: 'active' | 'success' | 'exception';
  description?: string;
  steps?: Array<{
    title: string;
    status: 'wait' | 'process' | 'finish' | 'error';
    description?: string;
  }>;
  onCancel?: () => void;
}

export const OperationProgress: React.FC<OperationProgressProps> = ({
  title,
  progress,
  status = 'active',
  description,
  steps,
  onCancel,
}) => {
  return (
    <Card 
      title={title}
      extra={
        onCancel && status === 'active' && (
          <Button  onClick={onCancel}>
            取消
          </Button>
        )
      }
    >
      <Progress 
        percent={progress} 
        status={status}
        strokeColor={
          status === 'success' ? '#52c41a' :
          status === 'exception' ? '#ff4d4f' : 
          '#1890ff'
        }
      />
      
      {description && (
        <Paragraph type="secondary" style={{ marginTop: 8 }}>
          {description}
        </Paragraph>
      )}

      {steps && steps.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong>详细步骤：</Text>
          <div style={{ marginTop: 8 }}>
            {steps.map((step, index) => (
              <div key={index} style={{ marginBottom: 8, paddingLeft: 16 }}>
                <Space>
                  {step.status === 'finish' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {step.status === 'process' && <LoadingOutlined spin style={{ color: '#1890ff' }} />}
                  {step.status === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  {step.status === 'wait' && <InfoCircleOutlined style={{ color: '#d9d9d9' }} />}
                  <Text type={step.status === 'error' ? 'danger' : 'secondary'}>
                    {step.title}
                  </Text>
                </Space>
                {step.description && (
                  <div style={{ marginLeft: 20, marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {step.description}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

// 验证错误显示组件
interface ValidationErrorDisplayProps {
  errors: Record<string, string | string[]>;
  title?: string;
  onDismiss?: () => void;
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  title = '表单验证错误',
  onDismiss,
}) => {
  if (!errors || Object.keys(errors).length === 0) {
    return null;
  }

  return (
    <Alert
      type="warning"
      icon={<ExclamationCircleOutlined />}
      message={title}
      description={
        <div style={{ marginTop: 8 }}>
          {Object.entries(errors).map(([field, fieldErrors]) => (
            <div key={field} style={{ marginBottom: 8 }}>
              <Tag color="orange">{field}:</Tag>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                {Array.isArray(fieldErrors) ? fieldErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                )) : (
                  <li>{fieldErrors}</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      }
      closable={!!onDismiss}
      onClose={onDismiss}
      showIcon
    />
  );
};

// 网络状态指示器
interface NetworkStatusProps {
  online: boolean;
  lastSync?: Date;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  online,
  lastSync,
}) => {
  return (
    <Space>
      <Tag color={online ? 'green' : 'red'}>
        {online ? '在线' : '离线'}
      </Tag>
      {lastSync && (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          最后同步: {lastSync.toLocaleTimeString()}
        </Text>
      )}
    </Space>
  );
};

// 空状态显示组件
interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  image?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description = '当前没有相关数据可显示',
  action,
  image,
}) => {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '48px 24px',
      color: 'rgba(0, 0, 0, 0.45)'
    }}>
      {image && (
        <div style={{ marginBottom: 16 }}>
          {image}
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: '16px', color: 'rgba(0, 0, 0, 0.65)' }}>
          {title}
        </Text>
      </div>
      {description && (
        <div style={{ marginBottom: action ? 16 : 0 }}>
          <Text type="secondary">{description}</Text>
        </div>
      )}
      {action}
    </div>
  );
};

export default {
  UserFeedbackCard,
  OperationProgress,
  ValidationErrorDisplay,
  NetworkStatus,
  EmptyState,
};