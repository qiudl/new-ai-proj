import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { AIConfigTestService } from '../../../services/aiConfigTestService';
import type {
  TestLog,
  TestHistoryFilters,
  TestHistoryPagination,
  AIProvider,
  TestStatistics
} from '../../../types/aiConfig';

export interface UseTestHistoryReturn {
  logs: TestLog[];
  pagination: TestHistoryPagination | null;
  statistics: TestStatistics | null;
  loading: boolean;
  filters: TestHistoryFilters;
  updateFilters: (newFilters: Partial<TestHistoryFilters>) => void;
  refresh: () => Promise<void>;
}

export function useTestHistory(provider: AIProvider): UseTestHistoryReturn {
  // 新增: 分离数据管理
  const [allLogs, setAllLogs] = useState<TestLog[]>([]); // 所有数据
  const [filteredLogs, setFilteredLogs] = useState<TestLog[]>([]); // 过滤后的数据
  const [displayLogs, setDisplayLogs] = useState<TestLog[]>([]); // 当前页显示的数据

  const [pagination, setPagination] = useState<TestHistoryPagination | null>(null);
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TestHistoryFilters>({
    status: 'all',
    testType: 'all',
    search: '',
    page: 1,
    limit: 20
  });

  /**
   * 计算统计数据
   */
  const calculateStatistics = useCallback((logs: TestLog[]): TestStatistics => {
    const totalTests = logs.length;
    const successCount = logs.filter(log => log.testStatus === 'success').length;
    const successRate = totalTests > 0 ? (successCount / totalTests) * 100 : 0;

    const totalResponseTime = logs.reduce((sum, log) => sum + log.responseTimeMs, 0);
    const averageResponseTime = totalTests > 0 ? totalResponseTime / totalTests : 0;

    return {
      totalTests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }, []);

  /**
   * 客户端过滤函数
   */
  const filterLogs = useCallback((logs: TestLog[], currentFilters: TestHistoryFilters): TestLog[] => {
    let result = [...logs];

    // 按状态过滤
    if (currentFilters.status && currentFilters.status !== 'all') {
      result = result.filter(log => log.testStatus === currentFilters.status);
    }

    // 按测试类型过滤
    if (currentFilters.testType && currentFilters.testType !== 'all') {
      result = result.filter(log => log.testType === currentFilters.testType);
    }

    // 按搜索关键词过滤
    if (currentFilters.search && currentFilters.search.trim() !== '') {
      const searchLower = currentFilters.search.toLowerCase();
      result = result.filter(log =>
        log.testText.toLowerCase().includes(searchLower) ||
        log.aiResponse.toLowerCase().includes(searchLower) ||
        log.model.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, []);

  /**
   * 加载所有测试历史数据
   */
  const loadAllTestHistory = useCallback(async () => {
    setLoading(true);
    try {
      // 一次性加载所有数据(limit=1000)
      const response = await AIConfigTestService.getTestHistory(provider, {
        status: 'all',
        testType: 'all',
        search: '',
        page: 1,
        limit: 1000
      });

      setAllLogs(response.data);

      // 初始时,过滤后的数据等于所有数据
      const filtered = filterLogs(response.data, filters);
      setFilteredLogs(filtered);

      // 计算统计数据(基于所有数据)
      const stats = calculateStatistics(response.data);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load test history:', error);
      message.error('加载测试历史失败');
    } finally {
      setLoading(false);
    }
  }, [provider, filterLogs, filters, calculateStatistics]);

  /**
   * 更新过滤条件
   */
  const updateFilters = useCallback((newFilters: Partial<TestHistoryFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // 重置页码(除非显式指定)
      page: newFilters.page ?? 1
    }));
  }, []);

  /**
   * 刷新数据
   */
  const refresh = useCallback(async () => {
    await loadAllTestHistory();
  }, [loadAllTestHistory]);

  // 初始加载数据
  useEffect(() => {
    loadAllTestHistory();
  }, [provider]); // 仅在provider变化时重新加载

  // 过滤和分页逻辑
  useEffect(() => {
    // 1. 应用过滤器
    const filtered = filterLogs(allLogs, filters);
    setFilteredLogs(filtered);

    // 2. 计算分页信息
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / filters.limit);
    const currentPage = Math.min(filters.page, Math.max(1, totalPages));

    // 3. 提取当前页数据
    const startIndex = (currentPage - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const pageData = filtered.slice(startIndex, endIndex);
    setDisplayLogs(pageData);

    // 4. 更新分页信息
    setPagination({
      currentPage,
      pageSize: filters.limit,
      totalRecords,
      totalPages
    });
  }, [allLogs, filters, filterLogs]);

  return {
    logs: displayLogs, // 返回当前页显示的数据
    pagination,
    statistics,
    loading,
    filters,
    updateFilters,
    refresh
  };
}
