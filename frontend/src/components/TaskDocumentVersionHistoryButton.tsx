import React, { useState, useEffect } from 'react';
import { Button, Badge, Tooltip } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { VersionHistoryModal } from './VersionHistory';
import { DocumentItem } from './UnifiedTaskDocumentArea';
import { realVersionHistoryService } from '../services/realVersionHistoryService';

interface TaskDocumentVersionHistoryButtonProps {
  projectId: number;
  taskId: number;
  documentId?: number;
  selectedDocument?: DocumentItem | null;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
  type?: 'default' | 'primary' | 'text' | 'link';
  onVersionUpdate?: (result: any) => void;
}

const TaskDocumentVersionHistoryButton: React.FC<TaskDocumentVersionHistoryButtonProps> = ({
  projectId,
  taskId,
  documentId,
  selectedDocument,
  style,
  size = 'middle',
  type = 'default',
  onVersionUpdate
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [versionsCount, setVersionsCount] = useState(0);

  // 初始化时加载版本数量
  useEffect(() => {
    const initializeVersionsCount = async () => {
      if (selectedDocument?.id) {
        try {
          const versionHistory = await realVersionHistoryService.getDocumentVersionHistory(
            projectId,
            taskId,
            selectedDocument.id,
            { limit: 10, includeContent: false } // 获取前10个版本来计算数量
          );
          setVersionsCount(versionHistory.length || 1);
        } catch (error) {
          console.warn('获取版本数量失败，使用默认值:', error);
          setVersionsCount(2); // 默认显示有2个版本（模拟数据）
        }
      } else {
        setVersionsCount(0); // 没有选中文档时显示0
      }
    };

    initializeVersionsCount();
  }, [projectId, taskId, selectedDocument?.id]);

  // 获取按钮提示文本
  const getTooltipTitle = () => {
    if (selectedDocument) {
      return `查看文档"${selectedDocument.title}"的版本历史`;
    } else if (documentId) {
      return `查看文档 #${documentId} 的版本历史`;
    } else {
      return `查看任务 #${taskId} 的所有文档版本历史`;
    }
  };

  return (
    <>
      <Tooltip title={getTooltipTitle()}>
        {versionsCount > 0 ? (
          <Badge count={versionsCount} size="small">
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setModalVisible(true)}
              size={size}
              type={type}
              style={style}
              disabled={!selectedDocument?.id}
            >
              {size !== 'small' && '版本历史'}
            </Button>
          </Badge>
        ) : (
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setModalVisible(true)}
            size={size}
            type={type}
            style={style}
            disabled={!selectedDocument?.id}
          >
            {size !== 'small' && '版本历史'}
          </Button>
        )}
      </Tooltip>

      {/* 使用新的VersionHistoryModal组件 */}
      {selectedDocument?.id && (
        <VersionHistoryModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            // 触发版本更新回调（如果需要）
            onVersionUpdate?.({ type: 'view' });
          }}
          projectId={projectId}
          taskId={taskId}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
        />
      )}
    </>
  );
};

export default TaskDocumentVersionHistoryButton;