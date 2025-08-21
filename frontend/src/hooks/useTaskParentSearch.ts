import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Task, PaginatedResponse } from '../types/task';
import api from '../services/api';
import { logApiError } from '../utils/logger';

export interface ParentSearchParams {
  projectId: number;
  keyword?: string;
  excludeTaskId?: number; // 兼容性保留
  excludeTaskIds?: number[]; // 新的批量排除参数
  maxLevel?: number;
  limit?: number;
  offset?: number;
}

export interface ParentSearchResult {
  tasks: Task[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

export interface UseTaskParentSearchReturn {
  searchResults: ParentSearchResult;
  searchParentTasks: (params: ParentSearchParams) => Promise<void>;
  clearResults: () => void;
  loadMore: () => Promise<void>;
}

// Cache for search results to avoid unnecessary API calls
const searchCache = new Map<string, { data: Task[]; total: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for searching potential parent tasks
 * Provides search functionality with pagination and caching
 */
export const useTaskParentSearch = (): UseTaskParentSearchReturn => {
  const [searchResults, setSearchResults] = useState<ParentSearchResult>({
    tasks: [],
    total: 0,
    loading: false,
    error: null,
    hasMore: false,
  });

  const [currentParams, setCurrentParams] = useState<ParentSearchParams | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUnmountedRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    isUnmountedRef.current = false; // Ensure it's set to false on mount
    
    return () => {
      isUnmountedRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Generate cache key for search params
  const getCacheKey = useCallback((params: ParentSearchParams): string => {
    // 合并单个和批量排除的任务IDs
    const allExcludeIds = [...(params.excludeTaskIds || [])];
    if (params.excludeTaskId && !allExcludeIds.includes(params.excludeTaskId)) {
      allExcludeIds.push(params.excludeTaskId);
    }
    
    return JSON.stringify({
      projectId: params.projectId,
      keyword: params.keyword || '',
      excludeTaskIds: allExcludeIds.sort(), // 排序确保缓存键的一致性
      maxLevel: params.maxLevel,
      limit: params.limit,
      offset: params.offset,
    });
  }, []);

  // Check if cache is valid
  const getCachedResult = useCallback((cacheKey: string) => {
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }
    return null;
  }, []);

  /**
   * Search for potential parent tasks
   */
  const searchParentTasks = useCallback(async (params: ParentSearchParams) => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const cacheKey = getCacheKey(params);
    // Check cache first
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      if (!isUnmountedRef.current) {
        setSearchResults({
          tasks: cachedResult.data,
          total: cachedResult.total,
          loading: false,
          error: null,
          hasMore: cachedResult.data.length < cachedResult.total,
        });
        setCurrentParams(params);
      }
      return;
    }

    try {
      if (!isUnmountedRef.current) {
        setSearchResults(prev => ({ ...prev, loading: true, error: null }));
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      setCurrentParams(params);

      // 合并单个和批量排除的任务IDs
      const allExcludeIds = [...(params.excludeTaskIds || [])];
      if (params.excludeTaskId && !allExcludeIds.includes(params.excludeTaskId)) {
        allExcludeIds.push(params.excludeTaskId);
      }
      
      const searchParams = {
        query: params.keyword || '',  // Backend expects 'query' parameter, not 'keyword'
        exclude_task_ids: allExcludeIds.length > 0 ? allExcludeIds.join(',') : undefined,
        max_level: params.maxLevel || 3,
        page: Math.floor((params.offset || 0) / (params.limit || 20)) + 1,
        page_size: params.limit || 20,
      };
      const response = await api.get(
        `/projects/${params.projectId}/tasks/search-parents`,
        { 
          params: searchParams,
          signal: abortControllerRef.current.signal
        }
      );
      // Check if component is still mounted
      if (isUnmountedRef.current) {
        return;
      }

      // API response structure: {success, message, data: {data: [], pagination: {}}}
      // We need to extract the inner data object
      let actualData;
      if (response && typeof response === 'object' && 'data' in response) {
        actualData = response.data;
        } else {
        actualData = response;
        }
      
      // Add null/undefined safety checks
      if (!actualData || typeof actualData !== 'object') {
        console.warn('Invalid response data:', actualData);
        setSearchResults(prev => ({
          ...prev,
          tasks: [],
          total: 0,
          loading: false,
          error: null,
          hasMore: false,
        }));
        return;
      }
      
      const responseData = actualData as unknown as PaginatedResponse<Task> | { data: Task[], total: number };
      
      let data: Task[];
      let total: number;
      
      if (responseData && typeof responseData === 'object' && 'pagination' in responseData) {
        data = Array.isArray(responseData.data) ? responseData.data : [];
        total = responseData.pagination.total || 0;
      } else {
        // Handle direct response or simple array response
        if (Array.isArray(responseData)) {
          data = responseData;
          total = responseData.length;
        } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
          data = Array.isArray(responseData.data) ? responseData.data : [];
          total = responseData.total || data.length;
        } else {
          data = [];
          total = 0;
        }
      }
      
      const isLoadMore = (params.offset || 0) > 0;

      // Cache the result for first page searches
      if (!isLoadMore) {
        searchCache.set(cacheKey, {
          data,
          total,
          timestamp: Date.now(),
        });
      }

      const safeData = Array.isArray(data) ? data : [];
      const newTasks = isLoadMore ? [...(searchResults.tasks || []), ...safeData] : safeData;
      const newSearchResults = {
        tasks: newTasks,
        total,
        loading: false,
        error: null,
        hasMore: safeData.length === (params.limit || 20) && newTasks.length < total,
      };
      
      setSearchResults(prev => {
        return newSearchResults;
      });

    } catch (error) {
      // Don't update state if request was aborted or component unmounted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      if (isUnmountedRef.current) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      logApiError('searchParentTasks', error, params);
      
      setSearchResults(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [getCacheKey, getCachedResult]);

  /**
   * Load more results for pagination
   */
  const loadMore = useCallback(async () => {
    if (!currentParams || searchResults.loading || !searchResults.hasMore) {
      return;
    }

    const nextParams = {
      ...currentParams,
      offset: searchResults.tasks.length,
    };

    await searchParentTasks(nextParams);
  }, [currentParams, searchResults.loading, searchResults.hasMore, searchResults.tasks.length, searchParentTasks]);

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setSearchResults({
      tasks: [],
      total: 0,
      loading: false,
      error: null,
      hasMore: false,
    });
    setCurrentParams(null);
  }, []);

  return {
    searchResults,
    searchParentTasks,
    clearResults,
    loadMore,
  };
};