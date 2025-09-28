import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { documentService, UnifiedDocument, DocumentFilter } from '../services/documentService';
import { errorLogger } from '../utils/ErrorLogger';

// 状态接口定义
interface DocumentState {
  documents: UnifiedDocument[];
  selectedDocument: UnifiedDocument | null;
  loading: boolean;
  error: string | null;
  filters: DocumentFilter;
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    recent: number;
  };
  cache: Map<string, { data: UnifiedDocument[]; timestamp: number }>;
  lastUpdate: number;
}

// 动作类型定义
type DocumentAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DOCUMENTS'; payload: UnifiedDocument[] }
  | { type: 'SET_SELECTED_DOCUMENT'; payload: UnifiedDocument | null }
  | { type: 'UPDATE_DOCUMENT'; payload: UnifiedDocument }
  | { type: 'DELETE_DOCUMENT'; payload: number }
  | { type: 'SET_FILTERS'; payload: Partial<DocumentFilter> }
  | { type: 'CLEAR_CACHE' }
  | { type: 'SET_CACHE'; payload: { key: string; data: UnifiedDocument[] } };

// Context 接口定义
interface DocumentContextType {
  state: DocumentState;
  actions: {
    loadDocuments: (filters?: Partial<DocumentFilter>, forceRefresh?: boolean) => Promise<void>;
    createDocument: (document: Partial<UnifiedDocument>) => Promise<UnifiedDocument>;
    updateDocument: (id: number, updates: Partial<UnifiedDocument>) => Promise<void>;
    deleteDocument: (id: number) => Promise<void>;
    selectDocument: (document: UnifiedDocument | null) => void;
    setFilters: (filters: Partial<DocumentFilter>) => void;
    clearError: () => void;
    refreshStatistics: () => void;
  };
}

// 初始状态
const initialState: DocumentState = {
  documents: [],
  selectedDocument: null,
  loading: false,
  error: null,
  filters: {},
  statistics: {
    total: 0,
    byStatus: {},
    byType: {},
    recent: 0
  },
  cache: new Map(),
  lastUpdate: 0
};

// Reducer 函数
const documentReducer = (state: DocumentState, action: DocumentAction): DocumentState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
      
    case 'SET_DOCUMENTS': {
      const documents = action.payload;
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
      
      return {
        ...state,
        documents,
        statistics,
        loading: false,
        error: null,
        lastUpdate: Date.now()
      };
    }
    
    case 'SET_SELECTED_DOCUMENT':
      return { ...state, selectedDocument: action.payload };
      
    case 'UPDATE_DOCUMENT': {
      const updatedDocuments = state.documents.map(doc =>
        doc.id === action.payload.id ? { ...doc, ...action.payload } : doc
      );
      return { ...state, documents: updatedDocuments };
    }
    
    case 'DELETE_DOCUMENT': {
      const filteredDocuments = state.documents.filter(doc => doc.id !== action.payload);
      return { 
        ...state, 
        documents: filteredDocuments,
        selectedDocument: state.selectedDocument?.id === action.payload ? null : state.selectedDocument
      };
    }
    
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      };
      
    case 'CLEAR_CACHE':
      return { ...state, cache: new Map() };
      
    case 'SET_CACHE': {
      const newCache = new Map(state.cache);
      newCache.set(action.payload.key, {
        data: action.payload.data,
        timestamp: Date.now()
      });
      return { ...state, cache: newCache };
    }
    
    default:
      return state;
  }
};

// Context 创建
const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Provider 组件
interface DocumentProviderProps {
  children: ReactNode;
  cacheTimeout?: number; // 缓存超时时间（毫秒）
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ 
  children, 
  cacheTimeout = 5 * 60 * 1000 // 默认5分钟缓存 
}) => {
  const [state, dispatch] = useReducer(documentReducer, initialState);

  // 生成缓存键
  const generateCacheKey = useCallback((filters: DocumentFilter) => {
    return JSON.stringify(filters);
  }, []);

  // 检查缓存是否有效
  const isCacheValid = useCallback((key: string) => {
    const cached = state.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < cacheTimeout;
  }, [state.cache, cacheTimeout]);

  // 加载文档
  const loadDocuments = useCallback(async (
    filters: Partial<DocumentFilter> = {}, 
    forceRefresh = false
  ) => {
    const mergedFilters = { ...state.filters, ...filters };
    const cacheKey = generateCacheKey(mergedFilters);
    
    // 检查缓存
    if (!forceRefresh && isCacheValid(cacheKey)) {
      const cached = state.cache.get(cacheKey);
      if (cached) {
        dispatch({ type: 'SET_DOCUMENTS', payload: cached.data });
        errorLogger.debug('document', 'DocumentContext: 使用缓存数据', { 
          cacheKey,
          documentCount: cached.data.length 
        });
        return;
      }
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await documentService.listDocuments(mergedFilters);
      
      dispatch({ type: 'SET_DOCUMENTS', payload: response.documents });
      dispatch({ type: 'SET_CACHE', payload: { key: cacheKey, data: response.documents } });
      
      errorLogger.info('document', 'DocumentContext: 文档加载成功', {
        documentCount: response.documents.length,
        filters: mergedFilters
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载文档失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      errorLogger.error('document', 'DocumentContext: 文档加载失败', {
        error: errorMessage,
        filters: mergedFilters
      });
    }
  }, [state.filters, state.cache, generateCacheKey, isCacheValid]);

  // 创建文档
  const createDocument = useCallback(async (documentData: Partial<UnifiedDocument>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const newDocument = await documentService.createDocument(documentData);
      
      // 清除相关缓存
      dispatch({ type: 'CLEAR_CACHE' });
      
      // 重新加载文档列表
      await loadDocuments({}, true);
      
      errorLogger.info('document', 'DocumentContext: 文档创建成功', {
        documentId: newDocument.id,
        title: newDocument.title
      });
      
      return newDocument;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建文档失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      errorLogger.error('document', 'DocumentContext: 文档创建失败', {
        error: errorMessage,
        documentData
      });
      
      throw error;
    }
  }, [loadDocuments]);

  // 更新文档
  const updateDocument = useCallback(async (id: number, updates: Partial<UnifiedDocument>) => {
    try {
      const updatedDocument = await documentService.updateDocument(id, updates);
      
      dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDocument });
      dispatch({ type: 'CLEAR_CACHE' }); // 清除缓存以确保数据一致性
      
      errorLogger.info('document', 'DocumentContext: 文档更新成功', {
        documentId: id,
        updates
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新文档失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      errorLogger.error('document', 'DocumentContext: 文档更新失败', {
        error: errorMessage,
        documentId: id,
        updates
      });
      
      throw error;
    }
  }, []);

  // 删除文档
  const deleteDocument = useCallback(async (id: number) => {
    try {
      await documentService.deleteDocument(id);
      
      dispatch({ type: 'DELETE_DOCUMENT', payload: id });
      dispatch({ type: 'CLEAR_CACHE' }); // 清除缓存
      
      errorLogger.info('document', 'DocumentContext: 文档删除成功', {
        documentId: id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除文档失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      errorLogger.error('document', 'DocumentContext: 文档删除失败', {
        error: errorMessage,
        documentId: id
      });
      
      throw error;
    }
  }, []);

  // 选择文档
  const selectDocument = useCallback((document: UnifiedDocument | null) => {
    dispatch({ type: 'SET_SELECTED_DOCUMENT', payload: document });
    
    errorLogger.debug('document', 'DocumentContext: 文档选择', {
      documentId: document?.id,
      title: document?.title
    });
  }, []);

  // 设置筛选器
  const setFilters = useCallback((filters: Partial<DocumentFilter>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
    
    // 应用新筛选器时重新加载数据
    loadDocuments(filters);
  }, [loadDocuments]);

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // 刷新统计信息
  const refreshStatistics = useCallback(() => {
    // 重新计算统计信息（已在 SET_DOCUMENTS 中处理）
    loadDocuments({}, true);
  }, [loadDocuments]);

  // 自动清理过期缓存
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const newCache = new Map();
      
      for (const [key, value] of state.cache.entries()) {
        if (now - value.timestamp < cacheTimeout) {
          newCache.set(key, value);
        }
      }
      
      if (newCache.size < state.cache.size) {
        dispatch({ type: 'CLEAR_CACHE' });
        // 重新设置有效缓存
        for (const [key, value] of newCache.entries()) {
          dispatch({ type: 'SET_CACHE', payload: { key, data: value.data } });
        }
        
        errorLogger.debug('document', 'DocumentContext: 清理过期缓存', {
          originalSize: state.cache.size,
          newSize: newCache.size
        });
      }
    }, cacheTimeout);

    return () => clearInterval(cleanupInterval);
  }, [state.cache, cacheTimeout]);

  const contextValue: DocumentContextType = {
    state,
    actions: {
      loadDocuments,
      createDocument,
      updateDocument,
      deleteDocument,
      selectDocument,
      setFilters,
      clearError,
      refreshStatistics
    }
  };

  return (
    <DocumentContext.Provider value={contextValue}>
      {children}
    </DocumentContext.Provider>
  );
};

// Hook for using document context
export const useDocumentContext = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocumentContext must be used within a DocumentProvider');
  }
  return context;
};

// Selector hooks for performance optimization
export const useDocuments = () => {
  const { state } = useDocumentContext();
  return state.documents;
};

export const useSelectedDocument = () => {
  const { state } = useDocumentContext();
  return state.selectedDocument;
};

export const useDocumentStatistics = () => {
  const { state } = useDocumentContext();
  return state.statistics;
};

export const useDocumentLoading = () => {
  const { state } = useDocumentContext();
  return state.loading;
};

export const useDocumentError = () => {
  const { state } = useDocumentContext();
  return state.error;
};