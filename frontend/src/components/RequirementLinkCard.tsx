import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Tag, Space, Empty, Button, message, Tooltip } from 'antd';
import {
  LinkOutlined,
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getTaskRequirements,
  RequirementTaskLink,
  RequirementTaskLinkType,
} from '../services/requirementService';

const { Text } = Typography;

interface RequirementLinkCardProps {
  taskId: number;
  refreshTrigger?: number;
}

/**
 * 需求关联卡片组件
 * 用于在任务详情页显示关联的需求
 */
const RequirementLinkCard: React.FC<RequirementLinkCardProps> = ({
  taskId,
  refreshTrigger,
}) => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<RequirementTaskLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 加载关联的需求
  const loadRequirements = async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const response = await getTaskRequirements(taskId, {
        page: 1,
        page_size: 10,
      });

      setLinks(response.data || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error('Failed to load task requirements:', error);
      message.error('加载关联需求失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, [taskId, refreshTrigger]);

  // 获取链接类型的标签配置
  const getLinkTypeTag = (linkType: string) => {
    switch (linkType) {
      case RequirementTaskLinkType.Converted:
        return <Tag color="blue">需求转任务</Tag>;
      case RequirementTaskLinkType.Manual:
        return <Tag color="green">手动关联</Tag>;
      case RequirementTaskLinkType.Related:
        return <Tag color="orange">相关任务</Tag>;
      default:
        return <Tag>{linkType}</Tag>;
    }
  };

  // 获取需求状态的标签配置
  const getStatusTag = (status?: string) => {
    if (!status) return null;

    const statusConfig: Record<string, { color: string; label: string }> = {
      draft: { color: 'default', label: '草稿' },
      submitted: { color: 'processing', label: '待审核' },
      approved: { color: 'success', label: '已批准' },
      rejected: { color: 'error', label: '已拒绝' },
      in_progress: { color: 'processing', label: '进行中' },
      completed: { color: 'success', label: '已完成' },
      cancelled: { color: 'default', label: '已取消' },
    };

    const config = statusConfig[status] || { color: 'default', label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 导航到需求详情
  const handleViewRequirement = (requirementId: number) => {
    navigate(`/requirements/${requirementId}`);
  };

  return (
    <Card
      title={
        <Space>
          <LinkOutlined />
          <span>关联需求</span>
          {total > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              {total}
            </Tag>
          )}
        </Space>
      }
      loading={loading}
      extra={
        <Button type="link" size="small" onClick={loadRequirements}>
          刷新
        </Button>
      }
      className="requirement-link-card"
    >
      {links.length > 0 ? (
        <List
          dataSource={links}
          renderItem={(link) => (
            <List.Item
              key={link.id}
              style={{
                padding: '12px 0',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => handleViewRequirement(link.requirement_id)}
            >
              <div style={{ width: '100%' }}>
                {/* 需求标题和状态 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <Space>
                      <FileTextOutlined style={{ color: '#1890ff' }} />
                      <Text strong style={{ fontSize: 14 }}>
                        {link.requirement_title || `需求 #${link.requirement_id}`}
                      </Text>
                    </Space>
                  </div>
                  <Tooltip title="查看需求详情">
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowRightOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewRequirement(link.requirement_id);
                      }}
                    />
                  </Tooltip>
                </div>

                {/* 标签行：链接类型和需求状态 */}
                <div style={{ marginBottom: 8 }}>
                  <Space size="small">
                    {getLinkTypeTag(link.link_type)}
                    {getStatusTag(link.requirement_status)}
                  </Space>
                </div>

                {/* 备注信息 */}
                {link.link_comment && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      💬 {link.link_comment}
                    </Text>
                  </div>
                )}

                {/* 元信息：关联人和时间 */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Space size="small">
                    {link.linker_username && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        {link.linker_username}
                      </Text>
                    )}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatTime(link.created_at)}
                  </Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      ) : (
        /* 空状态 */
        <div
          style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: '#8c8c8c',
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size="small">
                <Text type="secondary">暂无关联需求</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  可以通过需求管理页面将需求关联到此任务
                </Text>
              </Space>
            }
          />
        </div>
      )}

      {/* 更多提示 */}
      {total > links.length && (
        <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            还有 {total - links.length} 个关联需求未显示
          </Text>
        </div>
      )}
    </Card>
  );
};

export default RequirementLinkCard;
