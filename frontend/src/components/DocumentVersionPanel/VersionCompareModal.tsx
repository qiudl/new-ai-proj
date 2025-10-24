/**
 * VersionCompareModal - 版本对比弹窗
 *
 * 显示两个版本之间的差异
 */

import React, { useState, useEffect } from 'react';
import { Modal, Spin, Alert, Space, Tag, Typography, Descriptions } from 'antd';
import { SwapOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { documentVersionService } from '../../services/documentVersionService';
import type { DocumentVersion } from '../../types/version';
import type { VersionDiff } from '../../services/documentVersionService';

const { Text, Paragraph } = Typography;

export interface VersionCompareModalProps {
  /** 弹窗可见性 */
  visible: boolean;
  /** 源版本 */
  fromVersion: DocumentVersion;
  /** 目标版本 */
  toVersion: DocumentVersion;
  /** 文档ID */
  documentId: number;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 版本对比弹窗
 */
const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
  visible,
  fromVersion,
  toVersion,
  documentId,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载版本差异
   */
  useEffect(() => {
    if (visible && fromVersion && toVersion) {
      loadDiff();
    }
  }, [visible, fromVersion, toVersion]);

  const loadDiff = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await documentVersionService.compareVersions(
        documentId,
        fromVersion.id,
        toVersion.id
      );
      setDiff(result);
    } catch (err) {
      console.error('Failed to load version diff:', err);
      setError('加载版本对比失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>版本对比</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
    >
      {/* 版本信息 */}
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <Space size="large" align="center">
          <div>
            <Tag color="blue">源版本</Tag>
            <Text strong>v{fromVersion.version}</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
              {fromVersion.title}
            </Paragraph>
          </div>
          <ArrowRightOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <div>
            <Tag color="green">目标版本</Tag>
            <Text strong>v{toVersion.version}</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
              {toVersion.title}
            </Paragraph>
          </div>
        </Space>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin tip="正在对比版本..." />
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <Alert
          message="对比失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 差异统计 */}
      {!loading && !error && diff && (
        <>
          <Descriptions column={4} bordered size="small" style={{ marginBottom: '16px' }}>
            <Descriptions.Item label="新增行">
              <Text type="success">+{diff.summary.linesAdded}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="删除行">
              <Text type="danger">-{diff.summary.linesRemoved}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="修改行">
              <Text type="warning">{diff.summary.linesModified}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="总变更">
              <Text strong>{diff.summary.totalChanges}</Text>
            </Descriptions.Item>
          </Descriptions>

          {/* 差异详情 */}
          <div style={{ marginTop: '16px' }}>
            <Text strong>变更详情</Text>

            {/* 新增内容 */}
            {diff.added.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <Tag color="success">新增 ({diff.added.length})</Tag>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}
                >
                  {diff.added.map((item) => (
                    <div key={item.line} style={{ marginBottom: '4px', fontSize: '12px' }}>
                      <Text type="secondary" style={{ marginRight: '8px' }}>
                        L{item.line}
                      </Text>
                      <Text code style={{ color: '#52c41a' }}>
                        + {item.content}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 删除内容 */}
            {diff.removed.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <Tag color="error">删除 ({diff.removed.length})</Tag>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}
                >
                  {diff.removed.map((item) => (
                    <div key={item.line} style={{ marginBottom: '4px', fontSize: '12px' }}>
                      <Text type="secondary" style={{ marginRight: '8px' }}>
                        L{item.line}
                      </Text>
                      <Text code style={{ color: '#ff4d4f' }} delete>
                        - {item.content}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 修改内容 */}
            {diff.modified.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <Tag color="warning">修改 ({diff.modified.length})</Tag>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#fffbe6',
                    border: '1px solid #ffe58f',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}
                >
                  {diff.modified.map((item) => (
                    <div key={item.line} style={{ marginBottom: '8px', fontSize: '12px' }}>
                      <Text type="secondary" style={{ marginRight: '8px' }}>
                        L{item.line}
                      </Text>
                      <div style={{ paddingLeft: '40px' }}>
                        <Text code style={{ color: '#ff4d4f' }} delete>
                          - {item.old}
                        </Text>
                        <br />
                        <Text code style={{ color: '#52c41a' }}>
                          + {item.new}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无变更 */}
            {diff.summary.totalChanges === 0 && (
              <Alert
                message="版本相同"
                description="这两个版本没有差异"
                type="info"
                showIcon
                style={{ marginTop: '12px' }}
              />
            )}
          </div>
        </>
      )}
    </Modal>
  );
};

VersionCompareModal.displayName = 'VersionCompareModal';

export default React.memo(VersionCompareModal);
