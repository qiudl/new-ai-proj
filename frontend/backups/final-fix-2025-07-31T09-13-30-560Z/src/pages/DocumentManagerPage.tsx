// @ts-nocheck
import React, { useState, useEffect } from 'react';
import '../styles/DocumentManagerPage.css';
import { 
 Layout, 
 Card, 
 Typography, 
 Tree,
 message, 
 Modal,
 Form, 
 Select, 
 Grid,
 Tooltip
} from 'antd';
import { 
 MenuUnfoldOutlined,
 MenuFoldOutlined, 
 EditOutlined,
 DeleteOutlined
} from '@ant-design/icons';
import { DocumentFolder } from '../types/document';
import DocumentFileManager from '../components/DocumentFileManager';
import DocumentSearch from '../components/DocumentSearch';
import DocumentRelationsPanel from '../components/DocumentRelationsPanel';
import ResponsiveDocumentManager from '../components/ResponsiveDocumentManager';
import DocumentVersionPanel from '../components/DocumentVersionPanel';
import { documentFolderService } from '../services/documentFolderService';

const { Title, Text } = Typography;
const { Content, Sider } = Layout;
// Removed TreeNode import as we'll use treeData instead
const { Search } = Input;

const { useBreakpoint } = Grid;

const DocumentManagerPage: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [dragLoading, setDragLoading] = useState(false);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<DocumentFolder[]>([]);
  const [siderCollapsed, setSiderCollapsed] = useState(isMobile);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  
  // 模态框状态
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const [currentEditingFolder, setCurrentEditingFolder] = useState<DocumentFolder | null>(null);
  
  // 表单
  const [folderForm] = Form.useForm();
  const [editFolderForm] = Form.useForm();

  // 初始化数据
  useEffect(() => {
    loadFolderTree();
  }, []);

  // 递归收集所有文件夹的key用于展开
  const getAllFolderKeys = (folders: DocumentFolder[]): string[] => {
    const keys: string[] = [];
    const collectKeys = (folders: DocumentFolder[]) => {
      folders.forEach(folder => {
        keys.push(folder.id.toString());
        if (folder.children && folder.children.length > 0) {
          collectKeys(folder.children);
        }
      });
    };
    collectKeys(folders);
    return keys;
  };

  // 加载文件夹树
  const loadFolderTree = async () => {
    try {
      setLoading(true);
      
      // 防御性检查响应
      if (!response) {
        console.warn('getFolderTree returned null or undefined response');
        setFolders([]);
        setExpandedKeys([]);
        return;
      }
      
      // 确保 folders 始终为数组
      let foldersData = response.tree || [];
      if (!Array.isArray(foldersData)) {
        console.warn('getFolderTree returned non-array data:', foldersData);
        foldersData = [];
      }
      
      setFolders(foldersData);
      
      // 数据加载完成后，自动展开所有节点
      const allKeys = getAllFolderKeys(foldersData);
      setExpandedKeys(allKeys);
    } catch (error) {
      console.error('加载文件夹失败:', error);
      message.error('加载文件夹失败');
      // 确保在错误情况下也设置为空数组
      setFolders([]);
      setExpandedKeys([]);
    } finally {
      setLoading(false);
    }
  };


  // 创建文件夹
  const handleCreateFolder = async (values: any) => {
    try {
      const request = {
        name: values.name,
        description: values.description,
        parent_folder_id: selectedFolderId || undefined,
        visibility: values.visibility || 'team',
        color: values.color || '#1890ff',
        icon: values.icon || 'folder',
        sort_order: 0
      };

      await documentFolderService.createFolder(request);
      message.success('文件夹创建成功');
      setFolderModalVisible(false);
      folderForm.resetFields();
      
      // 重新加载文件夹树
      loadFolderTree();
    } catch (error: any) {
      console.error('创建文件夹失败:', error);
      message.error(error.message || '创建文件夹失败');
    }
  };

  // 编辑文件夹
  const handleEditFolder = async (values: any) => {
    try {
      if (!currentEditingFolder) return;

      const request = {
        name: values.name,
        description: values.description,
        visibility: values.visibility,
        color: values.color
      };

      await documentFolderService.updateFolder(currentEditingFolder.id, request);
      
      message.success('文件夹更新成功');
      setEditFolderModalVisible(false);
      setCurrentEditingFolder(null);
      editFolderForm.resetFields();
      
      // 重新加载文件夹树
      loadFolderTree();
    } catch (error: any) {
      console.error('更新文件夹失败:', error);
      message.error(error.message || '更新文件夹失败');
    }
  };

  // 删除文件夹
  const handleDeleteFolder = async (folder: DocumentFolder) => {
    try {
      await documentFolderService.deleteFolder(folder.id);
      
      message.success('文件夹删除成功');
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null);
      }
      
      // 重新加载文件夹树
      loadFolderTree();
    } catch (error: any) {
      console.error('删除文件夹失败:', error);
      message.error(error.message || '删除文件夹失败');
    }
  };

  // 打开编辑文件夹模态框
  const openEditFolderModal = (folder: DocumentFolder) => {
    setCurrentEditingFolder(folder);
    editFolderForm.setFieldsValue({
      name: folder.name,
      description: folder.description,
      visibility: folder.visibility,
      color: folder.color
    });
    setEditFolderModalVisible(true);
  };


  // 获取文件夹右键菜单
  const getFolderContextMenu = (folder: DocumentFolder) => {
    return {
      items: [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          onClick: () => openEditFolderModal(folder)
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: '确认删除',
              content: `确定要删除文件夹"${folder.name}"吗？此操作将同时删除文件夹内的所有文档。`,
              icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
              okText: '删除',
              okType: 'danger',
              cancelText: '取消',
              onOk: () => handleDeleteFolder(folder)
            });
          }
        }
      ]
    };
  };

  // 计算新的排序位置
  const calculateNewSortOrder = (siblings: DocumentFolder[], dropPosition: number, targetFolder?: DocumentFolder): number => {
    if (!siblings || siblings.length === 0) {
      return 1;
    }

    // 按照 sort_order 排序
    const sortedSiblings = [...siblings].sort((a, b) => a.sort_order - b.sort_order);
    
    if (!targetFolder) {
      // 如果没有目标文件夹，放在最后
      return (sortedSiblings[sortedSiblings.length - 1]?.sort_order || 0) + 1;
    }

    const targetIndex = sortedSiblings.findIndex(f => f.id === targetFolder.id);
    
    if (dropPosition < 0) {
      // 插入到目标之前
      if (targetIndex === 0) {
        return Math.max(1, targetFolder.sort_order - 1);
      } else {
        const prevFolder = sortedSiblings[targetIndex - 1];
        return Math.floor((prevFolder.sort_order + targetFolder.sort_order) / 2) || (targetFolder.sort_order - 1);
      }
    } else {
      // 插入到目标之后
      if (targetIndex === sortedSiblings.length - 1) {
        return targetFolder.sort_order + 1;
      } else {
        const nextFolder = sortedSiblings[targetIndex + 1];
        return Math.floor((targetFolder.sort_order + nextFolder.sort_order) / 2) || (targetFolder.sort_order + 1);
      }
    }
  };

  // 获取同级文件夹
  const getSiblingFolders = (parentId: number | undefined): DocumentFolder[] => {
    const findSiblings = (folders: DocumentFolder[], targetParentId: number | undefined): DocumentFolder[] => {
      const siblings: DocumentFolder[] = [];
      
      for (const folder of folders) {
        if (folder.parent_folder_id === targetParentId) {
          siblings.push(folder);
        }
        if (folder.children) {
          siblings.push(...findSiblings(folder.children, targetParentId));
        }
      }
      
      return siblings;
    };

    return findSiblings(folders, parentId);
  };

  // 处理文件夹拖拽
  const handleDrop = async (info: any) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    console.log('Drop info:', {
      dropKey,
      dragKey,
      dropPosition,
      dropToGap: info.dropToGap
    });

    try {
      setDragLoading(true);
      
      // 找到被拖拽的文件夹
      const dragFolder = findFolderById(folders, Number(dragKey));
      if (!dragFolder) {
        message.error('找不到被拖拽的文件夹');
        return;
      }

      let newParentId: number | undefined;
      let newSortOrder = 0;

      if (!info.dropToGap) {
        // 拖拽到文件夹内部（作为子文件夹）
        newParentId = Number(dropKey);
        const siblings = getSiblingFolders(newParentId);
        newSortOrder = calculateNewSortOrder(siblings, dropPosition);
      } else {
        // 拖拽到同级别位置
        const dropFolder = findFolderById(folders, Number(dropKey));
        if (dropFolder) {
          newParentId = dropFolder.parent_folder_id;
          const siblings = getSiblingFolders(newParentId);
          newSortOrder = calculateNewSortOrder(siblings, dropPosition, dropFolder);
        }
      }

      // 调用移动文件夹接口
      await documentFolderService.moveFolder(Number(dragKey), {
        parent_folder_id: newParentId,
        sort_order: newSortOrder
      });

      message.success('文件夹移动成功');
      // 重新加载文件夹树
      await loadFolderTree();
    } catch (error: any) {
      console.error('移动文件夹失败:', error);
      message.error(error.message || '移动文件夹失败');
    } finally {
      setDragLoading(false);
    }
  };

  // 查找文件夹的辅助函数
  const findFolderById = (folders: DocumentFolder[], id: number): DocumentFolder | null => {
    for (const folder of folders) {
      if (folder.id === id) {
        return folder;
      }
      if (folder.children) {
        const found = findFolderById(folder.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  // 转换文件夹数据为树结构
  const convertFoldersToTreeData = (folders: DocumentFolder[]): any[] => {
    if (!Array.isArray(folders)) {
      console.warn('convertFoldersToTreeData received non-array folders:', folders);
      return [];
    }
    
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

    // 构建树形结构
    const treeStructure = buildTree(folders);
    
    const convertToTreeNode = (folder: DocumentFolder & { children?: DocumentFolder[] }): any => ({
      key: folder.id,
      title: (
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '2px 0',
            minHeight: '24px',
            width: '100%'
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
            <FolderOutlined 
              style={{ 
                color: folder.color,
                fontSize: '14px',
                lineHeight: 1,
                flexShrink: 0
              }} 
            />
            <span style={{
              fontSize: '13px',
              lineHeight: '20px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0
            }}>
              {folder.name}
            </span>
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
          </div>
          
          <Space size={2} style={{ 
            opacity: 0,
            transition: 'opacity 0.2s ease',
            flexShrink: 0
          }} className="folder-actions">
            <Tooltip title="编辑文件夹">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditFolderModal(folder);
                }}
                style={{ 
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  padding: 0,
                  fontSize: '11px'
                }}
              />
            </Tooltip>
            <Tooltip title="删除文件夹">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  Modal.confirm({
                    title: '确认删除',
                    content: `确定要删除文件夹"${folder.name}"吗？此操作将同时删除文件夹内的所有文档。`,
                    icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
                    okText: '删除',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: () => handleDeleteFolder(folder)
                  });
                }}
                style={{ 
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  padding: 0,
                  fontSize: '11px'
                }}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      children: folder.children && folder.children.length > 0 ? folder.children.map(convertToTreeNode) : undefined,
      folder: folder // Store folder data for access
    });

    return treeStructure.map(convertToTreeNode);
  };


  return (
    <Layout style={{ minHeight: '100vh' }} className="document-manager">
      <Sider 
        width={isMobile ? '100%' : 280}
        theme="light"
        collapsed={siderCollapsed}
        collapsedWidth={isMobile ? 0 : 80}
        breakpoint="md"
        onBreakpoint={(broken) => {
          setSiderCollapsed(broken);
        }}
        style={{ 
          borderRight: '1px solid #f0f0f0',
          backgroundColor: '#fafafa',
          position: isMobile ? 'fixed' : 'relative',
          zIndex: isMobile ? 100 : 'auto',
          height: 'auto'
        }}
      >
        <div style={{ padding: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row justify="space-between" align="middle">
              <Title level={4} style={{ margin: 0 }}>
                {siderCollapsed ? '笔记' : '工作笔记'}
              </Title>
              <Button
                type="text"
                icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setSiderCollapsed(!siderCollapsed)}
              />
            </Row>
            
            {!siderCollapsed && (
              <>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  block
                  onClick={() => setFolderModalVisible(true)}
                >
                  新建文件夹
                </Button>
                
                <Search
                  placeholder="搜索文件夹..."
                  allowClear
                  style={{ marginBottom: 8 }}
                />
                
                <Tree
                  className="folder-tree document-manager-tree"
                  showLine={{ showLeafIcon: false }}
                  showIcon={false}
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setExpandedKeys(keys as string[])}
                  draggable
                  blockNode
                  virtual={false}
                  treeData={convertFoldersToTreeData(folders)}
                  selectedKeys={selectedFolderId ? [selectedFolderId.toString()] : []}
                  onSelect={(keys) => {
                    if (keys.length > 0) {
                      setSelectedFolderId(Number(keys[0]));
                    }
                  }}
                  onDrop={handleDrop}
                  allowDrop={({ dropNode, dropPosition, dragNode }) => {
                    // 防止将文件夹拖拽到自己或其子文件夹中
                    const dragId = Number(dragNode.key);
                    const dropId = Number(dropNode.key);
                    
                    // 不能拖拽到自己
                    if (dragId === dropId) {
                      return false;
                    }
                    
                    // 检查是否拖拽到自己的子文件夹中
                    const isDescendant = (parentId: number, childId: number): boolean => {
                      const parent = findFolderById(folders, parentId);
                      if (!parent || !parent.children) return false;
                      
                      for (const child of parent.children) {
                        if (child.id === childId || isDescendant(child.id, childId)) {
                          return true;
                        }
                      }
                      return false;
                    };
                    
                    return !isDescendant(dragId, dropId);
                  }}
                />
              </>
            )}
          </Space>
        </div>
      </Sider>

      <Layout style={{ marginLeft: isMobile && !siderCollapsed ? 0 : 'auto' }}>
        <Content style={{ 
          padding: isMobile ? '16px' : '24px',
          transition: 'all 0.2s ease'
        }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 面包屑导航 */}
            <Breadcrumb
              items={[
                {
                  title: <button type="button" className="ant-btn ant-btn-link" onClick={() => setSelectedFolderId(null)}>根目录</button>
                },
                ...breadcrumbPath.map(folder => ({
                  title: <button type="button" className="ant-btn ant-btn-link" onClick={() => setSelectedFolderId(folder.id)}>{folder.name}</button>,
                  key: folder.id
                }))
              ]}
            />

            {/* Main Content Tabs */}
            <Tabs
              defaultActiveKey="files"
              items={[
                {
                  key: 'files',
                  label: (
                    <Space>
                      <FileOutlined />
                      <span>文件管理</span>
                    </Space>
                  ),
                  children: (
                    <ResponsiveDocumentManager
                      folderId={selectedFolderId || undefined}
                      showSearch={true}
                      title="文档管理"
                      showBreadcrumb={true}
                      mobileOptimized={true}
                      onDocumentSelect={(doc) => {
                        console.log('Selected document:', doc);
                        setSelectedDocumentId(doc.id);
                        // TODO: Navigate to document editor
                      }}
                      onDocumentUpdate={() => {
                        console.log('Document updated, refresh if needed');
                        // Refresh folder tree and document list
                        loadFolderTree();
                      }}
                    />
                  )},
                {
                  key: 'search',
                  label: (
                    <Space>
                      <SearchOutlined />
                      <span>全文搜索</span>
                    </Space>
                  ),
                  children: (
                    <DocumentSearch
                      onResultSelect={(doc) => {
                        console.log('Search result selected:', doc);
                        setSelectedDocumentId(doc.id);
                        // TODO: Navigate to document editor
                      }}
                      autoFocus={false}
                    />
                  )},
                {
                  key: 'relations',
                  label: (
                    <Space>
                      <LinkOutlined />
                      <span>关联关系</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '400px' }}>
                      {selectedDocumentId ? (
                        <DocumentRelationsPanel
                          documentId={selectedDocumentId}
                          onRelationChange={() => {
                            console.log('Relations changed for document:', selectedDocumentId);
                          }}
                        />
                      ) : (
                        <Card>
                          <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <LinkOutlined style={{ fontSize: 48, color: '#ccc' }} />
                            <Title level={4} style={{ marginTop: 16, color: '#999' }}>
                              选择文档查看关联关系
                            </Title>
                            <Text type="secondary">
                              在文件管理或搜索页面选择一个文档，然后切换到此页面查看和管理该文档的关联关系
                            </Text>
                          </div>
                        </Card>
                      )}
                    </div>
                  )},
                {
                  key: 'permissions',
                  label: (
                    <Space>
                      <TeamOutlined />
                      <span>协作权限</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '400px' }}>
                      <Card>
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <TeamOutlined style={{ fontSize: 48, color: '#ccc' }} />
                          <Title level={4} style={{ marginTop: 16, color: '#999' }}>
                            权限管理功能已移除
                          </Title>
                          <Text type="secondary">
                            文档权限管理功能已从系统中移除
                          </Text>
                        </div>
                      </Card>
                    </div>
                  )},
                {
                  key: 'versions',
                  label: (
                    <Space>
                      <HistoryOutlined />
                      <span>版本管理</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ minHeight: '400px' }}>
                      {selectedDocumentId ? (
                        <DocumentVersionPanel
                          documentId={selectedDocumentId}
                          currentVersion={1} // TODO: Get actual current version
                          onVersionChange={(version) => {
                            console.log('Version changed:', version);
                            // TODO: Handle version change
                          }}
                        />
                      ) : (
                        <Card>
                          <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <HistoryOutlined style={{ fontSize: 48, color: '#ccc' }} />
                            <Title level={4} style={{ marginTop: 16, color: '#999' }}>
                              选择文档查看版本历史
                            </Title>
                            <Text type="secondary">
                              在文件管理或搜索页面选择一个文档，然后切换到此页面查看和管理该文档的版本历史、比较不同版本、恢复历史版本
                            </Text>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
              ]}
            />
          </Space>
        </Content>
      </Layout>

      {/* 创建文件夹模态框 */}
      <Modal
        title="创建文件夹"
        open={folderModalVisible}
        onOk={() => folderForm.submit()}
        onCancel={() => setFolderModalVisible(false)}
        width={500}
      >
        <Form
          form={folderForm}
          layout="vertical"
          onFinish={handleCreateFolder}
        >
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[{ required: true, message: '请输入文件夹名称' }]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入文件夹描述（可选）" />
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
            initialValue="team"
          >
            <Select>
              <Option value="private">私有</Option>
              <Option value="team">团队</Option>
              <Option value="public">公开</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="color"
            label="颜色"
            initialValue="#1890ff"
          >
            <Select>
              <Option value="#1890ff">蓝色</Option>
              <Option value="#52c41a">绿色</Option>
              <Option value="#fa8c16">橙色</Option>
              <Option value="#722ed1">紫色</Option>
              <Option value="#f5222d">红色</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑文件夹模态框 */}
      <Modal
        title="编辑文件夹"
        open={editFolderModalVisible}
        onOk={() => editFolderForm.submit()}
        onCancel={() => {
          setEditFolderModalVisible(false);
          setCurrentEditingFolder(null);
          editFolderForm.resetFields();
        }}
        width={500}
      >
        <Form
          form={editFolderForm}
          layout="vertical"
          onFinish={handleEditFolder}
        >
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[{ required: true, message: '请输入文件夹名称' }]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入文件夹描述（可选）" />
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
          >
            <Select>
              <Option value="private">私有</Option>
              <Option value="team">团队</Option>
              <Option value="public">公开</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="color"
            label="颜色"
          >
            <Select>
              <Option value="#1890ff">蓝色</Option>
              <Option value="#52c41a">绿色</Option>
              <Option value="#fa8c16">橙色</Option>
              <Option value="#722ed1">紫色</Option>
              <Option value="#f5222d">红色</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Mobile overlay when sider is open */}
      {isMobile && !siderCollapsed && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 99
          }}
          onClick={() => setSiderCollapsed(true)}
        />
      )}

    </Layout>
  );
};

export default DocumentManagerPage;