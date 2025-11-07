import React, { useState } from 'react';
import { Card, Tag, Space, Button, Descriptions, Typography, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  RedoOutlined,
  EyeOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons';
import type { TestLog } from '../../../types/aiConfig';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface TestLogCardProps {
  log: TestLog;
  onViewDetail: (log: TestLog) => void;
  onRetry?: (log: TestLog) => void;
}

export const TestLogCard: React.FC<TestLogCardProps> = ({
  log,
  onViewDetail,
  onRetry
}) => {
  const [expanded, setExpanded] = useState(false);

  /**
   * 复制文本到剪贴板
   */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label}已复制`);
  };

  /**
   * 渲染状态标签
   */
  const renderStatusTag = () => {
    const statusConfig: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
      success: { icon: <CheckCircleOutlined />, color: 'success', text: '成功' },
      failed: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
      timeout: { icon: <ClockCircleOutlined />, color: 'warning', text: '超时' }
    };

    const config = statusConfig[log.testStatus] || {
      icon: <ClockCircleOutlined />,
      color: 'default',
      text: log.testStatus || '未知'
    };

    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  /**
   * 渲染测试类型标签
   */
  const renderTypeTag = () => {
    const typeConfig: Record<string, { color: string; text: string }> = {
      manual: { color: 'blue', text: '手动测试' },
      auto: { color: 'cyan', text: '自动测试' },
      validation: { color: 'purple', text: '验证测试' }
    };

    const config = typeConfig[log.testType] || {
      color: 'default',
      text: log.testType || '未知类型'
    };

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /**
   * 获取状态对应的边框颜色
   */
  const getBorderColor = () => {
    const colorMap: Record<string, string> = {
      success: '#52c41a', // 绿色
      failed: '#ff4d4f',  // 红色
      timeout: '#faad14'  // 橙色
    };
    return colorMap[log.testStatus] || '#d9d9d9'; // 默认灰色
  };

  /**
   * 渲染卡片标题
   */
  const cardTitle = (
    <Space>
      {renderStatusTag()}
      <span>{dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}</span>
      <Tag>{log.responseTimeMs}ms</Tag>
      {renderTypeTag()}
      {log.createdBy && <Tag color="geekblue">测试者#{log.createdBy}</Tag>}
      {expanded ? <DownOutlined /> : <RightOutlined />}
    </Space>
  );

  /**
   * 渲染卡片操作按钮
   */
  const cardExtra = (
    <Space>
      <Button
        type="text"
        size="small"
        icon={<EyeOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onViewDetail(log);
        }}
      >
        详情
      </Button>
      {onRetry && (
        <Button
          type="text"
          size="small"
          icon={<RedoOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onRetry(log);
          }}
        >
          重试
        </Button>
      )}
    </Space>
  );

  /**
   * 渲染问题预览（未展开时）
   */
  const renderQuestionPreview = () => {
    if (expanded) return null;

    const previewLength = 80;
    const preview = log.testQuestion.length > previewLength
      ? log.testQuestion.substring(0, previewLength) + '...'
      : log.testQuestion;

    return (
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          问题预览: {preview}
        </Text>
      </div>
    );
  };

  return (
    <Card
      size="small"
      title={cardTitle}
      extra={cardExtra}
      style={{
        marginBottom: 8,
        cursor: 'pointer',
        borderLeft: `4px solid ${getBorderColor()}` // 左侧彩色边框
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* 未展开时显示问题预览 */}
      {renderQuestionPreview()}

      {/* 展开时显示完整内容 */}
      {expanded && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 测试问题 */}
          <div>
            <Space style={{ marginBottom: 8 }}>
              <Text strong>测试问题:</Text>
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(log.testQuestion, '测试问题');
                }}
              >
                复制
              </Button>
            </Space>
            <Paragraph
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                marginBottom: 0
              }}
            >
              {log.testQuestion}
            </Paragraph>
          </div>

          {/* AI响应 */}
          <div>
            <Space style={{ marginBottom: 8 }}>
              <Text strong>AI响应:</Text>
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(log.aiResponse, 'AI响应');
                }}
              >
                复制
              </Button>
            </Space>
            <Paragraph
              style={{
                background: '#e6f7ff',
                padding: 12,
                borderRadius: 4,
                marginBottom: 0
              }}
            >
              {log.aiResponse}
            </Paragraph>
          </div>

          {/* Token统计 */}
          {log.usage && (
            <Descriptions
              title="Token使用统计"
              size="small"
              column={3}
              bordered
            >
              <Descriptions.Item label="提示词Token">
                {log.usage.promptTokens}
              </Descriptions.Item>
              <Descriptions.Item label="完成Token">
                {log.usage.completionTokens}
              </Descriptions.Item>
              <Descriptions.Item label="总Token">
                <Text strong>{log.usage.totalTokens}</Text>
              </Descriptions.Item>
            </Descriptions>
          )}

          {/* 模型信息 */}
          {log.model && (
            <div>
              <Text strong>模型: </Text>
              <Tag>{log.model}</Tag>
            </div>
          )}

          {/* 错误信息 */}
          {log.errorMessage && (
            <div>
              <Text type="danger" strong>错误信息: </Text>
              <Text type="danger">{log.errorMessage}</Text>
            </div>
          )}
        </Space>
      )}
    </Card>
  );
};
