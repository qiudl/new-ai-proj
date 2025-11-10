/**
 * RequirementDetailHeader - 需求详情页顶部标题栏组件
 *
 * 职责:
 * - 显示需求标题和基本元信息
 * - 展示需求状态和优先级标签
 * - 提供操作按钮（编辑、删除、提交评审等）
 * - 与任务详情页Header保持一致的设计风格
 */

import React, { useMemo } from 'react';
import { Card, Row, Col, Space, Button, Tag, Typography, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  SwapOutlined,
  LinkOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Requirement,
  RequirementStatus,
  RequirementPriority,
  REQUIREMENT_STATUS_CONFIG,
  REQUIREMENT_PRIORITY_CONFIG,
} from '../../types/requirement';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;

export interface RequirementDetailHeaderProps {
  /** 需求数据 */
  requirement: Requirement;
  /** 编辑回调 */
  onEdit?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
  /** 提交评审回调 */
  onSubmit?: () => void;
  /** 评审回调 */
  onReview?: () => void;
  /** 转换为任务回调 */
  onConvert?: () => void;
  /** 关联任务回调 */
  onLink?: () => void;
  /** 归档回调 */
  onArchive?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * RequirementDetailHeader 组件
 */
export const RequirementDetailHeader: React.FC<RequirementDetailHeaderProps> = ({
  requirement,
  onEdit,
  onDelete,
  onSubmit,
  onReview,
  onConvert,
  onLink,
  onArchive,
  className,
}) => {
  const responsive = useResponsive();

  // 获取状态配置
  const statusConfig = useMemo(() => {
    return REQUIREMENT_STATUS_CONFIG[requirement.status as RequirementStatus] || {
      label: requirement.status,
      color: 'default',
      icon: '❓',
    };
  }, [requirement.status]);

  // 获取优先级配置
  const priorityConfig = useMemo(() => {
    return REQUIREMENT_PRIORITY_CONFIG[requirement.priority as RequirementPriority] || {
      label: requirement.priority,
      color: 'default',
      icon: '➡️',
    };
  }, [requirement.priority]);

  /**
   * 渲染操作按钮组（响应式）
   */
  const renderActionButtons = () => {
    // 移动端使用下拉菜单
    if (responsive.isMobile) {
      const menuItems: MenuProps['items'] = [];

      // 主要操作
      if (requirement.status === RequirementStatus.Draft) {
        menuItems.push({
          key: 'submit',
          label: '提交评审',
          icon: <CheckCircleOutlined />,
          onClick: onSubmit,
        });
      }

      if (
        requirement.status === RequirementStatus.Pending ||
        requirement.status === RequirementStatus.Reviewing
      ) {
        menuItems.push({
          key: 'review',
          label: '评审',
          icon: <CheckCircleOutlined />,
          onClick: onReview,
        });
      }

      if (requirement.status === RequirementStatus.Approved) {
        menuItems.push({
          key: 'convert',
          label: '转换为任务',
          icon: <SwapOutlined />,
          onClick: onConvert,
        });
        menuItems.push({
          key: 'link',
          label: '关联任务',
          icon: <LinkOutlined />,
          onClick: onLink,
        });
      }

      // 分隔线
      if (menuItems.length > 0) {
        menuItems.push({ type: 'divider' });
      }

      // 编辑和归档
      if (
        requirement.status !== RequirementStatus.Converted &&
        requirement.status !== RequirementStatus.Archived
      ) {
        menuItems.push({
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          onClick: onEdit,
        });
        menuItems.push({
          key: 'archive',
          label: '归档',
          icon: <DownloadOutlined />,
          onClick: onArchive,
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
          onClick: onDelete,
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
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={onSubmit}>
              提交评审
            </Button>
          </Tooltip>
        )}
        {(requirement.status === RequirementStatus.Pending ||
          requirement.status === RequirementStatus.Reviewing) && (
          <Tooltip title="评审需求">
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={onReview}>
              评审
            </Button>
          </Tooltip>
        )}
        {requirement.status === RequirementStatus.Approved && (
          <>
            <Tooltip title="转换为任务">
              <Button type="primary" icon={<SwapOutlined />} onClick={onConvert}>
                转换为任务
              </Button>
            </Tooltip>
            <Tooltip title="关联已有任务">
              <Button icon={<LinkOutlined />} onClick={onLink}>
                关联任务
              </Button>
            </Tooltip>
          </>
        )}
        {requirement.status !== RequirementStatus.Converted &&
          requirement.status !== RequirementStatus.Archived && (
            <>
              <Tooltip title="编辑">
                <Button icon={<EditOutlined />} onClick={onEdit}>
                  编辑
                </Button>
              </Tooltip>
              <Tooltip title="归档">
                <Button icon={<DownloadOutlined />} onClick={onArchive}>
                  归档
                </Button>
              </Tooltip>
            </>
          )}
        {requirement.status !== RequirementStatus.Converted && (
          <Tooltip title="删除">
            <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
              删除
            </Button>
          </Tooltip>
        )}
      </Space>
    );
  };

  return (
    <Card className={className} style={{ marginBottom: '24px' }}>
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
                提交时间:{' '}
                {requirement.created_at ? dayjs(requirement.created_at).format('YYYY-MM-DD') : '-'}
              </Text>
              <Text type="secondary">|</Text>
              <Text type="secondary">创建人: {requirement.submitter_name || '-'}</Text>
            </Space>
          </Space>
        </Col>
        <Col xs={24} lg={6} style={{
          textAlign: responsive.isMobile ? 'left' : 'right',
          display: 'flex',
          justifyContent: responsive.isMobile ? 'flex-start' : 'flex-end',
          alignItems: 'center'
        }}>
          {renderActionButtons()}
        </Col>
      </Row>
    </Card>
  );
};

RequirementDetailHeader.displayName = 'RequirementDetailHeader';
