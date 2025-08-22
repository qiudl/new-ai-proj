import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';

// URL状态管理类型定义
export interface UrlStateConfig<T> {
  defaultValue: T;
  serialize: (value: T) => string;
  deserialize: (value: string) => T;
  paramName: string;
}

// 通用URL状态管理hook
export const useUrlState = <T>(config: UrlStateConfig<T>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<T>(() => {
    const urlValue = searchParams.get(config.paramName);
    if (urlValue) {
      try {
        return config.deserialize(urlValue);
      } catch (error) {
        console.warn(`Failed to deserialize URL param ${config.paramName}:`, error);
      }
    }
    return config.defaultValue;
  });

  const updateState = useCallback((newValue: T) => {
    setState(newValue);
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (newValue === config.defaultValue) {
      newSearchParams.delete(config.paramName);
    } else {
      newSearchParams.set(config.paramName, config.serialize(newValue));
    }
    
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams, config]);

  return [state, updateState] as const;
};

// 任务列表筛选（Alpha）URL状态：status/priority/assignee/q
export interface TaskListFilters {
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'planning' | 'on_hold' | 'blocked';
  priority?: 'low' | 'medium' | 'high';
  assignee_id?: number;
  task_id?: number;
  q?: string;
}

const taskListFiltersConfig: UrlStateConfig<TaskListFilters> = {
  defaultValue: {},
  serialize: (filters) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (typeof filters.assignee_id === 'number') params.set('assignee_id', String(filters.assignee_id));
    if (filters.q) params.set('q', filters.q);
    if (typeof filters.task_id === 'number') params.set('task_id', String(filters.task_id));
    return params.toString();
  },
  deserialize: (value) => {
    const params = new URLSearchParams(value);
    const status = params.get('status') as TaskListFilters['status'] | null;
    const priority = params.get('priority') as TaskListFilters['priority'] | null;
    const assigneeParam = params.get('assignee_id');
    const assignee_id = assigneeParam ? parseInt(assigneeParam, 10) : undefined;
    const taskIdParam = params.get('task_id');
    const task_id = taskIdParam ? parseInt(taskIdParam, 10) : undefined;
    const q = params.get('q') || undefined;
    return {
      status: status || undefined,
      priority: priority || undefined,
      assignee_id: Number.isFinite(assignee_id) ? assignee_id : undefined,
      task_id: Number.isFinite(task_id) ? task_id : undefined,
      q,
    };
  },
  paramName: 'tfilters',
};

export const useTaskListUrlState = () => useUrlState(taskListFiltersConfig);

// 任务仪表板筛选状态类型
export interface TaskDashboardFilters {
  selectedWeek: Dayjs;
  selectedProject?: number;
  selectedCustomer?: number;
  selectedStatus: string;
  searchText: string;
  viewMode: 'calendar' | 'list';
}

// 序列化器配置
const filtersConfig: UrlStateConfig<TaskDashboardFilters> = {
  defaultValue: {
    selectedWeek: dayjs(),
    selectedProject: undefined,
    selectedCustomer: undefined,
    selectedStatus: 'all',
    searchText: '',
    viewMode: 'calendar',
  },
  serialize: (filters) => {
    return btoa(JSON.stringify({
      w: filters.selectedWeek.format('YYYY-MM-DD'),
      p: filters.selectedProject,
      c: filters.selectedCustomer,
      s: filters.selectedStatus === 'all' ? undefined : filters.selectedStatus,
      q: filters.searchText || undefined,
      v: filters.viewMode === 'calendar' ? undefined : filters.viewMode,
    }));
  },
  deserialize: (encoded) => {
    const decoded = JSON.parse(atob(encoded));
    return {
      selectedWeek: decoded.w ? dayjs(decoded.w) : dayjs(),
      selectedProject: decoded.p,
      selectedCustomer: decoded.c,
      selectedStatus: decoded.s || 'all',
      searchText: decoded.q || '',
      viewMode: decoded.v || 'calendar',
    };
  },
  paramName: 'filters',
};

// 任务仪表板URL状态管理hook
export const useTaskDashboardUrlState = () => {
  return useUrlState(filtersConfig);
};

// 快捷日期选择配置
export const dateShortcuts = [
  {
    label: '本周',
    value: () => dayjs(),
    key: 'thisWeek',
  },
  {
    label: '上周',
    value: () => dayjs().subtract(1, 'week'),
    key: 'lastWeek',
  },
  {
    label: '下周',
    value: () => dayjs().add(1, 'week'),
    key: 'nextWeek',
  },
  {
    label: '本月第一周',
    value: () => dayjs().startOf('month').startOf('week'),
    key: 'firstWeekOfMonth',
  },
  {
    label: '本月最后一周',
    value: () => dayjs().endOf('month').startOf('week'),
    key: 'lastWeekOfMonth',
  },
  {
    label: '上个月最后一周',
    value: () => dayjs().subtract(1, 'month').endOf('month').startOf('week'),
    key: 'lastWeekOfLastMonth',
  },
  {
    label: '下个月第一周',
    value: () => dayjs().add(1, 'month').startOf('month').startOf('week'),
    key: 'firstWeekOfNextMonth',
  },
];

// 日期范围工具函数
export const getDateRangePresets = () => [
  {
    label: '今天',
    value: [dayjs().startOf('day'), dayjs().endOf('day')] as [Dayjs, Dayjs],
    key: 'today',
  },
  {
    label: '昨天',
    value: [
      dayjs().subtract(1, 'day').startOf('day'),
      dayjs().subtract(1, 'day').endOf('day'),
    ] as [Dayjs, Dayjs],
    key: 'yesterday',
  },
  {
    label: '本周',
    value: [dayjs().startOf('week'), dayjs().endOf('week')] as [Dayjs, Dayjs],
    key: 'thisWeek',
  },
  {
    label: '上周',
    value: [
      dayjs().subtract(1, 'week').startOf('week'),
      dayjs().subtract(1, 'week').endOf('week'),
    ] as [Dayjs, Dayjs],
    key: 'lastWeek',
  },
  {
    label: '本月',
    value: [dayjs().startOf('month'), dayjs().endOf('month')] as [Dayjs, Dayjs],
    key: 'thisMonth',
  },
  {
    label: '上月',
    value: [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ] as [Dayjs, Dayjs],
    key: 'lastMonth',
  },
  {
    label: '近7天',
    value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] as [Dayjs, Dayjs],
    key: 'last7Days',
  },
  {
    label: '近30天',
    value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] as [Dayjs, Dayjs],
    key: 'last30Days',
  },
];

// URL参数解析辅助函数
export const parseUrlFilters = (searchParams: URLSearchParams): Partial<TaskDashboardFilters> => {
  const filters: Partial<TaskDashboardFilters> = {};
  
  // 解析周选择
  const weekParam = searchParams.get('week');
  if (weekParam) {
    const parsedWeek = dayjs(weekParam);
    if (parsedWeek.isValid()) {
      filters.selectedWeek = parsedWeek;
    }
  }
  
  // 解析项目筛选
  const projectParam = searchParams.get('project');
  if (projectParam) {
    const projectId = parseInt(projectParam, 10);
    if (!isNaN(projectId)) {
      filters.selectedProject = projectId;
    }
  }
  
  // 解析客户筛选
  const customerParam = searchParams.get('customer');
  if (customerParam) {
    const customerId = parseInt(customerParam, 10);
    if (!isNaN(customerId)) {
      filters.selectedCustomer = customerId;
    }
  }
  
  // 解析状态筛选
  const statusParam = searchParams.get('status');
  if (statusParam && ['all', 'todo', 'in_progress', 'completed', 'cancelled'].includes(statusParam)) {
    filters.selectedStatus = statusParam;
  }
  
  // 解析搜索文本
  const searchParam = searchParams.get('q');
  if (searchParam) {
    filters.searchText = decodeURIComponent(searchParam);
  }
  
  // 解析视图模式
  const viewParam = searchParams.get('view');
  if (viewParam && ['calendar', 'list'].includes(viewParam)) {
    filters.viewMode = viewParam as 'calendar' | 'list';
  }
  
  return filters;
};

// 生成分享链接
export const generateShareableUrl = (filters: TaskDashboardFilters, baseUrl?: string): string => {
  const params = new URLSearchParams();
  
  // 只添加非默认值的参数
  if (!filters.selectedWeek.isSame(dayjs(), 'week')) {
    params.set('week', filters.selectedWeek.format('YYYY-MM-DD'));
  }
  
  if (filters.selectedProject) {
    params.set('project', filters.selectedProject.toString());
  }
  
  if (filters.selectedCustomer) {
    params.set('customer', filters.selectedCustomer.toString());
  }
  
  if (filters.selectedStatus !== 'all') {
    params.set('status', filters.selectedStatus);
  }
  
  if (filters.searchText) {
    params.set('q', encodeURIComponent(filters.searchText));
  }
  
  if (filters.viewMode !== 'calendar') {
    params.set('view', filters.viewMode);
  }
  
  const queryString = params.toString();
  const currentUrl = baseUrl || window.location.origin + window.location.pathname;
  
  return queryString ? `${currentUrl}?${queryString}` : currentUrl;
};

// 筛选状态存储到localStorage
export const saveFiltersToLocal = (filters: TaskDashboardFilters, key: string = 'taskDashboardFilters') => {
  try {
    const serialized = {
      selectedProject: filters.selectedProject,
      selectedCustomer: filters.selectedCustomer,
      selectedStatus: filters.selectedStatus,
      viewMode: filters.viewMode,
      // 不保存selectedWeek和searchText，因为它们通常是临时的
    };
    localStorage.setItem(key, JSON.stringify(serialized));
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error);
  }
};

// 从localStorage恢复筛选状态
export const loadFiltersFromLocal = (key: string = 'taskDashboardFilters'): Partial<TaskDashboardFilters> => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error);
  }
  return {};
};