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
} from 'antd';
import type { ColumnsType, TabsProps, MenuProps } from 'antd';
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
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { requirementApi, RequirementTaskLink, getRequirementTasks } from '../services/requirementService';
import { requirementCommentService } from '../services/requirementCommentService';
import {
  Requirement,
  RequirementStatus,
  RequirementPriority,
  REQUIREMENT_STATUS_CONFIG,
  REQUIREMENT_PRIORITY_CONFIG,
  REQUIREMENT_COMPLEXITY_CONFIG,
  RequirementComplexity,
} from '../types/requirement';
import { RequirementComment } from '../types/requirementComment';
import CommentSection from '../components/CommentSection';
import MarkdownRenderer from '../components/MarkdownRenderer';
import RequirementReviewModal from '../components/RequirementReviewModal';
import ConvertToTaskModal from '../components/ConvertToTaskModal';
import LinkTaskModal from '../components/LinkTaskModal';
import { useResponsive } from '../hooks/useResponsive';

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
  const [activeTab, setActiveTab] = useState('basic');
  const [linkedTasks, setLinkedTasks] = useState<RequirementTaskLink[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

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

  /**
   * Tab配置
   */
  const tabItems: TabsProps['items'] = [
    {
      key: 'basic',
      label: (
        <Space>
          <InfoCircleOutlined />
          <span>基本信息</span>
        </Space>
      ),
      children: (
        <div>
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="需求编号" span={1}>
              <Text copyable>{requirement?.display_id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="所属项目" span={1}>
              {requirement?.project_name || <Text type="secondary">未关联</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="需求标题" span={2}>
              <Text strong>{requirement?.title}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="需求描述" span={2}>
              {requirement?.description ? (
                <MarkdownRenderer content={requirement.description} />
              ) : (
                <Text type="secondary">无</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="需求分类">
              {requirement?.category ? (
                <Tag>{requirement.category}</Tag>
              ) : (
                <Text type="secondary">未分类</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="提交人">
              {requirement?.submitter_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="评审人">
              {requirement?.reviewer_name || <Text type="secondary">未分配</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {requirement?.created_at ? dayjs(requirement.created_at).format('YYYY-MM-DD HH:mm') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="截止日期">
              {requirement?.due_date ? (
                <Text
                  type={dayjs(requirement.due_date).isBefore(dayjs(), 'day') ? 'danger' : undefined}
                >
                  {dayjs(requirement.due_date).format('YYYY-MM-DD')}
                </Text>
              ) : (
                <Text type="secondary">无</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {requirement?.updated_at ? dayjs(requirement.updated_at).format('YYYY-MM-DD HH:mm') : '-'}
            </Descriptions.Item>
          </Descriptions>

          {/* 业务信息 */}
          {(requirement?.business_value || requirement?.expected_outcome || requirement?.acceptance_criteria) && (
            <>
              <Divider orientation="left">业务信息</Divider>
              <Descriptions bordered column={1}>
                {requirement?.business_value && (
                  <Descriptions.Item label="商业价值">
                    <MarkdownRenderer content={requirement.business_value} />
                  </Descriptions.Item>
                )}
                {requirement?.expected_outcome && (
                  <Descriptions.Item label="预期结果">
                    <MarkdownRenderer content={requirement.expected_outcome} />
                  </Descriptions.Item>
                )}
                {requirement?.acceptance_criteria && (
                  <Descriptions.Item label="验收标准">
                    <MarkdownRenderer content={requirement.acceptance_criteria} />
                  </Descriptions.Item>
                )}
              </Descriptions>
            </>
          )}

          {/* 评审信息 */}
          {requirement?.review_status && (
            <>
              <Divider orientation="left">评审信息</Divider>
              <Descriptions bordered column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="评审状态">
                  {requirement.review_status}
                </Descriptions.Item>
                {requirement?.review_score && (
                  <Descriptions.Item label="评审评分">
                    {requirement.review_score} / 10
                  </Descriptions.Item>
                )}
                {complexityConfig && (
                  <Descriptions.Item label="复杂度">
                    <Tag color={complexityConfig.color}>
                      {complexityConfig.icon} {complexityConfig.label}
                    </Tag>
                  </Descriptions.Item>
                )}
                {requirement?.estimated_hours && (
                  <Descriptions.Item label="预估工时">
                    {requirement.estimated_hours} 小时
                  </Descriptions.Item>
                )}
                {requirement?.review_comment && (
                  <Descriptions.Item label="评审意见" span={2}>
                    <MarkdownRenderer content={requirement.review_comment} />
                  </Descriptions.Item>
                )}
                {requirement?.reviewed_at && (
                  <Descriptions.Item label="评审时间" span={2}>
                    {dayjs(requirement.reviewed_at).format('YYYY-MM-DD HH:mm')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </>
          )}

          {/* 附件 */}
          {requirement?.attachments && requirement.attachments.length > 0 && (
            <>
              <Divider orientation="left">附件</Divider>
              <Space direction="vertical" style={{ width: '100%' }}>
                {requirement.attachments.map((attachment, index) => (
                  <Card key={index} size="small" type="inner">
                    <Space>
                      <DownloadOutlined />
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        {attachment.name}
                      </a>
                      <Text type="secondary">
                        ({(attachment.size / 1024).toFixed(2)} KB)
                      </Text>
                    </Space>
                  </Card>
                ))}
              </Space>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'comments',
      label: (
        <Space>
          <CommentOutlined />
          <span>评论</span>
        </Space>
      ),
      children: requirement ? (
        <CommentSection<RequirementComment>
          entityId={requirementId}
          entityType="requirement"
          commentService={{
            list: (filters) => requirementCommentService.listComments(requirementId, filters),
            create: (data) => requirementCommentService.createComment(requirementId, {
              requirement_id: requirementId,
              content: data.content,
              parent_comment_id: data.parent_comment_id,
              mentioned_user_ids: data.mentioned_user_ids,
              comment_type: data.comment_type,
              is_internal: data.is_internal,
            }),
            update: (commentId, data) => requirementCommentService.updateComment(requirementId, commentId, data),
            delete: (commentId) => requirementCommentService.deleteComment(requirementId, commentId),
          }}
          currentUserId={1} // TODO: 从认证上下文获取
          showStats={true}
          allowReply={true}
          allowMention={true}
          allowPin={true}
          allowInternal={true}
        />
      ) : null,
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
        <div>
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
        </div>
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
        <div>
          <Timeline
            items={[
              {
                children: (
                  <div>
                    <Text strong>需求创建</Text>
                    <br />
                    <Text type="secondary">
                      {requirement?.created_at
                        ? dayjs(requirement.created_at).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </Text>
                    <br />
                    <Text type="secondary">由 {requirement?.submitter_name || '未知用户'} 创建</Text>
                  </div>
                ),
              },
              ...(requirement?.submitted_at
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
              ...(requirement?.reviewed_at
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
                          <Text type="secondary">由 {requirement?.reviewer_name || '未知评审人'} 评审</Text>
                        </div>
                      ),
                    },
                  ]
                : []),
              ...(requirement?.converted_at
                ? [
                    {
                      children: (
                        <div>
                          <Text strong>转换为任务</Text>
                          <br />
                          <Text type="secondary">
                            {dayjs(requirement.converted_at).format('YYYY-MM-DD HH:mm')}
                          </Text>
                          {requirement?.converted_task_id && (
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
        </div>
      ),
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
    <div style={{ padding: responsive.isMobile ? '12px' : '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 页面头部 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row align="middle" justify="space-between" gutter={responsive.isMobile ? [0, 12] : 0}>
          <Col xs={24} lg={18}>
            <Space size={responsive.isMobile ? 'middle' : 'large'} style={{ width: '100%' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                返回
              </Button>
              <div>
                <Space>
                  <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <Title level={3} style={{ margin: 0 }}>
                    {requirement.display_id}
                  </Title>
                </Space>
                <div style={{ marginTop: '8px' }}>
                  <Space size="middle" wrap>
                    {statusConfig && (
                      <Tag color={statusConfig.color}>
                        {statusConfig.icon} {statusConfig.label}
                      </Tag>
                    )}
                    {priorityConfig && (
                      <Tag color={priorityConfig.color}>
                        {priorityConfig.icon} {priorityConfig.label}
                      </Tag>
                    )}
                  </Space>
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={6} style={{ textAlign: responsive.isMobile ? 'left' : 'right' }}>
            {renderActionButtons()}
          </Col>
        </Row>
      </Card>

      {/* 需求标题 */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>
          {requirement.title}
        </Title>
      </Card>

      {/* Tabs内容 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={tabItems}
        />
      </Card>

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
    </div>
  );
};

export default RequirementDetailPage;
