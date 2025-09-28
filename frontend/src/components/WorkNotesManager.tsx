import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
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
  InboxOutlined
} from '@ant-design/icons';
import { workNotesService, WorkNote, CreateWorkNoteRequest, UpdateWorkNoteRequest } from '../services/workNotesService';
import WorkNoteConversionModal from './conversion/WorkNoteConversionModal';
import ModernWorkNoteViewer from './ModernWorkNoteViewer';
import { WORK_NOTE_TYPES, WORK_NOTE_PRIORITIES, getWorkNoteTypeConfig, getWorkNotePriorityConfig } from '../constants/workNoteTypes';
import WorkNotesStatsCards from './WorkNotesStatsCards';
import WorkNotesLayout from './WorkNotesLayout';
import WorkNotesTreeSidebar from './WorkNotesTreeSidebar';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedAssociation, setSelectedAssociation] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('');
  
  // 对话框状态
  const [modernViewerVisible, setModernViewerVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [currentWorkNote, setCurrentWorkNote] = useState<WorkNote | null>(null);
  
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [quickCreateForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [quickCreateVisible, setQuickCreateVisible] = useState(false);

  // 计算统计数据
  const calculateStats = useCallback((notes: WorkNoteWithTask[]): WorkNotesStats => {
    return {
      total: notes.length,
      draft: notes.filter(note => note.status === 'draft').length,
      published: notes.filter(note => note.status === 'published').length,
      archived: notes.filter(note => note.status === 'archived').length,
      associated: notes.filter(note => note.associatedTasks && note.associatedTasks.length > 0).length
    };
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


  // 使用防抖的搜索关键词
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  
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
    if (selectedCategory) {
      filtered = filtered.filter(note => 
        note.categoryName?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        selectedCategory === 'frontend' && note.categoryName?.includes('前端') ||
        selectedCategory === 'backend' && note.categoryName?.includes('后端') ||
        selectedCategory === 'ui-design' && note.categoryName?.includes('UI') ||
        selectedCategory === 'data-analysis' && note.categoryName?.includes('数据')
      );
    }

    // 标签筛选
    if (selectedTag) {
      filtered = filtered.filter(note => 
        note.tags?.some(tag => tag.includes(selectedTag))
      );
    }

    // 关联状态筛选
    if (selectedAssociation) {
      if (selectedAssociation === 'associated') {
        filtered = filtered.filter(note => note.associatedTasks && note.associatedTasks.length > 0);
      } else if (selectedAssociation === 'unassociated') {
        filtered = filtered.filter(note => !note.associatedTasks || note.associatedTasks.length === 0);
      } else if (selectedAssociation === 'convertible') {
        // 简单模拟可转换逻辑
        filtered = filtered.filter(note => note.status === 'published' && (!note.associatedTasks || note.associatedTasks.length === 0));
      }
    }

    // 时间范围筛选
    if (selectedTimeRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(note => {
        const noteDate = new Date(note.updated_at);
        switch (selectedTimeRange) {
          case 'today':
            return noteDate >= today;
          case 'thisWeek':
            return noteDate >= thisWeekStart;
          case 'thisMonth':
            return noteDate >= thisMonthStart;
          case 'earlier':
            return noteDate < thisMonthStart;
          default:
            return true;
        }
      });
    }

    // 按ID降序排序（默认）
    return filtered.sort((a, b) => b.id - a.id);
  }, [workNotes, debouncedSearchKeyword, statusFilter, typeFilter, selectedCategory, selectedTag, selectedAssociation, selectedTimeRange]);

  // 优化的加载工作笔记函数，支持缓存和重试
  const loadWorkNotes = useCallback(async (forceRefresh = false) => {
    // 检查缓存时间，5分钟内不重复请求
    const now = Date.now();
    const cacheTimeout = 5 * 60 * 1000; // 5分钟
    
    if (!forceRefresh && workNotes.length > 0 && (now - lastRefreshTime) < cacheTimeout) {
      console.log('使用缓存的工作笔记数据');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 使用AbortController支持请求取消
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
      
      const data = await workNotesService.listWorkNotes(selectedFolderId || undefined);
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
      setStats(calculateStats(notesWithTasks));
      setLastRefreshTime(now);
      setRetryCount(0); // 重置重试计数
      
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
  }, [selectedFolderId, calculateStats, workNotes.length, lastRefreshTime, retryCount]);

  // 初始化加载
  useEffect(() => {
    loadWorkNotes();
  }, [loadWorkNotes]);

  // 重置过滤器
  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchKeyword('');
    setSelectedCategory('');
    setSelectedTag('');
    setSelectedAssociation('');
    setSelectedTimeRange('');
  }, []);

  // 左侧树状导航事件处理
  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  }, [selectedCategory]);

  const handleTagSelect = useCallback((tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  }, [selectedTag]);

  const handleAssociationSelect = useCallback((type: string) => {
    setSelectedAssociation(type === selectedAssociation ? '' : type);
  }, [selectedAssociation]);

  const handleTimeRangeSelect = useCallback((range: string) => {
    setSelectedTimeRange(range === selectedTimeRange ? '' : range);
  }, [selectedTimeRange]);

  const handleTreeRefresh = useCallback(() => {
    loadWorkNotes(true); // 强制刷新
  }, [loadWorkNotes]);

  // 创建工作笔记
  const handleCreate = async (values: any) => {
    try {
      const createRequest: CreateWorkNoteRequest = {
        ...values,
        type: values.type || 'markdown',
        work_note_type: values.work_note_type || 'general',
        priority: values.priority || 'medium',
        status: values.status || 'draft',
        visibility: values.visibility || 'private',
        is_template: false,
        is_pinned: values.is_pinned || false,
        is_bookmarked: values.is_bookmarked || false,
      };

      await workNotesService.createWorkNote(createRequest);
      message.success('工作笔记创建成功');
      setModalVisible(false);
      form.resetFields();
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to create work note:', error);
      message.error('创建失败');
    }
  };

  // 快速创建工作笔记
  const handleQuickCreate = async (values: any) => {
    try {
      const createRequest: CreateWorkNoteRequest = {
        title: values.title,
        content: values.content || '',
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

      const updateRequest: UpdateWorkNoteRequest = {
        ...values,
      };

      await workNotesService.updateWorkNote(currentWorkNote.id, updateRequest);
      message.success('工作笔记更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentWorkNote(null);
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to update work note:', error);
      message.error('更新失败');
    }
  };

  // 删除工作笔记
  const handleDelete = async (id: number) => {
    try {
      await workNotesService.deleteWorkNote(id);
      message.success('工作笔记删除成功');
      loadWorkNotes();
    } catch (error) {
      console.error('Failed to delete work note:', error);
      message.error('删除失败');
    }
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

  // 批量操作功能 - 优化版本
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的笔记');
      return;
    }

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个工作笔记吗？此操作不可恢复。`,
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          setBatchLoading(true);
          let successCount = 0;
          let failureCount = 0;
          
          // 分批处理，避免同时发送过多请求
          const batchSize = 5;
          for (let i = 0; i < selectedRowKeys.length; i += batchSize) {
            const batch = selectedRowKeys.slice(i, i + batchSize);
            const promises = batch.map(async (id) => {
              try {
                await workNotesService.deleteWorkNote(Number(id));
                successCount++;
              } catch (error) {
                failureCount++;
                console.error(`删除笔记 ${id} 失败:`, error);
              }
            });
            
            await Promise.all(promises);
            
            // 显示进度
            if (selectedRowKeys.length > batchSize) {
              message.loading(`正在删除... ${Math.min(i + batchSize, selectedRowKeys.length)}/${selectedRowKeys.length}`, 0.5);
            }
          }
          
          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 个工作笔记${failureCount > 0 ? `，失败 ${failureCount} 个` : ''}`);
            setSelectedRowKeys([]);
            loadWorkNotes(true); // 强制刷新
          } else {
            message.error('批量删除失败');
          }
        } catch (error) {
          console.error('批量删除失败:', error);
          message.error('批量删除失败');
        } finally {
          setBatchLoading(false);
        }
      }
    });
  };

  const handleBatchStatusUpdate = async (status: string) => {
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
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: isMobile ? 80 : 120,
      align: 'center' as const,
      responsive: ['lg'],
      sorter: (a: WorkNoteWithTask, b: WorkNoteWithTask) => 
        dayjs(a.updated_at).unix() - dayjs(b.updated_at).unix(),
      render: (date: string) => (
        <div style={{ fontSize: isMobile ? 10 : 11 }}>
          <div>{dayjs(date).format('MM-DD')}</div>
          <div style={{ color: '#8c8c8c' }}>{dayjs(date).format('HH:mm')}</div>
        </div>
      ),
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
    <div style={{ padding: isMobile ? '12px' : '24px' }}>


      {/* 统计卡片 */}
      <WorkNotesStatsCards stats={stats} loading={loading} />

      {/* 主要内容区域 */}
      <WorkNotesLayout
        sidebar={
          <WorkNotesTreeSidebar
            onCategorySelect={handleCategorySelect}
            onTagSelect={handleTagSelect}
            onAssociationSelect={handleAssociationSelect}
            onTimeRangeSelect={handleTimeRangeSelect}
            onRefresh={handleTreeRefresh}
            selectedCategory={selectedCategory}
            selectedTag={selectedTag}
            selectedAssociation={selectedAssociation}
            selectedTimeRange={selectedTimeRange}
          />
        }
      >
        {/* 搜索和筛选区 */}
        <Card style={{ marginBottom: isMobile ? 16 : 24 }}>
          <Row gutter={[16, 16]} align="middle" wrap>
            <Col xs={24} sm={24} md={12} lg={10} xl={8}>
              <Search
                placeholder="搜索标题、内容或输入#ID搜索..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  if (e.target.value.trim()) {
                    setSearchLoading(true);
                    setTimeout(() => setSearchLoading(false), 300);
                  }
                }}
                loading={searchLoading}
                allowClear
                prefix={<SearchOutlined />}
                style={{ width: '100%' }}
                onSearch={() => {
                  setSearchLoading(true);
                  setTimeout(() => setSearchLoading(false), 100);
                }}
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4} xl={3}>
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: '100%' }}
                size="middle"
              >
                <Option value="all">全部状态</Option>
                <Option value="draft">草稿</Option>
                <Option value="published">已发布</Option>
                <Option value="archived">已归档</Option>
              </Select>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4} xl={3}>
              <Button
                icon={<FilterOutlined />}
                onClick={resetFilters}
                style={{ width: '100%' }}
                disabled={!searchKeyword && statusFilter === 'all' && !selectedCategory && !selectedTag && !selectedAssociation && !selectedTimeRange}
              >
                清空筛选
              </Button>
            </Col>
            <Col xs={24} sm={8} md={0} lg={6} xl={10}>
              <div style={{ textAlign: 'right', color: '#8c8c8c', fontSize: 12 }}>
                显示 {filteredNotes.length} / {workNotes.length} 个笔记
                {debouncedSearchKeyword && (
                  <span style={{ marginLeft: 8, color: '#1890ff' }}>
                    🔍 "{debouncedSearchKeyword}"
                  </span>
                )}
              </div>
            </Col>
          </Row>
        </Card>

        {/* 批量操作工具栏 */}
        {selectedRowKeys.length > 0 && (
          <Card style={{ marginBottom: isMobile ? 16 : 24, borderColor: '#1890ff' }}>
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
                y: isMobile ? 'calc(100vh - 500px)' : 'calc(100vh - 400px)' 
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
        width={800}
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
                <Select>
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
                <Select>
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
                <Select>
                  <Option value="private">私有</Option>
                  <Option value="team">团队</Option>
                  <Option value="public">公开</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="请输入标签（支持多个）"
              style={{ width: '100%' }}
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
          <FloatButton
            icon={<FileMarkdownOutlined />}
            tooltip="完整创建"
            onClick={() => setModalVisible(true)}
          />
        </FloatButton.Group>
      )}

    </div>
  );
});

WorkNotesManager.displayName = 'WorkNotesManager';

export default WorkNotesManager;