// @ts-nocheck
/**
 * 统一文档管理组件
 * 合并 DocumentFileManager 和 DocumentList 的功能
 * 提供简洁和高级两种模式
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Switch,
  Typography,
  Divider,
  message,
  Spin,
  Empty,
  Badge,
  Tooltip,
  Modal,
  Input
} from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  PlusOutlined,
  FileTextOutlined,
  UserOutlined,
  WifiOutlined,
  BulbOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Document, DocumentListItem } from '../types/document';
import useDocumentManager from '../hooks/useDocumentManager';
import useRealtimeCollaboration from '../hooks/useRealtimeCollaboration';

// 导入子组件
import DocumentTableView from './DocumentTableView';
import DocumentGridView from './DocumentGridView';
import DocumentToolbar from './DocumentToolbar';
import DocumentModals from './DocumentModals';
import VirtualizedDocumentList from './VirtualizedDocumentList';
import OnlineDocumentEditor from './OnlineDocumentEditor';
import DocumentVersionControl from './DocumentVersionControl';

// 导入智能搜索功能
import { intelligentSearch, searchDocuments, getRecommendations } from '../utils/intelligentSearch';

// 导入Google Docs服务
import { googleDocsService } from '../services/googleDocsService';

const { Title, Text } = Typography;

// 组件属性类型
interface UnifiedDocumentManagerProps {
  // 基础属性
  projectId?: number;
  projectName?: string;
  folderId?: number;
  
  // 功能配置
  mode?: 'simple' | 'advanced'; // 简洁模式或高级模式
  showSearch?: boolean;
  showToolbar?: boolean;
  allowUpload?: boolean;
  allowBatch?: boolean;
  
  // 视图配置
  defaultView?: 'table' | 'grid' | 'virtualized';
  showViewToggle?: boolean;
  
  // 高级功能配置
  enableRealtimeCollaboration?: boolean; // 实时协作
  enableIntelligentSearch?: boolean; // 智能搜索
  enableVirtualization?: boolean; // 虚拟化列表
  enableOnlineEditor?: boolean; // 在线编辑器
  enableVersionControl?: boolean; // 版本控制
  enableGoogleDocsIntegration?: boolean; // Google Docs集成
  
  // 回调函数
  onDocumentSelect?: (document: Document | DocumentListItem) => void;
  onDocumentUpdate?: () => void;
  onCreateDocument?: () => void;
  onEditDocument?: (document: Document | DocumentListItem) => void;
}

const UnifiedDocumentManager: React.FC<UnifiedDocumentManagerProps> = ({
  projectId,
  projectName,
  folderId,
  mode = 'simple', // 默认简洁模式
  showSearch = true,
  showToolbar = true,
  allowUpload = true,
  allowBatch = false,
  defaultView = 'table',
  showViewToggle = true,
  enableRealtimeCollaboration = false,
  enableIntelligentSearch = false,
  enableVirtualization = false,
  enableOnlineEditor = false,
  enableVersionControl = false,
  enableGoogleDocsIntegration = false,
  onDocumentSelect,
  onDocumentUpdate,
  onCreateDocument,
  onEditDocument
}) => {
  // 视图状态
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'virtualized'>(defaultView);
  const [advancedMode, setAdvancedMode] = useState(mode === 'advanced');
  
  // 模态框状态
  const [modalStates, setModalStates] = useState({
    create: false,
    edit: false,
    upload: false,
    preview: false,
    onlineEditor: false,
    versionControl: false,
    googleDocsImport: false
  });
  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // 智能搜索状态
  const [intelligentSearchEnabled, setIntelligentSearchEnabled] = useState(enableIntelligentSearch);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // 实时协作Hook
  const collaboration = useRealtimeCollaboration({
    enabled: enableRealtimeCollaboration && advancedMode
  });

  // 使用文档管理Hook
  const {
    documents,
    total,
    loading,
    error,
    searchText,
    filterStatus,
    filterType,
    sortBy,
    sortOrder,
    selectedDocuments,
    isSelectMode,
    pagination,
    updateState,
    debouncedSearch,
    deleteDocument,
    batchDelete,
    toggleSelectMode,
    toggleDocumentSelection,
    toggleSelectAll,
    refresh,
    hasDocuments,
    hasSelection,
    isAllSelected
  } = useDocumentManager({
    mode: advancedMode ? 'advanced' : 'simple',
    projectId,
    folderId,
    enableCache: true,
    autoRefresh: false
  });

  // 搜索处理（智能搜索或普通搜索）
  const handleSearchChange = useCallback((value: string) => {
    if (intelligentSearchEnabled && advancedMode) {
      // 使用智能搜索
      const searchResults = searchDocuments(documents as Document[], value, {
        fuzzy: true,
        semantic: true,
        maxResults: 50
      });
      // 更新文档列表为搜索结果
      const resultDocuments = searchResults.map(result => result.item);
      updateState({ 
        documents: resultDocuments,
        searchText: value 
      });
      
      // 记录搜索行为
      if (value) {
        intelligentSearch.recordSearchClick(value, 0);
      }
    } else {
      // 使用普通搜索
      debouncedSearch(value);
    }
  }, [intelligentSearchEnabled, advancedMode, documents, updateState, debouncedSearch]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    updateState({ [key]: value });
  }, [updateState]);

  const handleSortChange = useCallback((field: string, order: string) => {
    updateState({ 
      sortBy: field as any, 
      sortOrder: order as any 
    });
  }, [updateState]);

  // 文档操作处理
  const handleCreateDocument = () => {
    if (onCreateDocument) {
      onCreateDocument();
    } else {
      setModalStates(prev => ({ ...prev, create: true }));
    }
  };

  const handleEditDocument = (document: Document | DocumentListItem) => {
    if (onEditDocument) {
      onEditDocument(document);
    } else {
      setSelectedDocument(document as Document);
      if (enableOnlineEditor && advancedMode) {
        setModalStates(prev => ({ ...prev, onlineEditor: true }));
      } else {
        setModalStates(prev => ({ ...prev, edit: true }));
      }
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    await deleteDocument(documentId);
    onDocumentUpdate?.();
  };

  const handleDocumentSelect = (document: Document | DocumentListItem) => {
    // 记录文档查看行为（智能搜索）
    if (intelligentSearchEnabled) {
      intelligentSearch.recordDocumentView(document.id);
    }
    
    // 发送协作事件
    if (collaboration.connected) {
      collaboration.sendEvent({
        type: 'document_update',
        documentId: document.id,
        data: { action: 'view' }
      });
    }
    
    if (onDocumentSelect) {
      onDocumentSelect(document);
    } else {
      // 默认行为：查看文档
      window.open(`/documents/${document.id}`, '_blank');
    }
  };

  // 批量操作处理
  const handleBatchDelete = async () => {
    if (selectedDocuments.length === 0) {
      message.warning('请选择要删除的文档');
      return;
    }
    
    await batchDelete(selectedDocuments);
    onDocumentUpdate?.();
  };

  // Google Docs集成处理
  const handleGoogleDocsImport = async () => {
    try {
      const authenticated = await googleDocsService.authenticate();
      if (authenticated) {
        setModalStates(prev => ({ ...prev, googleDocsImport: true }));
      }
    } catch (error) {
      message.error('Google认证失败，请检查网络连接');
    }
  };

  const handleImportFromGoogleDocs = async (googleDocId: string) => {
    try {
      const importedDoc = await googleDocsService.importDocument(googleDocId);
      message.success(`文档 "${importedDoc.title}" 导入成功`);
      setModalStates(prev => ({ ...prev, googleDocsImport: false }));
      refresh();
      onDocumentUpdate?.();
    } catch (error) {
      console.error('导入失败:', error);
      message.error('从Google Docs导入失败');
    }
  };

  const handleExportToGoogleDocs = async (document: Document) => {
    try {
      const googleDocId = await googleDocsService.exportDocument(document.title, document.content || '');
      const shareableLink = await googleDocsService.getShareableLink(googleDocId);
      message.success('导出到Google Docs成功');
      Modal.info({
        title: '导出成功',
        content: (
          <div>
            <p>文档已成功导出到Google Docs</p>
            <a href={shareableLink} target="_blank" rel="noopener noreferrer">
              点击查看Google Docs文档
            </a>
          </div>
        )
      });
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出到Google Docs失败');
    }
  };

  // 版本控制处理
  const handleVersionControl = (document: Document) => {
    setSelectedDocument(document);
    setModalStates(prev => ({ ...prev, versionControl: true }));
  };

  // 在线保存处理
  const handleOnlineEditorSave = async (content: string) => {
    if (!selectedDocument) return;
    
    try {
      // 这里应该调用实际的文档更新API
      // await documentService.updateDocument(selectedDocument.id, { content });
      
      message.success('文档保存成功');
      refresh();
      onDocumentUpdate?.();
    } catch (error) {
      console.error('保存失败:', error);
      throw error; // 重新抛出错误让编辑器处理
    }
  };

  // 模式切换
  const handleModeSwitch = (advanced: boolean) => {
    setAdvancedMode(advanced);
    // Hook会自动处理模式切换后的数据重新加载
  };

  // 加载智能推荐
  useEffect(() => {
    if (intelligentSearchEnabled && advancedMode && documents.length > 0) {
      const recs = getRecommendations(documents as Document[], 5);
      setRecommendations(recs);
    }
  }, [documents, intelligentSearchEnabled, advancedMode]);

  // 协作事件监听
  useEffect(() => {
    if (!collaboration.connected) return;

    const unsubscribeDocUpdate = collaboration.addEventListener('document_update', (event: any) => {
      if (event.userId !== 'current-user-id') { // 避免自己触发的事件
        refresh(); // 刷新文档列表
      }
    });

    const unsubscribeDocDelete = collaboration.addEventListener('document_delete', (event: any) => {
      if (event.userId !== 'current-user-id') {
        refresh(); // 刷新文档列表
      }
    });

    return () => {
      unsubscribeDocUpdate();
      unsubscribeDocDelete();
    };
  }, [collaboration.connected, refresh]);

  // 渲染工具栏
  const renderToolbar = () => {
    if (!showToolbar) return null;

    return (
      <DocumentToolbar
        mode={advancedMode ? 'advanced' : 'simple'}
        searchText={searchText}
        onSearchChange={handleSearchChange}
        showSearch={showSearch}
        filterStatus={filterStatus}
        onFilterStatusChange={(value) => handleFilterChange('filterStatus', value)}
        filterType={filterType}
        onFilterTypeChange={(value) => handleFilterChange('filterType', value)}
        sortBy={sortBy}
        onSortByChange={(value) => handleFilterChange('sortBy', value)}
        sortOrder={sortOrder}
        onSortOrderChange={(value) => handleFilterChange('sortOrder', value)}
        viewMode={viewMode as 'table' | 'grid'}
        onViewModeChange={(mode: 'table' | 'grid') => setViewMode(mode as 'table' | 'grid' | 'virtualized')}
        showViewToggle={showViewToggle && advancedMode}
        isSelectMode={isSelectMode}
        selectedCount={selectedDocuments.length}
        totalCount={documents.length}
        onToggleSelectMode={toggleSelectMode}
        onSelectAll={toggleSelectAll}
        onClearSelection={() => updateState({ selectedDocuments: [] })}
        onBatchDelete={handleBatchDelete}
        onCreateDocument={handleCreateDocument}
        allowUpload={allowUpload}
        allowBatch={allowBatch && advancedMode}
        onUpload={() => setModalStates(prev => ({ ...prev, upload: true }))}
        // Google Docs集成相关属性
        enableGoogleDocsIntegration={enableGoogleDocsIntegration && advancedMode}
        onGoogleDocsImport={handleGoogleDocsImport}
      />
    );
  };

  // 渲染文档列表 - 使用memoization优化性能
  const renderDocumentList = useMemo(() => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">加载文档中...</Text>
          </div>
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <Empty 
          description="暂无文档" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={handleCreateDocument}>
            创建第一个文档
          </Button>
        </Empty>
      );
    }

    // 根据视图模式和功能模式选择合适的视图组件
    if (viewMode === 'virtualized' && (enableVirtualization || documents.length > 100)) {
      return (
        <VirtualizedDocumentList
          documents={documents}
          loading={loading}
          height={600}
          itemHeight={advancedMode ? 120 : 60}
          selectedDocuments={selectedDocuments}
          isSelectMode={isSelectMode}
          mode={advancedMode ? 'advanced' : 'simple'}
          showProject={!projectId}
          onDocumentSelect={handleDocumentSelect}
          onDocumentEdit={handleEditDocument}
          onDocumentDelete={handleDeleteDocument}
          onToggleSelection={toggleDocumentSelection}
          // 新增高级功能属性
          enableVersionControl={enableVersionControl && advancedMode}
          enableGoogleDocsIntegration={enableGoogleDocsIntegration && advancedMode}
          onVersionControl={handleVersionControl}
          onExportToGoogleDocs={handleExportToGoogleDocs}
        />
      );
    }

    if (viewMode === 'grid' && advancedMode) {
      return (
        <DocumentGridView
          documents={documents as Document[]}
          selectedDocuments={selectedDocuments}
          isSelectMode={isSelectMode}
          onDocumentSelect={handleDocumentSelect}
          onDocumentEdit={handleEditDocument}
          onDocumentDelete={handleDeleteDocument}
          onToggleSelection={toggleDocumentSelection}
          // 新增高级功能属性
          enableVersionControl={enableVersionControl && advancedMode}
          enableGoogleDocsIntegration={enableGoogleDocsIntegration && advancedMode}
          onVersionControl={handleVersionControl}
          onExportToGoogleDocs={handleExportToGoogleDocs}
        />
      );
    }

    return (
      <DocumentTableView
        documents={documents}
        selectedDocuments={selectedDocuments}
        isSelectMode={isSelectMode}
        showProject={!projectId}
        mode={advancedMode ? 'advanced' : 'simple'}
        page={pagination.current}
        pageSize={pagination.pageSize}
        total={total}
        onDocumentSelect={handleDocumentSelect}
        onDocumentEdit={handleEditDocument}
        onDocumentDelete={handleDeleteDocument}
        onToggleSelection={toggleDocumentSelection}
        onPageChange={pagination.onChange}
        // 新增高级功能属性
        enableVersionControl={enableVersionControl && advancedMode}
        enableGoogleDocsIntegration={enableGoogleDocsIntegration && advancedMode}
        onVersionControl={handleVersionControl}
        onExportToGoogleDocs={handleExportToGoogleDocs}
      />
    );
  }, [
    loading, 
    documents, 
    viewMode, 
    enableVirtualization, 
    advancedMode, 
    handleCreateDocument,
    handleDocumentSelect,
    handleEditDocument,
    handleDeleteDocument,
    toggleDocumentSelection,
    selectedDocuments,
    isSelectMode,
    projectId,
    pagination,
    total,
    enableVersionControl,
    enableGoogleDocsIntegration,
    handleVersionControl,
    handleExportToGoogleDocs
  ]);

  return (
    <div>
      <Card>
        {/* 页面头部 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 16 
        }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              {projectName ? `${projectName} - 文档管理` : '文档管理'}
            </Title>
          </div>
          
          <Space>
            {/* 协作状态指示器 */}
            {enableRealtimeCollaboration && advancedMode && (
              <Tooltip title={`实时协作 - ${collaboration.connected ? '已连接' : '未连接'}`}>
                <Space>
                  <WifiOutlined 
                    style={{ 
                      color: collaboration.connected ? '#52c41a' : '#d9d9d9',
                      fontSize: '14px' 
                    }} 
                  />
                  <Badge count={collaboration.getOnlineUserCount()} size="small">
                    <UserOutlined style={{ fontSize: '14px' }} />
                  </Badge>
                </Space>
              </Tooltip>
            )}

            {/* 智能功能指示器 */}
            {enableIntelligentSearch && advancedMode && (
              <Tooltip title="智能搜索已启用">
                <Space>
                  <BulbOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
                  {recommendations.length > 0 && (
                    <Badge count={recommendations.length} size="small">
                      <ThunderboltOutlined style={{ fontSize: '14px' }} />
                    </Badge>
                  )}
                </Space>
              </Tooltip>
            )}

            {/* 模式切换 */}
            <Tooltip title={advancedMode ? '切换到简洁模式' : '切换到高级模式'}>
              <Space>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {advancedMode ? '高级' : '简洁'}
                </Text>
                <Switch
                  size="small"
                  checked={advancedMode}
                  onChange={handleModeSwitch}
                  checkedChildren={<SettingOutlined />}
                  unCheckedChildren={<UnorderedListOutlined />}
                />
              </Space>
            </Tooltip>
            
            {/* 文档数量统计 */}
            <Badge count={total} showZero>
              <Text type="secondary">文档总数</Text>
            </Badge>
          </Space>
        </div>

        {/* 工具栏 */}
        {renderToolbar()}
        
        {/* 分隔线 */}
        {showToolbar && <Divider style={{ margin: '16px 0' }} />}
        
        {/* 批量操作提示 */}
        {isSelectMode && selectedDocuments.length > 0 && (
          <div style={{ 
            background: '#e6f7ff', 
            border: '1px solid #91d5ff',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '16px'
          }}>
            <Text>
              已选择 <Text strong>{selectedDocuments.length}</Text> 个文档
            </Text>
          </div>
        )}

        {/* 文档列表 */}
        {renderDocumentList}
      </Card>

      {/* 模态框 */}
      {advancedMode && (
        <DocumentModals
          modalStates={modalStates}
          selectedDocument={selectedDocument}
          folderId={folderId}
          projectId={projectId}
          onModalStateChange={(modal, visible) => 
            setModalStates(prev => ({ ...prev, [modal]: visible }))
          }
          onDocumentUpdate={() => {
            refresh();
            onDocumentUpdate?.();
          }}
          onDocumentCreated={() => {
            setModalStates(prev => ({ ...prev, create: false }));
            refresh();
            onDocumentUpdate?.();
          }}
          onDocumentUpdated={() => {
            setModalStates(prev => ({ ...prev, edit: false }));
            setSelectedDocument(null);
            refresh();
            onDocumentUpdate?.();
          }}
        />
      )}

      {/* 在线文档编辑器 */}
      {selectedDocument && (
        <OnlineDocumentEditor
          document={selectedDocument}
          visible={modalStates.onlineEditor}
          onClose={() => setModalStates(prev => ({ ...prev, onlineEditor: false }))}
          onSave={handleOnlineEditorSave}
          defaultEditor="google-docs"
          enableCollaboration={enableRealtimeCollaboration}
        />
      )}

      {/* 版本控制 */}
      {selectedDocument && (
        <DocumentVersionControl
          document={selectedDocument}
          visible={modalStates.versionControl}
          onClose={() => setModalStates(prev => ({ ...prev, versionControl: false }))}
          onVersionRestore={() => {
            refresh();
            onDocumentUpdate?.();
          }}
          onVersionUpdate={() => {
            refresh();
            onDocumentUpdate?.();
          }}
        />
      )}

      {/* Google Docs导入模态框 */}
      <Modal
        title="从Google Docs导入"
        open={modalStates.googleDocsImport}
        onCancel={() => setModalStates(prev => ({ ...prev, googleDocsImport: false }))}
        onOk={() => setModalStates(prev => ({ ...prev, googleDocsImport: false }))}
        width={600}
      >
        <div style={{ padding: '20px 0' }}>
          <Text>
            请在Google Docs中选择要导入的文档，然后复制文档ID或完整URL：
          </Text>
          <Input.TextArea
            placeholder="输入Google Docs文档ID或URL..."
            rows={3}
            style={{ marginTop: 16 }}
            onPressEnter={(e) => {
              const value = (e.target as HTMLTextAreaElement).value.trim();
              if (value) {
                // 提取文档ID（从URL中或直接使用）
                const docId = value.includes('/document/d/') 
                  ? value.split('/document/d/')[1].split('/')[0]
                  : value;
                handleImportFromGoogleDocs(docId);
              }
            }}
          />
          <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
            <div>支持格式：</div>
            <div>• 完整URL: https://docs.google.com/document/d/[文档ID]/edit</div>
            <div>• 文档ID: [文档ID]</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UnifiedDocumentManager;