import React, { useState } from 'react';
import {
  Modal,
  Alert,
  Space,
  Checkbox,
  Typography,
  message,
} from 'antd';
import {
  WarningOutlined,
  DeleteOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { WorkNoteFolder } from '../services/workNotesService';

const { Text } = Typography;

export interface DeleteFolderDialogProps {
  /** 对话框是否可见 */
  visible: boolean;

  /** 关闭对话框回调 */
  onClose: () => void;

  /** 确认删除回调 */
  onConfirm: (force: boolean) => Promise<void>;

  /** 要删除的文件夹 */
  folder: WorkNoteFolder | null;
}

/**
 * 删除文件夹确认对话框
 *
 * 功能：
 * - 检查文件夹是否为空
 * - 空文件夹：直接删除
 * - 非空文件夹：提示用户选择（强制删除或先移动内容）
 * - 显示确认对话框
 */
const DeleteFolderDialog: React.FC<DeleteFolderDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  folder,
}) => {
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!folder) {
    return null;
  }

  const hasContent = (folder.notes_count || 0) > 0 || (folder.subfolders_count || 0) > 0;

  const handleConfirm = async () => {
    if (hasContent && !force) {
      message.warning('请勾选强制删除选项，或先移动文件夹内容');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(force);
      message.success('文件夹已删除');
      setForce(false);
      onClose();
    } catch (error: any) {
      console.error('Delete folder failed:', error);
      message.error(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForce(false);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
          <span>删除文件夹</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText="删除"
      cancelText="取消"
      okButtonProps={{ danger: true }}
      width={500}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 基本确认信息 */}
        <Alert
          message={
            <Space>
              <FolderOutlined />
              <Text strong>
                确定要删除文件夹 "{folder.name}" 吗？
              </Text>
            </Space>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined />}
        />

        {/* 文件夹内容提示 */}
        {hasContent ? (
          <>
            <Alert
              message="此文件夹不为空"
              description={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <Text>包含内容：</Text>
                    <ul style={{ margin: '8px 0', paddingLeft: 24 }}>
                      {(folder.notes_count || 0) > 0 && (
                        <li>
                          <Text strong>{folder.notes_count}</Text> 条笔记
                        </li>
                      )}
                      {(folder.subfolders_count || 0) > 0 && (
                        <li>
                          <Text strong>{folder.subfolders_count}</Text> 个子文件夹
                        </li>
                      )}
                    </ul>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      backgroundColor: '#fff2e8',
                      border: '1px solid #ffbb96',
                      borderRadius: 4,
                    }}
                  >
                    <Checkbox
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                    >
                      <Text strong style={{ color: '#d4380d' }}>
                        强制删除（包括所有子内容）
                      </Text>
                    </Checkbox>
                  </div>
                </Space>
              }
              type="error"
              showIcon
            />

            {!force && (
              <Alert
                message="建议操作"
                description="建议先将文件夹内的笔记和子文件夹移动到其他位置，然后再删除空文件夹。"
                type="info"
                showIcon
              />
            )}
          </>
        ) : (
          <Alert
            message="空文件夹"
            description="此文件夹不包含任何笔记或子文件夹，可以安全删除。"
            type="success"
            showIcon
          />
        )}

        {/* 不可撤销提示 */}
        <div style={{
          textAlign: 'center',
          padding: '12px',
          backgroundColor: '#fff1f0',
          border: '1px dashed #ffa39e',
          borderRadius: 4,
        }}>
          <Text type="danger" strong>
            ⚠️ 此操作不可撤销
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default DeleteFolderDialog;
