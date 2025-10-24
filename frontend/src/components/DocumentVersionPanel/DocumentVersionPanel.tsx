/**
 * DocumentVersionPanel - 文档版本面板主组件
 *
 * 用途: 在任务详情页右侧显示文档版本历史时间线
 * 功能: 版本时间线、版本对比、版本恢复
 *
 * @author Claude Code AI
 * @task #2743
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spin, message, Empty } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import VersionPanelHeader from './VersionPanelHeader';
import VersionTimeline from './VersionTimeline';
import VersionDetailModal from './VersionDetailModal';
import VersionCompareModal from './VersionCompareModal';
import VersionRestoreConfirm from './VersionRestoreConfirm';
import { documentVersionService } from '../../services/documentVersionService';
import type { DocumentVersion } from '../../types/version';

export interface DocumentVersionPanelProps {
  /** 项目ID */
  projectId: number;
  /** 任务ID */
  taskId: number;
  /** 文档ID */
  documentId?: number;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
}

/**
 * 文档版本面板组件
 */
const DocumentVersionPanel: React.FC<DocumentVersionPanelProps> = ({
  projectId,
  taskId,
  documentId,
  showTitle = true,
  compact = false
}) => {
  // ===== 状态管理 =====
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [restoreConfirmVisible, setRestoreConfirmVisible] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [compareVersions, setCompareVersions] = useState<{
    fromVersion: DocumentVersion;
    toVersion: DocumentVersion;
  } | null>(null);

  // ===== 数据加载 =====

  /**
   * 加载版本历史
   */
  const loadVersionHistory = useCallback(async () => {
    if (!documentId) {
      console.warn('DocumentVersionPanel: documentId is required');
      return;
    }

    setLoading(true);
    try {
      const result = await documentVersionService.getVersionHistory(documentId);

      setVersions(result.versions || []);
      setTotalCount(result.totalCount || 0);
      setCurrentVersion(result.currentVersion || '');

    } catch (error) {
      console.error('Failed to load version history:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  /**
   * 组件挂载时加载数据
   */
  useEffect(() => {
    if (documentId) {
      loadVersionHistory();
    }
  }, [documentId, loadVersionHistory]);

  // ===== 事件处理 =====

  /**
   * 查看版本详情
   */
  const handleViewDetail = useCallback((version: DocumentVersion) => {
    setSelectedVersion(version);
    setDetailModalVisible(true);
  }, []);

  /**
   * 对比版本
   */
  const handleCompare = useCallback((fromVersion: DocumentVersion, toVersion: DocumentVersion) => {
    setCompareVersions({ fromVersion, toVersion });
    setCompareModalVisible(true);
  }, []);

  /**
   * 恢复版本
   */
  const handleRestore = useCallback((version: DocumentVersion) => {
    setSelectedVersion(version);
    setRestoreConfirmVisible(true);
  }, []);

  /**
   * 确认恢复版本
   */
  const handleConfirmRestore = useCallback(async (version: DocumentVersion) => {
    if (!documentId) return;

    try {
      await documentVersionService.restoreVersion(documentId, version.id);
      message.success(`已恢复到版本 ${version.version}`);
      setRestoreConfirmVisible(false);

      // 重新加载版本列表
      await loadVersionHistory();
    } catch (error) {
      console.error('Failed to restore version:', error);
      message.error('恢复版本失败');
    }
  }, [documentId, loadVersionHistory]);

  /**
   * 刷新版本列表
   */
  const handleRefresh = useCallback(() => {
    loadVersionHistory();
  }, [loadVersionHistory]);

  // ===== 渲染 =====

  // 如果没有文档ID，显示提示
  if (!documentId) {
    return (
      <Card
        title={showTitle ? (
          <>
            <FileTextOutlined /> 文档版本历史
          </>
        ) : null}
        size={compact ? 'small' : 'default'}
      >
        <Empty
          description="该任务暂无文档"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <>
      <Card
        title={showTitle ? (
          <>
            <FileTextOutlined /> 文档版本历史
          </>
        ) : null}
        size={compact ? 'small' : 'default'}
        extra={
          <VersionPanelHeader
            totalCount={totalCount}
            currentVersion={currentVersion}
            onRefresh={handleRefresh}
            loading={loading}
          />
        }
        styles={{ body: { padding: compact ? '8px' : '12px' } }}
      >
        <Spin spinning={loading}>
          {versions.length === 0 && !loading ? (
            <Empty
              description="暂无版本历史"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <VersionTimeline
              versions={versions}
              currentVersion={currentVersion}
              onViewDetail={handleViewDetail}
              onCompare={handleCompare}
              onRestore={handleRestore}
            />
          )}
        </Spin>
      </Card>

      {/* 版本详情弹窗 */}
      {selectedVersion && detailModalVisible && (
        <VersionDetailModal
          visible={detailModalVisible}
          version={selectedVersion}
          onClose={() => setDetailModalVisible(false)}
          onCompare={(toVersion) => {
            setCompareVersions({ fromVersion: selectedVersion, toVersion });
            setDetailModalVisible(false);
            setCompareModalVisible(true);
          }}
          onRestore={() => {
            setDetailModalVisible(false);
            setRestoreConfirmVisible(true);
          }}
        />
      )}

      {/* 版本对比弹窗 */}
      {compareVersions && compareModalVisible && (
        <VersionCompareModal
          visible={compareModalVisible}
          fromVersion={compareVersions.fromVersion}
          toVersion={compareVersions.toVersion}
          documentId={documentId}
          onClose={() => setCompareModalVisible(false)}
        />
      )}

      {/* 版本恢复确认弹窗 */}
      {selectedVersion && restoreConfirmVisible && (
        <VersionRestoreConfirm
          visible={restoreConfirmVisible}
          version={selectedVersion}
          onConfirm={handleConfirmRestore}
          onCancel={() => setRestoreConfirmVisible(false)}
        />
      )}
    </>
  );
};

DocumentVersionPanel.displayName = 'DocumentVersionPanel';

export default React.memo(DocumentVersionPanel);
