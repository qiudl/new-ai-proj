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

interface ImpersonationHistoryItem {
  sessionId: string;
  enterpriseId: number;
  enterpriseName: string;
  startedAt: string;
  endedAt: string;
  duration: string;
}

const EnterpriseImpersonation: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ImpersonationStatus>({ is_impersonating: false });
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
      const response = await fetch('/api/v1/enterprises', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setEnterprises(result.data?.data || []);
      } else {
        throw new Error('获取企业列表失败');
      }
    } catch (error) {
      console.error('Failed to fetch enterprises:', error);
      message.error('获取企业列表失败');
    }
  };

  // 获取模拟状态
  const fetchImpersonationStatus = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/v1/admin/impersonate/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        // 后端返回的是扁平结构：{ is_impersonating, enterprise, original_user, session }
        // 这里做一次映射，适配当前组件的期望结构
        if (result && result.is_impersonating) {
          const enterprise = result.enterprise || {};
          const session = result.session || {};
          const mapped = {
            is_impersonating: true,
            session: {
              sessionId: session.id || session.session_id || session.sessionId,
              enterpriseId: enterprise.id || session.enterprise_id,
              enterpriseName: enterprise.name || session.enterprise_name,
              startedAt: session.started_at || session.startedAt,
              expiresAt: session.expires_at || session.expiresAt,
            }
          } as ImpersonationStatus;
          setStatus(mapped);
        } else {
          setStatus({ is_impersonating: false });
        }
      } else {
        console.warn('Impersonation API not available, using fallback');
        setStatus({ is_impersonating: false });
      }
    } catch (error) {
      console.error('Failed to fetch impersonation status:', error);
      setStatus({ is_impersonating: false });
    }
  };

  // 获取模拟历史
  const fetchImpersonationHistory = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/v1/admin/impersonate/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setHistory(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch impersonation history:', error);
      message.error('获取模拟历史失败');
    }
  };

  // 开始企业模拟
  const startImpersonation = async () => {
    if (!selectedEnterpriseId || !token) return;

    const reasonToSend = reason.trim();
    if (reasonToSend.length < 10) {
      message.warning('请填写至少10个字的模拟原因');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/impersonate/enterprise/${selectedEnterpriseId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reasonToSend })
      });

      if (response.ok) {
        const result = await response.json();
        // 持久化新的模拟令牌（如果返回）
        if (result.token) {
          try {
            localStorage.setItem('token', result.token);
          } catch (e) {
            console.warn('无法保存模拟令牌到本地存储:', e);
          }
        }
        message.success('企业模拟开始成功');
        setShowModal(false);
        setSelectedEnterpriseId(undefined);
        setReason('');
        fetchImpersonationStatus();
        // 刷新页面以应用新的权限上下文
        window.location.reload();
      } else if (response.status === 401) {
        message.error('权限不足：企业模拟功能需要系统管理员权限');
      } else {
        const errorData = await response.json().catch(() => ({ message: '未知错误' }));
        message.error(`开始模拟失败: ${errorData.message || response.statusText}`);
      }
    } catch (error: any) {
      console.error('Failed to start impersonation:', error);
      message.error('网络错误：无法连接到服务器，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 退出企业模拟
  const exitImpersonation = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/impersonate/exit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('已退出企业模拟');
        fetchImpersonationStatus();
        // 刷新页面以恢复原始权限上下文
        window.location.reload();
      } else {
        const error = await response.json();
        throw new Error(error.message || '退出模拟失败');
      }
    } catch (error: any) {
      console.error('Failed to exit impersonation:', error);
      message.error('退出模拟失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (isSystemAdmin) {
      fetchEnterprises();
      fetchImpersonationStatus();
    }
  }, [isSystemAdmin, token]);

  // 如果不是系统管理员，不显示组件
  if (!isSystemAdmin) {
    return null;
  }

  return (
    <>
      <Space>
        {status.is_impersonating ? (
          <Card size="small" style={{ backgroundColor: '#fff2e8', border: '1px solid #ffbb96' }}>
            <Space>
              <SafetyOutlined style={{ color: '#fa541c' }} />
              <div>
                <Text strong style={{ color: '#fa541c' }}>
                  正在模拟: {status.session?.enterpriseName}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  开始于: {status.session?.startedAt ? new Date(status.session.startedAt).toLocaleString() : ''}
                </Text>
              </div>
              <Popconfirm
                title="确定要退出企业模拟吗？"
                description="退出后将恢复原始管理员权限"
                onConfirm={exitImpersonation}
                okText="退出"
                cancelText="取消"
              >
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<LogoutOutlined />}
                  loading={loading}
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
            loading={loading}
            disabled={!selectedEnterpriseId || !reason || reason.trim().length < 10}
            onClick={startImpersonation}
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
                <p>• 模拟功能允许系统管理员以企业用户身份访问系统</p>
                <p>• 模拟期间，您将拥有该企业的权限和数据视图</p>
                <p>• 所有操作都会被审计记录，确保安全性</p>
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
              optionFilterProp="children"
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
            <Card size="small" title="选中企业信息">
              {(() => {
                const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId);
                return selectedEnterprise ? (
                  <Descriptions column={1} size="small">
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
                    <Tag>{item.sessionId.slice(0, 8)}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">
                      开始: {new Date(item.startedAt).toLocaleString()}
                    </Text>
                    <Text type="secondary">
                      结束: {new Date(item.endedAt).toLocaleString()}
                    </Text>
                    <Text type="secondary">持续时间: {item.duration}</Text>
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