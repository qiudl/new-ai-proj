/**
 * VersionRestoreConfirm - 版本恢复确认弹窗
 *
 * 确认恢复到历史版本
 */

import React from 'react';
import { Modal, Alert, Descriptions, Space, Typography } from 'antd';
import { ExclamationCircleOutlined, RollbackOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DocumentVersion } from '../../types/version';

const { Text, Paragraph } = Typography;

export interface VersionRestoreConfirmProps {
  /** 弹窗可见性 */
  visible: boolean;
  /** 要恢复的版本 */
  version: DocumentVersion;
  /** 确认回调 */
  onConfirm: (version: DocumentVersion) => void;
  /** 取消回调 */
  onCancel: () => void;
}

/**
 * 版本恢复确认弹窗
 */
const VersionRestoreConfirm: React.FC<VersionRestoreConfirmProps> = ({
  visible,
  version,
  onConfirm,
  onCancel
}) => {
  const createdTime = dayjs(version.createdAt).format('YYYY-MM-DD HH:mm:ss');

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>确认恢复版本</span>
        </Space>
      }
      open={visible}
      onOk={() => onConfirm(version)}
      onCancel={onCancel}
      okText="确认恢复"
      cancelText="取消"
      okButtonProps={{ danger: true, icon: <RollbackOutlined /> }}
      width={600}
    >
      <Alert
        message="重要提示"
        description={
          <div>
            <p>恢复版本将执行以下操作：</p>
            <ul style={{ marginBottom: 0 }}>
              <li>当前文档内容将被替换为历史版本的内容</li>
              <li>当前内容会作为新版本保存，不会丢失</li>
              <li>恢复操作将创建一个新的版本记录</li>
            </ul>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <div style={{ marginBottom: '16px' }}>
        <Text strong>即将恢复到以下版本：</Text>
      </div>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="版本号">
          <Text strong>v{version.version}</Text>
        </Descriptions.Item>
        {version.title && (
          <Descriptions.Item label="标题">
            <Text>{version.title}</Text>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="创建时间">
          <Space size="small">
            <ClockCircleOutlined />
            <Text>{createdTime}</Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="创建人">
          <Text>{version.createdByName || version.createdBy}</Text>
        </Descriptions.Item>
        {version.summary && (
          <Descriptions.Item label="摘要">
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {version.summary}
            </Paragraph>
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginTop: '16px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <ExclamationCircleOutlined /> 请确认是否要恢复到此版本，此操作无法撤销。
        </Text>
      </div>
    </Modal>
  );
};

VersionRestoreConfirm.displayName = 'VersionRestoreConfirm';

export default React.memo(VersionRestoreConfirm);
