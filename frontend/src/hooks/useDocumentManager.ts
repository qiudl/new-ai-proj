/**
 * 文档管理器专用Hook
 * 提供状态管理、数据获取、缓存等功能
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { message } from 'antd';
import { Document, DocumentListItem, DocumentFilter } from '../types/document';
import unifiedDocumentService from '../services/unifiedDocumentService';
import { useCache } from './useCache';

interface UseDocumentManagerOptions {
  mode: 'simple' | 'advanced';
  projectId?: number;
  folderId?: number;
  initialPageSize?: number;
  enableCache?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface DocumentManagerState {
  documents: Document[] | DocumentListItem[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  searchText: string;
  filterStatus: string;
  filterType: string;
  sortBy: 'updated_at' | 'created_at' | 'title';
  sortOrder: 'asc' | 'desc';
  selectedDocuments: number[];
  isSelectMode: boolean;
}

const useDocumentManager = (options: UseDocumentManagerOptions) => {
  const {
    mode,
    projectId,
    folderId,
    initialPageSize = 20,
    enableCache = true,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  // 基础状态
  const [state, setState] = useState<DocumentManagerState>({
    documents: [],
    total: 0,
    loading: false,
    error: null,
    page: 1,
    pageSize: initialPageSize,
    searchText: '',
    filterStatus: 'all',
    filterType: 'all',
    sortBy: 'updated_at',
    sortOrder: 'desc',
    selectedDocuments: [],
    isSelectMode: false
  });

  // 缓存Hook (temporarily disabled due to interface mismatch)
  // const { data: cachedData, clearCache } = useCache<Document[]>(
  //   `documents-${mode}-${projectId || folderId || 'all'}`,
  //   async () => [], // placeholder fetcher
  //   { ttl: 5 * 60 * 1000 }
  // );

  // 防抖定时器
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // 构建查询参数
  const getQueryParams = useCallback(() => {
    const params: any = {
      page: state.page,
      limit: state.pageSize,
      sort_by: state.sortBy,
      order: state.sortOrder
    };

    if (projectId) params.project_id = projectId;
    if (folderId) params.folder_id = folderId;
    if (state.searchText) params.search = state.searchText;
    if (state.filterStatus !== 'all') params.status = state.filterStatus;
    if (state.filterType !== 'all') params.type = state.filterType;

    return params;
  }, [
    state.page,
    state.pageSize,
    state.sortBy,
    state.sortOrder,
    state.searchText,
    state.filterStatus,
    state.filterType,
    projectId,
    folderId
  ]);

  // 加载文档数据
  const loadDocuments = useCallback(async (useCache = true) => {
    try {
      // 避免重复请求
      if (state.loading) return;

      setState(prev => ({ ...prev, loading: true, error: null }));

      const params = getQueryParams();

      // 性能优化：使用更高效的API调用模式
      const filter = mode === 'advanced'
        ? { folder_id: folderId }
        : (params as DocumentFilter);

      const result = await unifiedDocumentService.listDocuments(filter);

      // Handle response
      const documents = result.documents || [];
      const total = result.total || documents.length;

      setState(prev => ({
        ...prev,
        documents: documents as any,
        total,
        loading: false
      }));

    } catch (error: Error | unknown) {
      const errorMessage = (error as any).message || '加载文档失败';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      message.error(errorMessage);
    }
  }, [
    mode,
    folderId,
    getQueryParams,
    state.loading // 添加loading依赖避免重复请求
  ]);

  // 防抖搜索
  const debouncedSearch = useCallback((searchText: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        searchText,
        page: 1 // 搜索时重置到第一页
      }));
    }, 300);
  }, []);

  // 状态更新方法
  const updateState = useCallback((updates: Partial<DocumentManagerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 重置状态
  const resetState = useCallback(() => {
    setState(prev => ({
      ...prev,
      page: 1,
      searchText: '',
      filterStatus: 'all',
      filterType: 'all',
      selectedDocuments: [],
      isSelectMode: false
    }));
  }, []);

  // 刷新数据
  const refresh = useCallback(() => {
    // clearCache(); // Cache disabled
    loadDocuments(false);
  }, [loadDocuments]);

  // 文档操作方法
  const documentActions = useMemo(() => ({
    // 删除文档
    deleteDocument: async (documentId: number) => {
      try {
        await unifiedDocumentService.deleteDocument(documentId);
        message.success('文档删除成功');
        
        // 从状态中移除文档
        setState(prev => ({
          ...prev,
          documents: (prev.documents as any[]).filter((doc: any) => doc.id !== documentId),
          selectedDocuments: prev.selectedDocuments.filter(id => id !== documentId),
          total: prev.total - 1
        }));
        
        // clearCache(); // Disabled cache
      } catch (error: Error | unknown) {
        message.error((error as any).message || '删除文档失败');
      }
    },

    // 批量删除
    batchDelete: async (documentIds: number[]) => {
      try {
        await Promise.all(documentIds.map(id => 
          unifiedDocumentService.deleteDocument(id)
        ));
        
        message.success(`成功删除 ${documentIds.length} 个文档`);
        
        setState(prev => ({
          ...prev,
          documents: (prev.documents as any[]).filter((doc: any) => !documentIds.includes(doc.id)),
          selectedDocuments: [],
          isSelectMode: false,
          total: prev.total - documentIds.length
        }));
        
        // clearCache(); // Disabled cache
      } catch (error: Error | unknown) {
        message.error('批量删除失败');
      }
    },

    // 切换选择模式
    toggleSelectMode: () => {
      setState(prev => ({
        ...prev,
        isSelectMode: !prev.isSelectMode,
        selectedDocuments: []
      }));
    },

    // 切换文档选择
    toggleDocumentSelection: (documentId: number) => {
      setState(prev => ({
        ...prev,
        selectedDocuments: prev.selectedDocuments.includes(documentId)
          ? prev.selectedDocuments.filter(id => id !== documentId)
          : [...prev.selectedDocuments, documentId]
      }));
    },

    // 全选/取消全选
    toggleSelectAll: () => {
      setState(prev => ({
        ...prev,
        selectedDocuments: prev.selectedDocuments.length === prev.documents.length
          ? []
          : prev.documents.map(doc => doc.id)
      }));
    }
  }), []);

  // 分页控制
  const pagination = useMemo(() => ({
    current: state.page,
    pageSize: state.pageSize,
    total: state.total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `第 ${range[0]}-${range[1]} 项，共 ${total} 个文档`,
    onChange: (page: number, pageSize?: number) => {
      setState(prev => ({
        ...prev,
        page,
        pageSize: pageSize || prev.pageSize
      }));
    }
  }), [state.page, state.pageSize, state.total]);

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [
    state.page,
    state.pageSize,
    state.sortBy,
    state.sortOrder,
    state.searchText,
    state.filterStatus,
    state.filterType
  ]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(() => {
        loadDocuments(false);
      }, refreshInterval);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, loadDocuments]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    // 状态
    ...state,
    
    // 控制方法
    updateState,
    resetState,
    refresh,
    debouncedSearch,
    
    // 文档操作
    ...documentActions,
    
    // 分页
    pagination,
    
    // 工具方法
    loadDocuments: () => loadDocuments(false),
    // clearCache, // Cache disabled
    
    // 计算属性
    hasDocuments: state.documents.length > 0,
    hasSelection: state.selectedDocuments.length > 0,
    isAllSelected: state.selectedDocuments.length === state.documents.length && state.documents.length > 0,
    
    // 过滤后的文档（用于本地过滤）
    filteredDocuments: useMemo(() => {
      const filtered = [...state.documents];
      
      // 这里可以添加额外的本地过滤逻辑
      // 比如客户端侧的实时搜索过滤等
      
      return filtered;
    }, [state.documents])
  };
};

export default useDocumentManager;