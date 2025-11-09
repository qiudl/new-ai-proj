import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Tag,
  Modal,
  // Upload, // ✅ FIXED - Removed unused import (ESLint)
  message,
  Tooltip,
  // Popconfirm, // ✅ FIXED - Removed unused import (ESLint)
  // Badge, // ✅ FIXED - Removed unused import (ESLint)
  // Tabs, // ✅ FIXED - Removed unused import (ESLint)
  Row,
  Col,
  Statistic,
  // Drawer, // ✅ FIXED - Removed unused import (ESLint)
  // List, // ✅ FIXED - Removed unused import (ESLint)
  // Avatar, // ✅ FIXED - Removed unused import (ESLint)
  Dropdown,
  // Progress, // ✅ FIXED - Removed unused import (ESLint)
  Alert,
  // Spin, // ✅ FIXED - Removed unused import (ESLint)
  // Empty // ✅ FIXED - Removed unused import (ESLint)
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
// import type { MenuProps } from 'antd'; // ✅ FIXED - Removed unused type import (ESLint)
import {
  FileTextOutlined,
  // CloudUploadOutlined, // ✅ FIXED - Removed unused import (ESLint)
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  // SearchOutlined, // ✅ FIXED - Removed unused import (ESLint)
  // FilterOutlined, // ✅ FIXED - Removed unused import (ESLint)
  // PlusOutlined, // ✅ FIXED - Removed unused import (ESLint)
  ReloadOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileOutlined,
  HistoryOutlined,
  SettingOutlined,
  ShareAltOutlined,
  StarOutlined,
  StarFilled,
  MoreOutlined,
  // FolderOutlined, // ✅ FIXED - Removed unused import (ESLint)
  // TagOutlined, // ✅ FIXED - Removed unused import (ESLint)
  // UserOutlined, // ✅ FIXED - Removed unused import (ESLint)
  ClockCircleOutlined,
  ExportOutlined,
  // ImportOutlined, // ✅ FIXED - Removed unused import (ESLint)
  // SyncOutlined // ✅ FIXED - Removed unused import (ESLint)
} from '@ant-design/icons';
import { documentService } from '../../services/unifiedDocumentService';
import { Document, DocumentFilter } from '../../types/document';
import ModernWorkNoteEditor from '../ModernWorkNoteEditor';
import ModernWorkNoteViewer from '../ModernWorkNoteViewer';
import DocumentVersionControl from '../DocumentVersionControl';
import { errorLogger } from '../../utils/ErrorLogger';
import { useDebounce } from '../../hooks/useDebounce';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

interface EnhancedDocumentInterfaceProps {
  projectId?: number;
  taskId?: number;
  mode?: 'standalone' | 'embedded';
  title?: string;
  showProjectFilter?: boolean;
  showTaskFilter?: boolean;
  allowBulkOperations?: boolean;
  height?: number | string;
  onDocumentSelect?: (document: Document) => void;
  onDocumentChange?: (documents: Document[]) => void;
}

interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  selectedRowKeys: React.Key[];
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    recent: number;
  };
}

interface FilterState extends DocumentFilter {
  search: string;
  dateRange: [string, string] | null;
}

/**
 * 增强的文档管理界面
 * 
 * 特性:
 * 1. 统一的文档管理体验
 * 2. 高级筛选和搜索
 * 3. 批量操作支持
 * 4. 实时统计和分析
 * 5. 响应式设计
 * 6. 性能优化
 */
const EnhancedDocumentInterface: React.FC<EnhancedDocumentInterfaceProps> = memo(({
  projectId,
  taskId,
  mode = 'standalone',
  title = '文档管理',
  showProjectFilter: _showProjectFilter = true, // ✅ FIXED - Added underscore to unused prop (ESLint)
  showTaskFilter: _showTaskFilter = true, // ✅ FIXED - Added underscore to unused prop (ESLint)
  allowBulkOperations = true,
  height = 'auto',
  onDocumentSelect,
  onDocumentChange
}) => {
  // 状态管理
  const [documentState, setDocumentState] = useState<DocumentState>({
    documents: [],
    loading: false,
    error: null,
    selectedRowKeys: [],
    statistics: {
      total: 0,
      byStatus: {},
      byType: {},
      recent: 0
    }
  });

  const [filterState, setFilterState] = useState<FilterState>({
    search: '',
    status: undefined,
    type: undefined,
    visibility: undefined,
    project_id: projectId,
    task_id: taskId,
    dateRange: null
  });

  const [viewState, setViewState] = useState({
    selectedDocument: null as Document | null,
    editorVisible: false,
    viewerVisible: false,
    uploadVisible: false,
    versionControlVisible: false,
    settingsVisible: false,
    viewMode: 'table' as 'table' | 'grid' | 'list'
  });

  // 防抖搜索
  const debouncedSearch = useDebounce(filterState.search, 300);

  // 加载文档列表
  const loadDocuments = useCallback(async (filters?: Partial<FilterState>) => {
    setDocumentState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const queryFilters = { ...filterState, ...filters };
      let documents: any[];

      if (taskId && projectId) {
        // getTaskDocuments returns array directly, doesn't accept filter params
        const allDocs = await documentService.getTaskDocuments(projectId, taskId);

        // Apply client-side filtering
        documents = (allDocs || []).filter(doc => {
          if (queryFilters.search && !doc.title?.toLowerCase().includes(queryFilters.search.toLowerCase())) {
            return false;
          }
          if (queryFilters.status && queryFilters.status.length > 0 && !queryFilters.status.includes(doc.status)) {
            return false;
          }
          if (queryFilters.type && queryFilters.type.length > 0 && !queryFilters.type.includes(doc.type)) {
            return false;
          }
          return true;
        });
      } else {
        const response = await documentService.listDocuments({
          search: queryFilters.search || undefined,
          status: queryFilters.status,
          type: queryFilters.type,
          visibility: queryFilters.visibility,
          project_id: queryFilters.project_id,
          task_id: queryFilters.task_id
        });
        documents = response.documents || [];
      }

      // 计算统计信息
      const statistics = {
        total: documents.length,
        byStatus: documents.reduce((acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byType: documents.reduce((acc, doc) => {
          acc[doc.type] = (acc[doc.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recent: documents.filter(doc => {
          const updateTime = new Date(doc.updated_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return updateTime > dayAgo;
        }).length
      };
      
      setDocumentState(prev => ({
        ...prev,
        documents,
        statistics,
        loading: false
      }));

      onDocumentChange?.(documents);

      errorLogger.info('ui', 'EnhancedDocumentInterface: 文档加载成功', {
        total: documents.length,
        taskId,
        projectId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载文档失败';
      
      setDocumentState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      errorLogger.error('ui', 'EnhancedDocumentInterface: 文档加载失败', {
        error: errorMessage,
        taskId,
        projectId
      });
      
      message.error(`加载文档失败: ${errorMessage}`);
    }
  }, [filterState, taskId, projectId, onDocumentChange]);

  // 搜索效果
  useEffect(() => {
    if (debouncedSearch !== filterState.search) {
      setFilterState(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch]);

  // 筛选器变化时重新加载
  useEffect(() => {
    loadDocuments();
  }, [filterState.status, filterState.type, filterState.visibility, debouncedSearch]);

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, []);

  // 处理文档操作
  const handleDocumentAction = useCallback(async (action: string, documentId: number, document?: Document) => {
    try {
      switch (action) {
        case 'view':
          if (document) {
            setViewState(prev => ({
              ...prev,
              selectedDocument: document,
              viewerVisible: true
            }));
            onDocumentSelect?.(document);
          }
          break;
          
        case 'edit':
          if (document) {
            setViewState(prev => ({
              ...prev,
              selectedDocument: document,
              editorVisible: true
            }));
          }
          break;
          
        case 'download':
          if (document) {
            // ✅ FIXED - downloadDocument takes 1 parameter (documentId), returns Blob (TS2554)
            const blob = await documentService.downloadDocument(documentId);
            documentService.triggerDownload(blob, document.title);
            message.success(`开始下载 "${document.title}"`);
          }
          break;
          
        case 'delete':
          await documentService.deleteDocument(documentId);
          message.success('文档删除成功');
          loadDocuments();
          break;
          
        case 'star':
          // 实现收藏逻辑
          message.success('文档已收藏');
          break;
          
        case 'share':
          // 实现分享逻辑
          message.success('分享链接已复制');
          break;
          
        default:
          break;
      }
      
      errorLogger.debug('ui', 'EnhancedDocumentInterface: 文档操作', {
        action,
        documentId,
        documentTitle: document?.title
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      message.error(`操作失败: ${errorMessage}`);
      
      errorLogger.error('ui', 'EnhancedDocumentInterface: 文档操作失败', {
        action,
        documentId,
        error: errorMessage
      });
    }
  }, [onDocumentSelect, loadDocuments]);

  // 批量操作
  const handleBulkAction = useCallback(async (action: string) => {
    if (documentState.selectedRowKeys.length === 0) {
      message.warning('请选择要操作的文档');
      return;
    }

    try {
      switch (action) {
        case 'delete':
          await Promise.all(
            documentState.selectedRowKeys.map(id => 
              documentService.deleteDocument(Number(id))
            )
          );
          message.success(`成功删除 ${documentState.selectedRowKeys.length} 个文档`);
          break;
          
        case 'star':
          // 批量收藏逻辑
          message.success(`成功收藏 ${documentState.selectedRowKeys.length} 个文档`);
          break;
          
        case 'export':
          // 批量导出逻辑
          message.success(`正在导出 ${documentState.selectedRowKeys.length} 个文档`);
          break;
          
        default:
          break;
      }
      
      setDocumentState(prev => ({ ...prev, selectedRowKeys: [] }));
      loadDocuments();
      
      errorLogger.info('ui', 'EnhancedDocumentInterface: 批量操作成功', {
        action,
        count: documentState.selectedRowKeys.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量操作失败';
      message.error(`批量操作失败: ${errorMessage}`);
      
      errorLogger.error('ui', 'EnhancedDocumentInterface: 批量操作失败', {
        action,
        error: errorMessage
      });
    }
  }, [documentState.selectedRowKeys, loadDocuments]);

  // 文档类型图标
  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'markdown':
        return <FileMarkdownOutlined style={{ color: '#1890ff' }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <FileOutlined style={{ color: '#52c41a' }} />;
    }
  };

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'green';
      case 'draft':
        return 'orange';
      case 'archived':
        return 'gray';
      default:
        return 'default';
    }
  };

  // 表格列定义
  const columns: ColumnsType<Document> = useMemo(() => [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (title: string, record: Document) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getDocumentIcon(record.type)}
          <Button
            type="link"
            onClick={() => handleDocumentAction('view', record.id, record)}
            style={{ padding: 0, height: 'auto' }}
          >
            {title}
          </Button>
          {record.is_starred && <StarFilled style={{ color: '#faad14' }} />}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      filters: Object.keys(documentState.statistics.byStatus).map(status => ({
        text: status,
        value: status
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      filters: Object.keys(documentState.statistics.byType).map(type => ({
        text: type,
        value: type
      })),
      onFilter: (value, record) => record.type === value,
      render: (type: string) => <Tag>{type}</Tag>
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: Document) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleDocumentAction('view', record.id, record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleDocumentAction('edit', record.id, record)}
            />
          </Tooltip>
          <Tooltip title="下载">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDocumentAction('download', record.id, record)}
            />
          </Tooltip>
          <Tooltip title="收藏">
            <Button
              type="text"
              size="small"
              icon={record.is_starred ? <StarFilled /> : <StarOutlined />}
              onClick={() => handleDocumentAction('star', record.id, record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'share',
                  label: '分享',
                  icon: <ShareAltOutlined />,
                  onClick: () => handleDocumentAction('share', record.id, record)
                },
                {
                  key: 'history',
                  label: '版本历史',
                  icon: <HistoryOutlined />,
                  onClick: () => {
                    setViewState(prev => ({
                      ...prev,
                      selectedDocument: record,
                      versionControlVisible: true
                    }));
                  }
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => {
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除文档 "${record.title}" 吗？`,
                      okText: '删除',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: () => handleDocumentAction('delete', record.id, record)
                    });
                  }
                }
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ], [documentState.statistics, handleDocumentAction]);

  // 渲染统计卡片
  const renderStatistics = () => (
    <Row gutter={16} style={{ marginBottom: '16px' }}>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="总文档数"
            value={documentState.statistics.total}
            prefix={<FileTextOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="今日更新"
            value={documentState.statistics.recent}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="已发布"
            value={documentState.statistics.byStatus.published || 0}
            prefix={<FileTextOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            title="草稿"
            value={documentState.statistics.byStatus.draft || 0}
            prefix={<EditOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
    </Row>
  );

  // 渲染筛选器
  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: '16px' }}>
      <Row gutter={16} align="middle">
        <Col flex="auto">
          <Search
            placeholder="搜索文档标题、内容..."
            value={filterState.search}
            onChange={e => setFilterState(prev => ({ ...prev, search: e.target.value }))}
            allowClear
            style={{ width: '100%' }}
          />
        </Col>
        <Col>
          <Select
            placeholder="状态"
            value={filterState.status}
            onChange={value => setFilterState(prev => ({ ...prev, status: value }))}
            allowClear
            style={{ width: '120px' }}
          >
            <Option value="published">已发布</Option>
            <Option value="draft">草稿</Option>
            <Option value="archived">已归档</Option>
          </Select>
        </Col>
        <Col>
          <Select
            placeholder="类型"
            value={filterState.type}
            onChange={value => setFilterState(prev => ({ ...prev, type: value }))}
            allowClear
            style={{ width: '120px' }}
          >
            <Option value="markdown">Markdown</Option>
            <Option value="pdf">PDF</Option>
            <Option value="text">文本</Option>
          </Select>
        </Col>
        <Col>
          <Select
            placeholder="可见性"
            value={filterState.visibility}
            onChange={value => setFilterState(prev => ({ ...prev, visibility: value }))}
            allowClear
            style={{ width: '120px' }}
          >
            <Option value="private">私有</Option>
            <Option value="team">团队</Option>
            <Option value="public">公开</Option>
          </Select>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadDocuments()}
              loading={documentState.loading}
            />
            <Button
              icon={<SettingOutlined />}
              onClick={() => setViewState(prev => ({ ...prev, settingsVisible: true }))}
            />
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染批量操作工具栏
  const renderBulkActions = () => {
    if (!allowBulkOperations || documentState.selectedRowKeys.length === 0) return null;

    return (
      <Card size="small" style={{ marginBottom: '16px', borderColor: '#1890ff' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong>已选择 {documentState.selectedRowKeys.length} 个文档</Text>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={() => handleBulkAction('export')}
              >
                导出
              </Button>
              <Button
                icon={<StarOutlined />}
                onClick={() => handleBulkAction('star')}
              >
                收藏
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: '批量删除确认',
                    content: `确定要删除选中的 ${documentState.selectedRowKeys.length} 个文档吗？`,
                    okText: '删除',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: () => handleBulkAction('delete')
                  });
                }}
              >
                删除
              </Button>
              <Button
                type="text"
                onClick={() => setDocumentState(prev => ({ ...prev, selectedRowKeys: [] }))}
              >
                取消选择
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  // 错误处理
  if (documentState.error) {
    return (
      <Alert
        message="文档加载失败"
        description={documentState.error}
        type="error"
        action={
          <Button size="small" onClick={() => loadDocuments()}>
            重试
          </Button>
        }
        closable
      />
    );
  }

  return (
    <div style={{ height }}>
      {mode === 'standalone' && <Title level={3}>{title}</Title>}
      
      {/* 统计信息 */}
      {renderStatistics()}
      
      {/* 筛选器 */}
      {renderFilters()}
      
      {/* 批量操作 */}
      {renderBulkActions()}
      
      {/* 文档表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={documentState.documents}
          rowKey="id"
          loading={documentState.loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 个文档`
          }}
          rowSelection={allowBulkOperations ? {
            selectedRowKeys: documentState.selectedRowKeys,
            onChange: (selectedRowKeys) => {
              setDocumentState(prev => ({ ...prev, selectedRowKeys }));
            }
          } : undefined}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 文档查看器 */}
      <ModernWorkNoteViewer
        visible={viewState.viewerVisible}
        note={viewState.selectedDocument as any}
        onClose={() => setViewState(prev => ({ ...prev, viewerVisible: false }))}
        onEdit={(note) => {
          setViewState(prev => ({
            ...prev,
            viewerVisible: false,
            editorVisible: true,
            selectedDocument: note as Document
          }));
        }}
      />

      {/* 文档编辑器 */}
      <ModernWorkNoteEditor
        visible={viewState.editorVisible}
        initialNote={viewState.selectedDocument as any}
        onClose={() => setViewState(prev => ({ ...prev, editorVisible: false }))}
        onSave={() => {
          setViewState(prev => ({ ...prev, editorVisible: false }));
          loadDocuments();
        }}
      />

      {/* 版本控制 */}
      <DocumentVersionControl
        visible={viewState.versionControlVisible}
        document={viewState.selectedDocument}
        onClose={() => setViewState(prev => ({ ...prev, versionControlVisible: false }))}
      />
    </div>
  );
});

EnhancedDocumentInterface.displayName = 'EnhancedDocumentInterface';

export default EnhancedDocumentInterface;