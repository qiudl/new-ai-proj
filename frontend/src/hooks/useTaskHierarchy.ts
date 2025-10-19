/**
 * Unified Task Hierarchy Hook
 * 统一的任务层级结构管理Hook，替代多个组件中的类似实现
 * 
 * 主要功能：
 * - 数据获取、缓存、更新逻辑
 * - 懒加载和分页支持
 * - 错误处理和重试机制
 * - 多种显示模式支持
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { fetchTaskDescendants, fetchTaskDescendantsV2, TaskDescendantsParams } from '../services/taskService';
import { UnifiedTaskNode, TaskDescendantsApiResponse } from '../types/UnifiedTaskNode';
import { message } from 'antd';
import { enhancedCacheManager } from '../utils/enhancedCacheManager';
import { cacheEventSystem, CacheEvent } from '../utils/cacheEventSystem';
import { CacheKeyBuilder } from '../utils/cacheKeyBuilder';

// Hook配置选项
export interface UseTaskHierarchyOptions {
  /** 项目ID */
  projectId: number;
  /** 根任务ID */
  rootTaskId?: number;
  /** 初始深度 */
  initialDepth?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 是否启用懒加载 */
  enableLazyLoad?: boolean;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存超时时间(毫秒) */
  cacheTimeout?: number;
  /** 是否包含扩展字段 */
  includeExtended?: boolean;
  /** API版本 */
  apiVersion?: 'v1' | 'v2';
  /** 排序函数 */
  sortFn?: (a: UnifiedTaskNode, b: UnifiedTaskNode) => number;
  /** 错误处理回调 */
  onError?: (error: Error, context: string) => void;
  /** 数据变更回调 */
  onDataChange?: (data: Map<number, UnifiedTaskNode[]>) => void;
  /** 是否使用增强缓存系统 */
  useEnhancedCache?: boolean;
  /** 缓存事件回调 */
  onCacheEvent?: (event: CacheEvent) => void;
}

// Hook返回值类型
export interface UseTaskHierarchyReturn {
  // 数据状态
  /** 按父ID分组的子任务数据 */
  childrenByParent: Map<number, UnifiedTaskNode[]>;
  /** 展开状态 */
  expanded: Set<number>;
  /** 全局加载状态 */
  isLoading: boolean;
  /** 节点级别的加载状态 */
  loadingById: Record<number, boolean>;
  /** 节点级别的错误状态 */
  errorById: Record<number, string | undefined>;
  /** 初始加载状态 */
  initialLoading: boolean;
  /** 初始错误 */
  initialError: string | null;
  
  // 分页相关
  /** 分页信息 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // 操作方法
  /** 切换节点展开状态 */
  toggleExpanded: (nodeId: number) => void;
  /** 展开节点 */
  expandNode: (nodeId: number) => void;
  /** 收起节点 */
  collapseNode: (nodeId: number) => void;
  /** 加载子任务 */
  loadChildren: (parentId: number) => Promise<void>;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 清理数据 */
  clear: () => void;
  /** 重置到初始状态 */
  reset: () => void;
  
  // 查询方法
  /** 获取节点的子任务 */
  getChildren: (parentId: number) => UnifiedTaskNode[] | undefined;
  /** 检查节点是否有子任务 */
  hasChildren: (parentId: number) => boolean;
  /** 检查节点是否已展开 */
  isExpanded: (nodeId: number) => boolean;
  /** 检查节点是否正在加载 */
  isNodeLoading: (nodeId: number) => boolean;
  /** 获取节点错误信息 */
  getNodeError: (nodeId: number) => string | undefined;
  
  // 批量操作
  /** 展开所有节点 */
  expandAll: () => void;
  /** 收起所有节点 */
  collapseAll: () => void;
  /** 批量加载多个节点的子任务 */
  loadMultipleChildren: (parentIds: number[]) => Promise<void>;
  
  // 增强缓存功能
  /** 智能失效节点缓存 */
  smartInvalidateNode: (nodeId: number, changeType?: 'create' | 'update' | 'delete') => Promise<void>;
  /** 获取缓存统计 */
  getCacheStats: () => ReturnType<typeof enhancedCacheManager.getStats> | null;
}

// 默认排序函数
const defaultSortFn = (a: UnifiedTaskNode, b: UnifiedTaskNode): number => {
  return a.sort_order - b.sort_order || a.id - b.id;
};

// 缓存管理
interface CacheEntry {
  data: UnifiedTaskNode[];
  timestamp: number;
  parentId: number;
}

class HierarchyCache {
  private cache = new Map<string, CacheEntry>();
  private timeout: number;

  constructor(timeout: number = 5 * 60 * 1000) { // 默认5分钟
    this.timeout = timeout;
  }

  set(parentId: number, data: UnifiedTaskNode[]): void {
    const key = parentId.toString();
    this.cache.set(key, {
      data: [...data],
      timestamp: Date.now(),
      parentId
    });
  }

  get(parentId: number): UnifiedTaskNode[] | null {
    const key = parentId.toString();
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.timeout) {
      this.cache.delete(key);
      return null;
    }
    
    return [...entry.data];
  }

  has(parentId: number): boolean {
    const key = parentId.toString();
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.timeout) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(parentId: number): void {
    this.cache.delete(parentId.toString());
  }
}

/**
 * 统一任务层级管理Hook
 */
export const useTaskHierarchy = (options: UseTaskHierarchyOptions): UseTaskHierarchyReturn => {
  const {
    projectId,
    rootTaskId,
    initialDepth = 2,
    pageSize = 200,
    enableLazyLoad = true,
    enableCache = true,
    cacheTimeout = 5 * 60 * 1000,
    includeExtended = false,
    apiVersion = 'v2',
    sortFn = defaultSortFn,
    onError,
    onDataChange,
    useEnhancedCache = false,
    onCacheEvent
  } = options;

  // 状态管理
  const [childrenByParent, setChildrenByParent] = useState<Map<number, UnifiedTaskNode[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingById, setLoadingById] = useState<Record<number, boolean>>({});
  const [errorById, setErrorById] = useState<Record<number, string | undefined>>({});
  const [initialLoading, setInitialLoading] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseTaskHierarchyReturn['pagination']>();

  // 缓存和引用
  const cacheRef = useRef(new HierarchyCache(cacheTimeout));
  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 防止依赖循环的 ref
  const childrenByParentRef = useRef<Map<number, UnifiedTaskNode[]>>(new Map());
  const attemptedLoadsRef = useRef<Set<number>>(new Set());
  const isInitializingRef = useRef(false);

  // 同步 childrenByParent 到 ref（防止依赖循环）
  useEffect(() => {
    childrenByParentRef.current = childrenByParent;
  }, [childrenByParent]);

  // 自动注册依赖关系 (仅在增强缓存模式下)
  useEffect(() => {
    if (useEnhancedCache && rootTaskId) {
      enhancedCacheManager.registerTaskDependencies(projectId, rootTaskId);
    }
  }, [useEnhancedCache, projectId, rootTaskId]);

  // 辅助函数
  const setNodeLoading = useCallback((id: number, val: boolean) => {
    setLoadingById(prev => ({ ...prev, [id]: val }));
  }, []);

  const setNodeError = useCallback((id: number, msg?: string) => {
    setErrorById(prev => ({ ...prev, [id]: msg }));
  }, []);

  const handleError = useCallback((error: Error, context: string) => {
    console.error(`TaskHierarchy Error in ${context}:`, error);
    onError?.(error, context);
  }, [onError]);

  // 排序节点
  const sortNodes = useCallback((nodes: UnifiedTaskNode[]): UnifiedTaskNode[] => {
    return [...nodes].sort(sortFn);
  }, [sortFn]);

  // 更新数据并触发回调
  const updateChildrenData = useCallback((updater: (prev: Map<number, UnifiedTaskNode[]>) => Map<number, UnifiedTaskNode[]>) => {
    setChildrenByParent(prev => {
      const next = updater(prev);
      onDataChange?.(next);
      return next;
    });
  }, [onDataChange]);

  // 核心API调用函数
  const fetchData = useCallback(async (
    parentId: number, 
    options: TaskDescendantsParams = {}
  ): Promise<UnifiedTaskNode[]> => {
    const params: TaskDescendantsParams = {
      depth: 1,
      limit: pageSize,
      includeExtended,
      apiVersion,
      ...options
    };

    let response: TaskDescendantsApiResponse;
    
    // Always use fetchTaskDescendantsV2 as it supports both V1 and V2 APIs
    response = await fetchTaskDescendantsV2(projectId, parentId, params);

    return response.data.data || [];
  }, [projectId, pageSize, includeExtended, apiVersion]);

  // 加载子任务
  const loadChildren = useCallback(async (parentId: number): Promise<void> => {
    const startTime = Date.now();

    // 防止无限重试：检查是否已经尝试过加载（无论成功或失败）
    if (attemptedLoadsRef.current.has(parentId)) {
      console.log(`[useTaskHierarchy] Skip duplicate load attempt for parent ${parentId}`);
      return;
    }

    // 标记为已尝试（在实际加载前标记，防止并发调用）
    attemptedLoadsRef.current.add(parentId);

    // 检查缓存
    if (enableCache) {
      let cachedData: UnifiedTaskNode[] | null = null;
      let cacheHit = false;

      if (useEnhancedCache) {
        const cacheKey = CacheKeyBuilder.taskChildren(projectId, parentId);
        cachedData = await enhancedCacheManager.getTaskChildren(projectId, parentId);
        cacheHit = cachedData !== null;

        // 发出缓存事件
        const duration = Date.now() - startTime;
        cacheEventSystem.emitGet(cacheKey, cacheHit, duration, undefined, 'useTaskHierarchy');

        if (onCacheEvent) {
          onCacheEvent({
            type: cacheHit ? 'hit' : 'miss',
            key: cacheKey,
            timestamp: Date.now(),
            duration,
            source: 'useTaskHierarchy'
          });
        }
      } else if (cacheRef.current.has(parentId)) {
        cachedData = cacheRef.current.get(parentId);
        cacheHit = cachedData !== null;
      }

      if (cachedData) {
        updateChildrenData(prev => {
          const next = new Map(prev);
          next.set(parentId, sortNodes(cachedData));
          return next;
        });
        return;
      }
    }

    // 检查是否已经有数据且不是懒加载（使用 ref 而不是状态，避免依赖循环）
    if (!enableLazyLoad && childrenByParentRef.current.has(parentId)) {
      return;
    }

    setNodeLoading(parentId, true);
    setNodeError(parentId, undefined);

    try {
      const data = await fetchData(parentId);
      const children = data.filter(node => node.parent_id === parentId);
      const sortedChildren = sortNodes(children);

      // 更新缓存
      if (enableCache) {
        if (useEnhancedCache) {
          await enhancedCacheManager.setTaskChildren(
            projectId, 
            parentId, 
            sortedChildren,
            { page: 1, limit: pageSize },
            {
              ttl: cacheTimeout,
              registerDependencies: true,
              tags: [`project:${projectId}`, `parent:${parentId}`]
            }
          );
          
          // 发出缓存设置事件
          const cacheKey = CacheKeyBuilder.taskChildren(projectId, parentId);
          cacheEventSystem.emitSet(
            cacheKey,
            JSON.stringify(sortedChildren).length,
            cacheTimeout,
            undefined,
            [`project:${projectId}`, `parent:${parentId}`],
            'useTaskHierarchy'
          );
        } else {
          cacheRef.current.set(parentId, sortedChildren);
        }
      }

      // 更新状态
      updateChildrenData(prev => {
        const next = new Map(prev);
        next.set(parentId, sortedChildren);
        return next;
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '加载失败';
      setNodeError(parentId, errorMsg);
      handleError(error as Error, `loadChildren(${parentId})`);
    } finally {
      setNodeLoading(parentId, false);
    }
  }, [
    enableCache,
    enableLazyLoad,
    // 移除 childrenByParent 依赖，使用 childrenByParentRef 避免依赖循环
    fetchData,
    sortNodes,
    updateChildrenData,
    handleError,
    projectId,
    pageSize,
    cacheTimeout,
    useEnhancedCache,
    onCacheEvent
  ]);

  // 初始化数据加载
  const initializeData = useCallback(async () => {
    if (!rootTaskId || isInitializedRef.current) return;

    // 防止并发初始化
    if (isInitializingRef.current) {
      console.log('[useTaskHierarchy] Initialization already in progress, skipping...');
      return;
    }

    isInitializingRef.current = true;
    setInitialLoading(true);
    setInitialError(null);

    try {
      await loadChildren(rootTaskId);
      isInitializedRef.current = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '初始化失败';
      setInitialError(errorMsg);
      handleError(error as Error, 'initializeData');
    } finally {
      setInitialLoading(false);
      isInitializingRef.current = false;
    }
  }, [rootTaskId, loadChildren, handleError]);

  // 展开/收起操作
  const toggleExpanded = useCallback((nodeId: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        // 如果启用懒加载，展开时加载子任务
        if (enableLazyLoad && !childrenByParent.has(nodeId)) {
          loadChildren(nodeId).catch(error => {
            handleError(error, `toggleExpanded(${nodeId})`);
          });
        }
      }
      return next;
    });
  }, [enableLazyLoad, childrenByParent, loadChildren, handleError]);

  const expandNode = useCallback((nodeId: number) => {
    setExpanded(prev => new Set([...prev, nodeId]));
    if (enableLazyLoad && !childrenByParent.has(nodeId)) {
      loadChildren(nodeId).catch(error => {
        handleError(error, `expandNode(${nodeId})`);
      });
    }
  }, [enableLazyLoad, childrenByParent, loadChildren, handleError]);

  const collapseNode = useCallback((nodeId: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    if (!rootTaskId) return;

    setIsLoading(true);

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // 清除缓存
      if (enableCache) {
        cacheRef.current.clear();
      }

      // 清除当前数据
      setChildrenByParent(new Map());
      setErrorById({});

      // 清除加载尝试记录，允许重新尝试（修复死循环问题的关键）
      attemptedLoadsRef.current.clear();
      isInitializedRef.current = false;
      isInitializingRef.current = false;

      console.log('[useTaskHierarchy] Refresh triggered, cleared all state and attempt records');

      // 重新加载根节点数据
      await loadChildren(rootTaskId);

      message.success('数据刷新成功');
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        handleError(error, 'refresh');
        message.error('数据刷新失败');
      }
    } finally {
      setIsLoading(false);
    }
  }, [rootTaskId, enableCache, loadChildren, handleError]);

  // 清理数据
  const clear = useCallback(() => {
    setChildrenByParent(new Map());
    setExpanded(new Set());
    setLoadingById({});
    setErrorById({});
    setInitialError(null);
    setPagination(undefined);
    
    if (enableCache) {
      cacheRef.current.clear();
    }
  }, [enableCache]);

  // 重置到初始状态
  const reset = useCallback(() => {
    clear();
    isInitializedRef.current = false;
    if (rootTaskId) {
      initializeData();
    }
  }, [clear, rootTaskId, initializeData]);

  // 查询方法
  const getChildren = useCallback((parentId: number): UnifiedTaskNode[] | undefined => {
    return childrenByParent.get(parentId);
  }, [childrenByParent]);

  const hasChildren = useCallback((parentId: number): boolean => {
    const children = childrenByParent.get(parentId);
    return children !== undefined && children.length > 0;
  }, [childrenByParent]);

  const isExpanded = useCallback((nodeId: number): boolean => {
    return expanded.has(nodeId);
  }, [expanded]);

  const isNodeLoading = useCallback((nodeId: number): boolean => {
    return Boolean(loadingById[nodeId]);
  }, [loadingById]);

  const getNodeError = useCallback((nodeId: number): string | undefined => {
    return errorById[nodeId];
  }, [errorById]);

  // 批量操作
  const expandAll = useCallback(() => {
    const allNodeIds = Array.from(childrenByParent.keys());
    setExpanded(new Set(allNodeIds));
  }, [childrenByParent]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const loadMultipleChildren = useCallback(async (parentIds: number[]): Promise<void> => {
    setIsLoading(true);
    
    try {
      await Promise.allSettled(
        parentIds.map(parentId => loadChildren(parentId))
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadChildren]);

  // 智能失效节点缓存
  const smartInvalidateNode = useCallback(async (nodeId: number, changeType: 'create' | 'update' | 'delete' = 'update') => {
    if (!useEnhancedCache) {
      // 降级到传统缓存清理
      cacheRef.current.remove(nodeId);
      return;
    }

    try {
      await enhancedCacheManager.invalidateTask(projectId, nodeId, changeType);
      
      // 清理本地状态中的相关数据
      updateChildrenData(prev => {
        const next = new Map(prev);
        // 如果是删除操作，清理该节点的子节点数据
        if (changeType === 'delete') {
          next.delete(nodeId);
        }
        return next;
      });
      
      // 如果当前节点在展开状态，重新加载
      if (expanded.has(nodeId)) {
        await loadChildren(nodeId);
      }
    } catch (error) {
      handleError(error as Error, `smartInvalidateNode(${nodeId})`);
    }
  }, [useEnhancedCache, projectId, expanded, loadChildren, handleError, updateChildrenData]);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    return useEnhancedCache ? enhancedCacheManager.getStats() : null;
  }, [useEnhancedCache]);

  // 初始化效果
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // 清理效果
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 返回Hook接口
  return {
    // 数据状态
    childrenByParent,
    expanded,
    isLoading,
    loadingById,
    errorById,
    initialLoading,
    initialError,
    pagination,
    
    // 操作方法
    toggleExpanded,
    expandNode,
    collapseNode,
    loadChildren,
    refresh,
    clear,
    reset,
    
    // 查询方法
    getChildren,
    hasChildren,
    isExpanded,
    isNodeLoading,
    getNodeError,
    
    // 批量操作
    expandAll,
    collapseAll,
    loadMultipleChildren,
    
    // 增强缓存功能
    smartInvalidateNode,
    getCacheStats
  };
};

export default useTaskHierarchy;