import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Typography,
  Card,
  List,
  Avatar,
  Tag,
  Tooltip,
  Divider,
  message,
  QRCode,
  Tabs,
  DatePicker,
  Row,
  Col,
  Badge
} from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  MailOutlined,
  MessageOutlined,
  QrcodeOutlined,
  LinkOutlined,
  UserOutlined,
  TeamOutlined,
  GlobalOutlined,
  LockOutlined,
  EyeOutlined,
  EditOutlined,
  CalendarOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './DocumentShareModal.css';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

export interface SharePermission {
  type: 'view' | 'edit' | 'comment';
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface ShareRecipient {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  permission: string;
  addedAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface ShareLink {
  id: string;
  url: string;
  permission: string;
  expiresAt?: string;
  createdAt: string;
  accessCount: number;
  isActive: boolean;
}

export interface DocumentShareModalProps {
  visible: boolean;
  documentTitle: string;
  documentId: string;
  onCancel: () => void;
  onShare?: (recipients: string[], permission: string, message?: string) => void;
  onCreateLink?: (permission: string, expiresAt?: string) => Promise<string>;
  onRevokeLink?: (linkId: string) => void;
  className?: string;
}

const DocumentShareModal: React.FC<DocumentShareModalProps> = ({
  visible,
  documentTitle,
  documentId,
  onCancel,
  onShare,
  onCreateLink,
  onRevokeLink,
  className = ''
}) => {
  // 表单实例
  const [form] = Form.useForm();
  
  // 状态管理
  const [activeTab, setActiveTab] = useState('people');
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('view');
  
  // 权限配置
  const permissions: SharePermission[] = [
    {
      type: 'view',
      label: '查看',
      icon: <EyeOutlined />,
      description: '只能查看文档内容，无法编辑或评论'
    },
    {
      type: 'comment',
      label: '评论',
      icon: <MessageOutlined />,
      description: '可以查看文档并添加评论，无法编辑'
    },
    {
      type: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      description: '可以查看、评论和编辑文档内容'
    }
  ];

  // 模拟数据
  const mockRecipients: ShareRecipient[] = [
    {
      id: '1',
      name: '张三',
      email: 'zhangsan@example.com',
      permission: 'edit',
      addedAt: '2025-01-01T10:00:00Z',
      status: 'accepted'
    },
    {
      id: '2',
      name: '李四',
      email: 'lisi@example.com',
      permission: 'comment',
      addedAt: '2025-01-01T11:00:00Z',
      status: 'pending'
    }
  ];

  const mockShareLinks: ShareLink[] = [
    {
      id: '1',
      url: `https://docs.example.com/shared/${documentId}?token=abc123`,
      permission: 'view',
      expiresAt: '2025-02-01T00:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      accessCount: 15,
      isActive: true
    }
  ];

  // 初始化数据
  React.useEffect(() => {
    if (visible) {
      setRecipients(mockRecipients);
      setShareLinks(mockShareLinks);
    }
  }, [visible]);

  // 添加收件人
  const handleAddRecipients = useCallback(async () => {
    if (selectedEmails.length === 0) {
      message.warning('请选择要分享的用户');
      return;
    }

    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newRecipients: ShareRecipient[] = selectedEmails.map(email => ({
        id: Date.now().toString() + Math.random(),
        name: email.split('@')[0],
        email,
        permission: selectedPermission,
        addedAt: new Date().toISOString(),
        status: 'pending' as const
      }));

      setRecipients(prev => [...prev, ...newRecipients]);
      onShare?.(selectedEmails, selectedPermission, shareMessage);
      
      // 重置表单
      setSelectedEmails([]);
      setShareMessage('');
      
      message.success(`已向 ${selectedEmails.length} 位用户发送分享邀请`);
    } catch (error) {
      message.error('分享失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [selectedEmails, selectedPermission, shareMessage, onShare]);

  // 创建分享链接
  const handleCreateLink = useCallback(async (values: any) => {
    setLoading(true);
    try {
      const expiresAt = values.expiresAt ? values.expiresAt.toISOString() : undefined;
      const url = await onCreateLink?.(values.permission, expiresAt) || 
                  `https://docs.example.com/shared/${documentId}?token=${Date.now()}`;
      
      const newLink: ShareLink = {
        id: Date.now().toString(),
        url,
        permission: values.permission,
        expiresAt,
        createdAt: new Date().toISOString(),
        accessCount: 0,
        isActive: true
      };

      setShareLinks(prev => [newLink, ...prev]);
      message.success('分享链接创建成功');
    } catch (error) {
      message.error('创建链接失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [documentId, onCreateLink]);

  // 复制链接
  const handleCopyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('链接已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  }, []);

  // 撤销链接
  const handleRevokeLink = useCallback((linkId: string) => {
    setShareLinks(prev => prev.map(link => 
      link.id === linkId ? { ...link, isActive: false } : link
    ));
    onRevokeLink?.(linkId);
    message.success('链接已撤销');
  }, [onRevokeLink]);

  // 移除收件人
  const handleRemoveRecipient = useCallback((recipientId: string) => {
    setRecipients(prev => prev.filter(r => r.id !== recipientId));
    message.success('已移除分享权限');
  }, []);

  // 渲染权限标签
  const renderPermissionTag = useCallback((permission: string) => {
    const perm = permissions.find(p => p.type === permission);
    if (!perm) return null;

    const colors = {
      view: 'blue',
      comment: 'orange',
      edit: 'green'
    };

    return (
      <Tag color={colors[permission as keyof typeof colors]} icon={perm.icon}>
        {perm.label}
      </Tag>
    );
  }, [permissions]);

  // 人员分享标签页
  const peopleTab = (
    <div className="share-people-tab">
      <Form form={form} layout="vertical" onFinish={handleAddRecipients}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="emails"
              label="邀请用户"
              rules={[{ required: true, message: '请输入邮箱地址' }]}
            >
              <Select
                mode="tags"
                placeholder="输入邮箱地址，按回车添加"
                value={selectedEmails}
                onChange={setSelectedEmails}
                style={{ width: '100%' }}
                tokenSeparators={[',', ' ']}
                open={false}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="permission" label="权限级别" initialValue="view">
              <Select value={selectedPermission} onChange={setSelectedPermission}>
                {permissions.map(perm => (
                  <Option key={perm.type} value={perm.type}>
                    <Space>
                      {perm.icon}
                      {perm.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="message" label="消息（可选）">
          <TextArea
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            placeholder="添加一条消息给收件人..."
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={selectedEmails.length === 0}
            icon={<ShareAltOutlined />}
          >
            发送邀请
          </Button>
        </Form.Item>
      </Form>

      {recipients.length > 0 && (
        <>
          <Divider>已分享用户</Divider>
          <List
            dataSource={recipients}
            renderItem={(recipient) => (
              <List.Item
                actions={[
                  <Tooltip title="移除权限">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveRecipient(recipient.id)}
                    />
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar src={recipient.avatar} icon={<UserOutlined />} />}
                  title={
                    <Space>
                      {recipient.name}
                      <Badge
                        status={
                          recipient.status === 'accepted' ? 'success' :
                          recipient.status === 'pending' ? 'processing' : 'error'
                        }
                        text={
                          recipient.status === 'accepted' ? '已接受' :
                          recipient.status === 'pending' ? '待接受' : '已拒绝'
                        }
                      />
                    </Space>
                  }
                  description={
                    <Space>
                      <Text type="secondary">{recipient.email}</Text>
                      {renderPermissionTag(recipient.permission)}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  );

  // 链接分享标签页
  const linkTab = (
    <div className="share-link-tab">
      <Form layout="vertical" onFinish={handleCreateLink}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="permission"
              label="权限级别"
              initialValue="view"
              rules={[{ required: true }]}
            >
              <Select>
                {permissions.map(perm => (
                  <Option key={perm.type} value={perm.type}>
                    <Space>
                      {perm.icon}
                      {perm.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="expiresAt" label="过期时间（可选）">
              <DatePicker
                showTime
                placeholder="选择过期时间"
                style={{ width: '100%' }}
                disabledDate={(current) => current && current < dayjs().endOf('day')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<LinkOutlined />}
          >
            创建链接
          </Button>
        </Form.Item>
      </Form>

      {shareLinks.length > 0 && (
        <>
          <Divider>分享链接</Divider>
          <List
            dataSource={shareLinks}
            renderItem={(link) => (
              <List.Item>
                <Card
                  size="small"
                  className={`share-link-card ${!link.isActive ? 'inactive' : ''}`}
                  title={
                    <Space>
                      <LinkOutlined />
                      {renderPermissionTag(link.permission)}
                      {!link.isActive && <Tag color="red">已禁用</Tag>}
                    </Space>
                  }
                  extra={
                    <Space>
                      {link.isActive && (
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => handleCopyLink(link.url)}
                        >
                          复制
                        </Button>
                      )}
                      <Button
                        type="text"
                        size="small"
                        danger
                        onClick={() => handleRevokeLink(link.id)}
                        disabled={!link.isActive}
                      >
                        撤销
                      </Button>
                    </Space>
                  }
                >
                  <div className="link-info">
                    <Text code className="share-url">
                      {link.url}
                    </Text>
                    <div className="link-stats">
                      <Space split={<Divider type="vertical" />}>
                        <Text type="secondary">
                          访问次数: {link.accessCount}
                        </Text>
                        <Text type="secondary">
                          创建时间: {dayjs(link.createdAt).format('MM-DD HH:mm')}
                        </Text>
                        {link.expiresAt && (
                          <Text type="secondary">
                            过期时间: {dayjs(link.expiresAt).format('MM-DD HH:mm')}
                          </Text>
                        )}
                      </Space>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          分享文档: {documentTitle}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      className={`document-share-modal ${className}`}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'people',
            label: (
              <Space>
                <TeamOutlined />
                邀请用户
              </Space>
            ),
            children: peopleTab
          },
          {
            key: 'link',
            label: (
              <Space>
                <LinkOutlined />
                分享链接
              </Space>
            ),
            children: linkTab
          }
        ]}
      />
    </Modal>
  );
};

export default DocumentShareModal;