import { useState, useCallback, useEffect } from 'react';
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

  /**
   * Search for potential parent tasks
   */
  const searchParentTasks = useCallback(async (params: ParentSearchParams) => {
    try {
      setSearchResults(prev => ({ ...prev, loading: true, error: null }));
      setCurrentParams(params);

      const searchParams = {
        keyword: params.keyword || '',
        exclude: params.excludeTaskId,
        limit: params.limit || 20,
        offset: params.offset || 0,
      };

      const response = await api.get(
        `/projects/${params.projectId}/tasks/search-parents`,
        { params: searchParams }
      );

      // response is already unwrapped by axios interceptor
      // Handle both formats: {data, pagination} and {data, total}
      const responseData = response as unknown as PaginatedResponse<Task> | { data: Task[], total: number };
      let data: Task[];
      let total: number;
      
      if ('pagination' in responseData) {
        data = responseData.data;
        total = responseData.pagination.total;
      } else {
        data = responseData.data;
        total = responseData.total;
      }
      
      const isLoadMore = (params.offset || 0) > 0;

      setSearchResults(prev => ({
        tasks: isLoadMore ? [...prev.tasks, ...data] : data,
        total,
        loading: false,
        error: null,
        hasMore: data.length === (params.limit || 20) && (prev.tasks.length + data.length) < total,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      logApiError('searchParentTasks', error, params);
      
      setSearchResults(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

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