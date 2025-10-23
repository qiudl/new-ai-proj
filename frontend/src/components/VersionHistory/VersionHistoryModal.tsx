/**
 * VersionHistoryModal - 版本历史弹窗组件
 * 三栏布局：版本列表 + Diff视图 + 操作区
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, message, Button, Space, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, SwapOutlined } from '@ant-design/icons';
import { VersionInfo } from '../../services/versionHistoryService';
import { realVersionHistoryService } from '../../services/realVersionHistoryService';
import VersionListPanel from './VersionListPanel';
import DiffViewPanel from './DiffViewPanel';
import './VersionHistoryModal.css';

export interface VersionHistoryModalProps {
  /** 是否显示弹窗 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 项目ID */
  projectId: number;
  /** 任务ID */
  taskId: number;
  /** 文档ID */
  documentId: number;
  /** 文档标题 */
  documentTitle?: string;
}

/**
 * VersionHistoryModal组件
 */
const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  visible,
  onClose,
  projectId,
  taskId,
  documentId,
  documentTitle = '文档'
}) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | undefined>();
  const [compareVersionId, setCompareVersionId] = useState<number | undefined>();

  // 加载版本历史
  useEffect(() => {
    if (visible && projectId && taskId && documentId) {
      loadVersionHistory();
    }
  }, [visible, projectId, taskId, documentId]);

  // 加载版本历史
  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const versionList = await realVersionHistoryService.getDocumentVersionHistory(
        projectId,
        taskId,
        documentId,
        {
          limit: 50,
          includeContent: true
        }
      );

      setVersions(versionList);

      // 默认选中最新版本（第一个）
      if (versionList.length > 0) {
        setSelectedVersionId(versionList[0].id);
        // 如果有多个版本，默认对比最新版本和上一个版本
        if (versionList.length > 1) {
          setCompareVersionId(versionList[1].id);
        }
      }
    } catch (error) {
      console.error('加载版本历史失败:', error);
      message.error('加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 版本选择处理（增强版）
  const handleVersionSelect = (version: VersionInfo) => {
    if (!compareVersionId) {
      // 如果还没有选择对比版本，设置为对比版本
      setCompareVersionId(version.id);
      message.info(`已选择版本 ${version.versionNumber} 作为基准版本`);
    } else if (selectedVersionId === version.id) {
      // 如果点击的是已选中的版本，取消选择
      setSelectedVersionId(undefined);
      message.info('已取消选择');
    } else if (compareVersionId === version.id) {
      // 如果点击的是对比版本，取消对比版本
      setCompareVersionId(undefined);
      message.info('已取消对比版本');
    } else {
      // 设置为选中版本
      setSelectedVersionId(version.id);
      message.success(`正在对比版本 ${version.versionNumber}`);
    }
  };

  // 快速导航：上一个版本
  const handlePreviousVersion = useCallback(() => {
    if (!selectedVersionId || versions.length === 0) return;

    const currentIndex = versions.findIndex(v => v.id === selectedVersionId);
    if (currentIndex < versions.length - 1) {
      const previousVersion = versions[currentIndex + 1];
      setSelectedVersionId(previousVersion.id);
      message.info(`切换到 ${previousVersion.versionNumber}`);
    } else {
      message.warning('已经是最早的版本');
    }
  }, [selectedVersionId, versions]);

  // 快速导航：下一个版本
  const handleNextVersion = useCallback(() => {
    if (!selectedVersionId || versions.length === 0) return;

    const currentIndex = versions.findIndex(v => v.id === selectedVersionId);
    if (currentIndex > 0) {
      const nextVersion = versions[currentIndex - 1];
      setSelectedVersionId(nextVersion.id);
      message.info(`切换到 ${nextVersion.versionNumber}`);
    } else {
      message.warning('已经是最新的版本');
    }
  }, [selectedVersionId, versions]);

  // 交换对比版本
  const handleSwapVersions = useCallback(() => {
    if (selectedVersionId && compareVersionId) {
      const temp = selectedVersionId;
      setSelectedVersionId(compareVersionId);
      setCompareVersionId(temp);
      message.info('已交换对比版本');
    }
  }, [selectedVersionId, compareVersionId]);

  // 键盘快捷键支持
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      if ((e.target as HTMLElement).tagName === 'INPUT' ||
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePreviousVersion();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextVersion();
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSwapVersions();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handlePreviousVersion, handleNextVersion, handleSwapVersions, onClose]);

  // 回滚到指定版本
  const handleRollback = async (version: VersionInfo) => {
    try {
      const result = await realVersionHistoryService.rollbackToVersion(
        projectId,
        taskId,
        documentId,
        version.id,
        {
          reason: '用户手动回滚',
          strategy: 'replace'
        }
      );

      if (result.success) {
        message.success(`成功回滚到版本 ${version.versionNumber}`);
        // 重新加载版本历史
        await loadVersionHistory();
      } else {
        message.error('回滚失败');
      }
    } catch (error) {
      console.error('回滚失败:', error);
      message.error('回滚操作失败');
    }
  };

  // 下载版本
  const handleDownload = (version: VersionInfo) => {
    try {
      const blob = new Blob([version.content || ''], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentTitle}_${version.versionNumber}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success('版本下载成功');
    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败');
    }
  };

  // 获取选中的旧版本和新版本
  const getSelectedVersions = (): { oldVersion?: VersionInfo; newVersion?: VersionInfo } => {
    if (!selectedVersionId || !compareVersionId) {
      return {};
    }

    const version1 = versions.find(v => v.id === selectedVersionId);
    const version2 = versions.find(v => v.id === compareVersionId);

    if (!version1 || !version2) {
      return {};
    }

    // 确保旧版本在前，新版本在后
    const version1Index = versions.findIndex(v => v.id === selectedVersionId);
    const version2Index = versions.findIndex(v => v.id === compareVersionId);

    if (version1Index < version2Index) {
      return { oldVersion: version2, newVersion: version1 };
    } else {
      return { oldVersion: version1, newVersion: version2 };
    }
  };

  const { oldVersion, newVersion } = getSelectedVersions();

  return (
    <Modal
      title={`版本历史 - ${documentTitle}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ top: 20 }}
      className="version-history-modal"
      destroyOnClose
    >
      <div className="version-history-container">
        {/* 左侧：版本列表 */}
        <div className="version-list-section">
          <VersionListPanel
            versions={versions}
            selectedVersionId={selectedVersionId}
            onVersionSelect={handleVersionSelect}
            loading={loading}
          />
        </div>

        {/* 右侧：Diff视图 */}
        <div className="diff-view-section">
          {/* 导航工具栏 */}
          {versions.length > 0 && (
            <div className="version-navigation-toolbar">
              <Space>
                <Tooltip title="上一个版本 (←)">
                  <Button
                    icon={<LeftOutlined />}
                    onClick={handlePreviousVersion}
                    disabled={!selectedVersionId || versions.findIndex(v => v.id === selectedVersionId) >= versions.length - 1}
                  >
                    上一版本
                  </Button>
                </Tooltip>

                <Tooltip title="下一个版本 (→)">
                  <Button
                    icon={<RightOutlined />}
                    onClick={handleNextVersion}
                    disabled={!selectedVersionId || versions.findIndex(v => v.id === selectedVersionId) <= 0}
                  >
                    下一版本
                  </Button>
                </Tooltip>

                <Tooltip title="交换对比版本 (Ctrl+S)">
                  <Button
                    icon={<SwapOutlined />}
                    onClick={handleSwapVersions}
                    disabled={!selectedVersionId || !compareVersionId}
                  >
                    交换对比
                  </Button>
                </Tooltip>
              </Space>

              <div className="keyboard-hints">
                <span className="hint">快捷键: ← → 导航 | Ctrl+S 交换 | ESC 关闭</span>
              </div>
            </div>
          )}

          <DiffViewPanel
            oldVersion={oldVersion}
            newVersion={newVersion}
            loading={loading}
            onRollback={handleRollback}
            onDownload={handleDownload}
          />
        </div>
      </div>
    </Modal>
  );
};

export default VersionHistoryModal;
