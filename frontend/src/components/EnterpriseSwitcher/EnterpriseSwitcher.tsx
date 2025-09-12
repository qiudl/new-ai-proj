import React, { useState, useEffect, useMemo } from 'react';
import { 
  Modal, 
  Input, 
  List, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Alert,
  Spin,
  Empty,
  Tooltip,
  Avatar,
  Badge
} from 'antd';
import { 
  SearchOutlined, 
  BuildOutlined, 
  UserOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { EnterpriseSwitcherProps, EnterpriseOption } from '../../types/impersonation';
import { useEnterprise } from '../../contexts/EnterpriseContext';
import { useImpersonationState } from '../../hooks/useImpersonationState';
import './EnterpriseSwitcher.css';

const { Search } = Input;
const { Text, Title } = Typography;

/**
 * 企业切换器组件
 * 用于系统管理员选择要模拟的企业
 */
const EnterpriseSwitcher: React.FC<EnterpriseSwitcherProps> = ({
  visible,
  onClose,
  onSelect
}) => {
  const { enterprises, loading: enterpriseLoading, refreshEnterprises } = useEnterprise();
  const { 
    startImpersonation, 
    loading: impersonationLoading, 
    permissions,
    enterpriseInfo
  } = useImpersonationState();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  // 将enterprises转换为EnterpriseOption格式
  const enterpriseOptions: EnterpriseOption[] = useMemo(() => {
    return enterprises.map(enterprise => ({
      id: enterprise.id,
      name: enterprise.name,
      code: enterprise.code || '',
      description: enterprise.description || '',
      status: enterprise.status === 'active' ? 'active' : 'inactive',
      userCount: enterprise.user_count || 0,
      isCurrentlyImpersonated: enterpriseInfo?.id === enterprise.id
    }));
  }, [enterprises, enterpriseInfo?.id]);

  // 过滤企业列表
  const filteredEnterprises = useMemo(() => {
    if (!searchTerm) return enterpriseOptions;
    
    const term = searchTerm.toLowerCase();
    return enterpriseOptions.filter(enterprise => 
      enterprise.name.toLowerCase().includes(term) ||
      enterprise.code.toLowerCase().includes(term) ||
      enterprise.description?.toLowerCase().includes(term)
    );
  }, [enterpriseOptions, searchTerm]);

  // 重置状态
  const resetState = () => {
    setSearchTerm('');
    setSelectedEnterpriseId(null);
    setReason('');
    setShowReasonInput(false);
  };

  // 处理企业选择
  const handleEnterpriseSelect = (enterpriseId: number) => {
    if (!permissions.canStartImpersonation) {
      return;
    }

    setSelectedEnterpriseId(enterpriseId);
    setShowReasonInput(true);
  };

  // 处理模拟开始
  const handleStartImpersonation = async () => {
    if (!selectedEnterpriseId || !reason.trim()) {
      return;
    }

    try {
      await startImpersonation(selectedEnterpriseId, reason.trim());
      onSelect(selectedEnterpriseId);
      onClose();
      resetState();
    } catch (error) {
      // 错误已在Context中处理
      console.error('启动模拟失败:', error);
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (showReasonInput) {
      setShowReasonInput(false);
      setSelectedEnterpriseId(null);
      setReason('');
    } else {
      onClose();
      resetState();
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: EnterpriseOption['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'inactive':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'suspended':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: EnterpriseOption['status']) => {
    switch (status) {
      case 'active':
        return '活跃';
      case 'inactive':
        return '不活跃';
      case 'suspended':
        return '已暂停';
      default:
        return '未知';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: EnterpriseOption['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  // 初始化时刷新企业列表
  useEffect(() => {
    if (visible) {
      refreshEnterprises();
    }
  }, [visible, refreshEnterprises]);

  return (
    <Modal
      title={
        <Space>
          <BuildOutlined />
          {showReasonInput ? '输入模拟原因' : '选择要模拟的企业'}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={700}
      className="enterprise-switcher-modal"
      footer={
        showReasonInput ? (
          <Space>
            <Button onClick={handleCancel}>
              返回
            </Button>
            <Button 
              type="primary" 
              onClick={handleStartImpersonation}
              loading={impersonationLoading}
              disabled={!reason.trim()}
            >
              开始模拟
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={onClose}>
              取消
            </Button>
            <Button onClick={refreshEnterprises} loading={enterpriseLoading}>
              刷新列表
            </Button>
          </Space>
        )
      }
    >
      {!permissions.canStartImpersonation && (
        <Alert
          message="权限不足"
          description="您没有权限开始企业模拟，请联系系统管理员"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {showReasonInput ? (
        // 原因输入界面
        <div className="reason-input-section">
          <div style={{ marginBottom: 16 }}>
            <Title level={4}>
              将要模拟企业: {enterpriseOptions.find(e => e.id === selectedEnterpriseId)?.name}
            </Title>
            <Text type="secondary">
              企业代码: {enterpriseOptions.find(e => e.id === selectedEnterpriseId)?.code}
            </Text>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>请输入模拟原因:</Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: '12px' }}>
              请详细说明模拟该企业的原因，此信息将被记录到审计日志中
            </Text>
          </div>

          <Input.TextArea
            placeholder="例如：协助客户解决权限问题、调试企业特定功能、进行系统维护..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={500}
            showCount
            disabled={!permissions.canStartImpersonation}
          />

          <Alert
            message="重要提醒"
            description="模拟期间，您的所有操作都将被审计记录。请确保只执行必要的操作，并在完成后及时退出模拟状态。"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        </div>
      ) : (
        // 企业列表界面
        <>
          <div style={{ marginBottom: 16 }}>
            <Search
              placeholder="搜索企业名称、代码或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>

          <div className="enterprise-list-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Spin spinning={enterpriseLoading}>
              {filteredEnterprises.length === 0 ? (
                <Empty 
                  description={searchTerm ? '未找到匹配的企业' : '暂无企业数据'}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  dataSource={filteredEnterprises}
                  renderItem={(enterprise) => (
                    <List.Item
                      key={enterprise.id}
                      className={`enterprise-list-item ${enterprise.isCurrentlyImpersonated ? 'currently-impersonated' : ''}`}
                      actions={[
                        <Tooltip title={enterprise.isCurrentlyImpersonated ? '当前正在模拟此企业' : ''}>
                          <Button
                            type={enterprise.isCurrentlyImpersonated ? 'default' : 'primary'}
                            size="small"
                            onClick={() => handleEnterpriseSelect(enterprise.id)}
                            disabled={!permissions.canStartImpersonation || enterprise.status !== 'active'}
                          >
                            {enterprise.isCurrentlyImpersonated ? '当前模拟' : '选择模拟'}
                          </Button>
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge dot={enterprise.isCurrentlyImpersonated} color="red">
                            <Avatar 
                              icon={<BuildOutlined />} 
                              style={{ backgroundColor: enterprise.status === 'active' ? '#1890ff' : '#d9d9d9' }}
                            />
                          </Badge>
                        }
                        title={
                          <Space>
                            <Text strong>{enterprise.name}</Text>
                            <Tag color={getStatusColor(enterprise.status)} size="small">
                              {getStatusIcon(enterprise.status)}
                              {getStatusText(enterprise.status)}
                            </Tag>
                            {enterprise.isCurrentlyImpersonated && (
                              <Tag color="red" size="small">正在模拟</Tag>
                            )}
                          </Space>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <Text type="secondary">企业代码: </Text>
                              <Text code>{enterprise.code || '未设置'}</Text>
                            </div>
                            {enterprise.description && (
                              <div style={{ marginBottom: 4 }}>
                                <Text type="secondary">{enterprise.description}</Text>
                              </div>
                            )}
                            <Space size="small">
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <UserOutlined /> {enterprise.userCount || 0} 用户
                              </Text>
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </div>

          {!enterpriseLoading && filteredEnterprises.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                共找到 {filteredEnterprises.length} 个企业
                {searchTerm && ` (搜索: "${searchTerm}")`}
              </Text>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default EnterpriseSwitcher;