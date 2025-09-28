import React, { useState, useEffect } from 'react';
import { Button, Modal, Badge, Tooltip, message, Spin } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import VersionHistory from './VersionHistory';
import { VersionInfo, MergeResult, RollbackResult } from '../services/versionHistoryService';
import { DocumentItem } from './UnifiedTaskDocumentArea';
import { taskDocumentService } from '../services/taskDocumentService';
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
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从真实API加载版本历史数据
  const loadVersionHistory = async (): Promise<VersionInfo[]> => {
    if (!selectedDocument?.id) {
      console.warn('没有选中的文档或文档ID');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // 使用真实版本历史服务
      const versionInfoList = await realVersionHistoryService.getDocumentVersionHistory(
        projectId,
        taskId,
        selectedDocument.id,
        {
          limit: 50, // 获取最多50个版本
          includeContent: true // 包含内容以便对比
        }
      );

      console.log(`成功加载 ${versionInfoList.length} 个版本历史记录`);
      return versionInfoList;
      
    } catch (error) {
      console.error('加载版本历史失败:', error);
      setError(error instanceof Error ? error.message : '加载版本历史失败');
      
      // 提供降级的mock数据
      return generateFallbackVersions();
    } finally {
      setLoading(false);
    }
  };

  // 降级的模拟版本数据
  const generateFallbackVersions = (): VersionInfo[] => {
    if (!selectedDocument) {
      return [];
    }

    return [
      {
        id: 1,
        content: `# ${selectedDocument.title} v1.0\n\n${selectedDocument.description || '这是文档的初始版本。'}\n\n## 基础内容\n- 文档创建时间: ${new Date(selectedDocument.created_at).toLocaleString()}\n- 文档类型: ${selectedDocument.type}\n- 初始大小: ${Math.round(selectedDocument.file_size / 1024)}KB`,
        versionNumber: '1.0.0',
        createdAt: new Date(selectedDocument.created_at),
        createdBy: selectedDocument.created_by || 1,
        description: '初始版本',
        size: selectedDocument.file_size,
        hash: `fallback_${selectedDocument.id}_1`
      },
      {
        id: 2,
        content: `# ${selectedDocument.title} v1.1\n\n${selectedDocument.description || '这是文档的更新版本。'}\n\n## 基础内容\n- 文档创建时间: ${new Date(selectedDocument.created_at).toLocaleString()}\n- 文档类型: ${selectedDocument.type}\n- 最后更新: ${new Date().toLocaleString()}\n- 当前大小: ${Math.round(selectedDocument.file_size * 1.1 / 1024)}KB\n- 版本号: v${selectedDocument.version}\n\n## 更新内容\n- 完善了文档结构\n- 增加了详细说明`,
        versionNumber: '1.1.0',
        createdAt: new Date(selectedDocument.updated_at),
        createdBy: selectedDocument.created_by || 2,
        description: '内容更新和格式优化',
        size: Math.round(selectedDocument.file_size * 1.1),
        hash: `fallback_${selectedDocument.id}_2`
      }
    ];
  };

  // 处理版本选择
  const handleVersionSelect = (version: VersionInfo) => {
    console.log('选中版本:', version);
  };

  // 处理版本对比
  const handleVersionCompare = async (oldVersion: VersionInfo, newVersion: VersionInfo) => {
    console.log('对比版本:', oldVersion, newVersion);
    message.success(`正在对比版本 ${oldVersion.versionNumber} 和 ${newVersion.versionNumber}`);
    
    try {
      // 使用真实版本历史服务进行对比
      if (selectedDocument?.id) {
        const diffResults = await realVersionHistoryService.compareVersions(
          projectId,
          taskId,
          selectedDocument.id,
          oldVersion.id,
          newVersion.id
        );
        console.log('版本对比结果:', diffResults);
        
        const totalChanges = diffResults.length;
        message.success(`版本对比完成：${totalChanges} 处变更`);
      }
    } catch (error) {
      console.error('版本对比失败:', error);
      message.error('版本对比失败，请稍后重试');
    }
  };

  // 处理版本合并
  const handleVersionMerge = (result: MergeResult) => {
    console.log('合并结果:', result);
    if (result.success) {
      message.success('版本合并完成，无冲突');
      onVersionUpdate?.({ type: 'merge', result });
    } else {
      message.warning(`版本合并完成，存在 ${result.conflicts.length} 个冲突需要解决`);
      onVersionUpdate?.({ type: 'merge', result });
    }
  };

  // 处理版本回滚
  const handleVersionRollback = async (result: RollbackResult) => {
    console.log('回滚结果:', result);
    
    if (result.success) {
      try {
        // 使用真实版本历史服务进行回滚
        if (selectedDocument?.id) {
          const versionToRestore = versions.find(v => v.versionNumber === result.toVersion);
          if (versionToRestore) {
            const rollbackResult = await realVersionHistoryService.rollbackToVersion(
              projectId,
              taskId,
              selectedDocument.id,
              versionToRestore.id,
              {
                reason: `回滚到版本 ${result.toVersion}`,
                strategy: 'replace'
              }
            );
            
            if (!rollbackResult.success) {
              throw new Error('回滚操作失败');
            }
            
            message.success(`文档已成功回滚到版本 ${result.toVersion}`);
            onVersionUpdate?.({ type: 'rollback', result });
            
            // 重新加载版本历史
            const updatedVersions = await loadVersionHistory();
            setVersions(updatedVersions);
            setVersionsCount(updatedVersions.length);
          }
        }
      } catch (error) {
        console.error('版本回滚失败:', error);
        message.error('文档版本回滚失败');
      }
    } else {
      message.error('文档版本回滚失败');
    }
  };

  // 打开版本历史模态框
  const handleOpenVersionHistory = async () => {
    setModalVisible(true);
    
    // 加载真实版本历史数据
    const versionHistory = await loadVersionHistory();
    setVersions(versionHistory);
    setVersionsCount(versionHistory.length);
  };

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
              onClick={handleOpenVersionHistory}
              size={size}
              type={type}
              style={style}
            >
              {size !== 'small' && '版本历史'}
            </Button>
          </Badge>
        ) : (
          <Button
            icon={<HistoryOutlined />}
            onClick={handleOpenVersionHistory}
            size={size}
            type={type}
            style={style}
          >
            {size !== 'small' && '版本历史'}
          </Button>
        )}
      </Tooltip>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HistoryOutlined />
            <span>
              {selectedDocument 
                ? `文档版本历史 - ${selectedDocument.title}`
                : `任务 #${taskId} 文档版本历史`
              }
            </span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width="95%"
        style={{ maxWidth: 1400, top: 20 }}
        footer={null}
        destroyOnHidden
      >
        <div style={{ 
          minHeight: 600,
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto'
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '400px' 
            }}>
              <Spin size="large" tip="加载版本历史中..." />
            </div>
          ) : error ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '400px',
              color: '#ff4d4f'
            }}>
              <p>❌ 加载失败: {error}</p>
              <Button 
                type="primary" 
                onClick={() => handleOpenVersionHistory()}
                style={{ marginTop: '16px' }}
              >
                重新加载
              </Button>
            </div>
          ) : (
            <VersionHistory
              documentId={selectedDocument?.id || documentId}
              taskId={taskId}
              versions={versions}
              onVersionSelect={handleVersionSelect}
              onVersionCompare={handleVersionCompare}
              onVersionMerge={handleVersionMerge}
              onVersionRollback={handleVersionRollback}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default TaskDocumentVersionHistoryButton;