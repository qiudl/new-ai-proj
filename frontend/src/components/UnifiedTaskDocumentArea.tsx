import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Card,
  Row,
  Col,
  Tabs,
  Button,
  Space,
  Typography,
  Divider,
  Badge,
  Tooltip,
  Dropdown,
  Menu,
  Upload,
  Progress,
  List,
  Empty,
  Tag,
  Alert,
  Spin,
  Modal,
  Input,
  message,
  Descriptions,
  Popconfirm
} from 'antd';
import type { MenuProps, TabsProps } from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  EyeOutlined,
  SettingOutlined,
  BarChartOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  SyncOutlined,
  PlusOutlined,
  MoreOutlined,
  FolderOutlined,
  DeleteOutlined,
  CopyOutlined,
  ShareAltOutlined,
  HistoryOutlined,
  LinkOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined,
  LeftOutlined,
  RightOutlined,
  RobotOutlined
} from '@ant-design/icons';

// 懒加载组件以减少初始渲染负担
const TaskDocumentEditor = lazy(() => import('./TaskDocumentEditor'));
const TaskDocumentManager = lazy(() => import('./TaskDocumentManager'));
const TaskDocumentVersionHistoryButton = lazy(() => import('./TaskDocumentVersionHistoryButton'));
const TaskMarkdownEditor = lazy(() => import('./TaskMarkdownEditor'));
const CreateAIDocDialog = lazy(() => import('./CreateAIDocDialog'));
import { documentService } from '../services/unifiedDocumentService';
import { Document } from '../types/document';
import { TaskService } from '../services/taskService';
import api from '../services/api';
import { apiCache } from '../utils/apiCacheManager';
import { documentCacheService } from '../services/documentCacheService';

// 导入快捷键Hook
import { useKeyboardShortcuts, createDocumentShortcuts } from '../hooks/useKeyboardShortcuts';

// 导入拖拽Hook
import { useDragAndDrop } from '../hooks/useDragAndDrop';

// 导入样式
import '../styles/UnifiedTaskDocumentArea.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 视图模式类型
export type ViewMode = 'edit' | 'preview' | 'manage' | 'stats';

// 文档类型定义
export interface DocumentItem extends Omit<Document, 'type'> {
  loading?: boolean;
  selected?: boolean;
  sourceTaskId?: number;
  file_path?: string; // 添加文件路径字段
  type: 'markdown' | 'txt' | 'pdf' | 'image' | 'file'; // 扩展类型定义
}

// 组件属性接口
export interface UnifiedTaskDocumentAreaProps {
  projectId: number;
  taskId: number;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  defaultViewMode?: ViewMode;
  showToolbar?: boolean;
  showDocumentList?: boolean;
  compactMode?: boolean;
  headerVisible?: boolean; // 是否显示头部标题与统计徽章
  includeSubtaskDocuments?: boolean; // 是否包含子任务的文档
  onDocumentChange?: (documents: DocumentItem[]) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onSaveDocument?: () => Promise<void>; // 保存文档回调
}

// 文档列表项组件 - 使用memo优化性能
const DocumentListItem: React.FC<{
  document: DocumentItem;
  selected?: boolean;
  onSelect?: (doc: DocumentItem) => void;
  onEdit?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
  onDownload?: (doc: DocumentItem) => void;
  onView?: (doc: DocumentItem) => void;
  draggableProps?: any;
  isDragOver?: boolean;
  isDraggedItem?: boolean;
  currentTaskId?: number;
}> = memo(({ document, selected, onSelect, onEdit, onDelete, onDownload, onView, draggableProps, isDragOver, isDraggedItem, currentTaskId }) => {
  
  // 右键菜单
  const contextMenuItems: MenuProps['items'] = [
    // 根据文档类型显示不同的操作
    ...(document.type === 'image' || document.type === 'pdf' || document.type === 'file' ? [
      {
        key: 'view',
        label: document.type === 'image' ? '查看图片' : document.type === 'pdf' ? '查看PDF' : '打开文件',
        icon: <EyeOutlined />,
        onClick: () => onView?.(document)
      }
    ] : []),
    ...(document.type !== 'image' && document.type !== 'file' ? [
      {
        key: 'edit',
        label: '编辑文档',
        icon: <EditOutlined />,
        onClick: () => onEdit?.(document)
      }
    ] : []),
    {
      key: 'copy',
      label: '复制链接',
      icon: <CopyOutlined />,
      onClick: () => {
        navigator.clipboard.writeText(`/projects/${document.project_id}/tasks/${document.task_id}/documents/${document.id}`);
        message.success('文档链接已复制');
      }
    },
    {
      key: 'download',
      label: '下载文档',
      icon: <DownloadOutlined />,
      onClick: () => onDownload?.(document)
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '删除文档',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete?.(document)
    }
  ];

  // 获取文档类型图标
  const getDocumentIcon = () => {
    switch (document.type) {
      case 'markdown': return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'pdf': return <FileTextOutlined style={{ color: '#ff4d4f' }} />;
      case 'txt': return <FileTextOutlined style={{ color: '#52c41a' }} />;
      case 'image': return <EyeOutlined style={{ color: '#722ed1' }} />;
      case 'file': return <FolderOutlined style={{ color: '#fa8c16' }} />;
      default: return <FileTextOutlined />;
    }
  };

  return (
    <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
      <List.Item
        {...draggableProps}
        className={`document-list-item ${selected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
        style={{
          padding: '12px 16px',
          cursor: draggableProps?.draggable ? 'move' : 'pointer',
          backgroundColor: selected ? '#e6f7ff' : isDragOver ? '#f0f9ff' : 'transparent',
          borderLeft: selected ? '3px solid #1890ff' : isDragOver ? '3px solid #52c41a' : '3px solid transparent',
          transition: 'all 0.3s ease',
          opacity: isDraggedItem ? 0.5 : 1,
          transform: isDragOver ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isDragOver ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
        }}
        onClick={() => onSelect?.(document)}
        actions={[
          // 根据文档类型显示不同的操作按钮
          ...(document.type === 'image' || document.type === 'pdf' || document.type === 'file' ? [
            <Tooltip title={document.type === 'image' ? '查看图片' : document.type === 'pdf' ? '查看PDF' : '打开文件'}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(document);
                }}
              />
            </Tooltip>
          ] : []),
          <Tooltip title="版本历史">
            <TaskDocumentVersionHistoryButton
              projectId={document.project_id}
              taskId={document.task_id}
              selectedDocument={document}
              size="small"
              type="text"
              style={{ padding: 0, width: '24px', height: '24px' }}
              onVersionUpdate={() => {/* 处理版本更新 */}}
            />
          </Tooltip>,
          <Tooltip title="下载">
            <Button
              type="text"
              icon={<DownloadOutlined />}

              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(document);
              }}
            />
          </Tooltip>,
          <Popconfirm
            title="确认删除文档"
            description={`确定要删除文档"${document.title}"吗？删除后无法恢复。`}
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete?.(document);
            }}
            okText="删除"
            cancelText="取消"
            okType="danger"
            placement="topRight"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}

                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            </Tooltip>
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          avatar={getDocumentIcon()}
          title={
            <Space>
              <Text strong>{document.title}</Text>
              <Tag>{document.type.toUpperCase()}</Tag>
              {document.is_template && <Tag color="purple">模板</Tag>}
              {document.sourceTaskId && currentTaskId && document.sourceTaskId !== currentTaskId && (
                <Tag color="geekblue">子任务 #{document.sourceTaskId}</Tag>
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              {document.description && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {document.description}
                </Text>
              )}
              <Space size={8}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {Math.round(document.file_size / 1024)}KB
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  v{document.version}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {new Date(document.updated_at).toLocaleDateString()} {new Date(document.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </Space>
            </Space>
          }
        />
      </List.Item>
    </Dropdown>
  );
});

// 主组件 - 使用React.memo优化重渲染
const UnifiedTaskDocumentArea: React.FC<UnifiedTaskDocumentAreaProps> = React.memo(({
  projectId,
  taskId,
  height = 'auto',
  className = '',
  style = {},
  defaultViewMode = 'edit',
  showToolbar = true,
  showDocumentList = true,
  compactMode = false,
  headerVisible = true,
  includeSubtaskDocuments = false,
  onDocumentChange,
  onViewModeChange,
  onSaveDocument
}) => {
  // 状态管理
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);
  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
  const [newDocumentModalVisible, setNewDocumentModalVisible] = useState(false);
  const [newDocumentForm, setNewDocumentForm] = useState({ title: '', type: 'markdown', description: '' });
  const [documentListView, setDocumentListView] = useState<'grouped' | 'list' | 'timeline' | 'grid'>('grouped');
  const [documentSortBy, setDocumentSortBy] = useState<'created_at' | 'updated_at'>('updated_at'); // 默认按更新时间排序
  const [documentSortOrder, setDocumentSortOrder] = useState<'asc' | 'desc'>('desc');
  const [aiDocDialogVisible, setAiDocDialogVisible] = useState(false); // AI文档创建对话框

  // ⚡ Performance: 延迟渲染重量级组件
  const [isHeavyComponentsReady, setIsHeavyComponentsReady] = useState(false);

  // 编辑内容和标题状态
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // 信息面板展开/收起状态
  const [isInfoPanelExpanded, setIsInfoPanelExpanded] = useState(() => {
    const saved = localStorage.getItem('taskDocPreview_infoPanelExpanded');
    return saved === 'true';
  });

  // 防抖计时器引用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 切换视图模式
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  // 本地控制"是否包含下级"开关，默认取props
  const [includeDescendants, setIncludeDescendants] = useState<boolean>(includeSubtaskDocuments);
  useEffect(() => {
    setIncludeDescendants(includeSubtaskDocuments);
  }, [includeSubtaskDocuments]);

  // 当选中文档变化时，自动初始化编辑内容和标题
  useEffect(() => {
    if (selectedDocument) {
      setEditContent(selectedDocument.content);
      setEditTitle(selectedDocument.title);
    }
  }, [selectedDocument]);

  // 保存信息面板状态到localStorage
  useEffect(() => {
    localStorage.setItem('taskDocPreview_infoPanelExpanded', String(isInfoPanelExpanded));
  }, [isInfoPanelExpanded]);

  // 快速过滤：全部 / 仅本任务 / 仅子任务
  const [filterMode, setFilterMode] = useState<'all' | 'root' | 'desc'>('all');

  // 防止重复加载的引用
  const loadingRef = useRef(false);

  // 文档缓存 - 简单的Map缓存
  const documentCache = useRef(new Map<string, DocumentItem[]>());
  const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  // 跟踪上一次的taskId，用于检测任务切换
  const previousTaskIdRef = useRef<number | null>(null);

  // 加载文档列表 - 高度优化版本，支持渐进式加载
  const loadDocuments = useCallback(async (force = false) => {
    // 检测任务切换或首次加载，如果taskId变化了，强制刷新
    const isFirstLoad = previousTaskIdRef.current === null;
    const taskChanged = previousTaskIdRef.current !== taskId;

    if (isFirstLoad || taskChanged) {
      console.log('🔄 [RELOAD] 强制刷新缓存', {
        reason: isFirstLoad ? '首次加载' : '任务切换',
        previous: previousTaskIdRef.current,
        current: taskId
      });
      force = true;
    }
    previousTaskIdRef.current = taskId;
    console.log(`🔍 [LOAD-DOCS] Starting loadDocuments - projectId: ${projectId}, taskId: ${taskId}, force: ${force}, loading: ${loadingRef.current}`);

    // 防止重复加载
    if (loadingRef.current && !force) {
      console.log('⏸️ [LOAD-DOCS] Documents already loading, skipping...');
      return;
    }

    // P2优化：使用多层缓存服务（L1内存 + L2 IndexedDB）
    const cached = await documentCacheService.get(projectId, taskId, includeDescendants);
    if (cached && !force) {
      console.log(`💾 [LOAD-DOCS] Using multi-layer cache (${cached.length} items)`);
      setDocuments(cached);
      onDocumentChange?.(cached);
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    console.log('📥 [LOAD-DOCS] Fetching documents from API...');

    // 开始性能监控
    const loadStartTime = performance.now();
    
    // P2优化：强制重新加载时，清除多层缓存
    if (force) {
      console.log('🗑️ [FORCE-RELOAD] 清除多层缓存');

      // 清除新的缓存服务（L1 + L2）
      await documentCacheService.clear(projectId, taskId);

      // 清除旧的API内存缓存（兼容性）
      const cacheKeys = apiCache.keys();
      cacheKeys.forEach((key: string) => {
        if (
          key.includes(`task_document_${projectId}_${taskId}`) ||
          key.includes(`task_documents_${projectId}_${taskId}`)
        ) {
          console.log('  🗑️ 删除API缓存:', key);
          apiCache.delete(key);
        }
      });

      setDocuments([]);
      setSelectedDocument(null);
    }
    try {
      // 并行获取两种类型的文档，避免串行等待，增加超时控制
      const fetchWithTimeout = (promise: Promise<any>, timeout = 10000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      };

      // P1优化：使用新的合并API端点，减少API请求数量
      // 一次性获取所有文档（数据库文档 + 工作笔记 + 上传文件）
      let docs: DocumentItem[] = [];

      try {
        const apiCallStartTime = performance.now();

        // 使用unifiedDocumentService的API端点
        const response = await fetchWithTimeout(
          api.get(`/tasks/${taskId}/documents`, {
            params: {
              _t: force ? Date.now() : undefined // 强制刷新时添加时间戳参数
            }
          })
        );

        const apiCallDuration = performance.now() - apiCallStartTime;
        console.log(`⚡ [LOAD-DOCS] API调用耗时: ${apiCallDuration.toFixed(2)}ms`);

        // 处理unifiedDocumentService的响应格式
        const result = response.data || response;
        const documents = result.documents || result || [];

        console.log('📄 [LOAD-DOCS] 获取到文档', {
          total: documents.length,
          force
        });

        // 转换为DocumentItem格式
        docs = documents.map((doc: any) => {
          // 判断文档来源并设置相应属性
          const isUploaded = doc.source_type === 'uploaded_file';
          const isWorkNote = doc.source_type === 'work_note';

          // 计算文件大小：如果没有file_size，基于content长度计算
          const content = doc.content || '';
          const calculatedSize = doc.file_size || (content ? new Blob([content]).size : 0);

          return {
            id: doc.id,
            title: doc.title,
            content: content, // content可能为null（如果include_content=false）
            description: doc.description || '',
            type: doc.type,
            mime_type: doc.mime_type,
            file_size: calculatedSize,
            version: doc.version || 1,
            status: doc.status || 'published',
            visibility: doc.visibility || 'team',
            is_template: doc.is_template || false,
            project_id: doc.project_id || projectId,
            task_id: doc.task_id || taskId,
            owner_id: doc.owner_id || 0,
            created_by: doc.created_by || 0,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            tags: doc.tags || (isUploaded ? ['uploaded'] : isWorkNote ? ['work_note'] : []),
            selected: false,
            sourceTaskId: taskId,
            file_path: doc.file_path, // 上传文件的路径
            can_edit: doc.can_edit !== false,
            can_delete: doc.can_delete !== false,
            can_share: doc.can_share !== false,
            source_type: doc.source_type // 保留来源类型标记
          };
        });

      } catch (error: any) {
        console.error('❌ [LOAD-DOCS] 获取文档失败:', error);
        // 使用documentService的fallback
        console.log('🔄 [LOAD-DOCS] 尝试使用documentService fallback');

        try {
          const documents = await documentService.getTaskDocuments(projectId, taskId);
          docs = (documents || []).map((doc: any) => ({
            ...doc,
            selected: false,
            sourceTaskId: taskId,
            can_edit: doc.can_edit !== false,
            can_delete: doc.can_delete !== false,
            can_share: doc.can_share !== false
          }));
          console.log('✅ [LOAD-DOCS] Fallback成功，获取到', docs.length, '个文档');
        } catch (fallbackError) {
          console.error('❌ [LOAD-DOCS] Fallback也失败:', fallbackError);
          docs = [];
        }
      }

      // 以下是原来的双API处理逻辑，现已废弃，暂时注释保留以供参考
      /*
      const [documentsResult, uploadedResult] = await Promise.allSettled([
        fetchWithTimeout(documentService.getTaskDocuments(projectId, taskId)),
        fetchWithTimeout(taskDocumentService.getTaskDocuments(projectId, taskId))  // ← 这个服务已删除
      ]);

      // 原来的处理逻辑...

        // 处理文档服务的响应
        if (documentsResult.status === 'fulfilled') {
          const result = documentsResult.value;
          const documents = result.documents || result.data?.documents || result;
          const docsArray = Array.isArray(documents) ? documents : [];

          docs = docsArray.map((doc: Document) => ({
            ...doc,
            selected: false,
            sourceTaskId: taskId
          }));
        }

        // 处理上传文档服务的响应
        if (uploadedResult.status === 'fulfilled') {
          // getTaskDocuments returns array directly
          const uploadedArray = Array.isArray(uploadedResult.value) ? uploadedResult.value : [];
          const uploadedDocs: DocumentItem[] = uploadedArray.map((doc: any) => ({
            id: doc.id,
            title: doc.original_name || doc.file_name,
            content: '',
            description: `上传的文件 (${Math.round(doc.file_size / 1024)}KB)`,
            type: doc.mime_type?.startsWith('image/') ? 'image' as const :
                  doc.mime_type === 'application/pdf' ? 'pdf' as const :
                  doc.mime_type === 'text/markdown' ? 'markdown' as const : 'file' as const,
            mime_type: doc.mime_type,
            file_size: doc.file_size,
            version: 1,
            status: 'published' as const,
            visibility: 'team' as const,
            is_template: false,
            project_id: projectId,
            task_id: taskId,
            owner_id: 0,
            created_by: 0,
            created_at: doc.uploaded_at,
            updated_at: doc.uploaded_at,
            tags: ['uploaded'],
            selected: false,
            sourceTaskId: taskId,
            file_path: doc.file_path,
            can_edit: true,
            can_delete: true,
            can_share: true
          }));
          docs = [...docs, ...uploadedDocs];
        }
      */

      // 禁用自动递归加载以提升性能 - 改为手动触发
      if (false && includeDescendants && docs.length > 0) { // 临时禁用自动递归加载
        try {
          const getAllDescendantTaskIds = async (pid: number, rootTaskId: number): Promise<number[]> => {
            const result: number[] = [];
            const queue: number[] = [rootTaskId];
            const visited = new Set<number>();
            let depth = 0;
            const MAX_DEPTH = 3; // 限制递归深度，防止性能问题
            const MAX_TOTAL_TASKS = 50; // 限制总任务数，防止过多API调用
            
            // 出队根本身以获取其子任务，不计入自身ID
            queue.shift();
            // 首先入队根的直接子任务
            const firstLevel = await TaskService.getTaskChildren(pid, rootTaskId);
            const initialChildren = Array.isArray(firstLevel) ? firstLevel : [];
            initialChildren.forEach((t: any) => queue.push(t.id));

            while (queue.length && depth < MAX_DEPTH && result.length < MAX_TOTAL_TASKS) {
              const currentLevelSize = queue.length;
              
              for (let i = 0; i < currentLevelSize && result.length < MAX_TOTAL_TASKS; i++) {
                const currentId = queue.shift() as number;
                if (visited.has(currentId)) continue;
                visited.add(currentId);
                result.push(currentId);
                
                try {
                  const children = await TaskService.getTaskChildren(pid, currentId);
                  const arr = Array.isArray(children) ? children : [];
                  arr.forEach((t: any) => {
                    if (!visited.has(t.id)) queue.push(t.id);
                  });
                } catch (e) {
                  // 忽略单个节点失败
                }
              }
              depth++;
            }
            return result;
          };

          const descendantIds = await getAllDescendantTaskIds(projectId, taskId);
          const descendantDocArrays = await Promise.all(
            descendantIds.map(async (descTaskId) => {
              try {
                // getTaskDocuments returns array directly
                const documents = await documentService.getTaskDocuments(projectId, descTaskId);
                return (documents || []).map((d: Document) => ({ ...d, selected: false, sourceTaskId: descTaskId }));
              } catch (e) {
                return [] as DocumentItem[];
              }
            })
          );
          const allDescDocs = descendantDocArrays.flat();
          docs = [
            ...docs,
            ...allDescDocs.map(d => ({ ...d, description: d.description || `来自子任务 #${d.sourceTaskId}` }))
          ];
        } catch (e) {
          // 忽略递归失败
        }
      }

      // 批量更新状态减少重渲染 - 只有数据真正变化时才更新
      setDocuments(prevDocs => {
        if (JSON.stringify(prevDocs.map(d => d.id)) === JSON.stringify(docs.map(d => d.id))) {
          return prevDocs; // 避免不必要的重渲染
        }
        
        // P2优化：保存到多层缓存服务（异步，不阻塞渲染）
        documentCacheService.set(projectId, taskId, docs, includeDescendants).catch(error => {
          console.error('❌ [CACHE] 保存缓存失败:', error);
        });

        return docs;
      });
      
      // 同步更新selectedDocument（如果当前有选中的文档）
      if (selectedDocument) {
        // 从新加载的文档中找到对应ID的文档
        const updatedDoc = docs.find(doc => doc.id === selectedDocument.id);
        if (updatedDoc) {
          console.log('🔄 [SYNC] 同步更新selectedDocument', {
            oldVersion: selectedDocument.version,
            newVersion: updatedDoc.version,
            documentId: updatedDoc.id
          });
          setSelectedDocument(updatedDoc);
        } else {
          // 如果选中的文档不在新列表中（可能被删除），清除选择
          console.log('⚠️ [SYNC] 选中的文档已不存在，清除选择');
          setSelectedDocument(null);
        }
      } else if (docs.length > 0) {
        // 如果没有选中文档且有文档列表，选中按updated_at排序后的第一个（最新更新的文档）
        // 直接在这里实现排序，避免依赖sortDocuments函数
        const sortedDocs = [...docs].sort((a, b) => {
          const aTime = new Date(a.updated_at).getTime();
          const bTime = new Date(b.updated_at).getTime();
          return bTime - aTime; // 倒序：最新的在前
        });
        console.log('📄 [AUTO-SELECT] 自动选择最新更新的文档', {
          selectedId: sortedDocs[0].id,
          selectedTitle: sortedDocs[0].title,
          updatedAt: sortedDocs[0].updated_at
        });
        setSelectedDocument(sortedDocs[0]);
      }

      // 通知父组件数据变化
      onDocumentChange?.(docs);
      
      // 性能监控 - 记录成功加载时间
      const loadDuration = performance.now() - loadStartTime;
      console.log(`✅ Document loading completed in ${loadDuration.toFixed(2)}ms, loaded ${docs.length} documents`);
      
      // 如果加载时间过长，记录警告
      if (loadDuration > 2000) {
        console.warn(`⚠️ Slow document loading detected: ${loadDuration.toFixed(2)}ms`);
      }
      
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档列表失败');
      
      // 性能监控 - 记录失败时间
      const loadDuration = performance.now() - loadStartTime;
      console.log(`❌ Document loading failed after ${loadDuration.toFixed(2)}ms`);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [projectId, taskId, includeDescendants]);

  // 保存文档函数
  const saveCurrentDocument = useCallback(async () => {
    if (!selectedDocument || viewMode !== 'edit') {
      message.warning('请先进入编辑模式选择要保存的文档');
      return;
    }
    
    try {
      if (onSaveDocument) {
        await onSaveDocument();
      } else {
        // 默认保存逻辑 - 重新加载文档
        await loadDocuments();
        message.success('文档保存成功');
      }
    } catch (error: any) {
      console.error('保存文档失败:', error);
      message.error(`保存失败: ${error.message || '未知错误'}`);
    }
  }, [selectedDocument, viewMode, onSaveDocument, loadDocuments]);

  // 快捷键回调函数
  const shortcutCallbacks = useMemo(() => ({
    save: () => {
      saveCurrentDocument();
    },
    toggleEditMode: () => {
      const modes: ViewMode[] = ['edit', 'preview', 'manage', 'stats'];
      const currentIndex = modes.indexOf(viewMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      handleViewModeChange(nextMode);
      message.info(`切换到${nextMode === 'edit' ? '编辑' : nextMode === 'preview' ? '预览' : nextMode === 'manage' ? '管理' : '统计'}模式`);
    },
    focusSearch: () => {
      if (searchInputRef) {
        searchInputRef.focus();
        message.info('聚焦搜索框');
      }
    },
    upload: () => {
      // 触发文件上传
      message.info('打开文件上传对话框');
    },
    refresh: () => {
      loadDocuments();
      message.success('刷新文档列表');
    },
    newDocument: () => {
      // 快速创建新文档
      handleQuickCreateDocument('markdown');
    },
    copyDocument: () => {
      if (selectedDocument) {
        // 复制选中文档
        message.info(`复制文档: ${selectedDocument.title}`);
      } else {
        message.warning('请先选择要复制的文档');
      }
    },
    deleteDocument: () => {
      if (selectedDocument) {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除文档 "${selectedDocument.title}" 吗？`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => {
            message.success(`删除文档: ${selectedDocument.title}`);
          }
        });
      } else {
        message.warning('请先选择要删除的文档');
      }
    },
    switchTab: (direction: 'next' | 'prev') => {
      const modes: ViewMode[] = ['edit', 'preview', 'manage', 'stats'];
      const currentIndex = modes.indexOf(viewMode);
      const nextIndex = direction === 'next' 
        ? (currentIndex + 1) % modes.length
        : (currentIndex - 1 + modes.length) % modes.length;
      handleViewModeChange(modes[nextIndex]);
    },
    switchListView: () => {
      const views: typeof documentListView[] = ['grouped', 'timeline', 'grid', 'list'];
      const currentIndex = views.indexOf(documentListView);
      const nextView = views[(currentIndex + 1) % views.length];
      setDocumentListView(nextView);
      message.info(`切换到${nextView === 'grouped' ? '分组' : nextView === 'timeline' ? '时间线' : nextView === 'grid' ? '网格' : '列表'}视图`);
    },
    showHelp: () => {
      Modal.info({
        title: '快捷键帮助',
        width: 600,
        content: (
          <div style={{ lineHeight: '1.8' }}>
            <div><strong>文档编辑：</strong></div>
            <div>• Ctrl+S - 保存文档</div>
            <div>• Ctrl+E - 切换编辑/预览模式</div>
            <div>• Ctrl+N - 新建文档</div>
            <br />
            <div><strong>文档操作：</strong></div>
            <div>• Ctrl+U - 上传文件</div>
            <div>• Ctrl+R - 刷新数据</div>
            <div>• Ctrl+Shift+C - 复制文档</div>
            <div>• Delete - 删除选中文档</div>
            <br />
            <div><strong>导航操作：</strong></div>
            <div>• Ctrl+F - 聚焦搜索框</div>
            <div>• Ctrl+Tab - 切换到下一个标签页</div>
            <div>• Ctrl+Shift+Tab - 切换到上一个标签页</div>
            <div>• Ctrl+V - 切换文档列表视图模式</div>
            <br />
            <div><strong>帮助：</strong></div>
            <div>• Ctrl+? - 显示快捷键帮助</div>
          </div>
        )
      });
    }
  }), [selectedDocument, viewMode, handleViewModeChange, loadDocuments, searchInputRef, documentListView]);

  // 配置快捷键
  const shortcutGroups = useMemo(() => createDocumentShortcuts(shortcutCallbacks), [shortcutCallbacks]);
  
  // 注册快捷键
const { showShortcutHelp, registeredCount } = useKeyboardShortcuts(shortcutGroups);

  // 配置拖拽功能
  const dragDropConfig = useMemo(() => ({
    enableFileDrop: true,
    enableItemReorder: true,
    acceptedFileTypes: ['.pdf', '.md', '.txt', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.bmp', '.webp'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    onFilesDrop: async (files: FileList, dropZone?: string) => {
      setUploading(true);
      try {
        // 批量上传文件到 TaskDocumentHandler
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          await documentService.uploadTaskDocument(
            projectId,
            taskId,
            file,
            {
              onProgress: (progress) => {
                console.log(`文件 ${file.name} 上传进度:`, progress);
              }
            }
          );
        }
        message.success(`成功上传 ${files.length} 个文件`);
        loadDocuments(); // 重新加载文档列表
      } catch (error) {
        console.error('文件上传失败:', error);
        message.error('文件上传失败');
      } finally {
        setUploading(false);
      }
    },
    onItemDrop: (draggedItem: DocumentItem, targetItem: DocumentItem, dropZone: string) => {
      // 重新排序文档列表
      setDocuments(prev => {
        const draggedIndex = prev.findIndex(doc => doc.id === draggedItem.id);
        const targetIndex = prev.findIndex(doc => doc.id === targetItem.id);
        
        if (draggedIndex === -1 || targetIndex === -1) return prev;
        
        const newDocs = [...prev];
        const [removed] = newDocs.splice(draggedIndex, 1);
        newDocs.splice(targetIndex, 0, removed);
        
        message.success('文档顺序已更新');
        return newDocs;
      });
    },
    onItemReorder: (items: DocumentItem[], fromIndex: number, toIndex: number) => {
      setDocuments(items);
      message.success('文档顺序已更新');
    }
  }), [loadDocuments]);

  // 初始化拖拽功能
  const { dragState, createDropZoneProps, createDraggableProps, isDragActive } = useDragAndDrop(dragDropConfig);

  // 防抖的文档加载函数
  const debouncedLoadDocuments = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadDocuments();
    }, 300); // 300ms防抖
  }, [loadDocuments]);
  
  // 清理防抖计时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ⚡ Performance: 延迟初始化重量级组件（编辑器、工具等）
  // 先快速渲染轻量级视图，100ms后再渲染完整功能
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHeavyComponentsReady(true);
      console.log('✅ [Performance] Heavy components initialized');
    }, 100); // 延迟100ms初始化编辑器等重量级组件

    return () => clearTimeout(timer);
  }, []);

  // 初始加载 - 使用防抖
  useEffect(() => {
    debouncedLoadDocuments();
  }, [projectId, taskId, includeDescendants, debouncedLoadDocuments]);

  // 文档变化通知（独立的useEffect避免重复加载）
  useEffect(() => {
    onDocumentChange?.(documents);
  }, [documents, onDocumentChange]);

  // 监听 ESC 键退出全屏
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // 切换全屏时锁定/恢复页面滚动，并添加全屏状态类到 body 以隐藏左右区域
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    if (isFullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('fullscreen-doc-active');
      return () => {
        document.body.style.overflow = prev;
        document.body.classList.remove('fullscreen-doc-active');
      };
    } else {
      document.body.classList.remove('fullscreen-doc-active');
    }
  }, [isFullscreen]);

  // 文档选择 - 优化避免重复更新
  const handleDocumentSelect = useCallback((doc: DocumentItem) => {
    if (selectedDocument?.id === doc.id) {
      return; // 避免重复选择
    }
    setSelectedDocument(doc);
    // 批量更新状态，减少重渲染
    setDocuments(prev => {
      const hasChange = prev.some(d => d.selected !== (d.id === doc.id));
      if (!hasChange) return prev; // 避免不必要的状态更新
      return prev.map(d => ({ ...d, selected: d.id === doc.id }));
    });
  }, [selectedDocument?.id]);

  // 文档上传 - 使用专门的任务文档上传接口
  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // 使用 documentService.uploadTaskDocument 连接到后端 TaskDocumentHandler
      await documentService.uploadTaskDocument(
        projectId,
        taskId,
        file,
        {
          onProgress: (progress) => {
            // 可以添加进度显示
            console.log('Upload progress:', progress);
          }
        }
      );
      message.success('文档上传成功');
      await loadDocuments();
      return false; // 阻止默认上传行为
    } catch (error) {
      console.error('上传失败:', error);
      message.error('文档上传失败');
      return false;
    } finally {
      setUploading(false);
    }
  }, [taskId, projectId, loadDocuments]);

  // 文档操作
  const handleDocumentEdit = useCallback((doc: DocumentItem) => {
    setSelectedDocument(doc);
    setViewMode('edit');
  }, []);

  // 保存预览编辑的内容（包括标题和内容）
  const handleSavePreviewEdit = useCallback(async () => {
    if (!selectedDocument) return;

    // 验证标题不能为空
    if (!editTitle.trim()) {
      message.error('文档标题不能为空');
      return;
    }

    try {
      await documentService.updateDocument(selectedDocument.id, {
        content: editContent,
        title: editTitle, // 使用编辑后的标题
        type: selectedDocument.type as any
      });
      message.success('文档保存成功');
      // 更新本地文档内容和标题
      setSelectedDocument({ ...selectedDocument, content: editContent, title: editTitle });
      setDocuments(prev => prev.map(doc =>
        doc.id === selectedDocument.id ? { ...doc, content: editContent, title: editTitle } : doc
      ));
      await loadDocuments();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('文档保存失败');
    }
  }, [selectedDocument, editContent, editTitle, loadDocuments]);

  // 取消预览编辑 - 恢复为原始内容
  const handleCancelPreviewEdit = useCallback(() => {
    if (selectedDocument) {
      setEditContent(selectedDocument.content);
      setEditTitle(selectedDocument.title);
    }
  }, [selectedDocument]);

  const handleDocumentDelete = useCallback(async (doc: DocumentItem) => {
    Modal.confirm({
      title: '确定删除该文档吗？',
      content: `文档"${doc.title}"删除后无法恢复，请确认操作`,
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await documentService.deleteDocument(doc.id);
          message.success('文档删除成功');
          await loadDocuments();
          if (selectedDocument?.id === doc.id) {
            setSelectedDocument(null);
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('文档删除失败');
        }
      }
    });
  }, [loadDocuments, selectedDocument]);

  const handleDocumentDownload = useCallback(async (doc: DocumentItem) => {
    try {
      // 如果是上传的文件，使用文件路径下载
      if (doc.file_path && doc.tags?.includes('uploaded')) {
        // 直接通过API下载文件
        const downloadUrl = `/api/v1/files/download?path=${encodeURIComponent(doc.file_path)}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = doc.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('文档下载成功');
      } else {
        // 原有的文本文档下载逻辑
        const blob = new Blob([doc.content], { type: doc.mime_type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${doc.title}.${doc.type === 'markdown' ? 'md' : 'txt'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success('文档下载成功');
      }
    } catch (error) {
      console.error('下载失败:', error);
      message.error('文档下载失败');
    }
  }, []);

  const handleDocumentView = useCallback(async (doc: DocumentItem) => {
    try {
      if (doc.file_path && doc.tags?.includes('uploaded')) {
        // 对于上传的文件，根据类型不同处理
        if (doc.type === 'image') {
          // 图片：在新窗口中显示
          const imageUrl = `/api/v1/files/view?path=${encodeURIComponent(doc.file_path)}`;
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>${doc.title}</title></head>
                <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5;">
                  <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${doc.title}" />
                </body>
              </html>
            `);
            newWindow.document.close();
          }
        } else if (doc.type === 'pdf') {
          // PDF：在新窗口中显示
          const pdfUrl = `/api/v1/files/view?path=${encodeURIComponent(doc.file_path)}`;
          window.open(pdfUrl, '_blank');
        } else {
          // 其他文件：尝试在新窗口中打开
          const fileUrl = `/api/v1/files/view?path=${encodeURIComponent(doc.file_path)}`;
          window.open(fileUrl, '_blank');
        }
        message.success('文件打开成功');
      } else {
        // 对于文本文档，显示在模态框中
        Modal.info({
          title: doc.title,
          content: (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {doc.content}
              </pre>
            </div>
          ),
          width: 800
        });
      }
    } catch (error) {
      console.error('查看失败:', error);
      message.error('文件查看失败');
    }
  }, []);

  // 创建新文档
  const handleCreateNewDocument = useCallback(async () => {
    if (!newDocumentForm.title.trim()) {
      message.warning('请输入文档标题');
      return;
    }
    
    try {
      const content = newDocumentForm.type === 'markdown' 
        ? '# ' + newDocumentForm.title.trim() + '\n\n请在这里编写文档内容...'
        : '请在这里编写文档内容...';
        
      // 使用专门的任务文档创建接口，确保正确关联到任务
      const response = await api.post(`/projects/${projectId}/tasks/${taskId}/documents/create-and-attach`, {
        title: newDocumentForm.title.trim(),
        content: content,
        type: newDocumentForm.type as 'markdown' | 'text',
        description: newDocumentForm.description,
        status: 'draft',
        visibility: 'team',
        is_template: false,
        relationship_type: 'attachment'
      });
      
      const newDoc = response.data;
      
      message.success('文档创建成功');
      setNewDocumentModalVisible(false);
      setNewDocumentForm({ title: '', type: 'markdown', description: '' });
      await loadDocuments();
      
      // 自动选中新创建的文档
      if (newDoc) {
        setSelectedDocument(newDoc);
        setViewMode('edit');
      }
    } catch (error) {
      console.error('创建文档失败:', error);
      message.error('文档创建失败');
    }
  }, [newDocumentForm, projectId, taskId, loadDocuments]);

  // 快速创建新文档
  const handleQuickCreateDocument = useCallback(async (type: 'markdown' | 'text' = 'markdown') => {
    const defaultTitle = `新建${type === 'markdown' ? 'Markdown' : '文本'}文档`;
    
    try {
      const content = type === 'markdown' 
        ? `# ${defaultTitle}\n\n请在这里编写文档内容...`
        : '请在这里编写文档内容...';
        
      // 使用专门的任务文档创建接口，确保正确关联到任务
      const response = await api.post(`/projects/${projectId}/tasks/${taskId}/documents/create-and-attach`, {
        title: defaultTitle,
        content: content,
        type: type,
        description: '',
        status: 'draft',
        visibility: 'team',
        is_template: false,
        relationship_type: 'attachment'
      });
      
      const newDoc = response.data;
      
      message.success('文档创建成功');
      await loadDocuments();
      
      // 自动选中新创建的文档并切换到编辑模式
      if (newDoc) {
        setSelectedDocument(newDoc);
        setViewMode('edit');
      }
    } catch (error) {
      console.error('创建文档失败:', error);
      message.error('文档创建失败');
    }
  }, [projectId, taskId, loadDocuments]);

  // 排序文档的辅助函数
  const sortDocuments = useCallback((docs: DocumentItem[]) => {
    return [...docs].sort((a, b) => {
      const aTime = new Date(a[documentSortBy]).getTime();
      const bTime = new Date(b[documentSortBy]).getTime();
      return documentSortOrder === 'desc' ? bTime - aTime : aTime - bTime;
    });
  }, [documentSortBy, documentSortOrder]);

  // 过滤后的文档 - 移动到这里避免循环引用
  const filteredDocuments = useMemo(() => {
    let filtered: DocumentItem[];
    if (filterMode === 'root') filtered = documents.filter(d => (d.sourceTaskId ?? taskId) === taskId);
    else if (filterMode === 'desc') filtered = documents.filter(d => (d.sourceTaskId ?? taskId) !== taskId);
    else filtered = documents;
    
    return sortDocuments(filtered);
  }, [documents, filterMode, taskId, sortDocuments]);

  // 虚拟列表优化 - 对于大量文档的情况
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  
  const paginatedDocuments = useMemo(() => {
    if (filteredDocuments.length <= ITEMS_PER_PAGE) {
      return filteredDocuments;
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDocuments, currentPage]);
  
  // 渲染不同的文档列表视图 - 使用React.memo进一步优化
  const renderDocumentList = useMemo(() => {
    if (documents.length === 0) {
      return (
        <div style={{ padding: '16px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无文档，请使用右上角的更多操作菜单创建或上传文档"
          />
        </div>
      );
    }

    let listContent: React.ReactNode;
    
    switch (documentListView) {
      case 'grouped':
        listContent = (
          <div style={{ padding: '0 8px' }}>
            {/* 按类型分组显示文档 - 使用分页数据 */}
            {Object.entries(
              paginatedDocuments.reduce((groups, doc) => {
                const type = doc.type || 'other';
                if (!groups[type]) groups[type] = [];
                groups[type].push(doc);
                return groups;
              }, {} as Record<string, DocumentItem[]>)
            ).map(([type, docs]) => (
              <div key={type} style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#fafafa',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#666'
                }}>
                  {type === 'markdown' && <FileTextOutlined style={{ marginRight: '4px', color: '#1890ff' }} />}
                  {type === 'text' && <FileTextOutlined style={{ marginRight: '4px', color: '#52c41a' }} />}
                  {type === 'pdf' && <FileTextOutlined style={{ marginRight: '4px', color: '#ff4d4f' }} />}
                  {type.toUpperCase()} ({docs.length})
                </div>
                
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`document-card ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                    onClick={() => setSelectedDocument(doc)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: selectedDocument?.id === doc.id ? '#e6f7ff' : '#fff',
                      border: selectedDocument?.id === doc.id ? '1px solid #1890ff' : '1px solid #f0f0f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: selectedDocument?.id === doc.id ? '0 2px 8px rgba(24,144,255,0.2)' : '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedDocument?.id !== doc.id) {
                        e.currentTarget.style.backgroundColor = '#f9f9f9';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedDocument?.id !== doc.id) {
                        e.currentTarget.style.backgroundColor = '#fff';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* 文档标题和状态 */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '13px', flex: 1, marginRight: '8px' }}>
                        <span style={{ color: '#999', marginRight: '4px' }}>#{doc.id}</span>
                        {doc.title}
                      </Text>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {doc.is_template && <Tag color="purple" style={{ margin: 0, fontSize: '10px' }}>模板</Tag>}
                        <Suspense fallback={<div style={{ width: '20px', height: '20px' }} />}>
                          <TaskDocumentVersionHistoryButton
                            projectId={doc.project_id}
                            taskId={doc.task_id}
                            selectedDocument={doc}
                            size="small"
                            type="text"
                            style={{ width: '20px', height: '20px', fontSize: '10px', padding: 0 }}
                            onVersionUpdate={() => {/* 处理版本更新 */}}
                          />
                        </Suspense>
                        <Popconfirm
                          title="确认删除文档"
                          description={`确定要删除文档"${doc.title}"吗？删除后无法恢复。`}
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            handleDocumentDelete(doc);
                          }}
                          okText="删除"
                          cancelText="取消"
                          okType="danger"
                          placement="topRight"
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}

                            style={{ width: '20px', height: '20px', fontSize: '10px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                    
                    {/* 文档信息 */}
                    <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>{Math.round(doc.file_size / 1024)}KB</span>
                        <span>v{doc.version}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span style={{ color: '#1890ff' }}>●</span>
                      </div>
                    </div>
                    
                    {/* 文档预览 */}
                    {doc.description && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#999', 
                        marginTop: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {doc.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
        break;

      case 'timeline':
        listContent = (
          <div style={{ padding: '0 8px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', fontWeight: 'bold' }}>
              📅 按{documentSortBy === 'created_at' ? '创建' : '更新'}时间排序 ({documentSortOrder === 'desc' ? '新→旧' : '旧→新'})
            </div>
            {paginatedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    marginBottom: '8px',
                    backgroundColor: selectedDocument?.id === doc.id ? '#e6f7ff' : '#fff',
                    border: selectedDocument?.id === doc.id ? '1px solid #1890ff' : '1px solid #f0f0f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ marginRight: '12px' }}>
                    {doc.type === 'markdown' && <FileTextOutlined style={{ color: '#1890ff' }} />}
                    {doc.type === 'txt' && <FileTextOutlined style={{ color: '#52c41a' }} />}
                    {doc.type === 'pdf' && <FileTextOutlined style={{ color: '#ff4d4f' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {Math.round(doc.file_size / 1024)}KB
                    </div>
                  </div>
                  <Space>
                    <Suspense fallback={<div style={{ width: '20px', height: '20px' }} />}>
                      <TaskDocumentVersionHistoryButton
                        projectId={doc.project_id}
                        taskId={doc.task_id}
                        selectedDocument={doc}
                        size="small"
                        type="text"
                        style={{ padding: 0, width: '20px', height: '20px' }}
                        onVersionUpdate={() => {/* 处理版本更新 */}}
                      />
                    </Suspense>
                    <Popconfirm
                      title="确认删除文档"
                      description={`确定要删除文档"${doc.title}"吗？删除后无法恢复。`}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDocumentDelete(doc);
                      }}
                      okText="删除"
                      cancelText="取消"
                      okType="danger"
                      placement="topRight"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}

                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                    </Popconfirm>
                  </Space>
                </div>
              ))}
          </div>
        );
        break;

      case 'grid':
        listContent = (
          <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {paginatedDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(doc)}
                style={{
                  padding: '12px',
                  backgroundColor: selectedDocument?.id === doc.id ? '#e6f7ff' : '#fff',
                  border: selectedDocument?.id === doc.id ? '1px solid #1890ff' : '1px solid #f0f0f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  minHeight: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  {doc.type === 'markdown' && <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                  {doc.type === 'txt' && <FileTextOutlined style={{ fontSize: '24px', color: '#52c41a' }} />}
                  {doc.type === 'pdf' && <FileTextOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {Math.round(doc.file_size / 1024)}KB
                </div>
              </div>
            ))}
          </div>
        );
        break;

      default: // list
        listContent = (
          <List
            
            dataSource={paginatedDocuments}
            renderItem={(doc) => (
              <DocumentListItem currentTaskId={taskId}
                key={doc.id}
                document={doc}
                selected={selectedDocument?.id === doc.id}
                onSelect={setSelectedDocument}
                onEdit={(d) => { setSelectedDocument(d); setViewMode('edit'); }}
                onDelete={handleDocumentDelete}
                onDownload={handleDocumentDownload}
                onView={handleDocumentView}
              />
            )}
          />
        );
        break;
    }
    const shouldShowPagination = filteredDocuments.length > ITEMS_PER_PAGE;
    
    return (
      <div>
        {listContent}
        {shouldShowPagination && (
          <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
            <Space.Compact>
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                icon={<LeftOutlined />}
              >
                上一页
              </Button>
              <Button disabled>
                {currentPage} / {Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE)}
              </Button>
              <Button
                disabled={currentPage >= Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(p => p + 1)}
                icon={<RightOutlined />}
              >
                下一页
              </Button>
            </Space.Compact>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              共 {filteredDocuments.length} 个文档
            </div>
          </div>
        )}
      </div>
    );
  }, [documents, selectedDocument, documentListView, taskId, paginatedDocuments, filteredDocuments.length, currentPage]);

  // 切换全屏模式
  const toggleFullscreen = useCallback(() => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    // 全屏模式下默认切换到预览模式
    if (newFullscreenState && selectedDocument && selectedDocument.type === 'markdown') {
      setViewMode('preview');
      onViewModeChange?.('preview');
    }
  }, [isFullscreen, selectedDocument, onViewModeChange]);

  // 工具栏按钮 - 添加全屏按钮
  const toolbarItems: MenuProps['items'] = [
    {
      key: 'fullscreen',
      label: isFullscreen ? '退出全屏' : '全屏查看',
      icon: isFullscreen ? <ShrinkOutlined /> : <ArrowsAltOutlined />,
      onClick: toggleFullscreen
    },
    { type: 'divider' },
    {
      key: 'sort-options',
      label: '排序选项',
      icon: <BarChartOutlined />,
      children: [
        {
          key: 'sort-created-desc',
          label: '📅 按创建时间(新→旧)',
          onClick: () => { setDocumentSortBy('created_at'); setDocumentSortOrder('desc'); }
        },
        {
          key: 'sort-created-asc',
          label: '📅 按创建时间(旧→新)',
          onClick: () => { setDocumentSortBy('created_at'); setDocumentSortOrder('asc'); }
        },
        {
          key: 'sort-updated-desc',
          label: '🔄 按更新时间(新→旧)',
          onClick: () => { setDocumentSortBy('updated_at'); setDocumentSortOrder('desc'); }
        },
        {
          key: 'sort-updated-asc',
          label: '🔄 按更新时间(旧→新)',
          onClick: () => { setDocumentSortBy('updated_at'); setDocumentSortOrder('asc'); }
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'view-options',
      label: '视图选项',
      icon: <EyeOutlined />,
      children: [
        {
          key: 'view-grouped',
          label: '📑 分组视图',
          onClick: () => setDocumentListView('grouped')
        },
        {
          key: 'view-timeline',
          label: '📅 时间线',
          onClick: () => setDocumentListView('timeline')
        },
        {
          key: 'view-grid',
          label: '⚏ 网格视图',
          onClick: () => setDocumentListView('grid')
        },
        {
          key: 'view-list',
          label: '📋 列表视图',
          onClick: () => setDocumentListView('list')
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'export-all',
      label: '导出全部',
      icon: <DownloadOutlined />,
      onClick: () => message.info('批量导出功能开发中')
    }
  ];

  // 文档统计（基于过滤结果）
  const documentStats = useMemo(() => {
    const total = filteredDocuments.length;
    const totalSize = filteredDocuments.reduce((sum, doc) => sum + doc.file_size, 0);
    const byType = filteredDocuments.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, totalSize, byType };
  }, [filteredDocuments]);

  // 渲染主要内容区域
  const renderContentArea = () => {
    switch (viewMode) {
      case 'edit':
        return selectedDocument ? (
          <ErrorBoundary>
            {/* ⚡ Performance: 延迟渲染重量级编辑器 */}
            {!isHeavyComponentsReady ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px', color: '#1890ff' }}>
                  ⚡ 正在初始化编辑器...
                </div>
              </div>
            ) : (
              <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}>
                <TaskDocumentEditor
                  key={selectedDocument.id}
                  taskId={taskId}
                  projectId={projectId}
                  taskDocument={selectedDocument}
                  onSave={(content) => {
                    loadDocuments(true); // 强制从API重新加载最新数据
                    if (onSaveDocument) {
                      onSaveDocument();
                    }
                  }}
                />
              </Suspense>
            )}
          </ErrorBoundary>
        ) : (
          <Empty
            description="暂无文档，请通过右上角的更多操作菜单创建文档"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
        
      case 'preview':
        console.log('🔍 Preview mode - selectedDocument:', !!selectedDocument, 'isInfoPanelExpanded:', isInfoPanelExpanded);
        return selectedDocument ? (
          <Card
            style={{
              height: isFullscreen ? 'calc(100vh - 120px)' : 'auto',
              overflow: 'hidden'
            }}
            styles={{
              body: {
                padding: 0,
                height: isFullscreen ? 'calc(100vh - 180px)' : 'auto',
                display: 'flex',
                flexDirection: 'row'
              }
            }}
          >
            {/* 主编辑区域 */}
            <div className="main-edit-area" style={{
              flex: 1,
              minWidth: '600px',
              padding: isFullscreen ? '32px' : '16px',
              overflow: 'auto'
            }}>
            {/* 标题编辑区域 */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="请输入文档标题"
                style={{
                  flex: 1,
                  fontSize: isFullscreen ? '20px' : '16px',
                  fontWeight: 600,
                  color: '#1890ff'
                }}
              />
              <Space>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSavePreviewEdit}>
                  保存
                </Button>
                <Button onClick={handleCancelPreviewEdit}>取消</Button>
              </Space>
            </div>

            {isFullscreen && (
              <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px'
              }}>
                <span>📄 {selectedDocument.type?.toUpperCase()} 文档</span>
                <span>📅 {new Date(selectedDocument.updated_at).toLocaleDateString()}</span>
                <span>📊 {selectedDocument.content?.length || 0} 字符</span>
              </div>
            )}

            <Divider />

            {/* 内容区域：直接使用TaskMarkdownEditor组件 */}
            <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}>
              <TaskMarkdownEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="请输入文档内容（支持Markdown格式）..."
                rows={20}
                style={{
                  minHeight: isFullscreen ? '400px' : '300px',
                  maxWidth: isFullscreen ? '900px' : '100%',
                  margin: isFullscreen ? '0 auto' : '0'
                }}
              />
            </Suspense>

            {isFullscreen && (
              <div style={{
                marginTop: '32px',
                textAlign: 'center',
                color: '#999',
                fontSize: '12px',
                borderTop: '1px solid #e8e8e8',
                paddingTop: '16px'
              }}>
                💡 提示：按 ESC 键退出全屏预览
              </div>
            )}
            </div>

            {/* 右侧：快捷操作栏或信息面板 */}
            {!isInfoPanelExpanded ? (
              // 收起状态：快捷操作栏
              <div className="quick-action-bar" style={{
                width: '48px',
                minWidth: '48px',
                flexShrink: 0,
                background: '#e6f7ff',  // 改为蓝色背景，更容易看到
                borderLeft: '2px solid #1890ff',  // 改为蓝色边框
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 4px',
                gap: '8px',
                overflow: 'visible'
              }}>
                <Tooltip title="展开信息" placement="left">
                  <Button
                    icon={<RightOutlined />}
                    onClick={() => setIsInfoPanelExpanded(true)}
                    type="text"
                    style={{ width: '32px', height: '32px' }}
                  />
                </Tooltip>
                <Divider style={{ margin: '4px 0' }} />
                <Tooltip title="删除" placement="left">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDocumentDelete(selectedDocument)}
                    type="text"
                    style={{ width: '32px', height: '32px' }}
                  />
                </Tooltip>
                <Tooltip title="下载" placement="left">
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      const blob = new Blob([selectedDocument.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedDocument.title}.${selectedDocument.type}`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    type="text"
                    style={{ width: '32px', height: '32px' }}
                  />
                </Tooltip>
              </div>
            ) : (
              // 展开状态：信息面板
              <div className="info-panel-expanded" style={{
                width: '30%',
                minWidth: '280px',
                maxWidth: '400px',
                background: '#fafafa',
                borderLeft: '1px solid #e8e8e8',
                padding: '16px',
                overflow: 'auto'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Button
                    icon={<LeftOutlined />}
                    onClick={() => setIsInfoPanelExpanded(false)}
                    type="text"
                    size="small"
                  >
                    收起
                  </Button>
                  <span style={{ fontWeight: 600, fontSize: '16px' }}>文档信息</span>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {/* 文档统计 */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ marginBottom: '12px', color: '#333', fontSize: '14px' }}>📊 文档统计</h4>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="类型">{selectedDocument.type?.toUpperCase()}</Descriptions.Item>
                    <Descriptions.Item label="大小">{(selectedDocument.file_size / 1024).toFixed(2)} KB</Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {new Date(selectedDocument.created_at).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {new Date(selectedDocument.updated_at).toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {/* 快捷操作 */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ marginBottom: '12px', color: '#333', fontSize: '14px' }}>🔧 快捷操作</h4>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      danger
                      block
                      icon={<DeleteOutlined />}
                      onClick={() => handleDocumentDelete(selectedDocument)}
                      size="small"
                    >
                      删除文档
                    </Button>
                    <Button
                      block
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        const blob = new Blob([selectedDocument.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${selectedDocument.title}.${selectedDocument.type}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      size="small"
                    >
                      下载文档
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Empty
            description="请选择一个文档进行预览"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
        
      case 'manage':
        return (
          <Card title="文档管理">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert message="文档管理功能已集成到统一界面中" type="info" />
              <Button onClick={() => setManagerVisible(true)}>
                打开高级管理器
              </Button>
            </Space>
          </Card>
        );
        
      case 'stats':
        return (
          <Card title="文档统计">
            <Row gutter={16}>
              <Col span={8}>
                <Card.Grid style={{ width: '100%', textAlign: 'center' }}>
                  <Statistic title="文档总数" value={documentStats.total} />
                </Card.Grid>
              </Col>
              <Col span={8}>
                <Card.Grid style={{ width: '100%', textAlign: 'center' }}>
                  <Statistic 
                    title="总大小" 
                    value={Math.round(documentStats.totalSize / 1024)} 
                    suffix="KB" 
                  />
                </Card.Grid>
              </Col>
              <Col span={8}>
                <Card.Grid style={{ width: '100%', textAlign: 'center' }}>
                  <Statistic title="类型数量" value={Object.keys(documentStats.byType).length} />
                </Card.Grid>
              </Col>
            </Row>
            <Divider />
            <Title level={4}>文档类型分布</Title>
            <Space wrap>
              {Object.entries(documentStats.byType).map(([type, count]) => (
                <Tag key={type} color="blue">
                  {type.toUpperCase()}: {count}
                </Tag>
              ))}
            </Space>
          </Card>
        );
        
      default:
        return <Empty description="未知视图模式" />;
    }
  };

  const Statistic = ({ title, value, suffix }: any) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}{suffix}</div>
      <div style={{ color: '#666' }}>{title}</div>
    </div>
  );

  // 错误边界组件
  const ErrorBoundary: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback }) => {
    try {
      return <>{children}</>;
    } catch (error) {
      console.error('DocumentArea Error:', error);
      return fallback || (
        <Alert 
          message="组件渲染出错" 
          description="请刷新页面重试" 
          type="error" 
          showIcon 
        />
      );
    }
  };

  // 早期返回加载状态，避免渲染复杂组件
  if (loading && documents.length === 0) {
    return (
      <div className={`unified-task-document-area loading ${className}`} style={style}>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', color: '#666' }}>正在加载任务文档...</div>
          </div>
        </Card>
      </div>
    );
  }

  const __content = (
    <div className={`unified-task-document-area ${viewMode}-mode ${className} ${isFullscreen ? 'fullscreen' : ''}`} style={isFullscreen ? {} : style}>
      <Card
        title={
          headerVisible ? (
            <Space>
              <FileTextOutlined />
              <span>任务文档</span>
            </Space>
          ) : undefined
        }
        extra={
          showToolbar && (
            <Space>
              {/* 创建AI文档按钮 */}
              <Tooltip title="使用AI生成文档">
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={() => setAiDocDialogVisible(true)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderColor: 'transparent',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  创建AI文档
                </Button>
              </Tooltip>

              {/* 仅保留刷新按钮 */}
              <Tooltip title="刷新">
                <Button
                  icon={<SyncOutlined />}
                  onClick={loadDocuments}
                  loading={loading}
                />
              </Tooltip>

              <Dropdown menu={{ items: toolbarItems }} trigger={['click']}>
                <Tooltip title="更多操作">
                  <Button icon={<MoreOutlined />} />
                </Tooltip>
              </Dropdown>
            </Space>
          )
        }
        styles={{ body: { padding: 0  }}}
        style={{ height: isFullscreen ? '100vh' : 'auto' }}
      >
        <Row style={{ height: isFullscreen ? 'calc(100vh - 60px)' : 'auto' }}>
          {/* 左侧文档列表 */}
          {showDocumentList && (
            <Col 
              span={compactMode ? 24 : 6} 
              style={{ 
                borderRight: compactMode ? 'none' : '1px solid #f0f0f0'
              }}
            >
              <div style={{ padding: '16px 0' }}>
                <div style={{ margin: '0 16px 16px' }}>
                  <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
                    文档列表 ({documentStats.total})
                  </Title>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    排序: {documentSortBy === 'created_at' ? '创建时间' : '更新时间'} 
                    ({documentSortOrder === 'desc' ? '新→旧' : '旧→新'})
                  </div>
                </div>
                
                <Spin spinning={loading}>
                  {renderDocumentList}
                </Spin>
              </div>
            </Col>
          )}

          {/* 中间内容区域 */}
          <Col span={showDocumentList ? (compactMode ? 24 : 18) : 24}>
            <div style={{ 
              padding: '16px'
            }}>
              {renderContentArea()}
            </div>
          </Col>

          {/* 右侧文档概览 - 已移除，功能已整合到preview模式的信息面板中 */}
          {false && selectedDocument && showDocumentList && !compactMode && (
            <Col 
              span={6}
              style={{ 
                borderLeft: '1px solid #f0f0f0',
                padding: '16px',
                backgroundColor: '#fafafa',
                height: isFullscreen ? 'calc(100vh - 60px)' : 'auto',
                overflowY: 'auto'
              }}
            >
              <div>
                <Title level={5} style={{ margin: '0 0 16px 0', color: '#1890ff' }}>
                  📊 文档概览
                </Title>
                
                {/* 基本信息 */}
                <Card 
                   
                  title="📋 基本信息" 
                  style={{ marginBottom: 16 }}
                  styles={{ body: { padding: '12px'  }}}
                >
                  <Space direction="vertical"  style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">类型:</Text>
                      <Tag color="blue">{selectedDocument.type?.toUpperCase()}</Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">创建:</Text>
                      <Text>{new Date(selectedDocument.created_at).toLocaleDateString()} {new Date(selectedDocument.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">更新:</Text>
                      <Text>{new Date(selectedDocument.updated_at).toLocaleDateString()} {new Date(selectedDocument.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">作者:</Text>
                      <Text>@{selectedDocument.created_by || 'system'}</Text>
                    </div>
                    {selectedDocument.file_size && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">大小:</Text>
                        <Text>{Math.round(selectedDocument.file_size / 1024)}KB</Text>
                      </div>
                    )}
                  </Space>
                </Card>

                {/* 统计信息 */}
                <Card 
                   
                  title="📈 统计信息" 
                  style={{ marginBottom: 16 }}
                  styles={{ body: { padding: '12px'  }}}
                >
                  <Space direction="vertical"  style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">字数:</Text>
                      <Text>{selectedDocument.content?.length || 0} 字符</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">版本:</Text>
                      <Text>v{selectedDocument.version || 1}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">状态:</Text>
                      <Tag color={selectedDocument.status === 'published' ? 'green' : 'orange'}>
                        {selectedDocument.status === 'published' ? '已发布' : '草稿'}
                      </Tag>
                    </div>
                  </Space>
                </Card>

                {/* 标签分类 */}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <Card 
                     
                    title="🏷️ 标签分类" 
                    style={{ marginBottom: 16 }}
                    styles={{ body: { padding: '12px'  }}}
                  >
                    <Space wrap>
                      {selectedDocument.tags.map((tag, index) => (
                        <Tag key={index} color="blue">{tag}</Tag>
                      ))}
                    </Space>
                  </Card>
                )}

                {/* 快速操作 */}
                <Card 
                   
                  title="⚡ 快速操作" 
                  style={{ marginBottom: 16 }}
                  styles={{ body: { padding: '12px'  }}}
                >
                  <Space direction="vertical"  style={{ width: '100%' }}>
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />} 
                       
                      block
                      onClick={() => handleDocumentEdit(selectedDocument)}
                    >
                      编辑文档
                    </Button>
                    <Button 
                      icon={<DownloadOutlined />} 
                       
                      block
                      onClick={() => handleDocumentDownload(selectedDocument)}
                    >
                      下载文档
                    </Button>
                    <Button 
                      icon={<ShareAltOutlined />} 
                       
                      block
                      onClick={() => {
                        navigator.clipboard.writeText(`/projects/${selectedDocument.project_id}/tasks/${selectedDocument.task_id}/documents/${selectedDocument.id}`);
                        message.success('文档链接已复制');
                      }}
                    >
                      分享链接
                    </Button>
                    <TaskDocumentVersionHistoryButton
                      projectId={projectId}
                      taskId={taskId}
                      selectedDocument={selectedDocument}
                      size="middle"
                      type="default"
                      style={{ width: '100%' }}
                      onVersionUpdate={(result) => {
                        // 当版本更新时，刷新文档列表
                        if (result.type === 'rollback' && result.result.success) {
                          loadDocuments();
                        }
                      }}
                    />
                    <Button 
                      danger 
                      icon={<DeleteOutlined />} 
                       
                      block
                      onClick={() => {
                        Modal.confirm({
                          title: '确认删除',
                          content: `确定要删除文档 "${selectedDocument.title}" 吗？`,
                          okText: '删除',
                          okType: 'danger',
                          onOk: () => handleDocumentDelete(selectedDocument)
                        });
                      }}
                    >
                      删除文档
                    </Button>
                  </Space>
                </Card>

                {/* 版本历史 */}
                <Card 
                   
                  title={
                    <Space>
                      <HistoryOutlined />
                      <span>📚 版本历史</span>
                    </Space>
                  } 
                  styles={{ body: { padding: '12px'  }}}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666' }}>
                      当前版本: v{selectedDocument.version || 1}
                    </div>
                    <TaskDocumentVersionHistoryButton
                      projectId={projectId}
                      taskId={taskId}
                      selectedDocument={selectedDocument}
                      size="middle"
                      type="primary"
                      style={{ width: '100%' }}
                      onVersionUpdate={(result) => {
                        // 当版本更新时，刷新文档列表
                        if (result.type === 'rollback' && result.result.success) {
                          loadDocuments();
                        }
                      }}
                    />
                  </Space>
                </Card>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* 高级文档管理器模态框 */}
      {managerVisible && (
        <ErrorBoundary>
          <Suspense fallback={<Spin />}>
            <TaskDocumentManager
              projectId={projectId}
              taskId={taskId}
              visible={managerVisible}
              onClose={() => setManagerVisible(false)}
              mode="modal"
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* 新建文档模态框 */}
      <Modal
        title="新建文档"
        open={newDocumentModalVisible}
        onOk={handleCreateNewDocument}
        onCancel={() => {
          setNewDocumentModalVisible(false);
          setNewDocumentForm({ title: '', type: 'markdown', description: '' });
        }}
        okText="创建"
        cancelText="取消"
        width={600}
        okButtonProps={{ disabled: !newDocumentForm.title.trim() }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              文档标题 <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <Input
              placeholder="请输入文档标题"
              value={newDocumentForm.title}
              onChange={(e) => setNewDocumentForm(prev => ({ ...prev, title: e.target.value }))}
              maxLength={100}
              showCount
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              文档类型
            </label>
            <Space>
              <Button
                type={newDocumentForm.type === 'markdown' ? 'primary' : 'default'}
                icon={<FileTextOutlined />}
                onClick={() => setNewDocumentForm(prev => ({ ...prev, type: 'markdown' }))}
              >
                Markdown
              </Button>
              <Button
                type={newDocumentForm.type === 'text' ? 'primary' : 'default'}
                icon={<FileTextOutlined />}
                onClick={() => setNewDocumentForm(prev => ({ ...prev, type: 'text' }))}
              >
                纯文本
              </Button>
            </Space>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              文档描述
            </label>
            <TextArea
              placeholder="请输入文档描述 (可选)"
              value={newDocumentForm.description}
              onChange={(e) => setNewDocumentForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              maxLength={500}
              showCount
            />
          </div>
          
          <Alert
            message="提示"
            description={`将创建一个${newDocumentForm.type === 'markdown' ? 'Markdown' : '纯文本'}格式的新文档，创建后将自动打开编辑模式。`}
            type="info"
            showIcon
          />
        </Space>
      </Modal>

      {/* AI文档创建对话框 */}
      <Suspense fallback={<Spin />}>
        <CreateAIDocDialog
          visible={aiDocDialogVisible}
          taskId={taskId}
          projectId={projectId}
          onClose={() => setAiDocDialogVisible(false)}
          onSuccess={() => {
            message.success('AI文档创建成功');
            loadDocuments(); // 刷新文档列表
            setAiDocDialogVisible(false);
          }}
        />
      </Suspense>
    </div>
  );

  if (isFullscreen) {
    return createPortal(__content, document.body);
  }
  return __content;
}, (prevProps, nextProps) => {
  // 自定义比较函数 - 只有关键props变化才重渲染
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.taskId === nextProps.taskId &&
    prevProps.defaultViewMode === nextProps.defaultViewMode &&
    prevProps.includeSubtaskDocuments === nextProps.includeSubtaskDocuments &&
    prevProps.compactMode === nextProps.compactMode &&
    prevProps.showToolbar === nextProps.showToolbar &&
    prevProps.showDocumentList === nextProps.showDocumentList
  );
});

export default UnifiedTaskDocumentArea;
