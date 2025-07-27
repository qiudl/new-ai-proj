import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Input,
  Switch,
  Tag,
  Tooltip,
  Avatar,
  Typography,
  Tabs,
  Divider,
  List,
  Empty,
  Badge,
  message,
  Popconfirm,
  DatePicker,
  Alert,
  Progress,
  Statistic,
  Row,
  Col,
  Dropdown,
  MenuProps,
  Timeline,
  Transfer
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  ShareAltOutlined,
  LinkOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FormOutlined,
  SettingOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  ExportOutlined,
  HistoryOutlined,
  SecurityScanOutlined,
  KeyOutlined,
  GlobalOutlined,
  MoreOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from '../utils/dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// 类型定义
interface DocumentCollaborator {
  id: number;
  document_id: number;
  user_id: number;
  permission_level: 'read' | 'comment' | 'edit' | 'admin';
  expires_at?: string;
  created_at: string;
  created_by: number;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  creator_name: string;
}

interface ShareLink {
  id: number;
  document_id: number;
  token: string;
  permission_level: 'read' | 'comment';
  expires_at?: string;
  password?: string;
  max_views?: number;
  current_views: number;
  is_active: boolean;
  created_at: string;
  created_by: number;
  creator_name: string;
}

interface DocumentComment {
  id: number;
  document_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar?: string;
}

interface DocumentPermissionPanelProps {
  documentId: number;
  onPermissionChange?: () => void;
}

// 权限级别配置
const PERMISSION_LEVELS = {
  read: {
    label: '只读',
    color: 'blue',
    description: '可以查看文档内容',
    icon: <EyeOutlined />
  },
  comment: {
    label: '评论',
    color: 'green',
    description: '可以查看和评论文档',
    icon: <FormOutlined />
  },
  edit: {
    label: '编辑',
    color: 'orange',
    description: '可以查看、评论和编辑文档',
    icon: <EditOutlined />
  },
  admin: {
    label: '管理员',
    color: 'red',
    description: '拥有文档的完全控制权',
    icon: <SettingOutlined />
  }
};

const DocumentPermissionPanel: React.FC<DocumentPermissionPanelProps> = ({
  documentId,
  onPermissionChange
}) => {
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<DocumentCollaborator[]>([]);
  const [filteredCollaborators, setFilteredCollaborators] = useState<DocumentCollaborator[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  // 搜索和过滤状态
  const [searchText, setSearchText] = useState('');
  const [filterPermission, setFilterPermission] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // 模态框状态
  const [collaboratorModalVisible, setCollaboratorModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<DocumentCollaborator | null>(null);
  const [editingShareLink, setEditingShareLink] = useState<ShareLink | null>(null);
  
  const [collaboratorForm] = Form.useForm();
  const [shareForm] = Form.useForm();
  const [commentForm] = Form.useForm();

  // 加载数据
  useEffect(() => {
    if (documentId) {
      loadCollaborators();
      loadShareLinks();
      loadComments();
      loadAvailableUsers();
      loadAuditLogs();
    }
  }, [documentId]);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取协作者
      // const response = await documentPermissionApi.getCollaborators(documentId);
      // setCollaborators(response.data.collaborators);
      
      // 临时模拟数据
      const mockCollaborators: DocumentCollaborator[] = [
        {
          id: 1,
          document_id: documentId,
          user_id: 2,
          permission_level: 'edit',
          created_at: '2024-01-01T00:00:00Z',
          created_by: 1,
          user_name: '张三',
          user_email: 'zhangsan@example.com',
          user_avatar: '',
          creator_name: 'Admin'
        },
        {
          id: 2,
          document_id: documentId,
          user_id: 3,
          permission_level: 'comment',
          expires_at: '2024-12-31T23:59:59Z',
          created_at: '2024-01-02T00:00:00Z',
          created_by: 1,
          user_name: '李四',
          user_email: 'lisi@example.com',
          creator_name: 'Admin'
        }
      ];
      setCollaborators(mockCollaborators);
      setFilteredCollaborators(mockCollaborators);
    } catch (error) {
      message.error('加载协作者失败');
    } finally {
      setLoading(false);
    }
  };

  // 应用搜索和过滤
  useEffect(() => {
    let filtered = [...collaborators];

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(collaborator => 
        collaborator.user_name.toLowerCase().includes(searchText.toLowerCase()) ||
        collaborator.user_email.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 权限级别过滤
    if (filterPermission !== 'all') {
      filtered = filtered.filter(collaborator => collaborator.permission_level === filterPermission);
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      const now = new Date();
      if (filterStatus === 'active') {
        filtered = filtered.filter(collaborator => 
          !collaborator.expires_at || new Date(collaborator.expires_at) > now
        );
      } else if (filterStatus === 'expired') {
        filtered = filtered.filter(collaborator => 
          collaborator.expires_at && new Date(collaborator.expires_at) <= now
        );
      }
    }

    setFilteredCollaborators(filtered);
  }, [collaborators, searchText, filterPermission, filterStatus]);

  // 加载可用用户列表
  const loadAvailableUsers = async () => {
    try {
      // TODO: 调用API获取可添加的用户列表
      // const response = await userApi.getAvailableUsers();
      // setAvailableUsers(response.data.users);
      
      // 临时模拟数据
      const mockUsers = [
        { id: 4, name: '王五', email: 'wangwu@example.com', avatar: '', department: '开发部' },
        { id: 5, name: '赵六', email: 'zhaoliu@example.com', avatar: '', department: '产品部' },
        { id: 6, name: '孙七', email: 'sunqi@example.com', avatar: '', department: '设计部' }
      ];
      setAvailableUsers(mockUsers);
    } catch (error) {
      console.error('加载用户列表失败');
    }
  };

  // 加载审计日志
  const loadAuditLogs = async () => {
    try {
      // TODO: 调用API获取权限变更审计日志
      // const response = await documentPermissionApi.getAuditLogs(documentId);
      // setAuditLogs(response.data.logs);
      
      // 临时模拟数据
      const mockLogs = [
        {
          id: 1,
          action: 'add_collaborator',
          user_name: 'Admin',
          target_user: '张三',
          permission_level: 'edit',
          created_at: '2024-01-01T10:00:00Z',
          details: '添加协作者，权限级别：编辑'
        },
        {
          id: 2,
          action: 'update_permission',
          user_name: 'Admin',
          target_user: '李四',
          permission_level: 'comment',
          created_at: '2024-01-02T15:30:00Z',
          details: '权限变更：编辑 → 评论'
        }
      ];
      setAuditLogs(mockLogs);
    } catch (error) {
      console.error('加载审计日志失败');
    }
  };

  const loadShareLinks = async () => {
    try {
      // TODO: 调用API获取分享链接
      // const response = await documentPermissionApi.getShareLinks(documentId);
      // setShareLinks(response.data.links);
      
      // 临时模拟数据
      const mockShareLinks: ShareLink[] = [
        {
          id: 1,
          document_id: documentId,
          token: 'abc123def456',
          permission_level: 'read',
          expires_at: '2024-12-31T23:59:59Z',
          max_views: 100,
          current_views: 25,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          created_by: 1,
          creator_name: 'Admin'
        }
      ];
      setShareLinks(mockShareLinks);
    } catch (error) {
      message.error('加载分享链接失败');
    }
  };

  const loadComments = async () => {
    try {
      // TODO: 调用API获取评论
      // const response = await documentPermissionApi.getComments(documentId);
      // setComments(response.data.comments);
      
      // 临时模拟数据
      const mockComments: DocumentComment[] = [
        {
          id: 1,
          document_id: documentId,
          user_id: 2,
          content: '这个文档写得很详细，不过第三段需要补充一些内容。',
          created_at: '2024-01-15T10:30:00Z',
          user_name: '张三',
          user_avatar: ''
        },
        {
          id: 2,
          document_id: documentId,
          user_id: 3,
          content: '建议添加更多的示例代码。',
          created_at: '2024-01-16T14:20:00Z',
          user_name: '李四'
        }
      ];
      setComments(mockComments);
    } catch (error) {
      message.error('加载评论失败');
    }
  };

  // 处理协作者操作
  const handleAddCollaborator = async (values: any) => {
    try {
      // TODO: 调用API添加协作者
      // await documentPermissionApi.addCollaborator(documentId, values);
      message.success('协作者添加成功');
      setCollaboratorModalVisible(false);
      collaboratorForm.resetFields();
      loadCollaborators();
      onPermissionChange?.();
    } catch (error) {
      message.error('添加协作者失败');
    }
  };

  const handleUpdateCollaborator = async (values: any) => {
    try {
      if (!editingCollaborator) return;
      // TODO: 调用API更新协作者权限
      // await documentPermissionApi.updateCollaborator(editingCollaborator.id, values);
      message.success('权限更新成功');
      setCollaboratorModalVisible(false);
      setEditingCollaborator(null);
      collaboratorForm.resetFields();
      loadCollaborators();
      onPermissionChange?.();
    } catch (error) {
      message.error('更新权限失败');
    }
  };

  const handleDeleteCollaborator = async (collaboratorId: number) => {
    try {
      // TODO: 调用API删除协作者
      // await documentPermissionApi.deleteCollaborator(collaboratorId);
      message.success('协作者移除成功');
      loadCollaborators();
      onPermissionChange?.();
    } catch (error) {
      message.error('移除协作者失败');
    }
  };

  // 处理分享链接操作
  const handleCreateShareLink = async (values: any) => {
    try {
      // TODO: 调用API创建分享链接
      // const response = await documentPermissionApi.createShareLink(documentId, values);
      message.success('分享链接创建成功');
      setShareModalVisible(false);
      shareForm.resetFields();
      loadShareLinks();
    } catch (error) {
      message.error('创建分享链接失败');
    }
  };

  const handleToggleShareLink = async (linkId: number, isActive: boolean) => {
    try {
      // TODO: 调用API启用/禁用分享链接
      // await documentPermissionApi.toggleShareLink(linkId, { is_active: isActive });
      message.success(isActive ? '分享链接已启用' : '分享链接已禁用');
      loadShareLinks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDeleteShareLink = async (linkId: number) => {
    try {
      // TODO: 调用API删除分享链接
      // await documentPermissionApi.deleteShareLink(linkId);
      message.success('分享链接删除成功');
      loadShareLinks();
    } catch (error) {
      message.error('删除分享链接失败');
    }
  };

  // 批量操作
  const handleBatchUpdatePermissions = async (collaboratorIds: number[], newPermission: string) => {
    try {
      // TODO: 调用批量更新API
      // await documentPermissionApi.batchUpdatePermissions(collaboratorIds, newPermission);
      message.success(`成功更新 ${collaboratorIds.length} 个协作者的权限`);
      loadCollaborators();
      onPermissionChange?.();
    } catch (error) {
      message.error('批量更新权限失败');
    }
  };

  const handleBatchRemoveCollaborators = async (collaboratorIds: number[]) => {
    try {
      // TODO: 调用批量删除API
      // await documentPermissionApi.batchRemoveCollaborators(collaboratorIds);
      message.success(`成功移除 ${collaboratorIds.length} 个协作者`);
      loadCollaborators();
      onPermissionChange?.();
    } catch (error) {
      message.error('批量移除失败');
    }
  };

  // 导出权限报告
  const handleExportPermissions = async () => {
    try {
      // TODO: 调用导出API
      // const blob = await documentPermissionApi.exportPermissions(documentId);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `document_permissions_${documentId}.xlsx`;
      // a.click();
      message.success('权限报告导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 发送邀请邮件
  const handleSendInvitation = async (collaboratorId: number) => {
    try {
      // TODO: 调用发送邀请API
      // await documentPermissionApi.sendInvitation(collaboratorId);
      message.success('邀请邮件发送成功');
    } catch (error) {
      message.error('发送邀请失败');
    }
  };

  // 获取统计信息
  const getPermissionStatistics = () => {
    const stats = {
      total: collaborators.length,
      read: collaborators.filter(c => c.permission_level === 'read').length,
      comment: collaborators.filter(c => c.permission_level === 'comment').length,
      edit: collaborators.filter(c => c.permission_level === 'edit').length,
      admin: collaborators.filter(c => c.permission_level === 'admin').length,
      expired: collaborators.filter(c => c.expires_at && new Date(c.expires_at) <= new Date()).length
    };
    return stats;
  };

  // 处理评论操作
  const handleAddComment = async (values: any) => {
    try {
      // TODO: 调用API添加评论
      // await documentPermissionApi.addComment(documentId, values);
      message.success('评论添加成功');
      setCommentModalVisible(false);
      commentForm.resetFields();
      loadComments();
    } catch (error) {
      message.error('添加评论失败');
    }
  };

  // 复制分享链接
  const handleCopyShareLink = (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      message.success('分享链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 协作者表格列
  const collaboratorColumns: ColumnsType<DocumentCollaborator> = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar 
            size="small" 
            src={record.user_avatar} 
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.user_name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user_email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: '权限级别',
      dataIndex: 'permission_level',
      key: 'permission_level',
      render: (level: keyof typeof PERMISSION_LEVELS) => {
        const config = PERMISSION_LEVELS[level];
        return (
          <Tooltip title={config.description}>
            <Tag color={config.color} icon={config.icon}>
              {config.label}
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date) => {
        if (!date) return <Text type="secondary">永不过期</Text>;
        const isExpired = dayjs(date).isBefore(dayjs());
        return (
          <Text type={isExpired ? 'danger' : undefined}>
            {dayjs(date).format('YYYY-MM-DD HH:mm')}
            {isExpired && <Badge status="error" />}
          </Text>
        );
      }
    },
    {
      title: '添加时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {dayjs(date).format('MM-DD HH:mm')}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑权限">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCollaborator(record);
                collaboratorForm.setFieldsValue({
                  permission_level: record.permission_level,
                  expires_at: record.expires_at ? dayjs(record.expires_at) : null
                });
                setCollaboratorModalVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="确认移除"
            description="确定要移除此协作者吗？"
            onConfirm={() => handleDeleteCollaborator(record.id)}
            okText="移除"
            cancelText="取消"
          >
            <Tooltip title="移除协作者">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="collaborators"
        items={[
          {
            key: 'collaborators',
            label: (
              <Space>
                <UserOutlined />
                <span>协作者</span>
                <Badge count={collaborators.length} size="small" />
              </Space>
            ),
            children: (
              <Card
                title={
                  <Space>
                    <UserOutlined />
                    <span>文档协作者</span>
                    <Badge count={collaborators.length} color="#108ee9" />
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={loadCollaborators}
                      loading={loading}
                      size="small"
                    >
                      刷新
                    </Button>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'export',
                            label: '导出权限报告',
                            icon: <ExportOutlined />,
                            onClick: handleExportPermissions
                          },
                          {
                            key: 'audit',
                            label: '查看审计日志',
                            icon: <HistoryOutlined />,
                            onClick: () => {
                              // TODO: 显示审计日志
                              message.info('审计日志功能即将上线');
                            }
                          }
                        ]
                      }}
                      trigger={['click']}
                    >
                      <Button size="small">
                        更多操作
                      </Button>
                    </Dropdown>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingCollaborator(null);
                        collaboratorForm.resetFields();
                        setCollaboratorModalVisible(true);
                      }}
                    >
                      添加协作者
                    </Button>
                  </Space>
                }
              >
                {/* 统计信息 */}
                {collaborators.length > 0 && (
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Statistic 
                        title="总协作者" 
                        value={getPermissionStatistics().total} 
                        prefix={<UserOutlined />} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="管理员" 
                        value={getPermissionStatistics().admin} 
                        prefix={<SettingOutlined style={{ color: '#f5222d' }} />} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="编辑者" 
                        value={getPermissionStatistics().edit} 
                        prefix={<EditOutlined style={{ color: '#fa8c16' }} />} 
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="过期权限" 
                        value={getPermissionStatistics().expired} 
                        prefix={<ClockCircleOutlined style={{ color: '#999' }} />} 
                      />
                    </Col>
                  </Row>
                )}

                {/* 搜索和过滤 */}
                <div style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Input
                        placeholder="搜索协作者..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col span={6}>
                      <Select
                        placeholder="权限级别"
                        value={filterPermission}
                        onChange={setFilterPermission}
                        style={{ width: '100%' }}
                      >
                        <Option value="all">全部权限</Option>
                        {Object.entries(PERMISSION_LEVELS).map(([key, config]) => (
                          <Option key={key} value={key}>
                            <Space>
                              <span style={{ color: `var(--ant-${config.color})` }}>
                                {config.icon}
                              </span>
                              {config.label}
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={6}>
                      <Select
                        placeholder="状态"
                        value={filterStatus}
                        onChange={setFilterStatus}
                        style={{ width: '100%' }}
                      >
                        <Option value="all">全部状态</Option>
                        <Option value="active">活跃</Option>
                        <Option value="expired">已过期</Option>
                      </Select>
                    </Col>
                    <Col span={4}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        显示 {filteredCollaborators.length} / {collaborators.length} 条
                      </Text>
                    </Col>
                  </Row>
                </div>

                <Alert
                  message="协作权限说明"
                  description="管理员可以修改文档权限和删除文档；编辑者可以修改文档内容；评论者可以添加评论；只读者只能查看文档。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Table
                  columns={collaboratorColumns}
                  dataSource={filteredCollaborators}
                  rowKey="id"
                  size="small"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                  }}
                  locale={{ emptyText: <Empty description="暂无协作者" /> }}
                />
              </Card>
            )
          },
          {
            key: 'share',
            label: (
              <Space>
                <ShareAltOutlined />
                <span>分享链接</span>
                <Badge count={shareLinks.length} size="small" />
              </Space>
            ),
            children: (
              <Card
                title="分享链接管理"
                extra={
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    onClick={() => {
                      setEditingShareLink(null);
                      shareForm.resetFields();
                      setShareModalVisible(true);
                    }}
                  >
                    创建分享链接
                  </Button>
                }
              >
                <Alert
                  message="分享链接安全提示"
                  description="通过分享链接，任何人都可以访问文档。请谨慎设置权限和过期时间。"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                {shareLinks.length === 0 ? (
                  <Empty description="暂无分享链接" />
                ) : (
                  <List
                    dataSource={shareLinks}
                    renderItem={(link) => (
                      <List.Item
                        actions={[
                          <Switch
                            key="toggle"
                            checked={link.is_active}
                            onChange={(checked) => handleToggleShareLink(link.id, checked)}
                            checkedChildren="启用"
                            unCheckedChildren="禁用"
                          />,
                          <Button
                            key="copy"
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyShareLink(link.token)}
                          >
                            复制链接
                          </Button>,
                          <Popconfirm
                            key="delete"
                            title="确认删除"
                            description="确定要删除此分享链接吗？"
                            onConfirm={() => handleDeleteShareLink(link.id)}
                            okText="删除"
                            cancelText="取消"
                          >
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge status={link.is_active ? 'success' : 'default'} />
                          }
                          title={
                            <Space>
                              <Text code>{link.token.substring(0, 8)}...</Text>
                              <Tag color={PERMISSION_LEVELS[link.permission_level].color}>
                                {PERMISSION_LEVELS[link.permission_level].label}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space split={<Divider type="vertical" />}>
                              <Text type="secondary">
                                <ClockCircleOutlined /> 
                                {link.expires_at 
                                  ? `${dayjs(link.expires_at).format('YYYY-MM-DD')} 过期`
                                  : '永不过期'
                                }
                              </Text>
                              {link.max_views && (
                                <Text type="secondary">
                                  <EyeOutlined /> {link.current_views}/{link.max_views} 次查看
                                </Text>
                              )}
                              <Text type="secondary">
                                {dayjs(link.created_at).format('MM-DD')} 创建
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            )
          },
          {
            key: 'comments',
            label: (
              <Space>
                <FormOutlined />
                <span>评论</span>
                <Badge count={comments.length} size="small" />
              </Space>
            ),
            children: (
              <Card
                title="文档评论"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      commentForm.resetFields();
                      setCommentModalVisible(true);
                    }}
                  >
                    添加评论
                  </Button>
                }
              >
                {comments.length === 0 ? (
                  <Empty description="暂无评论" />
                ) : (
                  <List
                    dataSource={comments}
                    renderItem={(comment) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar 
                              src={comment.user_avatar} 
                              icon={<UserOutlined />}
                            />
                          }
                          title={
                            <Space>
                              <Text strong>{comment.user_name}</Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {dayjs(comment.created_at).format('MM-DD HH:mm')}
                              </Text>
                            </Space>
                          }
                          description={
                            <Paragraph style={{ marginBottom: 0 }}>
                              {comment.content}
                            </Paragraph>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            )
          }
        ]}
      />

      {/* 添加/编辑协作者模态框 */}
      <Modal
        title={editingCollaborator ? '编辑协作者权限' : '添加协作者'}
        open={collaboratorModalVisible}
        onOk={() => collaboratorForm.submit()}
        onCancel={() => {
          setCollaboratorModalVisible(false);
          setEditingCollaborator(null);
          collaboratorForm.resetFields();
        }}
        width={500}
      >
        <Form
          form={collaboratorForm}
          layout="vertical"
          onFinish={editingCollaborator ? handleUpdateCollaborator : handleAddCollaborator}
        >
          {!editingCollaborator && (
            <Form.Item
              name="user_email"
              label="用户邮箱"
              rules={[
                { required: true, message: '请输入用户邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input placeholder="请输入要邀请的用户邮箱" />
            </Form.Item>
          )}

          <Form.Item
            name="permission_level"
            label="权限级别"
            rules={[{ required: true, message: '请选择权限级别' }]}
          >
            <Select placeholder="选择权限级别">
              {Object.entries(PERMISSION_LEVELS).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    {config.icon}
                    <span>{config.label}</span>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {config.description}
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="权限过期时间"
          >
            <DatePicker
              showTime
              placeholder="选择过期时间（可选）"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().endOf('day')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建分享链接模态框 */}
      <Modal
        title="创建分享链接"
        open={shareModalVisible}
        onOk={() => shareForm.submit()}
        onCancel={() => {
          setShareModalVisible(false);
          shareForm.resetFields();
        }}
        width={500}
      >
        <Form
          form={shareForm}
          layout="vertical"
          onFinish={handleCreateShareLink}
        >
          <Form.Item
            name="permission_level"
            label="访问权限"
            rules={[{ required: true, message: '请选择访问权限' }]}
            initialValue="read"
          >
            <Select placeholder="选择访问权限">
              <Option value="read">
                <Space>
                  <EyeOutlined />
                  只读 - 可以查看文档内容
                </Space>
              </Option>
              <Option value="comment">
                <Space>
                  <FormOutlined />
                  评论 - 可以查看和评论文档
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="expires_at"
            label="链接过期时间"
          >
            <DatePicker
              showTime
              placeholder="选择过期时间（可选）"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="max_views"
            label="最大访问次数"
          >
            <Input
              type="number"
              placeholder="设置最大访问次数（可选）"
              min={1}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="访问密码"
          >
            <Input.Password
              placeholder="设置访问密码（可选）"
              maxLength={20}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加评论模态框 */}
      <Modal
        title="添加评论"
        open={commentModalVisible}
        onOk={() => commentForm.submit()}
        onCancel={() => {
          setCommentModalVisible(false);
          commentForm.resetFields();
        }}
        width={500}
      >
        <Form
          form={commentForm}
          layout="vertical"
          onFinish={handleAddComment}
        >
          <Form.Item
            name="content"
            label="评论内容"
            rules={[{ required: true, message: '请输入评论内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入您的评论..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentPermissionPanel;