import React, { useState, useEffect } from 'react';
import '../styles/DocumentManagerPage.css';
import { 
  Layout, 
  Card, 
  Button, 
  Typography, 
  Breadcrumb, 
  Space,
  Tree,
  message,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Grid
} from 'antd';
import {
  FolderOutlined,
  PlusOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  FileOutlined,
  LinkOutlined,
  SearchOutlined,
  TeamOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { DocumentFolder } from '../types/document';
import DocumentFileManager from '../components/DocumentFileManager';
import DocumentSearch from '../components/DocumentSearch';
import DocumentRelationsPanel from '../components/DocumentRelationsPanel';
import DocumentPermissionPanel from '../components/DocumentPermissionPanel';
import ResponsiveDocumentManager from '../components/ResponsiveDocumentManager';
import MobilePermissionPanel from '../components/MobilePermissionPanel';
import DocumentVersionPanel from '../components/DocumentVersionPanel';

const { Title, Text } = Typography;
const { Content, Sider } = Layout;
const { TreeNode } = Tree;
const { Search } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

const DocumentManagerPage: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<DocumentFolder[]>([]);
  const [siderCollapsed, setSiderCollapsed] = useState(isMobile);
  
  // 模态框状态
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  
  // 表单
  const [folderForm] = Form.useForm();

  // 初始化数据
  useEffect(() => {
    loadFolderTree();
  }, []);

  // 加载文件夹树
  const loadFolderTree = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取文件夹树
      // const response = await documentFolderApi.getTree();
      // setFolders(response.data.tree);
      
      // 临时模拟数据
      const mockFolders: DocumentFolder[] = [
        {
          id: 1,
          name: '项目文档',
          parent_folder_id: undefined,
          owner_id: 1,
          visibility: 'team',
          color: '#1890ff',
          icon: 'project',
          sort_order: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 1,
          documents_count: 5,
          subfolders_count: 2,
          owner_name: 'Admin',
          children: [
            {
              id: 2,
              name: '需求文档',
              parent_folder_id: 1,
              owner_id: 1,
              visibility: 'team',
              color: '#52c41a',
              icon: 'requirement',
              sort_order: 1,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              created_by: 1,
              documents_count: 3,
              subfolders_count: 0,
              owner_name: 'Admin',
            },
            {
              id: 3,
              name: '设计文档',
              parent_folder_id: 1,
              owner_id: 1,
              visibility: 'team',
              color: '#fa8c16',
              icon: 'design',
              sort_order: 2,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              created_by: 1,
              documents_count: 2,
              subfolders_count: 0,
              owner_name: 'Admin',
            }
          ]
        },
        {
          id: 4,
          name: '技术文档',
          parent_folder_id: undefined,
          owner_id: 1,
          visibility: 'public',
          color: '#722ed1',
          icon: 'tech',
          sort_order: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 1,
          documents_count: 8,
          subfolders_count: 1,
          owner_name: 'Admin',
        }
      ];
      setFolders(mockFolders);
    } catch (error) {
      message.error('加载文件夹失败');
    } finally {
      setLoading(false);
    }
  };


  // 创建文件夹
  const handleCreateFolder = async (values: any) => {
    try {
      // TODO: 调用API创建文件夹
      // await documentFolderApi.create({
      //   ...values,
      //   parent_folder_id: selectedFolderId
      // });
      
      message.success('文件夹创建成功');
      setFolderModalVisible(false);
      folderForm.resetFields();
      loadFolderTree();
    } catch (error) {
      message.error('创建文件夹失败');
    }
  };


  // 渲染文件夹树
  const renderFolderTree = (folders: DocumentFolder[]) => {
    return folders.map(folder => (
      <TreeNode
        key={folder.id}
        title={
          <Space>
            <FolderOutlined style={{ color: folder.color }} />
            <span>{folder.name}</span>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ({folder.documents_count || 0})
            </Text>
          </Space>
        }
        data-folder={folder}
      >
        {folder.children && renderFolderTree(folder.children)}
      </TreeNode>
    ));
  };


  return (
    <Layout style={{ minHeight: '100vh' }}>
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
          height: isMobile ? '100vh' : 'auto'
        }}
      >
        <div style={{ padding: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row justify="space-between" align="middle">
              <Title level={4} style={{ margin: 0 }}>
                {siderCollapsed ? '文档' : '文档管理'}
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
                  showLine
                  showIcon
                  defaultExpandAll
                  selectedKeys={selectedFolderId ? [selectedFolderId.toString()] : []}
                  onSelect={(keys) => {
                    if (keys.length > 0) {
                      setSelectedFolderId(Number(keys[0]));
                    }
                  }}
                >
                  {renderFolderTree(folders)}
                </Tree>
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
            <Breadcrumb>
              <Breadcrumb.Item>
                <a onClick={() => setSelectedFolderId(null)}>根目录</a>
              </Breadcrumb.Item>
              {breadcrumbPath.map(folder => (
                <Breadcrumb.Item key={folder.id}>
                  <a onClick={() => setSelectedFolderId(folder.id)}>{folder.name}</a>
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>

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
                      onDocumentSelect={(doc) => {
                        console.log('Selected document:', doc);
                        setSelectedDocumentId(doc.id);
                        // TODO: Navigate to document editor
                      }}
                      onDocumentUpdate={() => {
                        console.log('Document updated, refresh if needed');
                      }}
                    />
                  ),
                },
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
                  ),
                },
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
                  ),
                },
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
                      {selectedDocumentId ? (
                        isMobile ? (
                          <MobilePermissionPanel
                            documentId={selectedDocumentId}
                            onPermissionChange={() => {
                              console.log('Permissions changed for document:', selectedDocumentId);
                            }}
                          />
                        ) : (
                          <DocumentPermissionPanel
                            documentId={selectedDocumentId}
                            onPermissionChange={() => {
                              console.log('Permissions changed for document:', selectedDocumentId);
                            }}
                          />
                        )
                      ) : (
                        <Card>
                          <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <TeamOutlined style={{ fontSize: 48, color: '#ccc' }} />
                            <Title level={4} style={{ marginTop: 16, color: '#999' }}>
                              选择文档管理协作权限
                            </Title>
                            <Text type="secondary">
                              在文件管理或搜索页面选择一个文档，然后切换到此页面管理该文档的用户权限、分享链接和评论
                            </Text>
                          </div>
                        </Card>
                      )}
                    </div>
                  ),
                },
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
                  ),
                }
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