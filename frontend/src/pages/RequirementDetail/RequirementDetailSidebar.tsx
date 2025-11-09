/**
 * RequirementDetailSidebar - 需求详情右侧边栏
 *
 * 职责:
 * - 展示需求基本信息（编号、项目、类型、状态、优先级、标签）
 * - 展示人员信息（创建人、审批人）
 * - 展示时间信息（创建时间、提交时间、审批时间、截止日期、更新时间）
 * - 展示评审信息（评审状态、评分、复杂度、预估工时、评审意见）
 * - 展示统计信息（评论数、浏览次数、关联任务数）
 * - 提供快速操作（转为任务、复制链接、导出PDF、打印）
 * - 展示附件列表
 */

import React from 'react';
import { Card, Space, Button, Tag, Typography, Empty, Tooltip } from 'antd';
import {
  EditOutlined,
  SwapOutlined,
  CopyOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  ThunderboltOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Requirement,
  RequirementStatus,
  RequirementPriority,
  RequirementComplexity,
  REQUIREMENT_STATUS_CONFIG,
  REQUIREMENT_PRIORITY_CONFIG,
  REQUIREMENT_COMPLEXITY_CONFIG,
} from '../../types/requirement';

const { Text, Paragraph } = Typography;

export interface RequirementDetailSidebarProps {
  /** 需求数据 */
  requirement: Requirement;
  /** 关联任务数量 */
  linkedTasksCount: number;
  /** 打开转换为任务Modal */
  onConvert?: () => void;
  /** 复制链接 */
  onCopyLink?: () => void;
  /** 导出PDF */
  onExportPDF?: () => void;
  /** 打印 */
  onPrint?: () => void;
  /** 打开标签编辑Modal */
  onEditTags?: () => void;
  /** 预览附件 */
  onPreviewAttachment?: (url: string, fileName: string) => void;
}

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
 * RequirementDetailSidebar 组件
 */
export const RequirementDetailSidebar: React.FC<RequirementDetailSidebarProps> = ({
  requirement,
  linkedTasksCount,
  onConvert,
  onCopyLink,
  onExportPDF,
  onPrint,
  onEditTags,
  onPreviewAttachment,
}) => {
  const statusConfig =
    REQUIREMENT_STATUS_CONFIG[requirement.status as RequirementStatus];
  const priorityConfig =
    REQUIREMENT_PRIORITY_CONFIG[requirement.priority as RequirementPriority];
  const complexityConfig = requirement.complexity
    ? REQUIREMENT_COMPLEXITY_CONFIG[requirement.complexity as RequirementComplexity]
    : null;

  return (
    <>
      {/* 需求信息 */}
      <Card title="📊 需求信息" size="small" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">需求编号</Text>
            <br />
            <Text strong copyable>
              {requirement.display_id}
            </Text>
          </div>
          <div>
            <Text type="secondary">所属项目</Text>
            <br />
            <Text>{requirement.project_name || <Text type="secondary">未关联</Text>}</Text>
          </div>
          <div>
            <Text type="secondary">需求类型</Text>
            <br />
            {requirement.category ? (
              <Tag>{requirement.category}</Tag>
            ) : (
              <Text type="secondary">未分类</Text>
            )}
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text type="secondary">标签</Text>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={onEditTags}
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
              <Text type="secondary" style={{ fontSize: '12px' }}>
                暂无标签
              </Text>
            )}
          </div>
        </Space>
      </Card>

      {/* 人员信息 */}
      <Card title="👤 人员" size="small" style={{ marginBottom: '24px' }}>
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
      <Card title="📅 时间" size="small" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">创建时间</Text>
            <br />
            <Text>
              {requirement.created_at
                ? dayjs(requirement.created_at).format('YYYY-MM-DD HH:mm')
                : '-'}
            </Text>
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
              <Text
                type={dayjs(requirement.due_date).isBefore(dayjs(), 'day') ? 'danger' : undefined}
              >
                {dayjs(requirement.due_date).format('YYYY-MM-DD')}
              </Text>
            </div>
          )}
          <div>
            <Text type="secondary">更新时间</Text>
            <br />
            <Text>
              {requirement.updated_at
                ? dayjs(requirement.updated_at).format('YYYY-MM-DD HH:mm')
                : '-'}
            </Text>
          </div>
        </Space>
      </Card>

      {/* 评审信息 */}
      {requirement.review_status && (
        <Card title="📋 评审信息" size="small" style={{ marginBottom: '24px' }}>
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
      <Card title="📈 统计" size="small" style={{ marginBottom: '24px' }}>
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
              {linkedTasksCount}
            </Text>
          </div>
        </Space>
      </Card>

      {/* 快速操作 */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>快速操作</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: '24px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {requirement.status === RequirementStatus.Approved && (
            <Button type="primary" icon={<SwapOutlined />} onClick={onConvert} block>
              转为任务
            </Button>
          )}
          <Button icon={<CopyOutlined />} onClick={onCopyLink} block>
            复制链接
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={onExportPDF} block>
            导出PDF
          </Button>
          <Button icon={<PrinterOutlined />} onClick={onPrint} block>
            打印
          </Button>
        </Space>
      </Card>

      {/* 附件 */}
      {requirement.attachments && requirement.attachments.length > 0 && (
        <Card title="📎 附件" size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {requirement.attachments.map((attachment, index) => {
              const canPreview = ['image', 'pdf'].includes(getFileType(attachment.name));
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Space size="small">
                      {getFileIcon(attachment.name)}
                      <Text ellipsis style={{ maxWidth: '120px' }}>
                        {attachment.name}
                      </Text>
                    </Space>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {(attachment.size / 1024).toFixed(2)} KB
                    </Text>
                  </div>
                  <Space size="small">
                    {canPreview && (
                      <Tooltip title="预览">
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() =>
                            onPreviewAttachment?.(attachment.url, attachment.name)
                          }
                        />
                      </Tooltip>
                    )}
                    <Tooltip title="下载">
                      <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        href={attachment.url}
                        target="_blank"
                      />
                    </Tooltip>
                  </Space>
                </div>
              );
            })}
          </Space>
        </Card>
      )}
    </>
  );
};

RequirementDetailSidebar.displayName = 'RequirementDetailSidebar';
