import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  Tree, 
  Button, 
  Input, 
  Modal, 
  Form, 
  message, 
  Dropdown, 
  Typography,
  Space,
  Tooltip
} from 'antd';
import { 
  FolderOutlined, 
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { workNotesService, type WorkNoteFolder, type CreateWorkNoteFolderRequest, type UpdateWorkNoteFolderRequest } from '../services/workNotesService';

// Local interface for folders with extended properties
interface FolderWithExtras extends WorkNoteFolder {
  path: string;
  document_count: number;
  children?: FolderWithExtras[];
}

const { Text } = Typography;
const { confirm } = Modal;

interface FolderTreeProps {
  projectId?: number;
  selectedFolderId?: number;
  onFolderSelect?: (folderId: number | null, folderPath: string) => void;
  onFolderChange?: () => void;
  className?: string;
  height?: number;
}

interface FolderTreeRef {
  triggerCreateFolder: (parentId?: number) => void;
}

interface TreeNodeData extends DataNode {
  id: number;
  parentId?: number;
  path: string;
  documentCount: number;
  isLeaf?: boolean;
}

const FolderTree = forwardRef<FolderTreeRef, FolderTreeProps>(({
  projectId,
  selectedFolderId,
  onFolderSelect,
  onFolderChange,
  className,
  height = 400
}, ref) => {
  const [folders, setFolders] = useState<FolderWithExtras[]>([]);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<WorkNoteFolder | null>(null);
  const [parentFolderId, setParentFolderId] = useState<number | undefined>();
  
  const [form] = Form.useForm();

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    triggerCreateFolder: (parentId?: number) => {
      handleCreateFolder(parentId);
    }
  }));

  // 加载文件夹数据
  const loadFolders = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // 调用真实API获取文件夹树
      const data = await workNotesService.getFolderTree();
      const folders = (data && (data as any).tree) ? (data as any).tree as WorkNoteFolder[] : [];
      // 转换为 FolderWithExtras 类型，添加缺失的属性
      const foldersWithExtras: FolderWithExtras[] = folders.map(folder => ({
        ...folder,
        path: folder.name, // 使用文件夹名称作为路径
        document_count: folder.notes_count || 0, // workNotesService使用notes_count字段
        children: folder.children as FolderWithExtras[] || []
      }));
      setFolders(foldersWithExtras);
      buildTreeData(foldersWithExtras);
    } catch (error: any) {
      console.error('Failed to load folders:', error);
      message.error(error?.message || '加载文件夹失败');
      setFolders([]);
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 构建树形数据
  const buildTreeData = (folderList: WorkNoteFolder[]) => {
    const treeNodes: TreeNodeData[] = [];
    
    const buildNode = (folder: any): TreeNodeData => ({
      key: folder.id,
      id: folder.id,
      parentId: folder.parent_folder_id ?? folder.parent_id,
      path: folder.path || `/${folder.name}`,
      documentCount: folder.documents_count ?? folder.document_count ?? 0,
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span>{folder.name}</span>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ({folder.document_count})
            </Text>
          </Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'create',
                  icon: <PlusOutlined />,
                  label: '新建子文件夹',
                  onClick: () => handleCreateFolder(folder.id)
                },
                {
                  key: 'edit',
                  icon: <EditOutlined />,
                  label: '重命名',
                  onClick: () => handleEditFolder(folder)
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除',
                  danger: true,
                  onClick: () => handleDeleteFolder(folder)
                }
              ]
            }}
            trigger={['click']}
          >
            <Button 
              type="text" 
               
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ opacity: 0.6 }}
            />
          </Dropdown>
        </div>
      ),
      icon: (props: Record<string, unknown>) => 
        props.expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: folder.children?.map(buildNode) || [],
      isLeaf: !folder.children || folder.children.length === 0
    });

    folderList.forEach((folder: any) => {
      if (!folder.parent_folder_id && !folder.parent_id) {
        treeNodes.push(buildNode(folder));
      }
    });

    // 添加根节点选项
    const rootNode: TreeNodeData = {
      key: 'root',
      id: 0,
      path: '/',
      documentCount: (folderList as any[]).reduce((sum, f: any) => sum + (f.documents_count ?? f.document_count ?? 0), 0),
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span>根目录</span>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              (全部文档)
            </Text>
          </Space>
          <Tooltip title="在根目录下新建文件夹">
            <Button 
              type="text" 
               
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleCreateFolder();
              }}
              style={{ opacity: 0.6 }}
            />
          </Tooltip>
        </div>
      ),
      icon: <FileTextOutlined />,
      children: treeNodes
    };

    setTreeData([rootNode]);
    
    // 默认展开第一级文件夹
    setExpandedKeys(['root']);
  };

  // 初始化选中状态
  useEffect(() => {
    if (selectedFolderId) {
      setSelectedKeys([selectedFolderId.toString()]);
    } else {
      setSelectedKeys(['root']);
    }
  }, [selectedFolderId]);

  // 初始化数据
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // 处理文件夹选择
  const handleSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0];
      if (key === 'root') {
        onFolderSelect?.(null, '/');
      } else {
        const selectedNode = info.node as unknown as TreeNodeData;
        onFolderSelect?.(selectedNode.id, selectedNode.path);
      }
      setSelectedKeys(selectedKeys);
    }
  };

  // 处理展开/收起
  const handleExpand: TreeProps['onExpand'] = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
  };

  // 创建文件夹
  const handleCreateFolder = (parentId?: number) => {
    setParentFolderId(parentId);
    setCreateModalVisible(true);
    form.resetFields();
  };

  // 编辑文件夹
  const handleEditFolder = (folder: WorkNoteFolder) => {
    setCurrentFolder(folder);
    setEditModalVisible(true);
    form.setFieldsValue({ name: folder.name });
  };

  // 删除文件夹
  const handleDeleteFolder = (folder: any) => {
    if (folder.document_count > 0) {
      message.warning('文件夹内有文档，无法删除');
      return;
    }

    confirm({
      title: '确认删除',
      content: `确定要删除文件夹"${folder.name}"吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 调用真实API删除文件夹
          await workNotesService.deleteFolder(folder.id);
          message.success('文件夹已删除');
          loadFolders();
          onFolderChange?.();
        } catch (error) {
          console.error('Failed to delete folder:', error);
          message.error('删除文件夹失败');
        }
      }
    });
  };

  // 确认创建文件夹
  const handleConfirmCreate = async () => {
    try {
      const values = await form.validateFields();
      const request: CreateWorkNoteFolderRequest = {
        name: values.name,
        parent_id: parentFolderId, // workNotesService使用parent_id字段
        visibility: 'private' // 默认私有
      };

      await workNotesService.createFolder(request);
      message.success('文件夹创建成功');
      setCreateModalVisible(false);
      loadFolders();
      onFolderChange?.();
    } catch (error) {
      console.error('Failed to create folder:', error);
      message.error('创建文件夹失败');
    }
  };

  // 确认编辑文件夹
  const handleConfirmEdit = async () => {
    if (!currentFolder) return;

    try {
      const values = await form.validateFields();
      const request: UpdateWorkNoteFolderRequest = {
        name: values.name
      };

      await workNotesService.updateFolder(currentFolder.id, request);
      message.success('文件夹重命名成功');
      setEditModalVisible(false);
      setCurrentFolder(null);
      loadFolders();
      onFolderChange?.();
    } catch (error) {
      console.error('Failed to update folder:', error);
      message.error('重命名文件夹失败');
    }
  };

  return (
    <div className={className}>
      {/* 文件夹树 */}
      <Tree
        treeData={treeData}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onSelect={handleSelect}
        onExpand={handleExpand}
        draggable={{ icon: false }}
        onDrop={async (info) => {
          try {
            const dragNode = info.dragNode as unknown as TreeNodeData;
            const dropNode = info.node as unknown as TreeNodeData;
            let newParentId: number | undefined;
            if (info.dropToGap) {
              // 放在节点间隙：归到目标节点的父级
              newParentId = dropNode.id === 0 ? undefined : (dropNode.parentId as number | undefined);
            } else {
              // 放在节点上：成为其子级
              newParentId = dropNode.id === 0 ? undefined : dropNode.id;
            }
            // workNotesService.moveFolder接受三个参数：(id, targetParentId, sortOrder)
            await workNotesService.moveFolder(dragNode.id, newParentId ?? null, 0);
            // 可选：后续根据新父级的 children 顺序，调用 batchUpdateFolders 调整 sort_order
            await loadFolders();
            onFolderChange?.();
            message.success('文件夹已移动');
          } catch (e: any) {
            console.error(e);
            message.error(e?.message || '移动失败');
          }
        }}
        showIcon
        height={height}
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          padding: '8px'
        }}
      />

      {/* 创建文件夹模态框 */}
      <Modal
        title="新建文件夹"
        open={createModalVisible}
        onOk={handleConfirmCreate}
        onCancel={() => setCreateModalVisible(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              { max: 50, message: '文件夹名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑文件夹模态框 */}
      <Modal
        title="重命名文件夹"
        open={editModalVisible}
        onOk={handleConfirmEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentFolder(null);
        }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              { max: 50, message: '文件夹名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

FolderTree.displayName = 'FolderTree';

export default FolderTree;