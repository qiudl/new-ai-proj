import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  TreeSelect,
  message,
  Space,
  Typography,
  Divider,
} from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { WorkNoteFolder, CreateWorkNoteFolderRequest, UpdateWorkNoteFolderRequest } from '../services/workNotesService';
import { ErrorHandler } from '../utils/error';
import { useModalConfig } from '../hooks/useModalConfig';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

export interface FolderFormValues {
  name: string;
  description?: string;
  parent_id?: number;
  visibility: 'private' | 'team' | 'public';
  color?: string;
  icon?: string;
}

export interface FolderDialogProps {
  /** 对话框是否可见 */
  visible: boolean;

  /** 关闭对话框回调 */
  onClose: () => void;

  /** 确认回调 */
  onConfirm: (values: FolderFormValues) => Promise<void>;

  /** 编辑模式：传入现有文件夹数据 */
  folder?: WorkNoteFolder;

  /** 父文件夹ID（创建子文件夹时使用） */
  parentId?: number;

  /** 树类型（用于设置默认可见性） */
  treeType?: 'private' | 'team' | 'public';

  /** 所有文件夹列表（用于选择父文件夹） */
  folders: WorkNoteFolder[];
}

/**
 * 文件夹创建/编辑对话框
 *
 * 功能：
 * - 创建新文件夹（支持选择父文件夹）
 * - 编辑现有文件夹
 * - 表单验证
 * - 颜色和图标选择
 */
const FolderDialog: React.FC<FolderDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  folder,
  parentId,
  treeType,
  folders,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const isEditMode = !!folder;

  // 表单验证规则
  const validationRules = {
    name: [
      { required: true, message: '请输入文件夹名称' },
      { min: 1, max: 100, message: '名称长度为1-100个字符' },
      { pattern: /^[^/\\]+$/, message: '名称不能包含 / 或 \\' },
    ],
    description: [
      { max: 500, message: '描述不能超过500个字符' },
    ],
  };

  // 查找指定ID的文件夹（递归搜索）
  const findFolderById = useCallback((folderId: number): WorkNoteFolder | undefined => {
    const findInTree = (folders: WorkNoteFolder[]): WorkNoteFolder | undefined => {
      for (const folder of folders) {
        if (folder.id === folderId) return folder;
        if (folder.children) {
          const found = findInTree(folder.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findInTree(folders);
  }, [folders]);

  // 获取父文件夹信息
  const parentFolder = useMemo(() => {
    if (parentId) {
      return findFolderById(parentId);
    }
    return undefined;
  }, [parentId, findFolderById]);

  // 构建文件夹树形选择数据（只显示当前树类型的文件夹）
  const buildFolderTreeSelectData = useMemo(() => {
    // 过滤出当前树类型的文件夹
    const filteredFolders = folders.filter(f => f.visibility === treeType);

    const buildTree = (folderList: WorkNoteFolder[], parentId?: number): any[] => {
      return folderList
        .filter(f => f.parent_id === parentId)
        .map(folder => ({
          value: folder.id,
          title: (
            <span>
              {folder.icon && <span style={{ marginRight: 4 }}>{folder.icon}</span>}
              {folder.name}
            </span>
          ),
          children: buildTree(folderList, folder.id),
        }));
    };

    return buildTree(filteredFolders, undefined);
  }, [folders, treeType]);

  // 初始化表单
  useEffect(() => {
    if (visible) {
      if (folder) {
        // 编辑模式：填充现有数据
        form.setFieldsValue({
          name: folder.name,
          description: folder.description || '',
          visibility: folder.visibility,
          color: folder.color || '#1890ff',
          icon: folder.icon || '📁',
        });
      } else {
        // 创建模式：设置默认值，visibility从treeType获取
        form.setFieldsValue({
          parent_id: parentId,
          visibility: treeType || 'private',
          color: '#1890ff',
          icon: '📁',
        });
      }
    } else {
      form.resetFields();
    }
  }, [visible, folder, parentId, treeType, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onConfirm(values);
      message.success(folder ? '文件夹已更新' : '文件夹已创建');
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误，不显示消息
        return;
      }
      ErrorHandler.showError(error, folder ? '更新文件夹失败' : '创建文件夹失败');
    } finally {
      setLoading(false);
    }
  };

  const modalConfig = useModalConfig({ width: 600 });

  return (
    <Modal
      {...modalConfig}
      title={
        <Space>
          <FolderOutlined />
          <span>{folder ? '编辑文件夹' : '创建文件夹'}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={folder ? '保存' : '创建'}
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        {/* 文件夹名称 */}
        <Form.Item
          name="name"
          label={<Text strong>文件夹名称</Text>}
          rules={validationRules.name}
        >
          <Input
            placeholder="输入文件夹名称"
            autoFocus
            prefix={<FolderOutlined />}
          />
        </Form.Item>

        {/* 描述 */}
        <Form.Item
          name="description"
          label="描述"
          rules={validationRules.description}
        >
          <TextArea
            rows={3}
            placeholder="输入文件夹描述（可选）"
            showCount
            maxLength={500}
          />
        </Form.Item>

        {/* 父文件夹选择（仅创建模式） */}
        {!folder && (
          <Form.Item
            name="parent_id"
            label="父文件夹"
            tooltip={parentId ? "创建子文件夹时父文件夹已固定" : "选择父文件夹或留空创建根级文件夹"}
          >
            {parentId && parentFolder ? (
              <Input
                disabled
                prefix={
                  <span>
                    {parentFolder.icon && <span style={{ marginRight: 4 }}>{parentFolder.icon}</span>}
                    <FolderOutlined />
                  </span>
                }
                value={parentFolder.name}
                style={{ width: '100%' }}
              />
            ) : (
              <TreeSelect
                placeholder="选择父文件夹（留空则为根级文件夹）"
                treeData={buildFolderTreeSelectData}
                allowClear
                showSearch
                treeDefaultExpandAll
                style={{ width: '100%' }}
              />
            )}
          </Form.Item>
        )}

        {/* 可见性 */}
        <Form.Item
          name="visibility"
          label="可见性"
          tooltip="控制谁可以看到此文件夹"
        >
          <Select getPopupContainer={(trigger) => trigger.parentElement || document.body}>
            <Option value="private">
              <Space>
                <span>🔒</span>
                <span>私有 - 只有我可见</span>
              </Space>
            </Option>
            <Option value="team">
              <Space>
                <span>👥</span>
                <span>团队 - 团队成员可见</span>
              </Space>
            </Option>
            <Option value="public">
              <Space>
                <span>🌐</span>
                <span>公开 - 所有人可见</span>
              </Space>
            </Option>
          </Select>
        </Form.Item>

        <Divider plain>外观设置</Divider>

        {/* 颜色选择 */}
        <Form.Item name="color" label="文件夹颜色">
          <ColorPicker />
        </Form.Item>

        {/* 图标选择 */}
        <Form.Item name="icon" label="文件夹图标">
          <IconPicker />
        </Form.Item>

        {/* 预览 */}
        <Form.Item label="预览">
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
            prevValues.icon !== currentValues.icon ||
            prevValues.color !== currentValues.color ||
            prevValues.name !== currentValues.name
          }>
            {({ getFieldValue }) => {
              const icon = getFieldValue('icon') || '📁';
              const color = getFieldValue('color') || '#1890ff';
              const name = getFieldValue('name') || '文件夹名称';

              return (
                <div
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    backgroundColor: '#fafafa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ color, fontWeight: 500 }}>{name}</span>
                </div>
              );
            }}
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default FolderDialog;
