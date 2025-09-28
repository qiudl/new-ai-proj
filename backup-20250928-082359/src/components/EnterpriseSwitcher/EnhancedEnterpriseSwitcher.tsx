import React, { useState, useEffect, useMemo } from 'react';
import { 
  Modal, 
  List, 
  Button, 
  Space, 
  Typography, 
  Alert,
  Spin,
  Empty,
  Tooltip,
  Avatar,
  Badge,
  Tag,
  Input,
  Divider,
  Card,
  Statistic
} from 'antd';
import { 
  BuildOutlined, 
  UserOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { EnterpriseSwitcherProps, EnterpriseOption } from '../../types/impersonation';
import { useEnterprise } from '../../contexts/EnterpriseContext';
import { useImpersonationState } from '../../hooks/useImpersonationState';
import EnterpriseFilter, { EnterpriseFilterOptions } from './EnterpriseFilter';
import './EnterpriseSwitcher.css';

const { Text, Title, Paragraph } = Typography;

/**
 * 增强版企业切换器组件
 * 包含高级过滤、搜索和统计功能
 */
const EnhancedEnterpriseSwitcher: React.FC<EnterpriseSwitcherProps> = ({
  visible,
  onClose,
  onSelect
}) => {
  const { enterprises, loading: enterpriseLoading, refreshEnterprises } = useEnterprise();
  const { 
    startImpersonation, 
    loading: impersonationLoading, 
    permissions,
    enterpriseInfo,
    getImpersonationHistory
  } = useImpersonationState();

  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  
  // 过滤器状态
  const [filters, setFilters] = useState<EnterpriseFilterOptions>({
    searchTerm: '',
    statusFilter: [],
    userCountRange: [0, 100],
    sortBy: 'name',
    sortOrder: 'asc',
    showCurrentlyImpersonated: false
  });

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

  // 应用过滤和排序
  const filteredAndSortedEnterprises = useMemo(() => {
    let filtered = enterpriseOptions;

    // 搜索过滤
    if (filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(enterprise => 
        enterprise.name.toLowerCase().includes(term) ||
        enterprise.code.toLowerCase().includes(term) ||
        enterprise.description?.toLowerCase().includes(term)
      );
    }

    // 状态过滤
    if (filters.statusFilter.length > 0) {
      filtered = filtered.filter(enterprise => 
        filters.statusFilter.includes(enterprise.status)
      );
    }

    // 用户数量范围过滤
    filtered = filtered.filter(enterprise => {
      const userCount = enterprise.userCount || 0;
      return userCount >= filters.userCountRange[0] && userCount <= filters.userCountRange[1];
    });

    // 当前模拟企业过滤
    if (filters.showCurrentlyImpersonated) {
      filtered = filtered.filter(enterprise => enterprise.isCurrentlyImpersonated);
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'userCount':
          aValue = a.userCount || 0;
          bValue = b.userCount || 0;
          break;
        case 'status':
          const statusOrder = { active: 0, inactive: 1, suspended: 2 };
          aValue = statusOrder[a.status] || 3;
          bValue = statusOrder[b.status] || 3;
          break;
        default:
          return 0;
      }

      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [enterpriseOptions, filters]);

  // 统计信息
  const statistics = useMemo(() => {
    const total = enterpriseOptions.length;
    const active = enterpriseOptions.filter(e => e.status === 'active').length;
    const inactive = enterpriseOptions.filter(e => e.status === 'inactive').length;
    const totalUsers = enterpriseOptions.reduce((sum, e) => sum + (e.userCount || 0), 0);
    const currentlyImpersonated = enterpriseOptions.filter(e => e.isCurrentlyImpersonated).length;

    return {
      total,
      active,
      inactive,
      totalUsers,
      currentlyImpersonated,
      filtered: filteredAndSortedEnterprises.length
    };
  }, [enterpriseOptions, filteredAndSortedEnterprises.length]);

  // 重置状态
  const resetState = () => {
    setSelectedEnterpriseId(null);
    setReason('');
    setShowReasonInput(false);
    setFilters({
      searchTerm: '',
      statusFilter: [],
      userCountRange: [0, 100],
      sortBy: 'name',
      sortOrder: 'asc',
      showCurrentlyImpersonated: false
    });
  };

  // 重置过滤器
  const resetFilters = () => {
    const userCounts = enterpriseOptions.map(e => e.userCount || 0);
    const minUsers = Math.min(...userCounts);
    const maxUsers = Math.max(...userCounts);
    
    setFilters({
      searchTerm: '',
      statusFilter: [],
      userCountRange: [minUsers, Math.max(maxUsers, 10)],
      sortBy: 'name',
      sortOrder: 'asc',
      showCurrentlyImpersonated: false
    });
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

  // 获取状态文本和颜色
  const getStatusInfo = (status: EnterpriseOption['status']) => {
    switch (status) {
      case 'active':
        return { text: '活跃', color: 'success' };
      case 'inactive':
        return { text: '不活跃', color: 'warning' };
      case 'suspended':
        return { text: '已暂停', color: 'error' };
      default:
        return { text: '未知', color: 'default' };
    }
  };

  // 加载最近历史
  const loadRecentHistory = async () => {
    try {
      const history = await getImpersonationHistory(1, 3);
      setRecentHistory(history);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  // 初始化
  useEffect(() => {
    if (visible) {
      refreshEnterprises();
      loadRecentHistory();
      
      // 设置初始用户数量范围
      const userCounts = enterprises.map(e => e.user_count || 0);
      if (userCounts.length > 0) {
        const minUsers = Math.min(...userCounts);
        const maxUsers = Math.max(...userCounts);
        setFilters(prev => ({
          ...prev,
          userCountRange: [minUsers, Math.max(maxUsers, 10)]
        }));
      }
    }
  }, [visible, refreshEnterprises, getImpersonationHistory, enterprises]);

  return (
    <Modal
      title={
        <Space>
          <BuildOutlined />
          {showReasonInput ? '输入模拟原因' : '企业模拟切换器'}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={900}
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
            <Text type="secondary" style={{ fontSize: '12px' }}>
              显示 {statistics.filtered} / {statistics.total} 个企业
            </Text>
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
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Title level={4}>
                <BuildOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                将要模拟企业: {enterpriseOptions.find(e => e.id === selectedEnterpriseId)?.name}
              </Title>
              <Space direction="vertical" >
                <Text type="secondary">
                  企业代码: <Text code>{enterpriseOptions.find(e => e.id === selectedEnterpriseId)?.code}</Text>
                </Text>
                <Text type="secondary">
                  用户数量: <Text strong>{enterpriseOptions.find(e => e.id === selectedEnterpriseId)?.userCount || 0}</Text> 人
                </Text>
              </Space>
            </div>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <Text strong>模拟原因 <Text type="danger">*</Text></Text>
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
          </Card>
        </div>
      ) : (
        // 企业列表界面
        <>
          {/* 统计信息 */}
          <Card  style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Statistic title="总企业数" value={statistics.total} prefix={<TeamOutlined />} />
              <Statistic title="活跃企业" value={statistics.active} valueStyle={{ color: '#52c41a' }} />
              <Statistic title="总用户数" value={statistics.totalUsers} prefix={<UserOutlined />} />
              {statistics.currentlyImpersonated > 0 && (
                <Statistic 
                  title="正在模拟" 
                  value={statistics.currentlyImpersonated} 
                  valueStyle={{ color: '#ff4d4f' }} 
                />
              )}
            </div>
          </Card>

          {/* 过滤器 */}
          <EnterpriseFilter
            enterprises={enterpriseOptions}
            filters={filters}
            onFiltersChange={setFilters}
            onReset={resetFilters}
          />

          {/* 最近历史 */}
          {recentHistory.length > 0 && (
            <Card  title={<><HistoryOutlined /> 最近模拟记录</>} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {recentHistory.map((item, index) => (
                  <Tag 
                    key={index} 
                    color="blue" 
                    style={{ margin: '2px', cursor: 'pointer' }}
                    onClick={() => {
                      setFilters(prev => ({ ...prev, searchTerm: item.enterprise_name }));
                    }}
                  >
                    {item.enterprise_name}
                  </Tag>
                ))}
              </div>
            </Card>
          )}

          {/* 企业列表 */}
          <div className="enterprise-list-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <Spin spinning={enterpriseLoading}>
              {filteredAndSortedEnterprises.length === 0 ? (
                <Empty 
                  description={
                    filters.searchTerm || filters.statusFilter.length > 0 || filters.showCurrentlyImpersonated 
                      ? '未找到符合条件的企业' 
                      : '暂无企业数据'
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  dataSource={filteredAndSortedEnterprises}
                  renderItem={(enterprise, index) => {
                    const statusInfo = getStatusInfo(enterprise.status);
                    return (
                      <List.Item
                        key={enterprise.id}
                        className={`enterprise-list-item ${enterprise.isCurrentlyImpersonated ? 'currently-impersonated' : ''}`}
                        style={{ '--item-index': index } as any}
                        actions={[
                          <Tooltip title={
                            enterprise.isCurrentlyImpersonated 
                              ? '当前正在模拟此企业' 
                              : enterprise.status !== 'active' 
                                ? '企业未激活，无法模拟' 
                                : '点击开始模拟此企业'
                          }>
                            <Button
                              type={enterprise.isCurrentlyImpersonated ? 'default' : 'primary'}
                              
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
                                style={{ 
                                  backgroundColor: enterprise.status === 'active' ? '#1890ff' : '#d9d9d9' 
                                }}
                              />
                            </Badge>
                          }
                          title={
                            <Space wrap>
                              <Text strong style={{ fontSize: '16px' }}>{enterprise.name}</Text>
                              <Tag color={statusInfo.color} >
                                {getStatusIcon(enterprise.status)}
                                {statusInfo.text}
                              </Tag>
                              {enterprise.isCurrentlyImpersonated && (
                                <Tag color="red" >正在模拟</Tag>
                              )}
                            </Space>
                          }
                          description={
                            <div>
                              <div style={{ marginBottom: 6 }}>
                                <Space wrap>
                                  <Text type="secondary">
                                    <Text strong>代码:</Text> 
                                    <Text code>{enterprise.code || '未设置'}</Text>
                                  </Text>
                                  <Text type="secondary">
                                    <UserOutlined /> {enterprise.userCount || 0} 用户
                                  </Text>
                                </Space>
                              </div>
                              {enterprise.description && (
                                <Paragraph 
                                  ellipsis={{ rows: 2, tooltip: true }}
                                  type="secondary" 
                                  style={{ marginBottom: 0, fontSize: '12px' }}
                                >
                                  {enterprise.description}
                                </Paragraph>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </Spin>
          </div>
        </>
      )}
    </Modal>
  );
};

export default EnhancedEnterpriseSwitcher;