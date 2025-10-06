import React from 'react';
import { Modal, Descriptions, Tag, Button, Space, message } from 'antd';
import {
  DownloadOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { TestLog } from '../../../types/aiConfig';
import { AIConfigTestService } from '../../../services/aiConfigTestService';
import dayjs from 'dayjs';

interface TestDetailModalProps {
  log: TestLog | null;
  visible: boolean;
  onClose: () => void;
}

export const TestDetailModal: React.FC<TestDetailModalProps> = ({
  log,
  visible,
  onClose
}) => {
  if (!log) return null;

  /**
   * 导出为JSON
   */
  const handleExportJSON = () => {
    AIConfigTestService.exportTestLogAsJSON(log);
    message.success('导出成功');
  };

  /**
   * 复制全部信息
   */
  const handleCopyAll = () => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  /**
   * 渲染状态标签
   */
  const renderStatusTag = () => {
    const statusConfig = {
      success: { icon: <CheckCircleOutlined />, color: 'success', text: '成功' },
      failed: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
      timeout: { icon: <ClockCircleOutlined />, color: 'warning', text: '超时' }
    };

    const config = statusConfig[log.testStatus];
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  return (
    <Modal
      title="测试详情"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          <Button icon={<CopyOutlined />} onClick={handleCopyAll}>
            复制全部
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportJSON}
          >
            导出JSON
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="测试ID" span={1}>
          {log.id}
        </Descriptions.Item>
        <Descriptions.Item label="配置ID" span={1}>
          {log.configId}
        </Descriptions.Item>

        <Descriptions.Item label="Provider" span={1}>
          <Tag>{log.provider.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="测试状态" span={1}>
          {renderStatusTag()}
        </Descriptions.Item>

        <Descriptions.Item label="测试类型" span={1}>
          <Tag color="blue">{log.testType}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="响应时间" span={1}>
          {log.responseTimeMs}ms
        </Descriptions.Item>

        {log.model && (
          <Descriptions.Item label="模型" span={2}>
            {log.model}
          </Descriptions.Item>
        )}

        <Descriptions.Item label="测试问题" span={2}>
          <div style={{ maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {log.testQuestion}
          </div>
        </Descriptions.Item>

        <Descriptions.Item label="AI响应" span={2}>
          <div style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {log.aiResponse}
          </div>
        </Descriptions.Item>

        {log.usage && (
          <>
            <Descriptions.Item label="提示词Token">
              {log.usage.promptTokens}
            </Descriptions.Item>
            <Descriptions.Item label="完成Token">
              {log.usage.completionTokens}
            </Descriptions.Item>
            <Descriptions.Item label="总Token" span={2}>
              <strong>{log.usage.totalTokens}</strong>
            </Descriptions.Item>
          </>
        )}

        {log.errorMessage && (
          <Descriptions.Item label="错误信息" span={2}>
            <span style={{ color: '#ff4d4f' }}>{log.errorMessage}</span>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="创建时间" span={2}>
          {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};
