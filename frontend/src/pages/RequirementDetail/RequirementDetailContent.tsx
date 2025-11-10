/**
 * RequirementDetailContent - 需求详情主内容区域
 *
 * 职责:
 * - 展示需求描述内容
 * - 展示业务信息（商业价值、预期结果、验收标准）
 * - 展示评论、关联任务、操作历史的Tab面板
 */

import React, { useState, useEffect } from 'react';
import { Card, Space, Tabs, Empty, Table, Timeline, Spin, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';
import {
  FileTextOutlined,
  InfoCircleOutlined,
  CommentOutlined,
  LinkOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { Requirement } from '../../types/requirement';
import { RequirementTaskLink } from '../../services/requirementService';
import SmartContentRenderer from '../../components/SmartContentRenderer';
import RequirementCommentSection from '../../components/RequirementComment/RequirementCommentSection';
import {
  getRequirementHistory,
  RequirementHistoryItem,
  getActionIcon,
  getActionColor,
} from '../../services/requirementHistoryService';

const { Title, Text } = Typography;

export interface RequirementDetailContentProps {
  /** 需求数据 */
  requirement: Requirement;
  /** 关联任务列表 */
  linkedTasks: RequirementTaskLink[];
  /** 关联任务加载状态 */
  loadingTasks: boolean;
  /** 当前激活的Tab */
  activeTab: string;
  /** Tab切换回调 */
  onTabChange: (key: string) => void;
  /** 需求ID */
  requirementId: number;
}

/**
 * RequirementDetailContent 组件
 */
export const RequirementDetailContent: React.FC<RequirementDetailContentProps> = ({
  requirement,
  linkedTasks,
  loadingTasks,
  activeTab,
  onTabChange,
  requirementId,
}) => {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState<RequirementHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /**
   * 加载操作历史
   */
  useEffect(() => {
    if (activeTab === 'history' && requirementId) {
      loadHistory();
    }
  }, [activeTab, requirementId]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await getRequirementHistory(requirementId, {
        page: 1,
        page_size: 100,
        sort_order: 'desc',
      });
      setHistoryItems(response.data || []);
    } catch (error: any) {
      console.error('Error loading requirement history:', error);
      message.error('加载操作历史失败');
    } finally {
      setLoadingHistory(false);
    }
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
        <a
          onClick={() =>
            navigate(`/projects/${requirement?.project_id}/tasks/${record.task_id}`)
          }
        >
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
        const config = typeConfig[type as keyof typeof typeConfig] || {
          label: type,
          color: 'default',
        };
        return <span style={{ color: config.color }}>{config.label}</span>;
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
        const config = statusMap[status as keyof typeof statusMap] || {
          label: status,
          color: 'default',
        };
        return <span style={{ color: config.color }}>{config.label}</span>;
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
            <Empty description="暂无关联任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
        <Spin spinning={loadingHistory}>
          {historyItems.length > 0 ? (
            <Timeline
              items={historyItems.map((item) => {
                // 动态获取图标
                const iconName = getActionIcon(item.action);
                const IconComponent =
                  (Icons as any)[
                    iconName
                      .split('-')
                      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
                      .join('') + 'Outlined'
                  ] || Icons.FileOutlined;

                return {
                  color: getActionColor(item.action),
                  dot: <IconComponent style={{ fontSize: '16px' }} />,
                  children: (
                    <div>
                      <div>
                        <Text strong>{item.action_display}</Text>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <Space size="small">
                          <UserOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                          <Text type="secondary" style={{ fontSize: '13px' }}>
                            {item.username || `用户 #${item.user_id}`}
                          </Text>
                        </Space>
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                          {dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                      </div>
                      {item.comment && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px 12px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        >
                          {item.comment}
                        </div>
                      )}
                    </div>
                  ),
                };
              })}
            />
          ) : (
            <Empty description="暂无操作历史" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Spin>
      ),
    },
  ];

  return (
    <>
      {/* 需求描述卡片 */}
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
          <div
            style={{
              padding: '16px 0',
              minHeight: '300px',
              fontSize: '15px',
              lineHeight: '1.8',
            }}
          >
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
      {(requirement.business_value ||
        requirement.expected_outcome ||
        requirement.acceptance_criteria) && (
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

      {/* 评论、任务、历史 Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          type="card"
          size="large"
          items={tabItems}
        />
      </Card>
    </>
  );
};

RequirementDetailContent.displayName = 'RequirementDetailContent';
