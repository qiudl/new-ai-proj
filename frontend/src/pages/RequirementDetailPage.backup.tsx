/**
 * 需求详情页面
 * Requirement Detail Page
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Row,
  Col,
  Descriptions,
  Tabs,
  Divider,
  Tooltip,
  Modal,
  Empty,
  Table,
  Timeline,
  Dropdown,
  Input,
} from 'antd';
// ✅ FIXED - Import ColumnsType from antd/es/table, not antd (TS2305)
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps, MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  CommentOutlined,
  LinkOutlined,
  HistoryOutlined,
  DownloadOutlined,
  SwapOutlined,
  MoreOutlined,
  FilePdfOutlined,
  CopyOutlined,
  PrinterOutlined,
  ThunderboltOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
  EyeOutlined,
  PlusOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { requirementApi, RequirementTaskLink, getRequirementTasks } from '../services/requirementService';
import {
  Requirement,
  RequirementStatus,
  RequirementPriority,
  REQUIREMENT_STATUS_CONFIG,
  REQUIREMENT_PRIORITY_CONFIG,
  REQUIREMENT_COMPLEXITY_CONFIG,
  RequirementComplexity,
} from '../types/requirement';
import SmartContentRenderer from '../components/SmartContentRenderer';
import RequirementReviewModal from '../components/RequirementReviewModal';
import ConvertToTaskModal from '../components/ConvertToTaskModal';
import LinkTaskModal from '../components/LinkTaskModal';
import RequirementCommentSection from '../components/RequirementComment/RequirementCommentSection';
import { useResponsive } from '../hooks/useResponsive';
import { RequirementDetailLayout } from './RequirementDetail/RequirementDetailLayout';

const { Title, Text, Paragraph } = Typography;

/**
 * 需求详情页面组件
 */
const RequirementDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const responsive = useResponsive();

  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // 默认展开评论tab
  const [linkedTasks, setLinkedTasks] = useState<RequirementTaskLink[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf'>('image');
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const requirementId = id ? parseInt(id) : 0;

  /**
   * 加载需求详情
   */
  useEffect(() => {
    if (requirementId) {
      loadRequirement();
    }
  }, [requirementId]);

  const loadRequirement = async () => {
    try {
      setLoading(true);
      const data = await requirementApi.getRequirement(requirementId);
      setRequirement(data);
    } catch (error: any) {
      console.error('Error loading requirement:', error);
      message.error(error?.message || '加载需求详情失败');
      navigate('/requirements');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载关联任务
   */
  useEffect(() => {
    if (requirementId && activeTab === 'tasks') {
      loadLinkedTasks();
    }
  }, [requirementId, activeTab]);

  const loadLinkedTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await getRequirementTasks(requirementId, { page: 1, page_size: 100 });
      setLinkedTasks(response.data || []);
    } catch (error: any) {
      console.error('Error loading linked tasks:', error);
      // 不显示错误消息，优雅降级
    } finally {
      setLoadingTasks(false);
    }
  };

  /**
   * 处理返回
   */
  const handleBack = () => {
    navigate('/requirements');
  };

  /**
   * 处理编辑
   */
  const handleEdit = () => {
    navigate(`/requirements/${requirementId}/edit`);
  };

  /**
   * 处理删除
   */
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除需求 "${requirement?.title}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await requirementApi.deleteRequirement(requirementId);
          message.success('需求已删除');
          navigate('/requirements');
        } catch (error: any) {
          console.error('Error deleting requirement:', error);
          message.error(error?.message || '删除需求失败');
        }
      },
    });
  };

  /**
   * 处理提交评审
   */
  const handleSubmit = async () => {
    try {
      await requirementApi.submitRequirement(requirementId);
      message.success('需求已提交评审');
      loadRequirement();
    } catch (error: any) {
      console.error('Error submitting requirement:', error);
      message.error(error?.message || '提交需求失败');
    }
  };

  /**
   * 处理归档
   */
  const handleArchive = async () => {
    Modal.confirm({
      title: '确认归档',
      content: `确定要归档需求 "${requirement?.title}" 吗？`,
      okText: '归档',
      cancelText: '取消',
      onOk: async () => {
        try {
          await requirementApi.archiveRequirement(requirementId);
          message.success('需求已归档');
          loadRequirement();
        } catch (error: any) {
          console.error('Error archiving requirement:', error);
          message.error(error?.message || '归档需求失败');
        }
      },
    });
  };

  /**
   * 处理评审
   */
  const handleOpenReview = () => {
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = async (reviewData: any) => {
    try {
      setReviewLoading(true);
      await requirementApi.reviewRequirement(requirementId, reviewData);
      setReviewModalVisible(false);
      loadRequirement();
    } catch (error: any) {
      console.error('Error reviewing requirement:', error);
      throw error; // Re-throw to let modal handle error display
    } finally {
      setReviewLoading(false);
    }
  };

  /**
   * 处理转换为任务
   */
  const handleOpenConvert = () => {
    setConvertModalVisible(true);
  };

  const handleConvertSubmit = async (convertData: any) => {
    try {
      setConvertLoading(true);
      const result = await requirementApi.convertToTask(requirementId, convertData);
      setConvertModalVisible(false);
      loadRequirement();
      loadLinkedTasks();
      return result;
    } catch (error: any) {
      console.error('Error converting to task:', error);
      throw error; // Re-throw to let modal handle error display
    } finally {
      setConvertLoading(false);
    }
  };

  const handleConvertSuccess = (taskId: number) => {
    setConvertModalVisible(false);
    if (requirement?.project_id && taskId) {
      // 跳转到任务详情页
      navigate(`/projects/${requirement.project_id}/tasks/${taskId}`);
    }
  };

  /**
   * 处理关联已有任务
   */
  const handleOpenLink = () => {
    setLinkModalVisible(true);
  };

  const handleLinkSubmit = async (taskId: number, linkType: any, linkComment?: string) => {
    try {
      setLinkLoading(true);
      const { linkTaskToRequirement } = await import('../services/requirementService');
      await linkTaskToRequirement(requirementId, taskId, linkType, linkComment);
      setLinkModalVisible(false);
      loadLinkedTasks();
    } catch (error: any) {
      console.error('Error linking task:', error);
      throw error; // Re-throw to let modal handle error display
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkSuccess = () => {
    setLinkModalVisible(false);
    message.success('任务关联成功');
    loadLinkedTasks();
  };

  /**
   * 处理复制链接
   */
  const handleCopyLink = () => {
    const url = `${window.location.origin}/requirements/${requirementId}`;
    navigator.clipboard.writeText(url);
    message.success('链接已复制到剪贴板');
  };

  /**
   * 处理导出PDF
   */
  const handleExportPDF = () => {
    window.print();
    message.info('请使用浏览器打印功能保存为PDF');
  };

  /**
   * 处理打印
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * 判断文件类型
   */
  const getFileType = (fileName: string): 'image' | 'pdf' | 'document' | 'other' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext) return 'other';

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const pdfExts = ['pdf'];
    const docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (imageExts.includes(ext)) return 'image';
    if (pdfExts.includes(ext)) return 'pdf';
    if (docExts.includes(ext)) return 'document';
    return 'other';
  };

  /**
   * 获取文件类型图标
   */
  const getFileIcon = (fileName: string) => {
    const type = getFileType(fileName);
    switch (type) {
      case 'image':
        return <FileImageOutlined style={{ color: '#52c41a' }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'document':
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext?.includes('xls')) {
          return <FileExcelOutlined style={{ color: '#52c41a' }} />;
        }
        return <FileWordOutlined style={{ color: '#1890ff' }} />;
      default:
        return <FileOutlined />;
    }
  };

  /**
   * 处理附件预览
   */
  const handlePreviewAttachment = (url: string, fileName: string) => {
    const type = getFileType(fileName);
    if (type === 'image' || type === 'pdf') {
      setPreviewUrl(url);
      setPreviewType(type);
      setPreviewVisible(true);
    } else {
      // 其他类型直接下载
      window.open(url, '_blank');
    }
  };

  /**
   * 打开标签编辑Modal
   */
  const handleOpenTagsModal = () => {
    setEditingTags(requirement?.tags || []);
    setTagInput('');
    setTagsModalVisible(true);
  };

  /**
   * 添加标签
   */
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) {
      message.warning('标签不能为空');
      return;
    }
    if (editingTags.includes(trimmedTag)) {
      message.warning('标签已存在');
      return;
    }
    setEditingTags([...editingTags, trimmedTag]);
    setTagInput('');
  };

  /**
   * 删除标签
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  /**
   * 保存标签
   */
  const handleSaveTags = async () => {
    try {
      await requirementApi.updateRequirement(requirementId, {
        tags: editingTags
      });
      message.success('标签更新成功');
      setTagsModalVisible(false);
      loadRequirement();
    } catch (error: any) {
      console.error('Error updating tags:', error);
      message.error(error?.message || '更新标签失败');
    }
  };

  /**
   * 获取状态配置
   */
  const statusConfig = useMemo(() => {
    if (!requirement) return null;
    return REQUIREMENT_STATUS_CONFIG[requirement.status as RequirementStatus] || {
      label: requirement.status,
      color: 'default',
      icon: '❓',
    };
  }, [requirement?.status]);

  /**
   * 获取优先级配置
   */
  const priorityConfig = useMemo(() => {
    if (!requirement) return null;
    return REQUIREMENT_PRIORITY_CONFIG[requirement.priority as RequirementPriority] || {
      label: requirement.priority,
      color: 'default',
      icon: '➡️',
    };
  }, [requirement?.priority]);

  /**
   * 获取复杂度配置
   */
  const complexityConfig = useMemo(() => {
    if (!requirement?.complexity) return null;
    return REQUIREMENT_COMPLEXITY_CONFIG[requirement.complexity as RequirementComplexity] || {
      label: requirement.complexity,
      color: 'default',
      icon: '🔵',
    };
  }, [requirement?.complexity]);

  /**
   * 渲染操作按钮组（响应式）
   */
  const renderActionButtons = () => {
    if (!requirement) return null;

    // 移动端使用下拉菜单
    if (responsive.isMobile) {
      const menuItems: MenuProps['items'] = [];

      // 主要操作
      if (requirement.status === RequirementStatus.Draft) {
        menuItems.push({
          key: 'submit',
          label: '提交评审',
          icon: <CheckCircleOutlined />,
          onClick: handleSubmit,
        });
      }

      if (requirement.status === RequirementStatus.Pending || requirement.status === RequirementStatus.Reviewing) {
        menuItems.push({
          key: 'review',
          label: '评审',
          icon: <CheckCircleOutlined />,
          onClick: handleOpenReview,
        });
      }

      if (requirement.status === RequirementStatus.Approved) {
        menuItems.push({
          key: 'convert',
          label: '转换为任务',
          icon: <SwapOutlined />,
          onClick: handleOpenConvert,
        });
        menuItems.push({
          key: 'link',
          label: '关联任务',
          icon: <LinkOutlined />,
          onClick: handleOpenLink,
        });
      }

      // 分隔线
      if (menuItems.length > 0) {
        menuItems.push({ type: 'divider' });
      }

      // 编辑和归档
      if (requirement.status !== RequirementStatus.Converted && requirement.status !== RequirementStatus.Archived) {
        menuItems.push({
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          onClick: handleEdit,
        });
        menuItems.push({
          key: 'archive',
          label: '归档',
          icon: <DownloadOutlined />,
          onClick: handleArchive,
        });
      }

      // 删除
      if (requirement.status !== RequirementStatus.Converted) {
        if (menuItems[menuItems.length - 1]?.type !== 'divider') {
          menuItems.push({ type: 'divider' });
        }
        menuItems.push({
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: handleDelete,
        });
      }

      return (
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Button type="primary" icon={<MoreOutlined />}>
            操作
          </Button>
        </Dropdown>
      );
    }

    // 桌面端使用按钮组
    return (
      <Space>
        {requirement.status === RequirementStatus.Draft && (
          <Tooltip title="提交评审">
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit}>
              提交评审
            </Button>
          </Tooltip>
        )}
        {(requirement.status === RequirementStatus.Pending || requirement.status === RequirementStatus.Reviewing) && (
          <Tooltip title="评审需求">
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleOpenReview}>
              评审
            </Button>
          </Tooltip>
        )}
        {requirement.status === RequirementStatus.Approved && (
          <>
            <Tooltip title="转换为任务">
              <Button type="primary" icon={<SwapOutlined />} onClick={handleOpenConvert}>
                转换为任务
              </Button>
            </Tooltip>
            <Tooltip title="关联已有任务">
              <Button icon={<LinkOutlined />} onClick={handleOpenLink}>
                关联任务
              </Button>
            </Tooltip>
          </>
        )}
        {requirement.status !== RequirementStatus.Converted && requirement.status !== RequirementStatus.Archived && (
          <>
            <Tooltip title="编辑">
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>
            </Tooltip>
            <Tooltip title="归档">
              <Button icon={<DownloadOutlined />} onClick={handleArchive}>
                归档
              </Button>
            </Tooltip>
          </>
        )}
        {requirement.status !== RequirementStatus.Converted && (
          <Tooltip title="删除">
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              删除
            </Button>
          </Tooltip>
        )}
      </Space>
    );
  };

  /**
   * 关联任务表格列
   */
  const taskColumns: ColumnsType<RequirementTaskLink> = [
    {
      title: '任务标题',
      dataIndex: 'task_title',
      key: 'task_title',
      ellipsis: true,
      render: (text: string, record: RequirementTaskLink) => (
        <a onClick={() => navigate(`/projects/${requirement?.project_id}/tasks/${record.task_id}`)}>
          {text || `任务 #${record.task_id}`}
        </a>
      ),
    },
    {
      title: '关联类型',
      dataIndex: 'link_type',
      key: 'link_type',
      width: 120,
      render: (type: string) => {
        const typeConfig = {
          manual: { label: '手动关联', color: 'blue' },
          converted: { label: '需求转任务', color: 'green' },
          related: { label: '相关任务', color: 'cyan' },
        };
        const config = typeConfig[type as keyof typeof typeConfig] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '任务状态',
      dataIndex: 'task_status',
      key: 'task_status',
      width: 100,
      render: (status?: string) => {
        if (!status) return '-';
        const statusMap = {
          todo: { label: '待开始', color: 'default' },
          in_progress: { label: '进行中', color: 'processing' },
          completed: { label: '已完成', color: 'success' },
          cancelled: { label: '已取消', color: 'error' },
        };
        const config = statusMap[status as keyof typeof statusMap] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '关联时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];


  if (loading) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', fontSize: '16px', color: '#1890ff' }}>
          正在加载需求详情...
        </div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: '16px', color: '#faad14', marginBottom: '16px' }}>
          需求不存在
        </div>
        <div style={{ color: '#8c8c8c' }}>找不到请求的需求。</div>
        <Button type="primary" onClick={handleBack} style={{ marginTop: '16px' }}>
          返回需求列表
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: responsive.isMobile ? '12px' : '24px' }}>
      {/* 页面头部 - 返回按钮 */}
      <div style={{ marginBottom: '16px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="large">
          返回需求列表
        </Button>
      </div>

      {/* 顶部标题和操作栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={18}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space size="middle" wrap>
                <FileTextOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
                <Title level={2} style={{ margin: 0 }}>
                  {requirement.title}
                </Title>
              </Space>
              <Space size="small" wrap>
                {statusConfig && (
                  <Tag color={statusConfig.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {statusConfig.icon} {statusConfig.label}
                  </Tag>
                )}
                {priorityConfig && (
                  <Tag color={priorityConfig.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {priorityConfig.icon} {priorityConfig.label}
                  </Tag>
                )}
                <Text type="secondary">
                  提交时间: {requirement.created_at ? dayjs(requirement.created_at).format('YYYY-MM-DD') : '-'}
                </Text>
                <Text type="secondary">|</Text>
                <Text type="secondary">
                  创建人: {requirement.submitter_name || '-'}
                </Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} lg={6} style={{ textAlign: responsive.isMobile ? 'left' : 'right' }}>
            {renderActionButtons()}
          </Col>
        </Row>
      </Card>

      {/* 主内容区域 - 使用统一布局组件 */}
      <RequirementDetailLayout
        content={
          <>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>需求描述</span>
              </Space>
            }
            style={{ marginBottom: '24px' }}
          >
            {requirement.description ? (
              <div style={{
                padding: '16px 0',
                minHeight: '300px',
                fontSize: '15px',
                lineHeight: '1.8'
              }}>
                <SmartContentRenderer content={requirement.description} />
              </div>
            ) : (
              <Empty
                description="暂无需求描述"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '60px 0' }}
              />
            )}
          </Card>

          {/* 业务信息卡片 */}
          {(requirement.business_value || requirement.expected_outcome || requirement.acceptance_criteria) && (
            <Card
              title={
                <Space>
                  <InfoCircleOutlined />
                  <span>业务信息</span>
                </Space>
              }
              style={{ marginBottom: '24px' }}
            >
              {requirement.business_value && (
                <div style={{ marginBottom: '24px' }}>
                  <Title level={5}>商业价值</Title>
                  <SmartContentRenderer content={requirement.business_value} />
                </div>
              )}
              {requirement.expected_outcome && (
                <div style={{ marginBottom: '24px' }}>
                  <Title level={5}>预期结果</Title>
                  <SmartContentRenderer content={requirement.expected_outcome} />
                </div>
              )}
              {requirement.acceptance_criteria && (
                <div>
                  <Title level={5}>验收标准</Title>
                  <SmartContentRenderer content={requirement.acceptance_criteria} />
                </div>
              )}
            </Card>
          )}

          {/* 评论、任务、历史 Tabs - 始终在左侧列 */}
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="large"
              items={[
            {
              key: 'comments',
              label: (
                <Space>
                  <CommentOutlined />
                  <span>评论</span>
                </Space>
              ),
              children: (
                <RequirementCommentSection
                  requirementId={requirementId}
                  currentUserId={1}
                  currentUserType="client"
                  showStats={true}
                  defaultPageSize={20}
                  enableTabs={false}
                />
              ),
            },
            {
              key: 'tasks',
              label: (
                <Space>
                  <LinkOutlined />
                  <span>关联任务</span>
                </Space>
              ),
              children: (
                <Spin spinning={loadingTasks}>
                  {linkedTasks.length > 0 ? (
                    <Table
                      dataSource={linkedTasks}
                      columns={taskColumns}
                      rowKey="id"
                      pagination={false}
                      size="middle"
                    />
                  ) : (
                    <Empty
                      description="暂无关联任务"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </Spin>
              ),
            },
            {
              key: 'history',
              label: (
                <Space>
                  <HistoryOutlined />
                  <span>操作历史</span>
                </Space>
              ),
              children: (
                <Timeline
                  items={[
                    {
                      children: (
                        <div>
                          <Text strong>需求创建</Text>
                          <br />
                          <Text type="secondary">
                            {requirement.created_at
                              ? dayjs(requirement.created_at).format('YYYY-MM-DD HH:mm')
                              : '-'}
                          </Text>
                          <br />
                          <Text type="secondary">由 {requirement.submitter_name || '未知用户'} 创建</Text>
                        </div>
                      ),
                    },
                    ...(requirement.submitted_at
                      ? [
                          {
                            children: (
                              <div>
                                <Text strong>提交评审</Text>
                                <br />
                                <Text type="secondary">
                                  {dayjs(requirement.submitted_at).format('YYYY-MM-DD HH:mm')}
                                </Text>
                              </div>
                            ),
                          },
                        ]
                      : []),
                    ...(requirement.reviewed_at
                      ? [
                          {
                            children: (
                              <div>
                                <Text strong>评审完成</Text>
                                <br />
                                <Text type="secondary">
                                  {dayjs(requirement.reviewed_at).format('YYYY-MM-DD HH:mm')}
                                </Text>
                                <br />
                                <Text type="secondary">由 {requirement.reviewer_name || '未知评审人'} 评审</Text>
                              </div>
                            ),
                          },
                        ]
                      : []),
                    ...(requirement.converted_at
                      ? [
                          {
                            children: (
                              <div>
                                <Text strong>转换为任务</Text>
                                <br />
                                <Text type="secondary">
                                  {dayjs(requirement.converted_at).format('YYYY-MM-DD HH:mm')}
                                </Text>
                                {requirement.converted_task_id && (
                                  <>
                                    <br />
                                    <a onClick={() => navigate(`/projects/${requirement.project_id}/tasks/${requirement.converted_task_id}`)}>
                                      查看任务 #{requirement.converted_task_id}
                                    </a>
                                  </>
                                )}
                              </div>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              ),
            },
          ]}
            />
          </Card>
          </>
        }
        sidebar={
          <>
          {/* 需求信息 */}
          <Card
            title="📊 需求信息"
            size="small"
            style={{ marginBottom: '24px' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">需求编号</Text>
                <br />
                <Text strong copyable>{requirement.display_id}</Text>
              </div>
              <div>
                <Text type="secondary">所属项目</Text>
                <br />
                <Text>{requirement.project_name || <Text type="secondary">未关联</Text>}</Text>
              </div>
              <div>
                <Text type="secondary">需求类型</Text>
                <br />
                {requirement.category ? <Tag>{requirement.category}</Tag> : <Text type="secondary">未分类</Text>}
              </div>
              <div>
                <Text type="secondary">状态</Text>
                <br />
                {statusConfig && (
                  <Tag color={statusConfig.color}>
                    {statusConfig.icon} {statusConfig.label}
                  </Tag>
                )}
              </div>
              <div>
                <Text type="secondary">优先级</Text>
                <br />
                {priorityConfig && (
                  <Tag color={priorityConfig.color}>
                    {priorityConfig.icon} {priorityConfig.label}
                  </Tag>
                )}
              </div>
              {/* 标签系统 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary">标签</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={handleOpenTagsModal}
                    style={{ padding: 0 }}
                  >
                    编辑
                  </Button>
                </div>
                {requirement.tags && requirement.tags.length > 0 ? (
                  <Space size={[0, 8]} wrap style={{ marginTop: '4px' }}>
                    {requirement.tags.map((tag, index) => (
                      <Tag key={index} color="blue">
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: '12px' }}>暂无标签</Text>
                )}
              </div>
            </Space>
          </Card>

          {/* 人员信息 */}
          <Card
            title="👤 人员"
            size="small"
            style={{ marginBottom: '24px' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">创建人</Text>
                <br />
                <Text>{requirement.submitter_name || '-'}</Text>
              </div>
              <div>
                <Text type="secondary">审批人</Text>
                <br />
                <Text>{requirement.reviewer_name || <Text type="secondary">未分配</Text>}</Text>
              </div>
            </Space>
          </Card>

          {/* 时间信息 */}
          <Card
            title="📅 时间"
            size="small"
            style={{ marginBottom: '24px' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">创建时间</Text>
                <br />
                <Text>{requirement.created_at ? dayjs(requirement.created_at).format('YYYY-MM-DD HH:mm') : '-'}</Text>
              </div>
              {requirement.submitted_at && (
                <div>
                  <Text type="secondary">提交时间</Text>
                  <br />
                  <Text>{dayjs(requirement.submitted_at).format('YYYY-MM-DD HH:mm')}</Text>
                </div>
              )}
              {requirement.reviewed_at && (
                <div>
                  <Text type="secondary">审批时间</Text>
                  <br />
                  <Text>{dayjs(requirement.reviewed_at).format('YYYY-MM-DD HH:mm')}</Text>
                </div>
              )}
              {requirement.due_date && (
                <div>
                  <Text type="secondary">截止日期</Text>
                  <br />
                  <Text type={dayjs(requirement.due_date).isBefore(dayjs(), 'day') ? 'danger' : undefined}>
                    {dayjs(requirement.due_date).format('YYYY-MM-DD')}
                  </Text>
                </div>
              )}
              <div>
                <Text type="secondary">更新时间</Text>
                <br />
                <Text>{requirement.updated_at ? dayjs(requirement.updated_at).format('YYYY-MM-DD HH:mm') : '-'}</Text>
              </div>
            </Space>
          </Card>

          {/* 评审信息 */}
          {requirement.review_status && (
            <Card
              title="📋 评审信息"
              size="small"
              style={{ marginBottom: '24px' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">评审状态</Text>
                  <br />
                  <Text>{requirement.review_status}</Text>
                </div>
                {requirement.review_score && (
                  <div>
                    <Text type="secondary">评审评分</Text>
                    <br />
                    <Text strong>{requirement.review_score} / 10</Text>
                  </div>
                )}
                {complexityConfig && (
                  <div>
                    <Text type="secondary">复杂度</Text>
                    <br />
                    <Tag color={complexityConfig.color}>
                      {complexityConfig.icon} {complexityConfig.label}
                    </Tag>
                  </div>
                )}
                {requirement.estimated_hours && (
                  <div>
                    <Text type="secondary">预估工时</Text>
                    <br />
                    <Text>{requirement.estimated_hours} 小时</Text>
                  </div>
                )}
                {requirement.review_comment && (
                  <div>
                    <Text type="secondary">评审意见</Text>
                    <br />
                    <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                      {requirement.review_comment}
                    </Paragraph>
                  </div>
                )}
              </Space>
            </Card>
          )}

          {/* 统计信息 */}
          <Card
            title="📈 统计"
            size="small"
            style={{ marginBottom: '24px' }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">💬 评论数</Text>
                <br />
                <Text strong style={{ fontSize: '18px' }}>
                  {requirement.comments_count ?? 0}
                </Text>
              </div>
              <div>
                <Text type="secondary">👁️ 浏览次数</Text>
                <br />
                <Text strong style={{ fontSize: '18px' }}>
                  {requirement.views_count ?? 0}
                </Text>
              </div>
              <div>
                <Text type="secondary">🔗 关联任务</Text>
                <br />
                <Text strong style={{ fontSize: '18px' }}>
                  {linkedTasks.length}
                </Text>
              </div>
            </Space>
          </Card>

          {/* 快速操作 */}
          <Card
            title={<Space><ThunderboltOutlined /><span>快速操作</span></Space>}
            size="small"
            style={{ marginBottom: '24px' }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {requirement.status === RequirementStatus.Approved && (
                <Button
                  type="primary"
                  icon={<SwapOutlined />}
                  onClick={handleOpenConvert}
                  block
                >
                  转为任务
                </Button>
              )}
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyLink}
                block
              >
                复制链接
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={handleExportPDF}
                block
              >
                导出PDF
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                block
              >
                打印
              </Button>
            </Space>
          </Card>

          {/* 附件 */}
          {requirement.attachments && requirement.attachments.length > 0 && (
            <Card
              title="📎 附件"
              size="small"
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {requirement.attachments.map((attachment, index) => {
                  const canPreview = ['image', 'pdf'].includes(getFileType(attachment.name));
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <Space size="small">
                          {getFileIcon(attachment.name)}
                          <Text ellipsis style={{ maxWidth: '120px' }}>{attachment.name}</Text>
                        </Space>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {(attachment.size / 1024).toFixed(2)} KB
                        </Text>
                      </div>
                      <Space size="small">
                        {canPreview && (
                          <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewAttachment(attachment.url, attachment.name)}
                          >
                            预览
                          </Button>
                        )}
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          href={attachment.url}
                          target="_blank"
                        >
                          下载
                        </Button>
                      </Space>
                    </div>
                  );
                })}
              </Space>
            </Card>
          )}
          </>
        }
      />

      {/* 评审对话框 */}
      <RequirementReviewModal
        visible={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        onSuccess={() => {
          setReviewModalVisible(false);
          loadRequirement();
        }}
        requirement={requirement}
        loading={reviewLoading}
        onSubmit={handleReviewSubmit}
      />

      {/* 转换为任务对话框 */}
      <ConvertToTaskModal
        visible={convertModalVisible}
        onCancel={() => setConvertModalVisible(false)}
        onSuccess={handleConvertSuccess}
        requirement={requirement}
        loading={convertLoading}
        onSubmit={handleConvertSubmit}
      />

      {/* 关联已有任务对话框 */}
      <LinkTaskModal
        visible={linkModalVisible}
        onCancel={() => setLinkModalVisible(false)}
        onSuccess={handleLinkSuccess}
        requirement={requirement}
        loading={linkLoading}
        onSubmit={handleLinkSubmit}
      />

      {/* 附件预览对话框 */}
      <Modal
        title={previewType === 'image' ? '图片预览' : 'PDF预览'}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={previewType === 'image' ? 800 : 1000}
        centered
        destroyOnClose
      >
        {previewType === 'image' ? (
          <div style={{ textAlign: 'center' }}>
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
          </div>
        ) : (
          <iframe
            src={previewUrl}
            title="PDF Preview"
            style={{
              width: '100%',
              height: '70vh',
              border: 'none'
            }}
          />
        )}
      </Modal>

      {/* 标签编辑对话框 */}
      <Modal
        title="编辑标签"
        open={tagsModalVisible}
        onCancel={() => setTagsModalVisible(false)}
        onOk={handleSaveTags}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">添加标签</Text>
            <Space.Compact style={{ width: '100%', marginTop: '8px' }}>
              <Input
                placeholder="输入标签名称"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={handleAddTag}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTag}>
                添加
              </Button>
            </Space.Compact>
          </div>

          <div>
            <Text type="secondary">当前标签</Text>
            <div style={{ marginTop: '8px', minHeight: '60px' }}>
              {editingTags.length > 0 ? (
                <Space size={[0, 8]} wrap>
                  {editingTags.map((tag, index) => (
                    <Tag
                      key={index}
                      color="blue"
                      closable
                      onClose={() => handleRemoveTag(tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Empty
                  description="暂无标签，请添加"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '20px 0' }}
                />
              )}
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default RequirementDetailPage;
