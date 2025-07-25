import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, message, Modal, Breadcrumb, Space, Typography, Card } from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  DeleteOutlined,
  HistoryOutlined,
  HomeOutlined,
  FileTextOutlined,
  EditOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import MarkdownEditor from '../components/MarkdownEditor';
import DocumentTypeSelector, { documentTypes } from '../components/DocumentTypeSelector';
import DocumentAssociationSelector from '../components/DocumentAssociationSelector';
import DocumentExporter from '../components/DocumentExporter';
import DocumentHistory from '../components/DocumentHistory';
import { documentService } from '../services/documentService';
import { 
  Document as DocumentModel, 
  DocumentType,
  DocumentStatus,
  DocumentVisibility,
  DocumentVersion,
  CreateDocumentRequest 
} from '../types/document';

const { Title } = Typography;
const { confirm } = Modal;

// 简化的关联类型
interface SimpleAssociation {
  type: 'project' | 'customer' | 'personal';
  id?: number;
  name?: string;
}

const DocumentEditorPage: React.FC = () => {
  const { id, projectId } = useParams<{ id?: string; projectId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 判断是编辑模式、查看模式还是新建模式
  const documentId = id && !isNaN(parseInt(id)) ? parseInt(id) : undefined;
  const finalProjectId = projectId && !isNaN(parseInt(projectId)) ? parseInt(projectId) : undefined;
  const isNewDocument = !documentId && location.pathname.includes('/new');
  const isEditMode = documentId && location.pathname.includes('/edit');
  const isViewMode = documentId && !isEditMode;
  
  const [document, setDocument] = useState<DocumentModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('markdown');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedAssociation, setSelectedAssociation] = useState<SimpleAssociation>({
    type: finalProjectId ? 'project' : 'personal',
    id: finalProjectId,
    name: undefined
  });
  const [exporterVisible, setExporterVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [creationStep, setCreationStep] = useState<'association' | 'type' | 'editor'>('association');

  // 调试用日志
  console.log('DocumentEditorPage - Debug Info:', {
    id,
    documentId,
    pathname: location.pathname,
    isNewDocument,
    isEditMode,
    isViewMode,
    creationStep
  });

  // 创建新文档
  const createNewDocument = useCallback((docType: DocumentType, category?: string, subcategory?: string) => {
    const typeConfig = (documentTypes as any)[docType];
    const newDoc: DocumentModel = {
      id: 0,
      title: `新建${typeConfig.name}`,
      content: typeConfig.template,
      type: docType,
      project_id: selectedAssociation.type === 'project' ? selectedAssociation.id : undefined,
      customer_id: selectedAssociation.type === 'customer' ? selectedAssociation.id : undefined,
      owner_id: 1, // 临时使用固定值
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft' as DocumentStatus,  // Explicitly type the status
      visibility: 'private' as DocumentVisibility,  // Explicitly type the visibility
      shared_with: [],
      tags: category && subcategory ? [category, subcategory] : category ? [category] : [],
      version: 1,
      is_template: false
    };
    setDocument(newDoc);
    setShowTypeSelector(false);
    setCreationStep('editor');
  }, [selectedAssociation]);

  // 加载文档数据
  const loadDocument = useCallback(async () => {
    if (isNewDocument) {
      // 新建文档，显示关联选择器
      setCreationStep('association');
      return;
    }

    if (!documentId) {
      // 无效的文档ID，返回错误
      message.error('无效的文档ID');
      navigate(-1);
      return;
    }

    setLoading(true);
    try {
      const doc = await documentService.getDocument(documentId);
      setDocument(doc);
    } catch (error) {
      console.error('Failed to load document:', error);
      message.error('加载文档失败');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [isNewDocument, documentId, navigate]);

  // 保存文档
  const saveDocument = useCallback(async () => {
    if (!document) return;

    setSaving(true);
    try {
      let savedDoc: DocumentModel;
      
      if (isNewDocument) {
        // 创建新文档
        const createRequest: CreateDocumentRequest = {
          title: document.title,
          content: document.content,
          type: document.type,
          status: document.status || 'draft',  // Ensure status is always provided
          project_id: document.project_id || undefined,
          customer_id: document.customer_id || undefined,
          visibility: document.visibility || 'private',  // Provide default visibility
          shared_with: document.shared_with || [],
          tags: document.tags || [],
          description: document.description
        };
        savedDoc = await documentService.createDocument(createRequest);
        // 更新URL为编辑模式
        navigate(`/documents/${savedDoc.id}/edit`, { replace: true });
      } else {
        // 更新现有文档
        savedDoc = await documentService.updateDocument(documentId!, {
          title: document.title,
          content: document.content,
          type: document.type,
          status: document.status,
          project_id: document.project_id || undefined,
          customer_id: document.customer_id || undefined,
          visibility: document.visibility,
          shared_with: document.shared_with,
          tags: document.tags,
          description: document.description
        });
      }
      
      setDocument(savedDoc);
      setHasUnsavedChanges(false);
      message.success('文档已保存');
    } catch (error) {
      console.error('Failed to save document:', error);
      message.error('保存文档失败');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [document, isNewDocument, documentId, navigate]);

  // 删除文档
  const deleteDocument = useCallback(() => {
    if (!document || isNewDocument) return;

    confirm({
      title: '确认删除',
      content: `确定要删除文档"${document.title}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await documentService.deleteDocument(documentId!);
          message.success('文档已删除');
          navigate(-1);
        } catch (error) {
          console.error('Failed to delete document:', error);
          message.error('删除文档失败');
        }
      }
    });
  }, [document, isNewDocument, documentId, navigate]);

  // 处理内容变化
  const handleContentChange = useCallback((content: string) => {
    if (!document) return;
    setDocument(prev => prev ? { ...prev, content } : null);
    setHasUnsavedChanges(true);
  }, [document]);

  // 处理标题变化
  const handleTitleChange = useCallback((title: string) => {
    if (!document) return;
    setDocument(prev => prev ? { ...prev, title } : null);
    setHasUnsavedChanges(true);
  }, [document]);

  // 返回上一页
  const handleGoBack = useCallback(() => {
    if (hasUnsavedChanges) {
      confirm({
        title: '有未保存的更改',
        content: '您有未保存的更改，确定要离开吗？',
        okText: '离开',
        cancelText: '取消',
        onOk: () => navigate(-1)
      });
    } else {
      navigate(-1);
    }
  }, [hasUnsavedChanges, navigate]);

  // 处理版本恢复
  const handleVersionRestore = useCallback(async (version: DocumentVersion) => {
    if (!document) return;

    try {
      // 创建新版本（将当前内容作为恢复点）
      const updatedDoc = {
        ...document,
        content: version.content,
        title: version.title,
        updated_at: new Date().toISOString()
      };
      
      setDocument(updatedDoc);
      setHasUnsavedChanges(true);
      
      // 自动保存恢复的版本
      setTimeout(() => {
        saveDocument();
      }, 100);
      
    } catch (error) {
      console.error('Failed to restore version:', error);
      message.error('恢复版本失败');
    }
  }, [document, saveDocument]);

  // 页面加载时获取文档数据
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 浏览器关闭前提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 验证参数：编辑文档时必须有documentId
  if (!isNewDocument && !documentId) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={3}>参数错误</Title>
        <p>缺少文档ID参数</p>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  // 显示文档创建流程
  if (isNewDocument && creationStep === 'association') {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: '#f5f5f5'
      }}>
        {/* 页面头部 */}
        <div style={{ 
          padding: '12px 24px', 
          borderBottom: '1px solid #f0f0f0',
          background: '#fff'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate(-1)}
                type="text"
              >
                返回
              </Button>
              <Breadcrumb
                items={[
                  {
                    title: (
                      <Link to="/">
                        <HomeOutlined />
                        <span>首页</span>
                      </Link>
                    )
                  },
                  {
                    title: (
                      <Link to="/documents">
                        <FileTextOutlined />
                        <span>文档管理</span>
                      </Link>
                    )
                  },
                  {
                    title: '新建文档 - 关联设置'
                  }
                ]}
              />
            </div>
          </div>
        </div>

        {/* 关联选择区域 */}
        <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Card>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <Title level={2}>创建新文档</Title>
                <p style={{ color: '#666', fontSize: '16px' }}>
                  首先选择文档的关联类型，这将决定谁可以访问和编辑您的文档
                </p>
              </div>

              {/* <DocumentAssociationSelector
                value={selectedAssociation}
                onChange={setSelectedAssociation}
                mode="inline"
                showDescription={true}
              /> */}

              <div style={{ 
                marginTop: '32px', 
                textAlign: 'center',
                borderTop: '1px solid #f0f0f0',
                paddingTop: '24px'
              }}>
                <Space size="large">
                  <Button 
                    size="large"
                    onClick={() => navigate(-1)}
                  >
                    取消
                  </Button>
                  <Button 
                    type="primary" 
                    size="large"
                    onClick={() => setCreationStep('type')}
                    disabled={selectedAssociation.type !== 'personal' && !selectedAssociation.id}
                  >
                    下一步：选择文档类型
                  </Button>
                </Space>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 显示文档类型选择器
  if (isNewDocument && (creationStep === 'type' || showTypeSelector)) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: '#f5f5f5'
      }}>
        {/* 页面头部 */}
        <div style={{ 
          padding: '12px 24px', 
          borderBottom: '1px solid #f0f0f0',
          background: '#fff'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate(-1)}
                type="text"
              >
                返回
              </Button>
              <Breadcrumb
                items={[
                  {
                    title: (
                      <Link to="/">
                        <HomeOutlined />
                        <span>首页</span>
                      </Link>
                    )
                  },
                  {
                    title: (
                      <Link to="/documents">
                        <FileTextOutlined />
                        <span>文档管理</span>
                      </Link>
                    )
                  },
                  {
                    title: '新建文档 - 选择类型'
                  }
                ]}
              />
            </div>
          </div>
        </div>

        {/* 类型选择区域 */}
        <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Card>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Title level={2}>选择文档类型</Title>
                <p style={{ color: '#666', fontSize: '16px' }}>
                  选择文档类型和分类，开始创建您的文档
                </p>
                {selectedAssociation.name && (
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text type="secondary">
                      关联到: <Typography.Text strong>{selectedAssociation.name}</Typography.Text>
                    </Typography.Text>
                  </div>
                )}
              </div>

              <DocumentTypeSelector
                selectedType={selectedDocType}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                onTypeChange={setSelectedDocType}
                onCategoryChange={(category, subcategory) => {
                  setSelectedCategory(category);
                  setSelectedSubcategory(subcategory || '');
                }}
                showCategories={true}
                mode="card"
              />

              <div style={{ 
                marginTop: '32px', 
                textAlign: 'center',
                borderTop: '1px solid #f0f0f0',
                paddingTop: '24px'
              }}>
                <Space size="large">
                  <Button 
                    size="large"
                    onClick={() => setCreationStep('association')}
                  >
                    上一步
                  </Button>
                  <Button 
                    size="large"
                    onClick={() => navigate(-1)}
                  >
                    取消
                  </Button>
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<EditOutlined />}
                    onClick={() => createNewDocument(selectedDocType, selectedCategory, selectedSubcategory)}
                  >
                    开始创建
                  </Button>
                </Space>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !document) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={3}>加载中...</Title>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 页面头部 */}
      <div style={{ 
        padding: '12px 24px', 
        borderBottom: '1px solid #f0f0f0',
        background: '#fff'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 8
        }}>
          {/* 左侧：返回按钮和面包屑 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleGoBack}
              type="text"
            >
              返回
            </Button>
            <Breadcrumb
              items={[
                {
                  title: (
                    <Link to="/">
                      <HomeOutlined />
                      <span>首页</span>
                    </Link>
                  )
                },
                {
                  title: (
                    <Link to="/documents">
                      <FileTextOutlined />
                      <span>文档管理</span>
                    </Link>
                  )
                },
                {
                  title: isNewDocument ? '新建文档' : isViewMode ? `查看文档 - ${document.title}` : `编辑文档 - ${document.title}`
                }
              ]}
            />
          </div>

          {/* 右侧：操作按钮 */}
          <Space>
            {!isNewDocument && (
              <>
                <Button 
                  icon={<HistoryOutlined />}
                  onClick={() => setHistoryVisible(true)}
                >
                  历史
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={() => setExporterVisible(true)}
                >
                  导出
                </Button>
                {!isViewMode && (
                  <Button 
                    icon={<DeleteOutlined />}
                    danger
                    onClick={deleteDocument}
                  >
                    删除
                  </Button>
                )}
              </>
            )}
            {isViewMode ? (
              <Button 
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/documents/${documentId}/edit`)}
              >
                编辑
              </Button>
            ) : (
              <Button 
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={saveDocument}
              >
                保存
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MarkdownEditor
          value={document.content || ''}
          onChange={handleContentChange}
          onSave={isViewMode ? undefined : saveDocument}
          title={document.title}
          onTitleChange={isViewMode ? undefined : handleTitleChange}
          height={window.innerHeight - 120} // 减去头部高度
          loading={saving}
          autoSave={!isViewMode}
          autoSaveDelay={3000}
          placeholder="开始编写您的Markdown文档..."
          projectId={document.project_id || undefined}
          readOnly={!!isViewMode}
        />
      </div>

      {/* 文档导出器 */}
      {document && !isNewDocument && (
        <DocumentExporter
          document={document}
          visible={exporterVisible}
          onClose={() => setExporterVisible(false)}
        />
      )}

      {/* 文档历史 */}
      {document && !isNewDocument && (
        <DocumentHistory
          document={document}
          visible={historyVisible}
          onClose={() => setHistoryVisible(false)}
          onRestore={handleVersionRestore}
        />
      )}
    </div>
  );
};

export default DocumentEditorPage;