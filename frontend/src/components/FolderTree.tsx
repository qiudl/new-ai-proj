import React, { useState, useEffect, useCallback } from 'react';
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
import { documentService } from '../services/documentService';
import { DocumentFolder, CreateFolderRequest, UpdateFolderRequest } from '../types/legacy';

// Local interface for folders with extended properties
interface FolderWithExtras extends DocumentFolder {
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

interface TreeNodeData extends DataNode {
  id: number;
  parentId?: number;
  path: string;
  documentCount: number;
  isLeaf?: boolean;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  projectId,
  selectedFolderId,
  onFolderSelect,
  onFolderChange,
  className,
  height = 400
}) => {
  const [folders, setFolders] = useState<FolderWithExtras[]>([]);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<DocumentFolder | null>(null);
  const [parentFolderId, setParentFolderId] = useState<number | undefined>();
  
  const [form] = Form.useForm();

  // 加载文件夹数据
  const loadFolders = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // 模拟API调用，实际项目中需要实现后端接口
      const mockFolders: FolderWithExtras[] = [
        {
          id: 1,
          name: '项目文档',
          project_id: projectId,
          path: '/项目文档',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          document_count: 5,
          children: [
            {
              id: 2,
              name: '需求分析',
              parent_id: 1,
              project_id: projectId,
              path: '/项目文档/需求分析',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              document_count: 3
            },
            {
              id: 3,
              name: '技术方案',
              parent_id: 1,
              project_id: projectId,
              path: '/项目文档/技术方案',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              document_count: 2
            }
          ]
        },
        {
          id: 4,
          name: '设计文档',
          project_id: projectId,
          path: '/设计文档',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          document_count: 8,
          children: [
            {
              id: 5,
              name: 'UI设计',
              parent_id: 4,
              project_id: projectId,
              path: '/设计文档/UI设计',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              document_count: 4
            }
          ]
        }
      ];
      
      setFolders(mockFolders);
      buildTreeData(mockFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
      message.error('加载文件夹失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 构建树形数据
  const buildTreeData = (folderList: DocumentFolder[]) => {
    const treeNodes: TreeNodeData[] = [];
    
    const buildNode = (folder: FolderWithExtras): TreeNodeData => ({
      key: folder.id,
      id: folder.id,
      parentId: folder.parent_id,
      path: folder.path,
      documentCount: folder.document_count,
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
              size="small" 
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ opacity: 0.6 }}
            />
          </Dropdown>
        </div>
      ),
      icon: (props: any) => 
        props.expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: folder.children?.map(buildNode) || [],
      isLeaf: !folder.children || folder.children.length === 0
    });

    folderList.forEach(folder => {
      if (!folder.parent_id) {
        treeNodes.push(buildNode(folder as FolderWithExtras));
      }
    });

    // 添加根节点选项
    const rootNode: TreeNodeData = {
      key: 'root',
      id: 0,
      path: '/',
      documentCount: folderList.reduce((sum, f) => sum + ((f as any).document_count || 0), 0),
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
              size="small" 
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
  const handleEditFolder = (folder: DocumentFolder) => {
    setCurrentFolder(folder);
    setEditModalVisible(true);
    form.setFieldsValue({ name: folder.name });
  };

  // 删除文件夹
  const handleDeleteFolder = (folder: FolderWithExtras) => {
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
          // 模拟删除API调用
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
      const request: CreateFolderRequest = {
        name: values.name,
        parent_id: parentFolderId,
        project_id: projectId!
      };

      // 模拟创建API调用
      console.log('Creating folder:', request);
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
      const request: UpdateFolderRequest = {
        name: values.name
      };

      // 模拟更新API调用
      console.log('Updating folder:', currentFolder.id, request);
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
};

export default FolderTree;