import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  Tooltip,
  Modal,
  Typography,
  Divider,
  Alert,
  Spin,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Table,
  Tag,
  List,
  Empty,
  Progress,
  Dropdown,
  Menu,
  Popconfirm,
  notification,
  Skeleton,
  Result,
  FloatButton,
  Tour,
  TourProps,
  Grid
} from 'antd';
import {
  FileTextOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined,
  CheckOutlined,
  CloseOutlined,
  SelectOutlined,
  TagOutlined,
  UndoOutlined,
  HistoryOutlined,
  QuestionCircleOutlined,
  ControlOutlined,
  BugOutlined,
  RocketOutlined,
  ExpandOutlined,
  ShrinkOutlined
} from '@ant-design/icons';
import TaskDocumentUploader from './TaskDocumentUploader';
import DocumentVersionHistory from './DocumentVersionHistory';
import { documentService as taskDocumentService } from '../services/unifiedDocumentService';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface TaskDocumentManagerProps {
  projectId: number;
  taskId: number;
  visible?: boolean;
  onClose?: () => void;
  mode?: 'embedded' | 'modal'; // embedded for task detail page, modal for standalone
}

interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  uploadTypes: {
    manual: number;
    api: number;
  };
  mimeTypes: Record<string, number>;
}

interface DocumentInfo {
  id?: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  upload_type: 'manual' | 'api';
  uploaded_at: string;
  file_path?: string;
  content?: string;
}

interface SearchFilters {
  searchText: string;
  fileType: string;
  uploadType: string;
  sizeRange: [number, number] | null;
  dateRange: [string, string] | null;
  selectedMimeTypes: string[];
}

interface BatchOperation {
  id: string;
  type: 'delete' | 'download' | 'move' | 'tag';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  canUndo: boolean;
}

interface BatchOperationHistory {
  operations: BatchOperation[];
  undoStack: BatchOperation[];
}

const TaskDocumentManager: React.FC<TaskDocumentManagerProps> = ({
  projectId,
  taskId,
  visible = true,
  onClose,
  mode = 'embedded'
}) => {
  // 响应式检测
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // md以下认为是移动端 (< 768px)
  
  const [activeTab, setActiveTab] = useState('uploader');
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  
  // 搜索和过滤状态
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchText: '',
    fileType: 'all',
    uploadType: 'all',
    sizeRange: null,
    dateRange: null,
    selectedMimeTypes: [],
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 预览和操作状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewExpanded, setPreviewExpanded] = useState(false); // 全屏预览展开/收起状态
  
  // 版本历史状态
  const [versionHistoryVisible, setVersionHistoryVisible] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<number>(0);
  const [currentDocumentVersion, setCurrentDocumentVersion] = useState<number>(1);
  
  // 批量操作增强状态
  const [batchOperationHistory, setBatchOperationHistory] = useState<BatchOperationHistory>({
    operations: [],
    undoStack: []
  });
  const [currentBatchOperation, setCurrentBatchOperation] = useState<BatchOperation | null>(null);
  const [batchProgressVisible, setBatchProgressVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced UX state
  const [tourOpen, setTourOpen] = useState(false);
  const [keyboardShortcutsVisible, setKeyboardShortcutsVisible] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastActionTimestamp, setLastActionTimestamp] = useState<number>(0);
  
  // Refs for tour and keyboard shortcuts
  const searchRef = useRef<any>(null);
  const tableRef = useRef<any>(null);
  const uploadTabRef = useRef<any>(null);
  const statsTabRef = useRef<any>(null);

  // Load document statistics and documents - with improved error handling
  const loadDocumentStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // getTaskDocuments returns array directly, not { documents: [] }
      const docs = await taskDocumentService.getTaskDocuments(projectId, taskId);

      // 设置文档列表
      setDocuments(docs || []);
      
      const stats: DocumentStats = {
        totalDocuments: docs.length,
        totalSize: docs.reduce((sum, doc) => sum + doc.file_size, 0),
        uploadTypes: {
          manual: docs.filter(doc => doc.upload_type === 'manual').length,
          api: docs.filter(doc => doc.upload_type === 'api').length
        },
        mimeTypes: docs.reduce((acc, doc) => {
          acc[doc.mime_type] = (acc[doc.mime_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      setDocumentStats(stats);
    } catch (error: any) {
      console.error('Failed to load document stats:', error);
      const errorMessage = error?.message || '加载文档数据失败，请稍后重试';
      setError(errorMessage);
      notification.error({
        message: '加载失败',
        description: errorMessage,
        duration: 4.5,
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  // Track user actions for auto-refresh logic
  const trackUserAction = useCallback(() => {
    setLastActionTimestamp(Date.now());
  }, []);

  // Handle refresh - optimized with useCallback
  const handleRefresh = useCallback(() => {
    trackUserAction();
    setRefreshKey(prev => prev + 1);
    loadDocumentStats();
  }, [trackUserAction, loadDocumentStats]);

  useEffect(() => {
    if (visible) {
      loadDocumentStats();
    }
  }, [visible, projectId, taskId, refreshKey]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when component is visible and not in modal input
      if (!visible || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      const isCtrlCmd = e.ctrlKey || e.metaKey;
      
      switch (e.key) {
        case 'r':
          if (isCtrlCmd) {
            e.preventDefault();
            handleRefresh();
            notification.info({ message: '快捷键触发', description: '文档列表已刷新', duration: 2 });
          }
          break;
        case 'f':
          if (isCtrlCmd) {
            e.preventDefault();
            searchRef.current?.focus();
            notification.info({ message: '快捷键触发', description: '焦点已移至搜索框', duration: 2 });
          }
          break;
        case 'a':
          if (isCtrlCmd && e.shiftKey) {
            e.preventDefault();
            handleSmartSelection('all');
            notification.info({ message: '快捷键触发', description: '已全选文档', duration: 2 });
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (selectedRowKeys.length > 0) {
            // Clear selections first, but provide clear guidance
            setSelectedRowKeys([]);
            notification.info({ 
              message: '已取消选择', 
              description: (
                <div>
                  <div>已清除所有选中项</div>
                  <div style={{ marginTop: 4, color: '#666', fontSize: '12px' }}>
                    提示：再按ESC键关闭窗口，或点击"关闭"按钮，或使用"强制关闭"
                  </div>
                </div>
              ), 
              duration: 4,
              style: { marginTop: '10vh' }
            });
          } else if (mode === 'modal') {
            // Close modal when no selections
            notification.info({ 
              message: '正在关闭...', 
              description: '如果窗口未正常关闭，请点击"强制关闭"按钮', 
              duration: 2 
            });
            handleModalClose();
          }
          break;
        case 'd':
          if (isCtrlCmd && selectedRowKeys.length > 0) {
            e.preventDefault();
            handleBatchDownload();
          }
          break;
        case 'h':
          if (isCtrlCmd && e.shiftKey) {
            e.preventDefault();
            setKeyboardShortcutsVisible(true);
          }
          break;
        case 't':
          if (isCtrlCmd && e.shiftKey) {
            e.preventDefault();
            setTourOpen(true);
          }
          break;
        case '1':
        case '2':
        case '3':
          if (isCtrlCmd) {
            e.preventDefault();
            const tabKeys = ['uploader', 'manage', 'stats'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabIndex < tabKeys.length) {
              setActiveTab(tabKeys[tabIndex]);
              notification.info({ 
                message: '快捷键触发', 
                description: `已切换到${tabIndex === 0 ? '文档上传' : tabIndex === 1 ? '文档管理' : '统计信息'}标签`, 
                duration: 2 
              });
            }
          }
          break;
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, selectedRowKeys, handleRefresh]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled || !visible) return;
    
    const interval = setInterval(() => {
      // Only auto-refresh if no recent user action (within 30 seconds)
      if (Date.now() - lastActionTimestamp > 30000) {
        loadDocumentStats();
      }
    }, 60000); // Auto-refresh every minute
    
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, visible, lastActionTimestamp, loadDocumentStats]);

  // Handle upload success - optimized with useCallback  
  const handleUploadSuccess = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Handle upload error - optimized with useCallback
  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error);
  }, []);

  // 过滤文档列表
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // 文本搜索
    if (searchFilters.searchText) {
      const searchText = searchFilters.searchText.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.original_name.toLowerCase().includes(searchText) ||
        doc.file_name.toLowerCase().includes(searchText)
      );
    }

    // 文件类型过滤
    if (searchFilters.fileType !== 'all') {
      filtered = filtered.filter(doc => {
        const extension = doc.original_name.toLowerCase().substring(doc.original_name.lastIndexOf('.'));
        return extension === searchFilters.fileType;
      });
    }

    // 上传类型过滤
    if (searchFilters.uploadType !== 'all') {
      filtered = filtered.filter(doc => doc.upload_type === searchFilters.uploadType);
    }

    // MIME类型过滤
    if (searchFilters.selectedMimeTypes.length > 0) {
      filtered = filtered.filter(doc => searchFilters.selectedMimeTypes.includes(doc.mime_type));
    }

    // 文件大小过滤
    if (searchFilters.sizeRange) {
      const [minSize, maxSize] = searchFilters.sizeRange;
      filtered = filtered.filter(doc => doc.file_size >= minSize && doc.file_size <= maxSize);
    }

    // 日期范围过滤
    if (searchFilters.dateRange) {
      const [startDate, endDate] = searchFilters.dateRange;
      filtered = filtered.filter(doc => {
        const uploadDate = new Date(doc.uploaded_at);
        return uploadDate >= new Date(startDate) && uploadDate <= new Date(endDate);
      });
    }

    return filtered;
  }, [documents, searchFilters]);

  // 重置搜索过滤器 - optimized with useCallback
  const resetFilters = useCallback(() => {
    trackUserAction();
    setSearchFilters({
      searchText: '',
      fileType: 'all',
      uploadType: 'all',
      sizeRange: null,
      dateRange: null,
      selectedMimeTypes: [],
    });
    setSelectedRowKeys([]);
  }, [trackUserAction]);

  // 处理预览
  const handlePreview = async (doc: DocumentInfo) => {
    if (doc.mime_type === 'application/pdf') {
      // PDF 文件直接下载
      if (doc.file_path) {
        await taskDocumentService.downloadFile(doc.file_path, doc.original_name);
      }
      return;
    }

    setPreviewVisible(true);
    setPreviewTitle(doc.original_name);
    
    try {
      if (doc.content) {
        setPreviewContent(doc.content);
        return;
      }

      if (doc.id) {
        const content = await taskDocumentService.getDocumentContent(projectId, taskId, doc.id);
        setPreviewContent(content);
        
        // 缓存内容
        setDocuments(prev => 
          prev.map(d => d.id === doc.id ? { ...d, content } : d)
        );
      }
    } catch (error) {
      console.error('Preview failed:', error);
      setPreviewVisible(false);
    }
  };

  // 处理删除
  const handleDelete = async (doc: DocumentInfo) => {
    if (!doc.id) return;
    
    try {
      await taskDocumentService.deleteDocument(projectId, taskId, doc.id);
      loadDocumentStats(); // 重新加载
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // 处理版本历史
  const handleVersionHistory = (doc: DocumentInfo) => {
    if (!doc.id) return;
    setCurrentDocumentId(doc.id);
    setCurrentDocumentVersion(1); // Default version, will be updated from API
    setVersionHistoryVisible(true);
  };

  // 处理版本恢复
  const handleVersionRestore = (versionId: number) => {
    // 版本恢复后刷新文档列表
    loadDocumentStats();
    notification.success({
      message: '版本恢复成功',
      description: '文档已恢复到指定版本',
    });
  };

  // 处理版本删除
  const handleVersionDelete = (versionId: number) => {
    notification.success({
      message: '版本删除成功',
      description: '指定版本已删除',
    });
  };

  // 创建批量操作
  const createBatchOperation = (type: BatchOperation['type']): BatchOperation => {
    return {
      id: `batch_${type}_${Date.now()}`,
      type,
      status: 'pending',
      progress: 0,
      totalItems: selectedRowKeys.length,
      completedItems: 0,
      failedItems: 0,
      startTime: new Date(),
      canUndo: type === 'delete' || type === 'move'
    };
  };

  // 更新批量操作状态
  const updateBatchOperation = (
    operation: BatchOperation,
    updates: Partial<BatchOperation>
  ) => {
    const updatedOperation = { ...operation, ...updates };
    setCurrentBatchOperation(updatedOperation);
    
    setBatchOperationHistory(prev => ({
      ...prev,
      operations: prev.operations.map(op => 
        op.id === operation.id ? updatedOperation : op
      )
    }));

    return updatedOperation;
  };

  // 批量删除增强版
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    
    const operation = createBatchOperation('delete');
    setBatchOperationHistory(prev => ({
      ...prev,
      operations: [...prev.operations, operation]
    }));
    
    setCurrentBatchOperation(operation);
    setBatchProgressVisible(true);
    
    try {
      let updatedOp = updateBatchOperation(operation, { status: 'running' });
      
      const selectedDocuments = documents.filter(doc => selectedRowKeys.includes(doc.id!));
      
      // 使用 taskDocumentService 的批量操作功能
      const results = await taskDocumentService.batchOperation(
        selectedDocuments,
        async (doc) => {
          if (doc.id) {
            await taskDocumentService.deleteDocument(projectId, taskId, doc.id);
          }
        },
        {
          concurrency: 3,
          onProgress: (completed, total) => {
            const progress = Math.round((completed / total) * 100);
            updatedOp = updateBatchOperation(updatedOp, { 
              progress,
              completedItems: completed 
            });
          },
          stopOnError: false
        }
      );
      
      const failedCount = results.filter(r => !r.success).length;
      const completedCount = results.filter(r => r.success).length;
      
      updateBatchOperation(updatedOp, {
        status: failedCount > 0 ? 'failed' : 'completed',
        progress: 100,
        completedItems: completedCount,
        failedItems: failedCount,
        endTime: new Date(),
        error: failedCount > 0 ? `${failedCount} 个文档删除失败` : undefined
      });
      
      setSelectedRowKeys([]);
      loadDocumentStats();
      
      notification.success({
        message: '批量删除完成',
        description: `成功删除 ${completedCount} 个文档${failedCount > 0 ? `，${failedCount} 个失败` : ''}`,
        duration: 3
      });
      
    } catch (error) {
      console.error('Batch delete failed:', error);
      updateBatchOperation(operation, {
        status: 'failed',
        endTime: new Date(),
        error: error instanceof Error ? error.message : '批量删除失败'
      });
      
      notification.error({
        message: '批量删除失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 5
      });
    } finally {
      setTimeout(() => {
        setBatchProgressVisible(false);
        setCurrentBatchOperation(null);
      }, 2000);
    }
  };

  // 批量下载
  const handleBatchDownload = async () => {
    if (selectedRowKeys.length === 0) return;
    
    const operation = createBatchOperation('download');
    setBatchOperationHistory(prev => ({
      ...prev,
      operations: [...prev.operations, operation]
    }));
    
    setCurrentBatchOperation(operation);
    setBatchProgressVisible(true);
    
    try {
      let updatedOp = updateBatchOperation(operation, { status: 'running' });
      
      const selectedDocuments = documents.filter(doc => selectedRowKeys.includes(doc.id!));
      
      const results = await taskDocumentService.batchOperation(
        selectedDocuments,
        async (doc) => {
          if (doc.file_path) {
            await taskDocumentService.downloadFile(doc.file_path, doc.original_name);
          }
        },
        {
          concurrency: 2, // 下载并发数较少
          onProgress: (completed, total) => {
            const progress = Math.round((completed / total) * 100);
            updatedOp = updateBatchOperation(updatedOp, { 
              progress,
              completedItems: completed 
            });
          },
          stopOnError: false
        }
      );
      
      const failedCount = results.filter(r => !r.success).length;
      const completedCount = results.filter(r => r.success).length;
      
      updateBatchOperation(updatedOp, {
        status: failedCount > 0 ? 'failed' : 'completed',
        progress: 100,
        completedItems: completedCount,
        failedItems: failedCount,
        endTime: new Date(),
        error: failedCount > 0 ? `${failedCount} 个文档下载失败` : undefined
      });
      
      notification.success({
        message: '批量下载完成',
        description: `成功下载 ${completedCount} 个文档${failedCount > 0 ? `，${failedCount} 个失败` : ''}`,
        duration: 3
      });
      
    } catch (error) {
      console.error('Batch download failed:', error);
      updateBatchOperation(operation, {
        status: 'failed',
        endTime: new Date(),
        error: error instanceof Error ? error.message : '批量下载失败'
      });
      
      notification.error({
        message: '批量下载失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 5
      });
    } finally {
      setTimeout(() => {
        setBatchProgressVisible(false);
        setCurrentBatchOperation(null);
      }, 2000);
    }
  };

  // 智能选择功能
  const handleSmartSelection = (criteria: string) => {
    trackUserAction();
    let newSelection: React.Key[] = [];
    
    switch (criteria) {
      case 'all':
        newSelection = filteredDocuments.map(doc => doc.id!).filter(id => id !== undefined);
        break;
      case 'none':
        newSelection = [];
        break;
      case 'pdf':
        newSelection = filteredDocuments
          .filter(doc => doc.mime_type === 'application/pdf')
          .map(doc => doc.id!)
          .filter(id => id !== undefined);
        break;
      case 'markdown':
        newSelection = filteredDocuments
          .filter(doc => doc.mime_type === 'text/markdown')
          .map(doc => doc.id!)
          .filter(id => id !== undefined);
        break;
      case 'large':
        // 大于1MB的文件
        newSelection = filteredDocuments
          .filter(doc => doc.file_size > 1024 * 1024)
          .map(doc => doc.id!)
          .filter(id => id !== undefined);
        break;
      case 'recent':
        // 最近7天的文件
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        newSelection = filteredDocuments
          .filter(doc => new Date(doc.uploaded_at) > sevenDaysAgo)
          .map(doc => doc.id!)
          .filter(id => id !== undefined);
        break;
      default:
        break;
    }
    
    setSelectedRowKeys(newSelection);
  };

  // Tour configuration for new user guidance
  const tourSteps: TourProps['steps'] = [
    {
      title: '欢迎使用文档管理系统',
      description: '这里是任务文档管理的中心，让我们快速了解主要功能。',
      target: () => uploadTabRef.current,
    },
    {
      title: '文档上传',
      description: '在这个标签页可以上传文档文件，支持拖拽上传和多种文件格式。',
      target: () => uploadTabRef.current,
    },
    {
      title: '搜索功能',
      description: '使用搜索框快速找到需要的文档，支持文件名搜索和高级过滤。',
      target: () => searchRef.current,
    },
    {
      title: '文档列表',
      description: '查看、管理所有上传的文档，支持预览、下载、版本历史等操作。',
      target: () => tableRef.current,
    },
    {
      title: '统计信息',
      description: '查看文档统计信息和快捷操作，了解文档使用情况。',
      target: () => statsTabRef.current,
    },
    {
      title: '键盘快捷键',
      description: '按 Ctrl+Shift+H 查看所有键盘快捷键，提高操作效率。',
      target: null,
    }
  ];

  // Keyboard shortcuts modal content
  const renderKeyboardShortcuts = () => (
    <Modal
      title={
        <Space>
          <ControlOutlined />
          键盘快捷键
        </Space>
      }
      open={keyboardShortcutsVisible}
      onCancel={() => setKeyboardShortcutsVisible(false)}
      footer={[
        <Button key="close" onClick={() => setKeyboardShortcutsVisible(false)}>
          关闭
        </Button>
      ]}
      width={isMobile ? '95vw' : 600}
      style={isMobile ? { top: 20, paddingBottom: 0, margin: 'auto' } : undefined}
      styles={isMobile ? { body: { maxHeight: 'calc(100vh - 120px)', overflow: 'auto' } } : undefined}
      destroyOnHidden
      maskClosable={true}
    >
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="提示"
            description="快捷键在文档管理页面激活时有效，输入框聚焦时不会触发"
            type="info"
            showIcon
          />
          
          <div>
            <Title level={5}>基础操作</Title>
            <List
              
              dataSource={[
                { key: 'Ctrl+R', desc: '刷新文档列表' },
                { key: 'Ctrl+F', desc: '焦点移至搜索框' },
                { key: 'Esc', desc: '取消当前选择 / 关闭窗口' },
                { key: 'Ctrl+Shift+H', desc: '显示快捷键帮助' },
                { key: 'Ctrl+Shift+T', desc: '开始功能导览' }
              ]}
              renderItem={item => (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text code>{item.key}</Text>
                    <Text>{item.desc}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>

          <div>
            <Title level={5}>选择操作</Title>
            <List
              
              dataSource={[
                { key: 'Ctrl+Shift+A', desc: '全选所有文档' },
                { key: 'Ctrl+D', desc: '批量下载选中文档' }
              ]}
              renderItem={item => (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text code>{item.key}</Text>
                    <Text>{item.desc}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>

          <div>
            <Title level={5}>标签页切换</Title>
            <List
              
              dataSource={[
                { key: 'Ctrl+1', desc: '切换到文档上传标签' },
                { key: 'Ctrl+2', desc: '切换到文档管理标签' },
                { key: 'Ctrl+3', desc: '切换到统计信息标签' }
              ]}
              renderItem={item => (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text code>{item.key}</Text>
                    <Text>{item.desc}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        </Space>
      </div>
    </Modal>
  );

  // Render statistics - memoized for performance
  const renderStats = useCallback(() => {
    if (loading && !documentStats) {
      return (
        <Card  className="mb-4">
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      );
    }
    
    if (!documentStats) return null;

    return (
      <Card  className="mb-4">
        <Title level={5}>
          <InfoCircleOutlined className="mr-2" />
          文档统计
        </Title>
        <Space direction="vertical" >
          <Text>
            <strong>总文档数:</strong> {documentStats.totalDocuments} 个
          </Text>
          <Text>
            <strong>总大小:</strong> {taskDocumentService.formatFileSize(documentStats.totalSize)}
          </Text>
          <Text>
            <strong>上传方式:</strong> 
            手工 {documentStats.uploadTypes.manual} 个，
            API {documentStats.uploadTypes.api} 个
          </Text>
          {Object.keys(documentStats.mimeTypes).length > 0 && (
            <Text>
              <strong>文件类型:</strong>{' '}
              {Object.entries(documentStats.mimeTypes).map(([type, count]) => (
                <span key={type}>
                  {type.split('/')[1]} ({count}) 
                </span>
              )).reduce((prev, curr, index) => 
                index === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[]
              )}
            </Text>
          )}
        </Space>
      </Card>
    );
  }, [documentStats, loading]);

  // Render quick actions
  const renderQuickActions = () => (
    <Card  className="mb-4">
      <Title level={5}>
        <CloudUploadOutlined className="mr-2" />
        快捷操作
      </Title>
      <Space wrap>
        <Tooltip title="刷新文档列表">
          <Button
            icon={<SyncOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Tooltip>
        <Tooltip title={autoRefreshEnabled ? '关闭自动刷新' : '开启自动刷新 (每分钟)'}>
          <Button
            icon={<SyncOutlined />}
            type={autoRefreshEnabled ? 'primary' : 'default'}
            onClick={() => {
              setAutoRefreshEnabled(!autoRefreshEnabled);
              notification.info({
                message: '自动刷新',
                description: autoRefreshEnabled ? '已关闭自动刷新' : '已开启自动刷新，将每分钟自动刷新文档列表',
                duration: 3
              });
            }}
          >
            {autoRefreshEnabled ? '自动刷新中' : '自动刷新'}
          </Button>
        </Tooltip>
        <Tooltip title="查看键盘快捷键">
          <Button
            icon={<ControlOutlined />}
            onClick={() => setKeyboardShortcutsVisible(true)}
          >
            快捷键
          </Button>
        </Tooltip>
        <Tooltip title="功能导览">
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => setTourOpen(true)}
          >
            使用指南
          </Button>
        </Tooltip>
        <Divider type="vertical" />
        <Tooltip title="下载任务文档的Markdown格式">
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              trackUserAction();
              try {
                const blob = await taskDocumentService.downloadTaskMarkdown(projectId, taskId);
                const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.md`;
                taskDocumentService.triggerDownload(blob, fileName);
                notification.success({
                  message: '导出成功',
                  description: 'Markdown 文档已开始下载',
                  duration: 3
                });
              } catch (error) {
                console.error('Download failed:', error);
                notification.error({
                  message: '导出失败',
                  description: '请稍后重试或联系管理员',
                  duration: 5
                });
              }
            }}
          >
            导出 MD
          </Button>
        </Tooltip>
        <Tooltip title="下载任务文档的PDF格式">
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              trackUserAction();
              try {
                const blob = await taskDocumentService.downloadTaskPDF(projectId, taskId);
                const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.pdf`;
                taskDocumentService.triggerDownload(blob, fileName);
                notification.success({
                  message: '导出成功',
                  description: 'PDF 文档已开始下载',
                  duration: 3
                });
              } catch (error) {
                console.error('Download failed:', error);
                notification.error({
                  message: '导出失败',
                  description: '请稍后重试或联系管理员',
                  duration: 5
                });
              }
            }}
          >
            导出 PDF
          </Button>
        </Tooltip>
      </Space>
    </Card>
  );

  // Render help info
  const renderHelpInfo = () => (
    <Alert
      message="文档管理功能说明"
      description={
        <div>
          <p><strong>手工上传:</strong> 支持拖拽或点击上传，支持 .md, .pdf, .txt 格式，单文件最大 10MB</p>
          <p><strong>API上传:</strong> 通过接口方式上传文本内容，适合程序化操作</p>
          <p><strong>文档导出:</strong> 将任务文档和附件整合导出为 Markdown 或 PDF 格式</p>
          <p><strong>版本管理:</strong> 自动记录文档版本，支持历史版本查看</p>
        </div>
      }
      type="info"
      showIcon
      className="mb-4"
    />
  );

  // 渲染搜索和过滤界面
  const renderSearchAndFilters = () => (
    <Card  className="mb-4">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 基础搜索 */}
        <div>
          <Space wrap>
            <Search
              ref={searchRef}
              placeholder="搜索文档名称... (Ctrl+F)"
              value={searchFilters.searchText}
              onChange={(e) => {
                trackUserAction();
                setSearchFilters(prev => ({ ...prev, searchText: e.target.value }));
              }}
              style={{ width: 300 }}
              allowClear
            />
            
            <Select
              value={searchFilters.fileType}
              onChange={(value) => setSearchFilters(prev => ({ ...prev, fileType: value }))}
              style={{ width: 120 }}
            >
              <Option value="all">所有类型</Option>
              <Option value=".md">Markdown</Option>
              <Option value=".pdf">PDF</Option>
              <Option value=".txt">文本</Option>
            </Select>
            
            <Select
              value={searchFilters.uploadType}
              onChange={(value) => setSearchFilters(prev => ({ ...prev, uploadType: value }))}
              style={{ width: 120 }}
            >
              <Option value="all">所有上传</Option>
              <Option value="manual">手工上传</Option>
              <Option value="api">API上传</Option>
            </Select>
            
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              type={showAdvancedFilters ? 'primary' : 'default'}
            >
              高级过滤
            </Button>
            
            <Button
              icon={<ClearOutlined />}
              onClick={resetFilters}
            >
              清除过滤
            </Button>
          </Space>
        </div>

        {/* 高级过滤器 */}
        {showAdvancedFilters && (
          <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>MIME 类型:</Text>
                <div style={{ marginTop: 8 }}>
                  <Checkbox.Group
                    value={searchFilters.selectedMimeTypes}
                    onChange={(values) => setSearchFilters(prev => ({ 
                      ...prev, 
                      selectedMimeTypes: values as string[] 
                    }))}
                  >
                    <Space wrap>
                      <Checkbox value="text/markdown">Markdown</Checkbox>
                      <Checkbox value="application/pdf">PDF</Checkbox>
                      <Checkbox value="text/plain">纯文本</Checkbox>
                    </Space>
                  </Checkbox.Group>
                </div>
              </div>

              <div>
                <Text strong>上传日期范围:</Text>
                <div style={{ marginTop: 8 }}>
                  <RangePicker
                    onChange={(dates, dateStrings) => {
                      setSearchFilters(prev => ({ 
                        ...prev, 
                        dateRange: dates ? [dateStrings[0], dateStrings[1]] : null 
                      }));
                    }}
                    style={{ width: 300 }}
                  />
                </div>
              </div>
            </Space>
          </div>
        )}

        {/* 搜索结果统计和批量操作 */}
        <div>
          <Space wrap>
            <Text type="secondary">
              显示 {filteredDocuments.length} / {documents.length} 个文档
            </Text>
            
            {/* 智能选择菜单 */}
            <Dropdown
              menu={{
                items: [
                  { key: 'all', label: '全选', icon: <CheckOutlined /> },
                  { key: 'none', label: '取消选择', icon: <CloseOutlined /> },
                  { type: 'divider' },
                  { key: 'pdf', label: '选择 PDF 文档', icon: <FileTextOutlined /> },
                  { key: 'markdown', label: '选择 Markdown 文档', icon: <FileTextOutlined /> },
                  { key: 'large', label: '选择大文件 (>1MB)', icon: <FileTextOutlined /> },
                  { key: 'recent', label: '选择最近文档 (7天)', icon: <FileTextOutlined /> },
                ],
                onClick: ({ key }) => handleSmartSelection(key)
              }}
              trigger={['click']}
            >
              <Button icon={<SelectOutlined />} >
                智能选择
              </Button>
            </Dropdown>

            {selectedRowKeys.length > 0 && (
              <>
                <Divider type="vertical" />
                <Text type="secondary">
                  已选择 {selectedRowKeys.length} 个文档
                </Text>
                
                {/* 批量操作菜单 */}
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'download',
                        label: '批量下载',
                        icon: <DownloadOutlined />,
                        onClick: handleBatchDownload
                      },
                      { type: 'divider' },
                      {
                        key: 'delete',
                        label: '批量删除',
                        icon: <DeleteOutlined />,
                        danger: true
                      }
                    ],
                    onClick: ({ key }) => {
                      if (key === 'delete') {
                        Modal.confirm({
                          title: '确认批量删除',
                          content: `您确定要删除选中的 ${selectedRowKeys.length} 个文档吗？这个操作不可撤销。`,
                          okText: '确认删除',
                          okType: 'danger',
                          cancelText: '取消',
                          onOk: () => {
                            // 延迟显示进度弹窗，确保确认弹窗完全关闭
                            setTimeout(() => {
                              handleBatchDelete();
                            }, 200);
                          },
                        });
                      }
                    }
                  }}
                  trigger={['click']}
                >
                  <Button type="primary"  icon={<MoreOutlined />}>
                    批量操作
                  </Button>
                </Dropdown>
              </>
            )}

            {/* 批量操作历史 */}
            {batchOperationHistory.operations.length > 0 && (
              <Dropdown
                menu={{
                  items: batchOperationHistory.operations.slice(-5).map(op => ({
                    key: op.id,
                    label: (
                      <Space>
                        <span>{op.type === 'delete' ? '删除' : op.type === 'download' ? '下载' : op.type}</span>
                        <span>{op.totalItems}个文档</span>
                        <Tag color={
                          op.status === 'completed' ? 'green' : 
                          op.status === 'failed' ? 'red' : 
                          op.status === 'running' ? 'blue' : 'default'
                        }>
                          {op.status === 'completed' ? '完成' : 
                           op.status === 'failed' ? '失败' : 
                           op.status === 'running' ? '运行中' : '等待'}
                        </Tag>
                      </Space>
                    ),
                    disabled: true
                  }))
                }}
                trigger={['click']}
              >
                <Button  icon={<HistoryOutlined />}>
                  操作历史
                </Button>
              </Dropdown>
            )}
          </Space>
        </div>
      </Space>
    </Card>
  );

  // 渲染文档表格
  const renderDocumentTable = () => {
    const columns = [
      {
        title: '文档名称',
        dataIndex: 'original_name',
        key: 'original_name',
        ellipsis: true,
        render: (text: string, record: DocumentInfo) => (
          <Space>
            {record.mime_type === 'text/markdown' && <FileTextOutlined style={{ color: '#1890ff' }} />}
            {record.mime_type === 'application/pdf' && <FileTextOutlined style={{ color: '#ff4d4f' }} />}
            {record.mime_type === 'text/plain' && <FileTextOutlined style={{ color: '#52c41a' }} />}
            <Text strong>{text}</Text>
          </Space>
        ),
      },
      {
        title: '大小',
        dataIndex: 'file_size',
        key: 'file_size',
        width: 100,
        render: (size: number) => taskDocumentService.formatFileSize(size),
        sorter: (a: DocumentInfo, b: DocumentInfo) => a.file_size - b.file_size,
      },
      {
        title: '类型',
        dataIndex: 'upload_type',
        key: 'upload_type',
        width: 100,
        render: (type: string) => (
          <Tag color={type === 'manual' ? 'blue' : 'green'}>
            {type === 'manual' ? '手工' : 'API'}
          </Tag>
        ),
      },
      {
        title: '上传时间',
        dataIndex: 'uploaded_at',
        key: 'uploaded_at',
        width: 160,
        render: (date: string) => new Date(date).toLocaleString(),
        sorter: (a: DocumentInfo, b: DocumentInfo) => 
          new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime(),
      },
      {
        title: '操作',
        key: 'actions',
        width: 180,
        render: (_, record: DocumentInfo) => (
          <Space >
            <Tooltip title="预览">
              <Button
                type="text"
                
                icon={<EyeOutlined />}
                onClick={() => handlePreview(record)}
                disabled={record.mime_type === 'application/pdf'}
                aria-label={`预览文档 ${record.original_name}`}
              />
            </Tooltip>
            <Tooltip title="下载">
              <Button
                type="text"
                
                icon={<DownloadOutlined />}
                onClick={() => {
                  if (record.file_path) {
                    taskDocumentService.downloadFile(record.file_path, record.original_name);
                  }
                }}
                aria-label={`下载文档 ${record.original_name}`}
              />
            </Tooltip>
            <Tooltip title="版本历史">
              <Button
                type="text"
                
                icon={<HistoryOutlined />}
                onClick={() => handleVersionHistory(record)}
                disabled={!record.id}
                aria-label={`查看文档 ${record.original_name} 的版本历史`}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Popconfirm
                title="确认删除文档"
                description={`您确定要删除文档 "${record.original_name}" 吗？这个操作不可撤销。`}
                onConfirm={() => handleDelete(record)}
                okText="确认删除"
                cancelText="取消"
                okType="danger"
                placement="topRight"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`删除文档 ${record.original_name}`}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        ),
      },
    ];

    const rowSelection = {
      selectedRowKeys,
      onChange: setSelectedRowKeys,
      getCheckboxProps: (record: DocumentInfo) => ({
        disabled: !record.id,
      }),
    };

    return (
      <div ref={tableRef}>
        <Table
          columns={columns}
          dataSource={filteredDocuments}
          rowKey="id"
          rowSelection={{
            ...rowSelection,
            onChange: (selectedKeys) => {
              trackUserAction();
              setSelectedRowKeys(selectedKeys);
            }
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} 条`,
            onChange: (page, pageSize) => {
              trackUserAction();
            },
            onShowSizeChange: (current, size) => {
              trackUserAction();
            }
          }}
          loading={loading}
          
          scroll={{ x: 800 }}
          onChange={(pagination, filters, sorter) => {
            trackUserAction();
          }}
        />
      </div>
    );
  };

  // Tab items
  const tabItems = [
    {
      key: 'uploader',
      label: (
        <span ref={uploadTabRef}>
          <CloudUploadOutlined />
          文档上传
        </span>
      ),
      children: (
        <TaskDocumentUploader
          projectId={projectId}
          taskId={taskId}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      )
    },
    {
      key: 'manage',
      label: (
        <span>
          <FileTextOutlined />
          文档管理
        </span>
      ),
      children: (
        <Spin spinning={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {error ? (
              <Result
                status="error"
                title="加载失败"
                subTitle={error}
                extra={
                  <Button type="primary" onClick={loadDocumentStats}>
                    重试
                  </Button>
                }
              />
            ) : (
              <>
                {renderSearchAndFilters()}
                {filteredDocuments.length > 0 ? (
                  renderDocumentTable()
                ) : (
                  <Empty 
                    description={loading ? "正在加载..." : "暂无文档数据"} 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </>
            )}
          </Space>
        </Spin>
      )
    },
    {
      key: 'stats',
      label: (
        <span ref={statsTabRef}>
          <InfoCircleOutlined />
          统计信息
        </span>
      ),
      children: (
        <Spin spinning={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {renderStats()}
            {renderQuickActions()}
            {renderHelpInfo()}
          </Space>
        </Spin>
      )
    }
  ];

  // Render content
  const renderContent = () => (
    <div className="task-document-manager">
      <div className="mb-4">
        <Title level={3}>
          <FileTextOutlined className="mr-2" />
          任务文档管理 (任务 #{taskId})
        </Title>
        <Text type="secondary">
          管理任务相关的文档，支持手工上传、API上传和批量导出功能
        </Text>
      </div>

      <Divider />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          trackUserAction();
          setActiveTab(key);
        }}
        items={tabItems}
        size="large"
      />
    </div>
  );

  // Handle modal close - ensure all nested modals are closed
  const handleModalClose = useCallback(() => {
    // Close all nested modals first
    setPreviewVisible(false);
    setBatchProgressVisible(false);
    setVersionHistoryVisible(false);
    setKeyboardShortcutsVisible(false);
    setTourOpen(false);
    
    // Clear selections and reset states
    setSelectedRowKeys([]);
    setError(null);
    setActiveTab('uploader'); // Reset to default tab
    
    // Force DOM cleanup after state updates
    setTimeout(() => {
      // Remove any lingering modal masks and wrappers
      const masks = document.querySelectorAll('.ant-modal-mask, .ant-modal-wrap');
      masks.forEach(mask => {
        if (mask && mask.parentNode) {
          mask.parentNode.removeChild(mask);
        }
      });
      
      // Reset body style that might be modified by modals
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, 100);
    
    // Call the parent onClose callback
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Render based on mode
  if (mode === 'modal') {
    return (
      <Modal
        title={
          <div 
            onDoubleClick={handleModalClose}
            style={{ cursor: 'pointer' }}
            title="双击标题栏快速关闭窗口"
          >
            任务 #{taskId} - 文档管理
          </div>
        }
        open={visible}
        onCancel={handleModalClose}
        footer={[
          <Button key="close" onClick={handleModalClose} type="primary">
            关闭
          </Button>,
          <Button key="force-close" onClick={() => {
            // Force close all modals and reset all states
            setPreviewVisible(false);
            setBatchProgressVisible(false);
            setVersionHistoryVisible(false);
            setKeyboardShortcutsVisible(false);
            setTourOpen(false);
            setSelectedRowKeys([]);
            setError(null);
            setActiveTab('uploader');
            
            // Immediate DOM cleanup
            const masks = document.querySelectorAll('.ant-modal-mask, .ant-modal-wrap');
            masks.forEach(mask => {
              if (mask && mask.parentNode) {
                mask.parentNode.removeChild(mask);
              }
            });
            
            // Reset body styles
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // Call parent close with a slight delay to ensure cleanup
            setTimeout(() => {
              onClose && onClose();
            }, 50);
          }} danger type="text"  title="如果正常关闭失败，使用此按钮强制清理所有状态和DOM元素">
            强制关闭
          </Button>
        ]}
        width={isMobile ? '95vw' : 900}
        style={isMobile ? {
          top: 20,
          paddingBottom: 0,
          margin: 'auto'
        } : undefined}
        styles={isMobile ? {
          body: {
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'auto'
          }
        } : undefined}
        destroyOnHidden
        closable={true}
        maskClosable={true}
      >
        {renderContent()}
      </Modal>
    );
  }

  // Embedded mode
  return (
    <>
      {renderContent()}
      
      {/* Document Preview Modal */}
      <Modal
        title={`预览文档: ${previewTitle}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button
            key="expand"
            icon={previewExpanded ? <ShrinkOutlined /> : <ExpandOutlined />}
            onClick={() => setPreviewExpanded(!previewExpanded)}
          >
            {previewExpanded ? '收起' : '展开'}
          </Button>,
          <Popconfirm
            key="delete"
            title="确定删除该文档吗？"
            description="删除后无法恢复，请确认操作"
            onConfirm={async () => {
              const docToDelete = documents.find(d => d.original_name === previewTitle);
              if (docToDelete) {
                await handleDelete(docToDelete);
                setPreviewVisible(false);
                notification.success({
                  message: '删除成功',
                  description: `文档 "${previewTitle}" 已删除`
                });
              }
            }}
            okText="删除"
            cancelText="取消"
            okType="danger"
          >
            <Button key="delete" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={previewExpanded ? '95vw' : (isMobile ? '95vw' : 800)}
        style={previewExpanded ? {
          top: 10,
          paddingBottom: 0,
          margin: 'auto',
          maxWidth: '100vw'
        } : (isMobile ? {
          top: 20,
          paddingBottom: 0,
          margin: 'auto'
        } : undefined)}
        styles={previewExpanded ? {
          body: {
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'auto',
            padding: '16px'
          }
        } : (isMobile ? {
          body: {
            maxHeight: 'calc(100vh - 150px)',
            overflow: 'auto',
            padding: '12px'
          }
        } : undefined)}
        className="document-preview-modal"
        destroyOnHidden
        maskClosable={true}
      >
        <div className="document-preview-content">
          {previewContent.includes('```') || previewContent.includes('#') ? (
            // Markdown 格式预览
            <div style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '16px', 
              borderRadius: '4px', 
              border: '1px solid #d9d9d9'
            }}>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '14px',
                  maxHeight: previewExpanded ? 'calc(100vh - 250px)' : '500px',
                  overflow: 'auto',
                  margin: 0
                }}
              >
                {previewContent}
              </pre>
            </div>
          ) : (
            // 纯文本预览
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '16px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '4px' 
            }}>
              <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {previewContent}
              </Text>
            </div>
          )}
          
          {/* 预览统计信息 */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Space split={<Divider type="vertical" />}>
<Text type="secondary">
                字符数: {previewContent.length}
              </Text>
<Text type="secondary">
                行数: {previewContent.split('\n').length}
              </Text>
              <Text type="secondary">
                字数: {previewContent.replace(/\s+/g, '').length}
              </Text>
            </Space>
          </div>
        </div>
      </Modal>

      {/* Batch Operation Progress Modal */}
      <Modal
        title="批量操作进度"
        open={batchProgressVisible}
        footer={null}
        closable={false}
        width={isMobile ? '90vw' : 500}
        centered={!isMobile}
        style={isMobile ? {
          top: 50,
          paddingBottom: 0
        } : undefined}
        styles={isMobile ? {
          body: {
            padding: '16px 12px'
          }
        } : undefined}
        destroyOnHidden
      >
        {currentBatchOperation && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text strong>
                {currentBatchOperation.type === 'delete' ? '批量删除' : 
                 currentBatchOperation.type === 'download' ? '批量下载' : 
                 '批量操作'} ({currentBatchOperation.totalItems} 个文档)
              </Text>
            </div>
            
            <Progress
              percent={currentBatchOperation.progress}
              status={currentBatchOperation.status === 'failed' ? 'exception' : 'active'}
              strokeColor={
                currentBatchOperation.status === 'completed' ? '#52c41a' :
                currentBatchOperation.status === 'failed' ? '#ff4d4f' :
                '#1890ff'
              }
            />
            
            <Space split={<Divider type="vertical" />}>
              <Text type="secondary">
                已完成: {currentBatchOperation.completedItems}
              </Text>
              {currentBatchOperation.failedItems > 0 && (
                <Text type="danger">
                  失败: {currentBatchOperation.failedItems}
                </Text>
              )}
              <Text type="secondary">
                总计: {currentBatchOperation.totalItems}
              </Text>
            </Space>
            
            {currentBatchOperation.status === 'completed' && (
              <Alert
                message="操作完成"
                description={`成功处理 ${currentBatchOperation.completedItems} 个文档${
                  currentBatchOperation.failedItems > 0 ? 
                  `，${currentBatchOperation.failedItems} 个失败` : ''
                }`}
                type="success"
                showIcon
              />
            )}
            
            {currentBatchOperation.status === 'failed' && currentBatchOperation.error && (
              <Alert
                message="操作失败"
                description={currentBatchOperation.error}
                type="error"
                showIcon
              />
            )}
          </Space>
        )}
      </Modal>

      {/* Document Version History Modal */}
      <DocumentVersionHistory
        visible={versionHistoryVisible}
        documentId={currentDocumentId}
        projectId={projectId}
        taskId={taskId}
        currentVersion={currentDocumentVersion}
        onClose={() => setVersionHistoryVisible(false)}
        onVersionRestore={handleVersionRestore}
        onVersionDelete={handleVersionDelete}
      />

      {/* Enhanced UI Components */}
      {renderKeyboardShortcuts()}
      
      {/* Tour Guide */}
      <Tour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        steps={tourSteps}
        type="primary"
      />

      {/* Float Button Group for Quick Access */}
      <FloatButton.Group
        trigger="hover"
        type="primary"
        style={{ right: 24 }}
        icon={<RocketOutlined />}
      >
        <FloatButton 
          icon={<QuestionCircleOutlined />} 
          tooltip="使用指南"
          onClick={() => setTourOpen(true)}
        />
        <FloatButton 
          icon={<ControlOutlined />} 
          tooltip="快捷键"
          onClick={() => setKeyboardShortcutsVisible(true)}
        />
        <FloatButton 
          icon={<SyncOutlined />} 
          tooltip="刷新"
          onClick={handleRefresh}
        />
        {selectedRowKeys.length > 0 && (
          <FloatButton 
            icon={<DownloadOutlined />} 
            tooltip={`批量下载 (${selectedRowKeys.length})`}
            onClick={handleBatchDownload}
          />
        )}
      </FloatButton.Group>
    </>
  );
};

export default TaskDocumentManager;