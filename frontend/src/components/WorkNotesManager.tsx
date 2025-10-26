import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  notification,
  Skeleton,
  Popconfirm,
  Tag,
  Space,
  Tooltip,
  Card,
  Spin,
  Typography,
  Row,
  Col,
  Badge,
  Checkbox,
  Dropdown,
  Divider,
  FloatButton
} from 'antd';
import TreeSelect from 'antd/es/tree-select';
import { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FileMarkdownOutlined,
  FilterOutlined,
  SwapOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  CopyOutlined,
  BookOutlined,
  StarOutlined,
  InboxOutlined,
  UndoOutlined,
  LockOutlined,
  TeamOutlined,
  GlobalOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { workNotesService, WorkNote, CreateWorkNoteRequest, UpdateWorkNoteRequest, WorkNoteFolder } from '../services/workNotesService';
import WorkNoteConversionModal from './conversion/WorkNoteConversionModal';
import ModernWorkNoteViewer from './ModernWorkNoteViewer';
import { WORK_NOTE_TYPES, WORK_NOTE_PRIORITIES, getWorkNoteTypeConfig, getWorkNotePriorityConfig } from '../constants/workNoteTypes';
import WorkNotesStatsCards from './WorkNotesStatsCards';
import WorkNotesLayout from './WorkNotesLayout';
import WorkNotesFilterBar from './WorkNotesFilterBar';
import WorkNoteFolderTree from './WorkNoteFolderTree';
import WorkNoteThreeTreesView from './WorkNoteThreeTreesView';
import FolderBreadcrumb from './FolderBreadcrumb';
import FolderDetailDrawer from './FolderDetailDrawer';
import { FolderDialog, DeleteFolderDialog, MoveFolderDialog, FolderFormValues } from './FolderDialogs';
import {
  deletionManager,
  getCurrentUserInfo,
  showUndoNotification,
  parseErrorMessage
} from '../utils/deletionManager';
import { workNotesStorage } from '../utils/workNotesStorage';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 关联任务接口
interface AssociatedTask {
  id: number;
  title: string;
  status: string;
  project_id: number;
  project_name: string;
}

// 扩展的工作笔记接口
interface WorkNoteWithTask extends WorkNote {
  associatedTasks?: AssociatedTask[];
  categoryIcon?: string;
  categoryName?: string;
}

// 统计数据接口
interface WorkNotesStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
  associated: number;
}

// 分类统计接口
interface CategoryStats {
  categories: {
    [key: string]: {
      count: number;
      icon: string;
      color: string;
    }
  };
  tags: {
    [key: string]: number;
  };
  associations: {
    associated: number;
    unassociated: number;
    convertible: number;
  };
  timeRanges: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    earlier: number;
  };
}

interface WorkNotesManagerProps {
  selectedFolderId?: number | null;
  onDocumentSelect?: (doc: WorkNote) => void;
}

// 定义树类型
type TreeType = 'private' | 'team' | 'public';

const WorkNotesManager: React.FC<WorkNotesManagerProps> = memo(({
  selectedFolderId,
  onDocumentSelect
}) => {
  // 基础状态
  const [workNotes, setWorkNotes] = useState<WorkNoteWithTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 文件夹状态
  const [internalFolderId, setInternalFolderId] = useState<number | null>(null);
  const [currentFolder, setCurrentFolder] = useState<WorkNoteFolder | null>(null);
  const [folders, setFolders] = useState<WorkNoteFolder[]>([]);

  // 当前选中的树类型（用于过滤笔记）
  const [currentTreeType, setCurrentTreeType] = useState<TreeType>('private');

  // 默认使用三棵树视图（已移除传统视图）
  const useThreeTreesView = true;

  // 文件夹操作对话框状态
  const [folderDialogVisible, setFolderDialogVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WorkNoteFolder | undefined>(undefined);
  const [deletingFolder, setDeletingFolder] = useState<WorkNoteFolder | undefined>(undefined);
  const [movingFolder, setMovingFolder] = useState<WorkNoteFolder | undefined>(undefined);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [detailFolder, setDetailFolder] = useState<WorkNoteFolder | undefined>(undefined);
  const [parentFolderId, setParentFolderId] = useState<number | undefined>(undefined);

  // 使用外部prop或内部state
  const activeFolderId = selectedFolderId !== undefined ? selectedFolderId : internalFolderId;

  // 批量操作状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // API缓存和重试状态
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  // 统计数据
  const [stats, setStats] = useState<WorkNotesStats>({
    total: 0,
    draft: 0,
    published: 0,
    archived: 0,
    associated: 0
  });

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [timeRangeFilter, setTimeRangeFilter] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  // 对话框状态
  const [modernViewerVisible, setModernViewerVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [currentWorkNote, setCurrentWorkNote] = useState<WorkNote | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm] = Form.useForm();
  const [quickCreateForm] = Form.useForm();
  const [quickCreateVisible, setQuickCreateVisible] = useState(false);

  // 使用防抖的搜索关键词
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');

  // 使用 ref 追踪最新的 state 值，避免闭包陷阱
  const workNotesRef = useRef<WorkNoteWithTask[]>([]);
  const lastRefreshTimeRef = useRef<number>(0);

  // 加载统计数据（从后端API获取真实数据）
  const loadStats = useCallback(async () => {
    try {
      const statsData = await workNotesService.getWorkNoteStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load work note stats:', error);
      // 如果API失败，使用默认值，不影响主要功能
      setStats({
        total: 0,
        draft: 0,
        published: 0,
        archived: 0,
        associated: 0
      });
    }
  }, []);

  // 检查是否是ID搜索
  const isIdSearch = (query: string): boolean => {
    return query.startsWith('#') && /^#\d+$/.test(query);
  };

  // 通过ID搜索工作笔记
  const searchById = async (id: number): Promise<WorkNote[]> => {
    try {
      const workNote = await workNotesService.getWorkNote(id);
      return [workNote];
    } catch (error) {
      console.warn(`Work note with ID ${id} not found:`, error);
      return [];
    }
  };

  // 同步 ref 和 state（必须在所有useState/useRef之后，其他useEffect之前）
  useEffect(() => {
    workNotesRef.current = workNotes;
  }, [workNotes]);

  useEffect(() => {
    lastRefreshTimeRef.current = lastRefreshTime;
  }, [lastRefreshTime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 使用 useMemo 优化筛选数据性能
  const filteredNotes = useMemo(() => {
    let filtered = [...workNotes];
    
    // 关键词搜索
    if (debouncedSearchKeyword.trim()) {
      const keyword = debouncedSearchKeyword.trim();
      
      if (isIdSearch(keyword)) {
        // ID搜索 (格式: #123)
        const id = parseInt(keyword.substring(1));
        if (!isNaN(id)) {
          filtered = filtered.filter(note => note.id === id);
        }
      } else {
        // 常规搜索
        const lowerKeyword = keyword.toLowerCase();
        filtered = filtered.filter(note =>
          note.title.toLowerCase().includes(lowerKeyword) ||
          note.content?.toLowerCase().includes(lowerKeyword) ||
          note.id.toString().includes(keyword)
        );
      }
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(note => note.status === statusFilter);
    }

    // 类型筛选
    if (typeFilter !== 'all') {
      filtered = filtered.filter(note => note.type === typeFilter);
    }

    // 分类筛选
    if (categoryFilter) {
      filtered = filtered.filter(note => note.work_note_type === categoryFilter);
    }

    // 标签筛选 (包含任一选中标签)
    if (tagFilter.length > 0) {
      filtered = filtered.filter(note =>
        note.tags?.some(tag => tagFilter.includes(tag))
      );
    }

    // 时间范围筛选
    if (timeRangeFilter) {
      const now = Date.now();
      filtered = filtered.filter(note => {
        const createdAt = new Date(note.created_at).getTime();
        switch (timeRangeFilter) {
          case 'today':
            return createdAt >= now - 24 * 60 * 60 * 1000;
          case 'week':
            return createdAt >= now - 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return createdAt >= now - 30 * 24 * 60 * 60 * 1000;
          case 'earlier':
            return createdAt < now - 30 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });
    }

    // 快捷筛选
    if (quickFilter) {
      const now = Date.now();
      filtered = filtered.filter(note => {
        const createdAt = new Date(note.created_at).getTime();
        switch (quickFilter) {
          case 'today':
            return createdAt >= now - 24 * 60 * 60 * 1000;
          case 'week':
            return createdAt >= now - 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return createdAt >= now - 30 * 24 * 60 * 60 * 1000;
          case 'associated':
            return note.associatedTasks && note.associatedTasks.length > 0;
          case 'unassociated':
            return !note.associatedTasks || note.associatedTasks.length === 0;
          default:
            return true;
        }
      });
    }

    // 按ID降序排序（默认）
    return filtered.sort((a, b) => b.id - a.id);
  }, [workNotes, debouncedSearchKeyword, statusFilter, typeFilter, categoryFilter, tagFilter, timeRangeFilter, quickFilter]);

  // 准备分类数据
  const categories = useMemo(() => {
    return Object.keys(WORK_NOTE_TYPES).map(type => {
      const config = getWorkNoteTypeConfig(type);
      const count = workNotes.filter(n => n.work_note_type === type).length;
      return {
        value: type,
        label: config.label,
        icon: config.icon,
        count
      };
    });
  }, [workNotes]);

  // 准备标签数据
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    workNotes.forEach(note => {
      note.tags?.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [workNotes]);

  // 准备时间范围统计
  const timeRanges = useMemo(() => {
    const now = Date.now();
    return {
      today: workNotes.filter(n => new Date(n.created_at).getTime() >= now - 24 * 60 * 60 * 1000).length,
      thisWeek: workNotes.filter(n => new Date(n.created_at).getTime() >= now - 7 * 24 * 60 * 60 * 1000).length,
      thisMonth: workNotes.filter(n => new Date(n.created_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000).length,
      earlier: workNotes.filter(n => new Date(n.created_at).getTime() < now - 30 * 24 * 60 * 60 * 1000).length
    };
  }, [workNotes]);

  // 文件夹选择处理
  const handleFolderSelect = useCallback((folderId: number | null, folder: WorkNoteFolder | null) => {
    setInternalFolderId(folderId);
    setCurrentFolder(folder);
    // 清空缓存强制刷新
    setLastRefreshTime(0);
  }, []);

  // 将文件夹转换为TreeSelect数据
  const buildFolderTreeData = useCallback((folders: WorkNoteFolder[], parentId: number | null = null): any[] => {
    return folders
      .filter(f => f.parent_id === parentId)
      .map(folder => ({
        title: folder.name,
        value: folder.id,
        key: folder.id,
        icon: <FolderOutlined style={{ color: folder.color || '#1890ff' }} />,
        children: buildFolderTreeData(folders, folder.id)
      }));
  }, []);

  // 加载文件夹列表 - 从三棵树加载
  const loadFolders = useCallback(async () => {
    try {
      const allFolders: WorkNoteFolder[] = [];
      const treeTypes: ('private' | 'team' | 'public')[] = ['private', 'team', 'public'];

      for (const treeType of treeTypes) {
        try {
          const response = await workNotesService.getFolderTreeByType(treeType, undefined, 10);
          console.log(`[WorkNotesManager] Loaded ${treeType} folders:`, response.folders?.length || 0);
          if (response.folders) {
            allFolders.push(...response.folders);
          }
        } catch (error) {
          console.error(`Failed to load ${treeType} folders:`, error);
          // 继续加载其他树
        }
      }

      console.log('[WorkNotesManager] Total folders loaded:', allFolders.length, allFolders);
      setFolders(allFolders);
    } catch (error: any) {
      console.error('加载文件夹列表失败:', error);
      message.error('加载文件夹失败');
    }
  }, []);

  // 文件夹操作回调
  const handleFolderCreate = useCallback((parentId?: number) => {
    setParentFolderId(parentId);
    setEditingFolder(undefined);
    setFolderDialogVisible(true);
  }, []);

  const handleFolderEdit = useCallback((folderId: number) => {
    const findFolder = (folders: WorkNoteFolder[], id: number): WorkNoteFolder | undefined => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    const folder = findFolder(folders, folderId);
    setEditingFolder(folder);
    setParentFolderId(undefined);
    setFolderDialogVisible(true);
  }, [folders]);

  const handleFolderDelete = useCallback((folderId: number) => {
    const findFolder = (folders: WorkNoteFolder[], id: number): WorkNoteFolder | undefined => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    const folder = findFolder(folders, folderId);
    setDeletingFolder(folder);
  }, [folders]);

  const handleFolderMove = useCallback((folderId: number) => {
    const findFolder = (folders: WorkNoteFolder[], id: number): WorkNoteFolder | undefined => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    const folder = findFolder(folders, folderId);
    setMovingFolder(folder);
  }, [folders]);

  const handleFolderDetail = useCallback((folderId: number) => {
    const findFolder = (folders: WorkNoteFolder[], id: number): WorkNoteFolder | undefined => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    const folder = findFolder(folders, folderId);
    setDetailFolder(folder);
    setDetailDrawerVisible(true);
  }, [folders]);

  // 文件夹对话框确认操作
  const handleFolderDialogConfirm = useCallback(async (values: FolderFormValues) => {
    try {
      if (editingFolder) {
        await workNotesService.updateFolder(editingFolder.id, values);
        message.success('文件夹更新成功');
      } else {
        // 创建文件夹时确保包含所有必需字段
        await workNotesService.createFolder({
          name: values.name,
          description: values.description,
          parent_id: values.parent_id,
          visibility: values.visibility || 'private', // 确保visibility有值
          color: values.color,
          icon: values.icon,
        });
        message.success('文件夹创建成功');
      }
      await loadFolders();
      setFolderDialogVisible(false);
      setEditingFolder(undefined);
      setParentFolderId(undefined);
    } catch (error: any) {
      console.error('文件夹操作失败:', error);
      message.error(error.message || '操作失败');
    }
  }, [editingFolder, loadFolders]);

  const handleDeleteFolderConfirm = useCallback(async (force: boolean) => {
    if (!deletingFolder) return;
    try {
      await workNotesService.deleteFolder(deletingFolder.id);
      message.success('文件夹删除成功');
      await loadFolders();
      setDeletingFolder(undefined);
      // 如果删除的是当前文件夹，清空选择
      if (activeFolderId === deletingFolder.id) {
        setInternalFolderId(null);
        setCurrentFolder(null);
      }
    } catch (error: any) {
      console.error('删除文件夹失败:', error);
      message.error(error.message || '删除失败');
    }
  }, [deletingFolder, activeFolderId, loadFolders]);

  const handleMoveFolderConfirm = useCallback(async (targetParentId: number | null) => {
    if (!movingFolder) return;
    try {
      await workNotesService.moveFolder(movingFolder.id, targetParentId);
      message.success('文件夹移动成功');
      await loadFolders();
      setMovingFolder(undefined);
    } catch (error: any) {
      console.error('移动文件夹失败:', error);
      message.error(error.message || '移动失败');
    }
  }, [movingFolder, loadFolders]);

  // 加载文件夹列表
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // 优化的加载工作笔记函数，支持缓存和重试
  const loadWorkNotes = useCallback(async (forceRefresh = false) => {
    // 检查缓存时间，5分钟内不重复请求
    const now = Date.now();
    const cacheTimeout = 5 * 60 * 1000; // 5分钟

    // 使用 ref 来检查缓存，避免依赖 state 导致循环
    if (!forceRefresh && workNotesRef.current.length > 0 && (now - lastRefreshTimeRef.current) < cacheTimeout) {
      console.log('使用缓存的工作笔记数据');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 使用AbortController支持请求取消
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      // 根据当前树类型过滤笔记
      const data = await workNotesService.listWorkNotes(
        activeFolderId || undefined,
        undefined, // page
        undefined, // limit
        currentTreeType // 传递当前树类型进行过滤
      );
      clearTimeout(timeoutId);

      // 模拟添加关联任务数据
      const notesWithTasks: WorkNoteWithTask[] = data.documents.map(note => ({
        ...note,
        associatedTasks: Math.random() > 0.6 ? [
          {
            id: Math.floor(Math.random() * 1000),
            title: '示例任务',
            status: 'in_progress',
            project_id: 1,
            project_name: '示例项目'
          }
        ] : undefined,
        categoryIcon: '📝',
        categoryName: '前端开发'
      }));

      setWorkNotes(notesWithTasks);
      setLastRefreshTime(now);
      setRetryCount(0); // 重置重试计数

      // 加载统计数据（异步，不阻塞笔记列表显示）
      loadStats();

      console.log(`成功加载 ${notesWithTasks.length} 个工作笔记`);
    } catch (error) {
      console.error('Failed to load work notes:', error);
      const errorMessage = error instanceof Error ? error.message : '加载工作笔记失败';
      setError(errorMessage);

      // 自动重试逻辑（最多3次）
      if (retryCount < 3) {
        console.log(`第 ${retryCount + 1} 次重试加载工作笔记...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadWorkNotes(forceRefresh), 2000 * (retryCount + 1)); // 递增延迟重试
      } else {
        message.error(`${errorMessage}（已重试${retryCount}次）`);
      }
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, loadStats, retryCount, currentTreeType]); // 添加currentTreeType依赖

  // 初始化加载
  useEffect(() => {
    loadWorkNotes();
  }, [loadWorkNotes]);

  // 重置过滤器
  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchKeyword('');
    setCategoryFilter(null);
    setTagFilter([]);
    setTimeRangeFilter(null);
    setQuickFilter(null);
  }, []);

  // 快速创建工作笔记
  const handleQuickCreate = async (values: any) => {
    try {
      const createRequest: CreateWorkNoteRequest = {
        title: values.title,
        content: values.content || '',
        folder_id: activeFolderId || undefined,
        type: 'markdown',
        work_note_type: 'general',
        priority: 'medium',
        status: 'draft',
        visibility: 'private',
        is_template: false,
        is_pinned: false,
        is_bookmarked: false,
        tags: values.tags || [],
      };

      await workNotesService.createWorkNote(createRequest);
      message.success('快速创建成功！');
      setQuickCreateVisible(false);
      quickCreateForm.resetFields();
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to quick create work note:', error);
      message.error('快速创建失败');
    }
  };

  // 更新工作笔记
  const handleUpdate = async (values: any) => {
    try {
      if (!currentWorkNote) return;
      setSaving(true);

      // 构建规范的UpdateWorkNoteRequest
      const updateRequest: UpdateWorkNoteRequest = {
        title: values.title,
        content: values.content,
        description: values.description || '',
        status: values.status,
        visibility: values.visibility,
        folder_id: values.folder_id,  // 必填
        tags: values.tags || [],
      };

      console.log('[WorkNotesManager] Updating work note:', currentWorkNote.id, updateRequest);

      const result = await workNotesService.updateWorkNote(
        currentWorkNote.id,
        updateRequest
      );

      console.log('[WorkNotesManager] Update success:', result);

      message.success('工作笔记更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentWorkNote(null);

      // 刷新列表
      await loadWorkNotes();
    } catch (error: any) {
      console.error('[WorkNotesManager] Failed to update work note:', error);
      message.error(error.message || '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 删除工作笔记 - 增强版本（带撤销和日志）
  const handleDelete = async (id: number) => {
    const note = workNotes.find(n => n.id === id);
    if (!note) {
      message.error('找不到要删除的笔记');
      return;
    }

    // 添加到删除队列
    if (!deletionManager.addToQueue(note)) {
      // 如果添加失败（重复删除），直接返回
      return;
    }

    const userInfo = getCurrentUserInfo();
    let undoTimeoutId: NodeJS.Timeout | null = null;
    let isUndone = false;

    // 撤销函数
    const handleUndo = () => {
      isUndone = true;
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
      deletionManager.removeFromQueue(id);
      deletionManager.logDeletion({
        userId: userInfo.userId,
        username: userInfo.username,
        noteId: id,
        noteTitle: note.title,
        operationType: 'single',
        status: 'cancelled',
        undoAvailable: false,
      });
      message.info(`已取消删除笔记: ${note.title}`);
      console.log(`[Delete] 用户撤销了笔记 #${id} 的删除`);
    };

    // 显示撤销通知
    showUndoNotification(note, handleUndo, 5);

    // 设置5秒延迟后执行实际删除
    undoTimeoutId = setTimeout(async () => {
      if (isUndone) {
        return;
      }

      try {
        // 更新队列状态为删除中
        deletionManager.updateQueueItemStatus(id, 'deleting');

        // 执行删除
        await workNotesService.deleteWorkNote(id);

        // 更新队列状态为成功
        deletionManager.updateQueueItemStatus(id, 'success');

        // 记录成功日志
        deletionManager.logDeletion({
          userId: userInfo.userId,
          username: userInfo.username,
          noteId: id,
          noteTitle: note.title,
          operationType: 'single',
          status: 'success',
          undoAvailable: false,
        });

        console.log(`[Delete] 成功删除笔记 #${id} "${note.title}"`);

        // 从队列中移除
        deletionManager.removeFromQueue(id);

        // 刷新列表
        loadWorkNotes(true);
      } catch (error: any) {
        const errorInfo = parseErrorMessage(error);

        // 更新队列状态为失败
        deletionManager.updateQueueItemStatus(id, 'failed', errorInfo.technicalMessage);

        // 记录失败日志
        deletionManager.logDeletion({
          userId: userInfo.userId,
          username: userInfo.username,
          noteId: id,
          noteTitle: note.title,
          operationType: 'single',
          status: 'failed',
          errorMessage: errorInfo.technicalMessage,
          undoAvailable: false,
        });

        console.error(`[Delete] 删除笔记 #${id} 失败:`, errorInfo.technicalMessage);
        message.error(errorInfo.userMessage);

        // 如果可重试，询问用户
        if (errorInfo.retryable) {
          Modal.confirm({
            title: '删除失败',
            content: `${errorInfo.userMessage}，是否重试？`,
            okText: '重试',
            cancelText: '取消',
            onOk: () => handleDelete(id),
          });
        }

        // 从队列中移除
        deletionManager.removeFromQueue(id);
      }
    }, 5000);
  };

  // 复制工作笔记
  const handleCopy = async (id: number) => {
    try {
      await workNotesService.copyWorkNote(id);
      message.success('工作笔记复制成功');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to copy work note:', error);
      message.error('复制失败');
    }
  };

  // 切换模板状态
  const handleToggleTemplate = async (id: number) => {
    try {
      await workNotesService.toggleTemplate(id);
      message.success('模板状态更新成功');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to toggle template:', error);
      message.error('更新失败');
    }
  };

  // 切换收藏状态
  const handleToggleBookmark = async (workNote: WorkNote) => {
    try {
      const newBookmarkStatus = !workNote.is_bookmarked;
      await workNotesService.updateWorkNote(workNote.id, {
        is_bookmarked: newBookmarkStatus
      });
      message.success(newBookmarkStatus ? '已收藏' : '已取消收藏');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      message.error('操作失败');
    }
  };

  // 切换置顶状态
  const handleTogglePin = async (workNote: WorkNote) => {
    try {
      const newPinStatus = !workNote.is_pinned;
      await workNotesService.updateWorkNote(workNote.id, {
        is_pinned: newPinStatus
      });
      message.success(newPinStatus ? '已置顶' : '已取消置顶');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      message.error('操作失败');
    }
  };

  // 查看工作笔记
  const handleView = (workNote: WorkNote) => {
    setCurrentWorkNote(workNote);
    setModernViewerVisible(true);
    if (onDocumentSelect) {
      onDocumentSelect(workNote);
    }
  };

  // 打开编辑对话框
  const openEditModal = (workNote: WorkNote) => {
    setCurrentWorkNote(workNote);
    editForm.setFieldsValue({
      title: workNote.title,
      description: workNote.description,
      content: workNote.content,
      type: workNote.type,
      work_note_type: workNote.work_note_type,
      priority: workNote.priority,
      status: workNote.status,
      visibility: workNote.visibility,
      folder_id: workNote.folder_id, // 添加文件夹ID
      tags: workNote.tags,
      is_pinned: workNote.is_pinned,
      is_bookmarked: workNote.is_bookmarked,
    });
    setEditModalVisible(true);
  };

  // 打开转换对话框
  const openConversionModal = (workNote: WorkNote) => {
    setCurrentWorkNote(workNote);
    setConversionModalVisible(true);
  };

  // 转换成功回调
  const handleConversionSuccess = (result: any) => {
    message.success('转换成功！任务文档已创建');
    setConversionModalVisible(false);
    loadWorkNotes();
  };

  // 批量操作功能 - 增强版本（带撤销、队列管理和详细日志）
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的笔记');
      return;
    }

    const notesToDelete = workNotes.filter(note => selectedRowKeys.includes(note.id));
    const userInfo = getCurrentUserInfo();

    Modal.confirm({
      title: '批量删除确认',
      content: (
        <div>
          <div style={{ marginBottom: 12 }}>
            确定要删除选中的 <strong>{notesToDelete.length}</strong> 个工作笔记吗？
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            笔记将在5秒内可撤销，之后将永久删除
          </div>
        </div>
      ),
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        // 批量添加到队列
        const addedNotes = deletionManager.addBatchToQueue(notesToDelete);
        if (addedNotes.length === 0) {
          message.warning('所有笔记都已在删除队列中');
          return;
        }

        let isUndone = false;
        let undoTimeoutId: NodeJS.Timeout | null = null;

        // 撤销函数
        const handleUndo = () => {
          isUndone = true;
          if (undoTimeoutId) {
            clearTimeout(undoTimeoutId);
          }

          // 从队列中移除所有笔记
          addedNotes.forEach(note => {
            deletionManager.removeFromQueue(note.id);
            deletionManager.logDeletion({
              userId: userInfo.userId,
              username: userInfo.username,
              noteId: note.id,
              noteTitle: note.title,
              operationType: 'batch',
              status: 'cancelled',
              undoAvailable: false,
            });
          });

          message.info(`已取消删除 ${addedNotes.length} 个笔记`);
          console.log(`[BatchDelete] 用户撤销了 ${addedNotes.length} 个笔记的批量删除`);
        };

        // 显示撤销通知（使用第一个笔记的信息）
        notification.success({
          message: `批量删除 ${addedNotes.length} 个笔记`,
          description: (
            <div>
              <div style={{ marginBottom: 8 }}>
                笔记列表: {addedNotes.slice(0, 3).map(n => n.title).join(', ')}
                {addedNotes.length > 3 && ` 等${addedNotes.length}个`}
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                5秒内可撤销
              </div>
            </div>
          ),
          duration: 5,
          btn: (
            <button
              onClick={() => {
                handleUndo();
                notification.destroy();
              }}
              style={{
                padding: '4px 12px',
                background: '#1890ff',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <UndoOutlined /> 撤销全部
            </button>
          ),
          placement: 'bottomRight',
        });

        // 设置5秒延迟后执行批量删除
        undoTimeoutId = setTimeout(async () => {
          if (isUndone) {
            return;
          }

          try {
            setBatchLoading(true);
            let successCount = 0;
            let failureCount = 0;
            const failedNotes: { note: WorkNote; error: string }[] = [];

            // 分批处理，避免同时发送过多请求
            const batchSize = 5;
            for (let i = 0; i < addedNotes.length; i += batchSize) {
              const batch = addedNotes.slice(i, i + batchSize);
              const promises = batch.map(async (note) => {
                try {
                  // 更新队列状态
                  deletionManager.updateQueueItemStatus(note.id, 'deleting');

                  // 执行删除
                  await workNotesService.deleteWorkNote(note.id);

                  // 更新队列状态为成功
                  deletionManager.updateQueueItemStatus(note.id, 'success');

                  // 记录成功日志
                  deletionManager.logDeletion({
                    userId: userInfo.userId,
                    username: userInfo.username,
                    noteId: note.id,
                    noteTitle: note.title,
                    operationType: 'batch',
                    status: 'success',
                    undoAvailable: false,
                  });

                  successCount++;
                  console.log(`[BatchDelete] 成功删除笔记 #${note.id} "${note.title}"`);

                  // 从队列中移除
                  deletionManager.removeFromQueue(note.id);
                } catch (error: any) {
                  const errorInfo = parseErrorMessage(error);

                  // 更新队列状态为失败
                  deletionManager.updateQueueItemStatus(note.id, 'failed', errorInfo.technicalMessage);

                  // 记录失败日志
                  deletionManager.logDeletion({
                    userId: userInfo.userId,
                    username: userInfo.username,
                    noteId: note.id,
                    noteTitle: note.title,
                    operationType: 'batch',
                    status: 'failed',
                    errorMessage: errorInfo.technicalMessage,
                    undoAvailable: false,
                  });

                  failureCount++;
                  failedNotes.push({ note, error: errorInfo.userMessage });
                  console.error(`[BatchDelete] 删除笔记 #${note.id} 失败:`, errorInfo.technicalMessage);

                  // 从队列中移除
                  deletionManager.removeFromQueue(note.id);
                }
              });

              await Promise.all(promises);

              // 显示进度
              if (addedNotes.length > batchSize) {
                message.loading(
                  `正在删除... ${Math.min(i + batchSize, addedNotes.length)}/${addedNotes.length}`,
                  0.5
                );
              }
            }

            // 显示最终结果
            if (successCount > 0) {
              if (failureCount === 0) {
                message.success(`成功删除 ${successCount} 个工作笔记`);
              } else {
                Modal.warning({
                  title: '批量删除部分成功',
                  content: (
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        成功删除 <strong>{successCount}</strong> 个笔记
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        失败 <strong>{failureCount}</strong> 个笔记
                      </div>
                      {failedNotes.length > 0 && (
                        <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 12 }}>
                          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                            失败详情:
                          </div>
                          {failedNotes.map(({ note, error }) => (
                            <div key={note.id} style={{ fontSize: 12, marginBottom: 4 }}>
                              • #{note.id} {note.title}: {error}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                  width: 500,
                });
              }
              setSelectedRowKeys([]);
              loadWorkNotes(true); // 强制刷新
            } else {
              message.error('批量删除全部失败');
            }

            console.log(`[BatchDelete] 批量删除完成 - 成功: ${successCount}, 失败: ${failureCount}`);
          } catch (error) {
            console.error('[BatchDelete] 批量删除失败:', error);
            message.error('批量删除失败');
          } finally {
            setBatchLoading(false);
          }
        }, 5000);
      }
    });
  };

  const handleBatchStatusUpdate = async (status: 'draft' | 'published' | 'archived' | 'template') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要更新的笔记');
      return;
    }

    try {
      setBatchLoading(true);
      const promises = selectedRowKeys.map(id =>
        workNotesService.updateWorkNote(Number(id), { status })
      );
      await Promise.all(promises);
      
      const statusText = {
        'published': '已发布',
        'draft': '草稿',
        'archived': '已归档'
      }[status] || status;
      
      message.success(`成功将 ${selectedRowKeys.length} 个笔记更新为${statusText}`);
      setSelectedRowKeys([]);
      loadWorkNotes();
    } catch (error) {
      console.error('批量状态更新失败:', error);
      message.error('批量状态更新失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchCopy = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要复制的笔记');
      return;
    }

    try {
      setBatchLoading(true);
      const promises = selectedRowKeys.map(id => workNotesService.copyWorkNote(Number(id)));
      await Promise.all(promises);
      message.success(`成功复制 ${selectedRowKeys.length} 个工作笔记`);
      setSelectedRowKeys([]);
      loadWorkNotes();
    } catch (error) {
      console.error('批量复制失败:', error);
      message.error('批量复制失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchToggleTemplate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的笔记');
      return;
    }

    try {
      setBatchLoading(true);
      const promises = selectedRowKeys.map(id => workNotesService.toggleTemplate(Number(id)));
      await Promise.all(promises);
      message.success(`成功切换 ${selectedRowKeys.length} 个笔记的模板状态`);
      setSelectedRowKeys([]);
      loadWorkNotes();
    } catch (error) {
      console.error('批量模板状态切换失败:', error);
      message.error('批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
    onSelectAll: (selected: boolean, selectedRows: WorkNoteWithTask[], changeRows: WorkNoteWithTask[]) => {
      if (selected) {
        const allKeys = filteredNotes.map(note => note.id);
        setSelectedRowKeys(allKeys);
      } else {
        setSelectedRowKeys([]);
      }
    },
    onSelect: (record: WorkNoteWithTask, selected: boolean) => {
      if (selected) {
        setSelectedRowKeys(prev => [...prev, record.id]);
      } else {
        setSelectedRowKeys(prev => prev.filter(key => key !== record.id));
      }
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
      {
        key: 'select-published',
        text: '选择已发布',
        onSelect: () => {
          const publishedKeys = filteredNotes
            .filter(note => note.status === 'published')
            .map(note => note.id);
          setSelectedRowKeys(publishedKeys);
        },
      },
      {
        key: 'select-draft',
        text: '选择草稿',
        onSelect: () => {
          const draftKeys = filteredNotes
            .filter(note => note.status === 'draft')
            .map(note => note.id);
          setSelectedRowKeys(draftKeys);
        },
      },
    ],
  };

  // 批量操作菜单
  const batchActionsMenu = {
    items: [
      {
        key: 'batch-publish',
        label: '批量发布',
        icon: <CheckOutlined />,
        onClick: () => handleBatchStatusUpdate('published'),
      },
      {
        key: 'batch-draft',
        label: '批量转为草稿',
        icon: <EditOutlined />,
        onClick: () => handleBatchStatusUpdate('draft'),
      },
      {
        key: 'batch-archive',
        label: '批量归档',
        icon: <InboxOutlined />,
        onClick: () => handleBatchStatusUpdate('archived'),
      },
      { type: 'divider' as const },
      {
        key: 'batch-copy',
        label: '批量复制',
        icon: <CopyOutlined />,
        onClick: handleBatchCopy,
      },
      {
        key: 'batch-template',
        label: '批量切换模板状态',
        icon: <BookOutlined />,
        onClick: handleBatchToggleTemplate,
      },
      { type: 'divider' as const },
      {
        key: 'batch-delete',
        label: '批量删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: handleBatchDelete,
      },
    ],
  };




  // 过滤后的数据

  // 响应式布局检测
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 组件初始化时恢复筛选条件
  useEffect(() => {
    const savedFilters = workNotesStorage.getFilters();
    if (savedFilters) {
      if (savedFilters.statusFilter) setStatusFilter(savedFilters.statusFilter);
      if (savedFilters.categoryFilter) setCategoryFilter(savedFilters.categoryFilter);
      if (savedFilters.tagFilter) setTagFilter(savedFilters.tagFilter);
      if (savedFilters.timeRangeFilter) setTimeRangeFilter(savedFilters.timeRangeFilter);
      if (savedFilters.quickFilter) setQuickFilter(savedFilters.quickFilter);
    }
  }, []);

  // 筛选条件变化时保存
  useEffect(() => {
    workNotesStorage.saveFilters({
      statusFilter,
      categoryFilter,
      tagFilter,
      timeRangeFilter,
      quickFilter
    });
  }, [statusFilter, categoryFilter, tagFilter, timeRangeFilter, quickFilter]);

  // 搜索防抖 - 300ms延迟
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width < 1024;
  
  // 使用 useMemo 优化表格列定义
  const columns: ColumnsType<WorkNoteWithTask> = useMemo(() => [
    {
      title: '笔记ID',
      dataIndex: 'id',
      key: 'id',
      width: isMobile ? 60 : 90,
      fixed: 'left' as const,
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => b.id - a.id,
      defaultSortOrder: 'descend' as const,
      responsive: ['md'],
      render: (id: number) => (
        <Button
          type="link"
          style={{ 
            fontFamily: 'monospace', 
            fontWeight: 'bold',
            color: '#1890ff',
            padding: 0,
            height: 'auto',
            fontSize: isMobile ? '10px' : '12px'
          }}
          onClick={() => handleView(filteredNotes.find(note => note.id === id)!)}
        >
          #{id}
        </Button>
      ),
    },
    {
      title: '笔记标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => 
        a.title.localeCompare(b.title),
      render: (title: string, record: WorkNoteWithTask) => (
        <div style={{ minWidth: isMobile ? 150 : 200 }}>
          <div style={{ 
            fontWeight: 500, 
            marginBottom: 2,
            cursor: 'pointer',
            color: '#1890ff',
            fontSize: isMobile ? 13 : 14
          }}
          onClick={() => handleView(record)}
          title={title}
          >
            {record.categoryIcon} {isMobile ? (title.length > 20 ? title.substring(0, 20) + '...' : title) : title}
          </div>
          {!isMobile && (
            <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: 1.4 }}>
              <Space size={4} wrap>
                <span>{record.categoryName}</span>
                {record.associatedTasks && record.associatedTasks.length > 0 && (
                  <span>🔗{record.associatedTasks.length}个任务</span>
                )}
                {record.tags && record.tags.length > 0 && 
                  record.tags.slice(0, 2).map(tag => (
                    <span key={tag} style={{ color: '#52c41a' }}>#{tag}</span>
                  ))
                }
              </Space>
            </div>
          )}
          {isMobile && (
            <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 4 }}>
              #{record.id} • {record.status === 'published' ? '✓' : record.status === 'draft' ? '📝' : '📦'}
              {record.associatedTasks && record.associatedTasks.length > 0 && <span> • 🔗{record.associatedTasks.length}</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '关联',
      key: 'associationStatus',
      width: isMobile ? 60 : 80,
      align: 'center' as const,
      responsive: ['sm'],
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => {
        const aAssociated = a.associatedTasks && a.associatedTasks.length > 0;
        const bAssociated = b.associatedTasks && b.associatedTasks.length > 0;
        if (aAssociated && !bAssociated) return -1;
        if (!aAssociated && bAssociated) return 1;
        return 0;
      },
      filters: [
        { text: '已关联', value: 'associated' },
        { text: '未关联', value: 'unassociated' },
      ],
      onFilter: (value: any, record: WorkNoteWithTask) => {
        if (value === 'associated') return record.associatedTasks && record.associatedTasks.length > 0;
        if (value === 'unassociated') return !record.associatedTasks || record.associatedTasks.length === 0;
        return true;
      },
      render: (_, record: WorkNoteWithTask) => {
        const hasAssociation = record.associatedTasks && record.associatedTasks.length > 0;
        return (
          <div style={{ textAlign: 'center' }}>
            {hasAssociation ? (
              <Tooltip title={`已关联 ${record.associatedTasks!.length} 个任务`}>
                <Badge count={record.associatedTasks!.length} style={{ backgroundColor: '#52c41a' }}>
                  🔗
                </Badge>
              </Tooltip>
            ) : (
              <span style={{ color: '#d9d9d9', fontSize: 16 }}>○</span>
            )}
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: isMobile ? 60 : 80,
      align: 'center' as const,
      responsive: ['md'],
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => a.status.localeCompare(b.status),
      filters: [
        { text: '草稿', value: 'draft' },
        { text: '已发布', value: 'published' },
        { text: '已归档', value: 'archived' },
      ],
      onFilter: (value: any, record: WorkNoteWithTask) => record.status === value,
      render: (status: string) => {
        const getStatusConfig = (status: string) => {
          switch (status) {
            case 'published': return { color: '#52c41a', icon: '✓', text: '已发布' };
            case 'draft': return { color: '#faad14', icon: '📝', text: '草稿' };
            case 'archived': return { color: '#8c8c8c', icon: '📦', text: '已归档' };
            default: return { color: '#d9d9d9', icon: '?', text: status };
          }
        };
        const config = getStatusConfig(status);
        return (
          <Tooltip title={config.text}>
            <span style={{
              color: config.color,
              fontSize: 16,
              cursor: 'help'
            }}>
              {config.icon}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: isMobile ? 60 : 80,
      align: 'center' as const,
      responsive: ['md'],
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => a.visibility.localeCompare(b.visibility),
      filters: [
        { text: '私人', value: 'private' },
        { text: '团队', value: 'team' },
        { text: '公开', value: 'public' },
      ],
      onFilter: (value: any, record: WorkNoteWithTask) => record.visibility === value,
      render: (visibility: string) => {
        const getVisibilityConfig = (visibility: string) => {
          switch (visibility) {
            case 'private': return { color: '#1890ff', icon: <LockOutlined />, text: '私人' };
            case 'team': return { color: '#52c41a', icon: <TeamOutlined />, text: '团队' };
            case 'public': return { color: '#fa8c16', icon: <GlobalOutlined />, text: '公开' };
            default: return { color: '#d9d9d9', icon: <LockOutlined />, text: visibility };
          }
        };
        const config = getVisibilityConfig(visibility);
        return (
          <Tooltip title={config.text}>
            <span style={{
              color: config.color,
              fontSize: 14,
              cursor: 'help'
            }}>
              {config.icon}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: isMobile ? 80 : 120,
      align: 'center' as const,
      responsive: ['lg'],
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) =>
        dayjs(a.updated_at).unix() - dayjs(b.updated_at).unix(),
      render: (date: string) => {
        if (!date || !dayjs(date).isValid()) {
          return (
            <div style={{ fontSize: isMobile ? 10 : 11, color: '#bfbfbf' }}>
              <div>未知</div>
              <div>时间</div>
            </div>
          );
        }
        return (
          <div style={{ fontSize: isMobile ? 10 : 11 }}>
            <div>{dayjs(date).format('MM-DD')}</div>
            <div style={{ color: '#8c8c8c' }}>{dayjs(date).format('HH:mm')}</div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: isMobile ? 80 : 100,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_, record: WorkNoteWithTask) => (
        <Space size={isMobile ? 2 : 4}>
          <Tooltip title="查看笔记">
            <Button
              type="text"
              size={isMobile ? 'small' : 'small'}
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              style={{ color: '#1890ff', fontSize: isMobile ? 12 : 14 }}
            />
          </Tooltip>
          {!isMobile && (
            <Tooltip title="编辑笔记">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
          {!isMobile && (
            <Tooltip title="转换为任务文档">
              <Button
                type="text"
                size="small"
                icon={<SwapOutlined />}
                onClick={() => openConversionModal(record)}
                style={{ color: '#fa8c16' }}
              />
            </Tooltip>
          )}
          {isMobile && (
            <Tooltip title="更多操作">
              <Button
                type="text"
                size="small"
                icon={<span style={{ fontSize: 12 }}>⋯</span>}
                onClick={() => handleView(record)}
                style={{ color: '#8c8c8c' }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], [isMobile, filteredNotes, handleView, openEditModal, openConversionModal]);

  return (
    <div style={{ padding: isMobile ? '8px' : '12px' }}>


      {/* 统计卡片 */}
      <WorkNotesStatsCards stats={stats} loading={loading} />

      {/* 主要内容区域 */}
      <WorkNotesLayout
        sidebar={
          <div>
            {/* 文件夹树形导航 */}
            <Card
              title={
                <Space>
                  <BookOutlined />
                  <span>笔记分类</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 12 }}
            >
              <WorkNoteThreeTreesView
                selectedFolderId={activeFolderId}
                onFolderSelect={handleFolderSelect}
                onFolderCreate={handleFolderCreate}
                onFolderEdit={handleFolderEdit}
                onFolderDelete={handleFolderDelete}
                onFolderMove={handleFolderMove}
                onFolderDetail={handleFolderDetail}
                onTreeTypeChange={setCurrentTreeType}
                height="400px"
                defaultTreeType="private"
              />
            </Card>
          </div>
        }
      >
        {/* 搜索和筛选区 */}
        <Card style={{ marginBottom: isMobile ? 12 : 16 }}>
          <WorkNotesFilterBar
            searchKeyword={searchKeyword}
            onSearchChange={(value) => {
              setSearchKeyword(value);
              if (value.trim()) {
                setSearchLoading(true);
                setTimeout(() => setSearchLoading(false), 300);
              }
            }}
            searchLoading={searchLoading}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            categories={categories}
            tagFilter={tagFilter}
            onTagChange={setTagFilter}
            availableTags={availableTags}
            timeRangeFilter={timeRangeFilter}
            onTimeRangeChange={setTimeRangeFilter}
            timeRanges={timeRanges}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            onClearFilters={resetFilters}
            onCreate={() => setQuickCreateVisible(true)}
            totalCount={workNotes.length}
            filteredCount={filteredNotes.length}
            isMobile={isMobile}
          />
        </Card>

        {/* 文件夹面包屑导航 */}
        {activeFolderId && currentFolder && (
          <FolderBreadcrumb
            folder={currentFolder}
            folders={folders}
            onNavigate={(folderId) => {
              if (folderId === null) {
                setInternalFolderId(null);
                setCurrentFolder(null);
              } else {
                const findFolder = (folders: WorkNoteFolder[], id: number): WorkNoteFolder | undefined => {
                  for (const folder of folders) {
                    if (folder.id === id) return folder;
                    if (folder.children) {
                      const found = findFolder(folder.children, id);
                      if (found) return found;
                    }
                  }
                  return undefined;
                };
                const folder = findFolder(folders, folderId);
                if (folder) {
                  setInternalFolderId(folderId);
                  setCurrentFolder(folder);
                }
              }
            }}
            maxItems={5}
            showIcon={true}
          />
        )}

        {/* 批量操作工具栏 */}
        {selectedRowKeys.length > 0 && (
          <Card style={{ marginBottom: isMobile ? 12 : 16, borderColor: '#1890ff' }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Space>
                  <Text strong style={{ color: '#1890ff' }}>
                    已选择 {selectedRowKeys.length} 个笔记
                  </Text>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={() => setSelectedRowKeys([])}
                    icon={<CloseOutlined />}
                  >
                    取消选择
                  </Button>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => handleBatchStatusUpdate('published')}
                    loading={batchLoading}
                    size={isMobile ? 'small' : 'middle'}
                  >
                    批量发布
                  </Button>
                  <Dropdown 
                    menu={batchActionsMenu} 
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button 
                      icon={<DownOutlined />}
                      loading={batchLoading}
                      size={isMobile ? 'small' : 'middle'}
                    >
                      更多操作
                    </Button>
                  </Dropdown>
                </Space>
              </Col>
            </Row>
          </Card>
        )}

        {/* 工作笔记表格 */}
        <Card>
          {error && (
            <div style={{ 
              padding: 16, 
              marginBottom: 16, 
              background: '#fff2f0', 
              border: '1px solid #ffccc7',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ color: '#ff4d4f' }}>⚠️ {error}</span>
                {retryCount > 0 && (
                  <div style={{ fontSize: 12, color: '#ff7875', marginTop: 4 }}>
                    已自动重试 {retryCount} 次
                  </div>
                )}
              </div>
              <Space>
                <Button 
                  size="small" 
                  type="link" 
                  onClick={() => loadWorkNotes(true)}
                  loading={loading}
                >
                  重试
                </Button>
                <Button 
                  size="small" 
                  type="text" 
                  onClick={() => setError(null)}
                  icon={<span style={{ fontSize: 12 }}>✕</span>}
                />
              </Space>
            </div>
          )}
          
          {loading ? (
            <div style={{ padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: '#8c8c8c' }}>
                  正在加载工作笔记...
                  {retryCount > 0 && <span>（第{retryCount + 1}次尝试）</span>}
                </div>
              </div>
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredNotes}
              rowKey="id"
              loading={false}
              size="small"
              rowSelection={rowSelection}
              pagination={{
                total: filteredNotes.length,
                pageSize: 15,
                pageSizeOptions: ['10', '15', '30', '50'],
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 个笔记`,
                responsive: true,
                position: ['topRight', 'bottomRight'],
              }}
              scroll={{
                x: isMobile ? 600 : 800,
                y: isMobile ? 'calc(100vh - 450px)' : 'calc(100vh - 320px)'
              }}
              locale={{
                emptyText: (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }}>
                      {error ? '😞' : filteredNotes.length === 0 && workNotes.length > 0 ? '🔍' : '📝'}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 16, marginBottom: 8 }}>
                      {error 
                        ? '数据加载失败' 
                        : filteredNotes.length === 0 && workNotes.length > 0 
                        ? '没有找到匹配的笔记' 
                        : '暂无工作笔记'
                      }
                    </div>
                    <div style={{ color: '#bfbfbf', fontSize: 12 }}>
                      {error ? (
                        <Space>
                          <Button type="link" size="small" onClick={() => loadWorkNotes(true)}>
                            重新加载
                          </Button>
                          <Button type="text" size="small" onClick={() => setError(null)}>
                            忽略错误
                          </Button>
                        </Space>
                      ) : filteredNotes.length === 0 && workNotes.length > 0 ? (
                        <Space>
                          <Button type="link" size="small" onClick={resetFilters}>
                            清空筛选条件
                          </Button>
                          <span>或尝试其他关键词</span>
                        </Space>
                      ) : (
                        <Space>
                          <Button 
                            type="primary" 
                            size="small" 
                            icon={<PlusOutlined />}
                            onClick={() => setQuickCreateVisible(true)}
                          >
                            创建第一个笔记
                          </Button>
                          <Button 
                            type="text" 
                            size="small"
                            onClick={() => loadWorkNotes(true)}
                          >
                            刷新数据
                          </Button>
                        </Space>
                      )}
                    </div>
                  </div>
                )
              }}
            />
          )}
        </Card>
      </WorkNotesLayout>

      {/* 现代化笔记查看器 */}
      <ModernWorkNoteViewer
        visible={modernViewerVisible}
        note={currentWorkNote}
        onClose={() => {
          setModernViewerVisible(false);
          setCurrentWorkNote(null);
        }}
        onEdit={(note) => {
          setModernViewerVisible(false);
          openEditModal(note);
        }}
      />

      {/* 编辑笔记对话框 */}
      <Modal
        title={`编辑笔记 - ${currentWorkNote?.title || ''}`}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentWorkNote(null);
          editForm.resetFields();
        }}
        width={900}
        style={{ top: '5vh' }}
        bodyStyle={{
          maxHeight: '65vh',
          overflowY: 'auto',
          padding: '24px'
        }}
        destroyOnClose
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入笔记标题" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="请输入笔记描述（可选）" />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              rows={12}
              placeholder="请输入笔记内容"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                  <Option value="draft">草稿</Option>
                  <Option value="published">已发布</Option>
                  <Option value="archived">已归档</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="type"
                label="类型"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                  <Option value="markdown">Markdown</Option>
                  <Option value="html">HTML</Option>
                  <Option value="text">文本</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="visibility"
                label="可见性"
                rules={[{ required: true, message: '请选择可见性' }]}
              >
                <Select getPopupContainer={(trigger) => trigger.parentElement || document.body}>
                  <Option value="private">私有</Option>
                  <Option value="team">团队</Option>
                  <Option value="public">公开</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="folder_id"
            label="所属文件夹"
            rules={[{ required: true, message: '请选择所属文件夹' }]}
          >
            <TreeSelect
              showSearch
              style={{ width: '100%' }}
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              placeholder="请选择文件夹"
              treeDefaultExpandAll
              treeData={buildFolderTreeData(folders)}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              filterTreeNode={(input, node) =>
                (node.title as string).toLowerCase().includes(input.toLowerCase())
              }
              onDropdownVisibleChange={(open) => {
                console.log('[TreeSelect] Dropdown visible:', open, 'Folders:', folders.length, 'TreeData:', buildFolderTreeData(folders).length);
              }}
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="请输入标签（支持多个）"
              style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 转换为任务文档对话框 */}
      <WorkNoteConversionModal
        visible={conversionModalVisible}
        workNote={currentWorkNote}
        onClose={() => {
          setConversionModalVisible(false);
          setCurrentWorkNote(null);
        }}
        onConversionSuccess={handleConversionSuccess}
      />

      {/* 快速创建对话框 */}
      <Modal
        title="快速创建工作笔记"
        open={quickCreateVisible}
        onOk={() => quickCreateForm.submit()}
        onCancel={() => {
          setQuickCreateVisible(false);
          quickCreateForm.resetFields();
        }}
        width={600}
        okText="立即创建"
        cancelText="取消"
      >
        <Form
          form={quickCreateForm}
          layout="vertical"
          onFinish={handleQuickCreate}
        >
          <Form.Item
            name="title"
            label="笔记标题"
            rules={[{ required: true, message: '请输入笔记标题' }]}
          >
            <Input 
              placeholder="输入笔记标题..."
              autoFocus
            />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="笔记内容"
          >
            <TextArea
              rows={6}
              placeholder="快速记录你的想法..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 浮动操作按钮 */}
      {!isMobile && (
        <FloatButton.Group
          trigger="hover"
          type="primary"
          style={{ right: 24 }}
          icon={<PlusOutlined />}
          tooltip="快速操作"
        >
          <FloatButton
            icon={<PlusOutlined />}
            tooltip="快速创建笔记"
            onClick={() => setQuickCreateVisible(true)}
          />
          <FloatButton
            icon={<BookOutlined />}
            tooltip="从模板创建"
            onClick={() => message.info('模板功能即将推出')}
          />
        </FloatButton.Group>
      )}

      {/* 文件夹操作对话框 */}
      <FolderDialog
        visible={folderDialogVisible}
        onClose={() => {
          setFolderDialogVisible(false);
          setEditingFolder(undefined);
          setParentFolderId(undefined);
        }}
        onConfirm={handleFolderDialogConfirm}
        folder={editingFolder}
        parentId={parentFolderId}
        folders={folders}
      />

      <DeleteFolderDialog
        visible={!!deletingFolder}
        onClose={() => setDeletingFolder(undefined)}
        onConfirm={handleDeleteFolderConfirm}
        folder={deletingFolder}
      />

      <MoveFolderDialog
        visible={!!movingFolder}
        onClose={() => setMovingFolder(undefined)}
        onConfirm={handleMoveFolderConfirm}
        folder={movingFolder}
        folders={folders}
      />

      <FolderDetailDrawer
        visible={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setDetailFolder(undefined);
        }}
        folder={detailFolder || null}
        onEdit={(folder) => {
          setDetailDrawerVisible(false);
          setEditingFolder(folder);
          setFolderDialogVisible(true);
        }}
        onDelete={(folder) => {
          setDetailDrawerVisible(false);
          setDeletingFolder(folder);
        }}
      />

    </div>
  );
});

WorkNotesManager.displayName = 'WorkNotesManager';

export default WorkNotesManager;