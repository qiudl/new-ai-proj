import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Select,
  Card,
  Space,
  Typography,
  Alert,
  message,
  Descriptions,
  Tag,
  Spin,
  List,
  Avatar,
  Popconfirm,
  Input
} from 'antd';
import {
  UserSwitchOutlined,
  LogoutOutlined,
  HistoryOutlined,
  SafetyOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { User } from '../types/user';
import { ImpersonationHistoryItem } from '../types/impersonation';
import { useImpersonation } from '../contexts/ImpersonationContext';

const { Title, Text } = Typography;
const { Option } = Select;

interface Enterprise {
  id: number;
  name: string;
  code: string;
  status: string;
  user_count?: number;
}

interface ImpersonationStatus {
  is_impersonating: boolean;
  session?: {
    sessionId: string;
    enterpriseId: number;
    enterpriseName: string;
    startedAt: string;
    expiresAt: string;
  };
}

// Using the global ImpersonationHistoryItem interface from types/impersonation.ts

const EnterpriseImpersonation: React.FC = () => {
  // 使用新的 ImpersonationProvider 系统
  const {
    isImpersonating,
    impersonationStatus,
    loading: impersonationLoading,
    startImpersonation,
    exitImpersonation,
    getImpersonationHistory,
    triggerTokenChangeEvent
  } = useImpersonation();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ImpersonationHistoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<number | undefined>();
  const [reason, setReason] = useState<string>('');

  // 初始化用户和token
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('currentUser');
    
    setToken(storedToken);
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
      }
    }
  }, []);

  // 检查是否为系统管理员
  const isSystemAdmin = user?.role === 'admin' && user?.user_type === 'system';

  // 获取企业列表
  const fetchEnterprises = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/v1/system/enterprises', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setEnterprises(result.data?.data || []);
      } else if (response.status === 404 || response.status === 403) {
        // 权限不足或API不可用，静默处理
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ 企业列表API不可用（权限不足）');
        }
        setEnterprises([]);
      } else {
        throw new Error('获取企业列表失败');
      }
    } catch (error) {
      // 仅在非网络错误时显示消息
      if (error instanceof Error && error.message !== '获取企业列表失败') {
        console.error('Failed to fetch enterprises:', error);
      }
    }
  };

  // 注意：现在使用 ImpersonationProvider 的状态，不需要手动获取

  // 使用 ImpersonationProvider 的 getImpersonationHistory 方法
  const fetchImpersonationHistory = async () => {
    try {
      const historyData = await getImpersonationHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch impersonation history:', error);
      message.error('获取模拟历史失败');
    }
  };

  // 使用 ImpersonationProvider 的 startImpersonation 方法
  const handleStartImpersonation = async () => {
    if (!selectedEnterpriseId) return;

    const reasonToSend = reason.trim();
    if (reasonToSend.length < 10) {
      message.warning('请填写至少10个字的模拟原因');
      return;
    }

    try {
      await startImpersonation(selectedEnterpriseId, reasonToSend);
      // 成功后关闭模态框
      setShowModal(false);
      setSelectedEnterpriseId(undefined);
      setReason('');
      
      // 手动触发token变化事件，确保状态同步
      triggerTokenChangeEvent();
      
    } catch (error) {
      // 错误处理已在 ImpersonationProvider 中完成
      console.error('Start impersonation failed:', error);
    }
  };

  // 使用 ImpersonationProvider 的 exitImpersonation 方法
  const handleExitImpersonation = async () => {
    try {
      await exitImpersonation();
      
      // 手动触发token变化事件，确保状态同步
      triggerTokenChangeEvent();
      
    } catch (error) {
      // 错误处理已在 ImpersonationProvider 中完成
      console.error('Exit impersonation failed:', error);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (isSystemAdmin) {
      fetchEnterprises();
      // 不需要手动获取模拟状态，ImpersonationProvider 会自动处理
    }
  }, [isSystemAdmin, token]);

  // 如果不是系统管理员，不显示组件
  if (!isSystemAdmin) {
    return null;
  }

  return (
    <>
      <Space>
        {isImpersonating ? (
          <Card  style={{ backgroundColor: '#fff2e8', border: '1px solid #ffbb96' }}>
            <Space>
              <SafetyOutlined style={{ color: '#fa541c' }} />
              <div>
                <Text strong style={{ color: '#fa541c' }}>
                  正在模拟: {impersonationStatus?.enterprise?.name}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  开始于: {impersonationStatus?.session?.started_at ? new Date(impersonationStatus.session.started_at).toLocaleString() : ''}
                </Text>
              </div>
              <Popconfirm
                title="确定要退出企业模拟吗？"
                description="退出后将恢复原始管理员权限"
                onConfirm={handleExitImpersonation}
                okText="退出"
                cancelText="取消"
              >
                <Button
                  type="primary"
                  danger
                  
                  icon={<LogoutOutlined />}
                  loading={impersonationLoading}
                >
                  退出模拟
                </Button>
              </Popconfirm>
            </Space>
          </Card>
        ) : (
          <Button
            type="primary"
            icon={<UserSwitchOutlined />}
            onClick={() => setShowModal(true)}
          >
            企业模拟
          </Button>
        )}
        
        <Button
          icon={<HistoryOutlined />}
          onClick={() => {
            fetchImpersonationHistory();
            setShowHistoryModal(true);
          }}
        >
          模拟历史
        </Button>
      </Space>

      {/* 开始模拟的模态框 */}
      <Modal
        title="企业用户模拟"
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setSelectedEnterpriseId(undefined);
          setReason('');
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowModal(false)}>
            取消
          </Button>,
          <Button
            key="start"
            type="primary"
            loading={impersonationLoading}
            disabled={!selectedEnterpriseId || !reason || reason.trim().length < 10}
            onClick={handleStartImpersonation}
          >
            开始模拟
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="企业模拟功能说明"
            description={
              <div>
                <p>• 模拟会话有时间限制，到期后自动退出</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div>
            <Text strong>选择要模拟的企业:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="请选择企业"
              value={selectedEnterpriseId}
              onChange={setSelectedEnterpriseId}
              showSearch
              
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
              dropdownStyle={{ zIndex: 9999 }}
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            >
              {enterprises.map(enterprise => (
                <Option key={enterprise.id} value={enterprise.id}>
                  <Space>
                    <Tag color={enterprise.status === 'active' ? 'green' : 'red'}>
                      {enterprise.code}
                    </Tag>
                    {enterprise.name}
                    {enterprise.user_count && (
                      <Text type="secondary">({enterprise.user_count}个用户)</Text>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>填写模拟原因（至少10个字）:</Text>
            <Input.TextArea
              style={{ width: '100%', marginTop: 8 }}
              placeholder="例如：用于排查企业权限问题或复现用户反馈的Bug"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              showCount
              maxLength={500}
            />
          </div>

          {selectedEnterpriseId && (
            <Card  title="选中企业信息">
              {(() => {
                const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
                return selectedEnterprise ? (
                  <Descriptions column={1} >
                    <Descriptions.Item label="企业名称">
                      {selectedEnterprise.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="企业代码">
                      {selectedEnterprise.code}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={selectedEnterprise.status === 'active' ? 'green' : 'red'}>
                        {selectedEnterprise.status === 'active' ? '活跃' : '非活跃'}
                      </Tag>
                    </Descriptions.Item>
                    {selectedEnterprise.user_count && (
                      <Descriptions.Item label="用户数量">
                        {selectedEnterprise.user_count}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                ) : null;
              })()}
            </Card>
          )}
        </Space>
      </Modal>

      {/* 模拟历史模态框 */}
      <Modal
        title="企业模拟历史"
        open={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowHistoryModal(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <List
          dataSource={history}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<BuildOutlined />} />}
                title={
                  <Space>
                    <Text strong>{item.enterpriseName}</Text>
                    {item.sessionId && <Tag>{item.sessionId.slice(0, 8)}</Tag>}
                    <Tag color={item.status === 'active' ? 'green' : item.status === 'ended' ? 'blue' : 'orange'}>
                      {item.status === 'active' ? '进行中' : item.status === 'ended' ? '已结束' : item.status}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    {item.startedAt && (
                      <Text type="secondary">
                        开始时间: {new Date(item.startedAt).toLocaleString()}
                      </Text>
                    )}
                    {item.endedAt && (
                      <Text type="secondary">
                        结束时间: {new Date(item.endedAt).toLocaleString()}
                      </Text>
                    )}
                    {item.duration && (
                      <Text type="secondary">持续时间: {item.duration}</Text>
                    )}
                    {item.reason && (
                      <Text type="secondary">原因: {item.reason}</Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无模拟历史记录' }}
        />
      </Modal>
    </>
  );
};

export default EnterpriseImpersonation;