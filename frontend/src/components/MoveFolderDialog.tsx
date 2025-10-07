import React, { useState, useMemo } from 'react';
import {
  Modal,
  Alert,
  Space,
  Typography,
  message,
  TreeSelect,
  Form,
} from 'antd';
import {
  SwapOutlined,
  FolderOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { WorkNoteFolder } from '../services/workNotesService';

const { Text } = Typography;

export interface MoveFolderDialogProps {
  /** 对话框是否可见 */
  visible: boolean;

  /** 关闭对话框回调 */
  onClose: () => void;

  /** 确认移动回调 */
  onConfirm: (targetParentId: number | null) => Promise<void>;

  /** 要移动的文件夹 */
  folder: WorkNoteFolder | null;

  /** 所有文件夹列表 */
  folders: WorkNoteFolder[];
}

/**
 * 移动文件夹对话框
 *
 * 功能：
 * - 选择目标父文件夹
 * - 排除当前文件夹及其子文件夹（防止循环引用）
 * - 显示移动预览
 */
const MoveFolderDialog: React.FC<MoveFolderDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  folder,
  folders,
}) => {
  const [targetParentId, setTargetParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (!folder) {
    return null;
  }

  // 构建可选父文件夹列表（排除当前文件夹及其子文件夹）
  const { availableFolders, excludedCount } = useMemo(() => {
    const excludeIds = new Set([folder.id]);

    // 递归收集所有子文件夹ID
    const collectChildIds = (folderId: number) => {
      folders.forEach(f => {
        if (f.parent_id === folderId) {
          excludeIds.add(f.id);
          collectChildIds(f.id);
        }
      });
    };

    collectChildIds(folder.id);

    return {
      availableFolders: folders.filter(f => !excludeIds.has(f.id)),
      excludedCount: excludeIds.size - 1, // 减去自身
    };
  }, [folder, folders]);

  // 构建树形选择数据
  const buildFolderTreeSelectData = useMemo(() => {
    const buildTree = (folders: WorkNoteFolder[], parentId?: number): any[] => {
      return folders
        .filter(f => f.parent_id === parentId)
        .map(folder => ({
          value: folder.id,
          title: (
            <span>
              {folder.icon && <span style={{ marginRight: 4 }}>{folder.icon}</span>}
              {folder.name}
            </span>
          ),
          children: buildTree(folders, folder.id),
        }));
    };

    return buildTree(availableFolders, undefined);
  }, [availableFolders]);

  // 获取目标文件夹信息
  const targetFolder = targetParentId
    ? folders.find(f => f.id === targetParentId)
    : null;

  const handleConfirm = async () => {
    // 检查是否移动到相同位置
    if (targetParentId === folder.parent_id) {
      message.warning('目标位置与当前位置相同，无需移动');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(targetParentId);
      message.success('文件夹已移动');
      setTargetParentId(null);
      onClose();
    } catch (error: any) {
      console.error('Move folder failed:', error);
      message.error(error.message || '移动失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTargetParentId(null);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>移动文件夹</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText="移动"
      cancelText="取消"
      width={600}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 当前文件夹信息 */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
          }}
        >
          <Space>
            <Text type="secondary">移动：</Text>
            <Space>
              {folder.icon && <span>{folder.icon}</span>}
              <Text strong style={{ color: folder.color }}>{folder.name}</Text>
            </Space>
          </Space>
        </div>

        {/* 目标位置选择 */}
        <Form.Item label={<Text strong>目标位置</Text>} style={{ marginBottom: 0 }}>
          <TreeSelect
            value={targetParentId}
            onChange={setTargetParentId}
            placeholder="选择目标父文件夹（留空则移动到根级）"
            treeData={buildFolderTreeSelectData}
            allowClear
            showSearch
            treeDefaultExpandAll
            style={{ width: '100%' }}
            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
            suffixIcon={<FolderOutlined />}
          />
        </Form.Item>

        {/* 排除提示 */}
        {excludedCount > 0 && (
          <Alert
            message={`已自动排除 ${excludedCount} 个子文件夹，防止循环引用`}
            type="info"
            showIcon
            style={{ fontSize: 12 }}
          />
        )}

        {/* 移动预览 */}
        {targetParentId !== null || folder.parent_id !== null ? (
          <Alert
            message="移动预览"
            description={
              <div style={{ marginTop: 8 }}>
                <Space align="center">
                  {/* 源位置 */}
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      当前位置
                    </Text>
                    <div style={{ marginTop: 4 }}>
                      {folder.parent_id ? (
                        <Space>
                          {folders.find(f => f.id === folder.parent_id)?.icon}
                          <Text>
                            {folders.find(f => f.id === folder.parent_id)?.name}
                          </Text>
                        </Space>
                      ) : (
                        <Text type="secondary">根级文件夹</Text>
                      )}
                    </div>
                  </div>

                  {/* 箭头 */}
                  <ArrowRightOutlined style={{ fontSize: 20, color: '#1890ff' }} />

                  {/* 目标位置 */}
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      目标位置
                    </Text>
                    <div style={{ marginTop: 4 }}>
                      {targetFolder ? (
                        <Space>
                          {targetFolder.icon}
                          <Text strong style={{ color: '#1890ff' }}>
                            {targetFolder.name}
                          </Text>
                        </Space>
                      ) : (
                        <Text type="secondary">根级文件夹</Text>
                      )}
                    </div>
                  </div>
                </Space>
              </div>
            }
            type="success"
          />
        ) : null}

        {/* 提示信息 */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 4,
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 移动文件夹会保留其所有子文件夹和笔记
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default MoveFolderDialog;
