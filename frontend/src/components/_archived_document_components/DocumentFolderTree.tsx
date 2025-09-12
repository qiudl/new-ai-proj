import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tree, 
  Space, 
  Typography, 
  Tooltip, 
  Dropdown, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message,
  Button
} from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  EllipsisOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ScissorOutlined,
  CopyOutlined,
  FileOutlined
} from '@ant-design/icons';
import type { TreeProps, DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import { documentFolderService, DocumentFolder, CreateDocumentFolderRequest, UpdateDocumentFolderRequest } from '../services/documentFolderService';

const { Text } = Typography;
const { Option } = Select;

interface DocumentFolderTreeProps {
  selectedFolderId?: number | null;
  onFolderSelect?: (folderId: number | null, folder?: DocumentFolder) => void;
  onFolderChange?: () => void;
  showRootOption?: boolean;
  draggable?: boolean;
  height?: number;
  style?: React.CSSProperties;
}

interface TreeDataNode extends DataNode {
  key: string;
  title: React.ReactNode;
  folder: DocumentFolder;
  children?: TreeDataNode[];
}

const DocumentFolderTree: React.FC<DocumentFolderTreeProps> = ({
  selectedFolderId,
  onFolderSelect,
  onFolderChange,
  showRootOption = true,
  draggable = true,
  height = 400,
  style
}) => {
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  
  // 模态框状态
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentFolder, setCurrentFolder] = useState<DocumentFolder | null>(null);
  const [parentFolder, setParentFolder] = useState<DocumentFolder | null>(null);
  
  // 拖拽状态
  const [dragOverNodeKey, setDragOverNodeKey] = useState<string>('');
  const [cutFolder, setCutFolder] = useState<DocumentFolder | null>(null);
  
  const [form] = Form.useForm();

  // 加载文件夹树
  const loadFolderTree = async () => {
    try {
      setLoading(true);
      const response = await documentFolderService.getFolderTree();
      
      // 确保 tree 始终为数组
      const treeData = response.tree;
      if (!Array.isArray(treeData)) {
        console.warn('getFolderTree returned non-array tree data:', treeData);
        setFolders([]);
        setExpandedKeys([]);
      } else {
        setFolders(treeData);
        // 自动展开根文件夹
        const rootKeys = treeData.map(folder => folder.id.toString());
        setExpandedKeys(rootKeys);
      }
    } catch (error) {
      console.error('Error loading folder tree:', error);
      message.error('加载文件夹树失败');
      // 确保在错误情况下也设置为空数组
      setFolders([]);
      setExpandedKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolderTree();
  }, []);

  // 更新选中状态
  useEffect(() => {
    if (selectedFolderId !== undefined) {
      setSelectedKeys(selectedFolderId ? [selectedFolderId.toString()] : []);
    }
  }, [selectedFolderId]);

  // 转换为Tree组件需要的数据结构
  const treeData: TreeDataNode[] = useMemo(() => {
    // 从平级列表构建树形结构
    const buildTree = (folders: DocumentFolder[]): DocumentFolder[] => {
      const folderMap = new Map<number, DocumentFolder & { children?: DocumentFolder[] }>();
      const rootFolders: (DocumentFolder & { children?: DocumentFolder[] })[] = [];

      // 创建文件夹映射，并初始化children数组
      folders.forEach(folder => {
        folderMap.set(folder.id, { ...folder, children: [] });
      });

      // 构建树形结构
      folders.forEach(folder => {
        const folderWithChildren = folderMap.get(folder.id)!;
        if (folder.parent_folder_id) {
          const parent = folderMap.get(folder.parent_folder_id);
          if (parent) {
            parent.children!.push(folderWithChildren);
          } else {
            // 如果父文件夹不存在，作为根文件夹处理
            rootFolders.push(folderWithChildren);
          }
        } else {
          rootFolders.push(folderWithChildren);
        }
      });

      return rootFolders;
    };
    const convertToTreeNode = (folder: DocumentFolder & { children?: DocumentFolder[] }): TreeDataNode => {
      const nodeKey = folder.id.toString();
      const isSelected = selectedKeys.includes(nodeKey);
      const isCut = cutFolder?.id === folder.id;
      
      return {
        key: nodeKey,
        folder: folder,
        title: (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              opacity: isCut ? 0.5 : 1,
              textDecoration: isCut ? 'line-through' : 'none',
              minHeight: '24px',
              padding: '2px 0'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <span style={{ 
                color: folder.color || '#1890ff',
                fontSize: '14px',
                lineHeight: 1,
                flexShrink: 0
              }}>
                {isSelected ? <FolderOpenOutlined /> : <FolderOutlined />}
              </span>
              <Text 
                strong={isSelected}
                style={{
                  fontSize: '13px',
                  lineHeight: '20px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0
                }}
                title={folder.name}
              >
                {folder.name}
              </Text>
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: '11px',
                  lineHeight: '16px',
                  flexShrink: 0,
                  color: '#999'
                }}
              >
                ({folder.documents_count || 0})
              </Text>
              {folder.visibility === 'private' && (
                <Text 
                  type="secondary" 
                  style={{ 
                    fontSize: '9px',
                    lineHeight: '12px',
                    flexShrink: 0
                  }}
                >
                  🔒
                </Text>
              )}
            </div>
            
            <Dropdown
              menu={{
                items: getContextMenuItems(folder),
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  handleContextMenuClick(key, folder);
                }
              }}
              trigger={['click']}
            >
              <Button 
                type="text" 
                icon={<EllipsisOutlined />}
                
                style={{ 
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  padding: 0,
                  flexShrink: 0,
                  fontSize: '12px'
                }}
                className="folder-action-button"
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        ),
        children: folder.children && folder.children.length > 0 ? folder.children.map(convertToTreeNode) : undefined
      };
    };

    // 构建树形结构
    const treeStructure = buildTree(folders);
    const rootData: TreeDataNode[] = treeStructure.map(convertToTreeNode);
    
    // 如果显示根选项，添加根节点
    if (showRootOption) {
      rootData.unshift({
        key: 'root',
        folder: {
          id: 0,
          name: '根目录',
          owner_id: 0,
          visibility: 'public',
          sort_order: 0,
          created_at: '',
          updated_at: '',
          created_by: 0
        } as DocumentFolder,
        title: (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            minHeight: '20px',
            padding: '1px 0'
          }}>
            <FolderOutlined style={{ 
              color: '#666',
              fontSize: '14px',
              flexShrink: 0
            }} />
            <Text style={{
              fontSize: '13px',
              lineHeight: '18px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              根目录
            </Text>
          </div>
        )
      });
    }
    
    return rootData;
  }, [folders, selectedKeys, cutFolder, showRootOption]);

  // 获取右键菜单项
  const getContextMenuItems = (folder: DocumentFolder): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'create',
        label: '新建子文件夹',
        icon: <PlusOutlined />
      },
      {
        key: 'edit',
        label: '重命名',
        icon: <EditOutlined />
      },
      {
        type: 'divider'
      },
      {
        key: 'cut',
        label: '剪切',
        icon: <ScissorOutlined />,
        disabled: cutFolder?.id === folder.id
      }
    ];

    // 如果有剪切的文件夹，显示粘贴选项
    if (cutFolder && cutFolder.id !== folder.id) {
      items.push({
        key: 'paste',
        label: `粘贴 "${cutFolder.name}"`,
        icon: <CopyOutlined />
      });
    }

    items.push(
      {
        type: 'divider'
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true
      }
    );

    return items;
  };

  // 处理右键菜单点击
  const handleContextMenuClick = async (key: string, folder: DocumentFolder) => {
    switch (key) {
      case 'create':
        setModalMode('create');
        setParentFolder(folder);
        setCurrentFolder(null);
        form.resetFields();
        setFolderModalVisible(true);
        break;
        
      case 'edit':
        setModalMode('edit');
        setCurrentFolder(folder);
        setParentFolder(null);
        form.setFieldsValue({
          name: folder.name,
          description: folder.description,
          visibility: folder.visibility,
          color: folder.color
        });
        setFolderModalVisible(true);
        break;
        
      case 'cut':
        setCutFolder(folder);
        message.info(`已剪切文件夹 "${folder.name}"`);
        break;
        
      case 'paste':
        if (cutFolder) {
          await handleMoveFolder(cutFolder.id, folder.id);
          setCutFolder(null);
        }
        break;
        
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除文件夹 "${folder.name}" 吗？此操作不可撤销。`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => handleDeleteFolder(folder.id)
        });
        break;
    }
  };

  // 移动文件夹
  const handleMoveFolder = async (folderId: number, targetParentId: number) => {
    try {
      await documentFolderService.moveFolder(folderId, {
        parent_folder_id: targetParentId === 0 ? undefined : targetParentId,
        sort_order: 0
      });
      message.success('文件夹移动成功');
      loadFolderTree();
      onFolderChange?.();
    } catch (error: Error | unknown) {
      message.error(error.message || '移动文件夹失败');
    }
  };

  // 删除文件夹
  const handleDeleteFolder = async (folderId: number) => {
    try {
      await documentFolderService.deleteFolder(folderId);
      message.success('文件夹删除成功');
      loadFolderTree();
      onFolderChange?.();
      
      // 如果删除的是当前选中的文件夹，清除选中状态
      if (selectedFolderId === folderId) {
        onFolderSelect?.(null);
      }
    } catch (error: Error | unknown) {
      message.error(error.message || '删除文件夹失败');
    }
  };

  // 处理文件夹选择
  const handleSelect: TreeProps['onSelect'] = (keys, { node }) => {
    if (keys.length > 0) {
      const key = keys[0] as string;
      if (key === 'root') {
        onFolderSelect?.(null);
      } else {
        const folderId = parseInt(key);
        const folder = (node as unknown as TreeDataNode).folder;
        onFolderSelect?.(folderId, folder);
      }
    }
  };

  // 处理拖拽
  const handleDrop: TreeProps['onDrop'] = async (info) => {
    const dropKey = info.node.key as string;
    const dragKey = info.dragNode.key as string;
    
    if (dropKey === dragKey || dropKey === 'root' && dragKey === 'root') {
      return;
    }
    
    const dragFolderId = parseInt(dragKey);
    const dropFolderId = dropKey === 'root' ? 0 : parseInt(dropKey);
    
    // 检查是否是有效的移动操作
    if (dragFolderId && dropFolderId !== dragFolderId) {
      await handleMoveFolder(dragFolderId, dropFolderId);
    }
  };

  // 处理表单提交
  const handleFormSubmit = async (values: unknown) => {
    try {
      if (modalMode === 'create') {
        const request: CreateDocumentFolderRequest = {
          ...values,
          parent_folder_id: parentFolder?.id === 0 ? undefined : parentFolder?.id
        };
        await documentFolderService.createFolder(request);
        message.success('文件夹创建成功');
      } else {
        const request: UpdateDocumentFolderRequest = values;
        await documentFolderService.updateFolder(currentFolder!.id, request);
        message.success('文件夹更新成功');
      }
      
      setFolderModalVisible(false);
      form.resetFields();
      loadFolderTree();
      onFolderChange?.();
    } catch (error: Error | unknown) {
      message.error(error.message || '操作失败');
    }
  };

  return (
    <div style={style}>
      <Tree
        treeData={treeData}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys as string[])}
        onSelect={handleSelect}
        draggable={draggable}
        onDrop={handleDrop}
        height={height}
        virtual={false}
        blockNode
        showLine={{ showLeafIcon: false }}
        showIcon={false}
        className="optimized-folder-tree"
        style={{
          fontSize: '13px'
        }}
      />

      {/* 文件夹创建/编辑模态框 */}
      <Modal
        title={modalMode === 'create' ? '创建文件夹' : '编辑文件夹'}
        open={folderModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setFolderModalVisible(false);
          form.resetFields();
        }}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              { max: 100, message: '文件夹名称不能超过100个字符' }
            ]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              placeholder="请输入文件夹描述（可选）" 
              rows={3}
              maxLength={500}
            />
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
            initialValue="team"
          >
            <Select>
              <Option value="private">
                <Space>
                  🔒 <span>私有 - 仅自己可见</span>
                </Space>
              </Option>
              <Option value="team">
                <Space>
                  👥 <span>团队 - 团队成员可见</span>
                </Space>
              </Option>
              <Option value="public">
                <Space>
                  🌍 <span>公开 - 所有人可见</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="color"
            label="颜色"
            initialValue="#1890ff"
          >
            <Select>
              <Option value="#1890ff">
                <Space>
                  <div style={{ width: 16, height: 16, backgroundColor: '#1890ff', borderRadius: 2 }} />
                  蓝色
                </Space>
              </Option>
              <Option value="#52c41a">
                <Space>
                  <div style={{ width: 16, height: 16, backgroundColor: '#52c41a', borderRadius: 2 }} />
                  绿色
                </Space>
              </Option>
              <Option value="#fa8c16">
                <Space>
                  <div style={{ width: 16, height: 16, backgroundColor: '#fa8c16', borderRadius: 2 }} />
                  橙色
                </Space>
              </Option>
              <Option value="#722ed1">
                <Space>
                  <div style={{ width: 16, height: 16, backgroundColor: '#722ed1', borderRadius: 2 }} />
                  紫色
                </Space>
              </Option>
              <Option value="#f5222d">
                <Space>
                  <div style={{ width: 16, height: 16, backgroundColor: '#f5222d', borderRadius: 2 }} />
                  红色
                </Space>
              </Option>
              <Option value="#13c2c2">
                <Space>
                  <div style={{ width: 16, height: 16, backgroundColor: '#13c2c2', borderRadius: 2 }} />
                  青色
                </Space>
              </Option>
            </Select>
          </Form.Item>
          
          {modalMode === 'create' && parentFolder && (
            <Form.Item label="父文件夹">
              <Input 
                value={parentFolder.name} 
                disabled 
                addonBefore={<FolderOutlined style={{ color: parentFolder.color }} />}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentFolderTree;