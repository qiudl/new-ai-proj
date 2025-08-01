import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Task, PaginatedResponse } from '../types/task';
import api from '../services/api';
import { logApiError } from '../utils/logger';

export interface ParentSearchParams {
  projectId: number;
  keyword?: string;
  excludeTaskId?: number;
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
    console.log('🔍 [useTaskParentSearch] Hook mounted');
    isUnmountedRef.current = false; // Ensure it's set to false on mount
    
    return () => {
      console.log('🔍 [useTaskParentSearch] Hook unmounting');
      isUnmountedRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Generate cache key for search params
  const getCacheKey = useCallback((params: ParentSearchParams): string => {
    return JSON.stringify({
      projectId: params.projectId,
      keyword: params.keyword || '',
      excludeTaskId: params.excludeTaskId,
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
    console.log('🔍 [useTaskParentSearch] searchParentTasks called with params:', params);
    
    // Abort previous request
    if (abortControllerRef.current) {
      console.log('🔍 [useTaskParentSearch] Aborting previous request');
      abortControllerRef.current.abort();
    }

    const cacheKey = getCacheKey(params);
    console.log('🔍 [useTaskParentSearch] Cache key generated:', cacheKey);
    
    // Check cache first
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('✅ [useTaskParentSearch] Using cached result:', cachedResult);
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
        console.log('🔍 [useTaskParentSearch] Setting loading state to true');
        setSearchResults(prev => ({ ...prev, loading: true, error: null }));
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      setCurrentParams(params);

      const searchParams = {
        keyword: params.keyword || '',
        exclude_task_id: params.excludeTaskId,
        max_level: params.maxLevel || 2,
        page: Math.floor((params.offset || 0) / (params.limit || 20)) + 1,
        page_size: params.limit || 20,
      };
      console.log('🔍 [useTaskParentSearch] API search params:', searchParams);
      console.log('🔍 [useTaskParentSearch] API URL:', `/projects/${params.projectId}/tasks/search-parents`);

      const response = await api.get(
        `/projects/${params.projectId}/tasks/search-parents`,
        { 
          params: searchParams,
          signal: abortControllerRef.current.signal
        }
      );
      console.log('🔍 [useTaskParentSearch] API response received:', response);

      // Check if component is still mounted
      if (isUnmountedRef.current) {
        console.log('🔍 [useTaskParentSearch] Component unmounted, skipping processing');
        return;
      }

      console.log('🔍 [useTaskParentSearch] Processing API response...');
      console.log('🔍 [useTaskParentSearch] Raw response type:', typeof response);
      console.log('🔍 [useTaskParentSearch] Raw response keys:', Object.keys(response || {}));

      // API response structure: {success, message, data: {data: [], pagination: {}}}
      // We need to extract the inner data object
      let actualData;
      if (response && typeof response === 'object' && 'data' in response) {
        actualData = response.data;
        console.log('🔍 [useTaskParentSearch] Found response.data:', actualData);
      } else {
        actualData = response;
        console.log('🔍 [useTaskParentSearch] Using response directly:', actualData);
      }
      
      const responseData = actualData as unknown as PaginatedResponse<Task> | { data: Task[], total: number };
      console.log('🔍 [useTaskParentSearch] responseData:', responseData);
      console.log('🔍 [useTaskParentSearch] responseData type:', typeof responseData);
      console.log('🔍 [useTaskParentSearch] responseData keys:', Object.keys(responseData || {}));
      
      let data: Task[];
      let total: number;
      
      if ('pagination' in responseData) {
        console.log('🔍 [useTaskParentSearch] Using pagination format');
        console.log('🔍 [useTaskParentSearch] responseData.pagination:', responseData.pagination);
        data = responseData.data;
        total = responseData.pagination.total;
        console.log('🔍 [useTaskParentSearch] Extracted data (pagination):', data);
        console.log('🔍 [useTaskParentSearch] Extracted data type (pagination):', Array.isArray(data) ? 'Array' : typeof data);
        console.log('🔍 [useTaskParentSearch] Extracted total (pagination):', total);
      } else {
        console.log('🔍 [useTaskParentSearch] Using simple format');
        console.log('🔍 [useTaskParentSearch] responseData.data:', responseData.data);
        console.log('🔍 [useTaskParentSearch] responseData.total:', responseData.total);
        data = responseData.data;
        total = responseData.total;
        console.log('🔍 [useTaskParentSearch] Extracted data (simple):', data);
        console.log('🔍 [useTaskParentSearch] Extracted data type (simple):', Array.isArray(data) ? 'Array' : typeof data);
        console.log('🔍 [useTaskParentSearch] Extracted total (simple):', total);
      }
      
      console.log('🔍 [useTaskParentSearch] Final extracted data:', data);
      console.log('🔍 [useTaskParentSearch] Final extracted data length:', data?.length);
      console.log('🔍 [useTaskParentSearch] Final extracted total:', total);
      
      const isLoadMore = (params.offset || 0) > 0;

      // Cache the result for first page searches
      if (!isLoadMore) {
        searchCache.set(cacheKey, {
          data,
          total,
          timestamp: Date.now(),
        });
      }

      const newTasks = isLoadMore ? [...prev.tasks, ...data] : data;
      const newSearchResults = {
        tasks: newTasks,
        total,
        loading: false,
        error: null,
        hasMore: data.length === (params.limit || 20) && (newTasks.length) < total,
      };
      
      console.log('🔍 [useTaskParentSearch] Setting new search results:');
      console.log('🔍 [useTaskParentSearch] newTasks:', newTasks);
      console.log('🔍 [useTaskParentSearch] newTasks.length:', newTasks?.length);
      console.log('🔍 [useTaskParentSearch] newSearchResults:', newSearchResults);
      
      setSearchResults(prev => {
        console.log('🔍 [useTaskParentSearch] Previous search results:', prev);
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