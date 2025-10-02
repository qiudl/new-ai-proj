import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { Task } from '../types/task';
import { taskService } from '../services/taskService';
import { errorLogger } from '../utils/ErrorLogger';

// 任务状态接口
interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    priority?: string;
    assignee?: number;
    project?: number;
    search?: string;
  };
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    dueToday: number;
  };
  cache: Map<string, { data: Task[]; timestamp: number }>;
  optimisticUpdates: Map<number, Partial<Task>>;
  lastUpdate: number;
}

// 任务动作类型
type TaskAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_SELECTED_TASK'; payload: Task | null }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: number }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'SET_FILTERS'; payload: Partial<TaskState['filters']> }
  | { type: 'CLEAR_CACHE' }
  | { type: 'SET_CACHE'; payload: { key: string; data: Task[] } }
  | { type: 'SET_OPTIMISTIC_UPDATE'; payload: { id: number; updates: Partial<Task> } }
  | { type: 'CLEAR_OPTIMISTIC_UPDATE'; payload: number }
  | { type: 'BATCH_UPDATE_TASKS'; payload: Task[] };

// Context 接口
interface TaskContextType {
  state: TaskState;
  actions: {
    loadTasks: (filters?: Partial<TaskState['filters']>, forceRefresh?: boolean) => Promise<void>;
    loadTaskById: (id: number) => Promise<Task>;
    createTask: (task: Partial<Task>) => Promise<Task>;
    updateTask: (id: number, updates: Partial<Task>, optimistic?: boolean) => Promise<void>;
    deleteTask: (id: number) => Promise<void>;
    batchUpdateTasks: (updates: Array<{ id: number; data: Partial<Task> }>) => Promise<void>;
    selectTask: (task: Task | null) => void;
    setFilters: (filters: Partial<TaskState['filters']>) => void;
    clearError: () => void;
    refreshStatistics: () => void;
    invalidateCache: () => void;
  };
}

// 初始状态
const initialState: TaskState = {
  tasks: [],
  selectedTask: null,
  loading: false,
  error: null,
  filters: {},
  statistics: {
    total: 0,
    byStatus: {},
    byPriority: {},
    overdue: 0,
    dueToday: 0
  },
  cache: new Map(),
  optimisticUpdates: new Map(),
  lastUpdate: 0
};

// 统计计算函数
const calculateStatistics = (tasks: Task[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  return {
    total: tasks.length,
    byStatus: tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byPriority: tasks.reduce((acc, task) => {
      if (task.priority) {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    overdue: tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      return new Date(task.due_date) < today;
    }).length,
    dueToday: tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= today && dueDate < tomorrow;
    }).length
  };
};

// Reducer 函数
const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
      
    case 'SET_TASKS': {
      const tasks = action.payload;
      const statistics = calculateStatistics(tasks);
      
      return {
        ...state,
        tasks,
        statistics,
        loading: false,
        error: null,
        lastUpdate: Date.now()
      };
    }
    
    case 'SET_SELECTED_TASK':
      return { ...state, selectedTask: action.payload };
      
    case 'ADD_TASK': {
      const newTasks = [...state.tasks, action.payload];
      const statistics = calculateStatistics(newTasks);
      
      return {
        ...state,
        tasks: newTasks,
        statistics
      };
    }
    
    case 'UPDATE_TASK': {
      const updatedTasks = state.tasks.map(task =>
        task.id === action.payload.id ? { ...task, ...action.payload } : task
      );
      const statistics = calculateStatistics(updatedTasks);
      
      return {
        ...state,
        tasks: updatedTasks,
        statistics,
        selectedTask: state.selectedTask?.id === action.payload.id 
          ? { ...state.selectedTask, ...action.payload } 
          : state.selectedTask
      };
    }
    
    case 'DELETE_TASK': {
      const filteredTasks = state.tasks.filter(task => task.id !== action.payload);
      const statistics = calculateStatistics(filteredTasks);
      
      return {
        ...state,
        tasks: filteredTasks,
        statistics,
        selectedTask: state.selectedTask?.id === action.payload ? null : state.selectedTask
      };
    }
    
    case 'BATCH_UPDATE_TASKS': {
      const updatedTasksMap = new Map(action.payload.map(task => [task.id, task]));
      const updatedTasks = state.tasks.map(task =>
        updatedTasksMap.has(task.id) ? { ...task, ...updatedTasksMap.get(task.id) } : task
      );
      const statistics = calculateStatistics(updatedTasks);
      
      return {
        ...state,
        tasks: updatedTasks,
        statistics
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
    
    case 'SET_OPTIMISTIC_UPDATE': {
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.set(action.payload.id, action.payload.updates);
      return { ...state, optimisticUpdates: newOptimisticUpdates };
    }
    
    case 'CLEAR_OPTIMISTIC_UPDATE': {
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.delete(action.payload);
      return { ...state, optimisticUpdates: newOptimisticUpdates };
    }
    
    default:
      return state;
  }
};

// 分离 Context - state 和 actions 分开存储以避免不必要的重新渲染
const TaskStateContext = createContext<TaskState | undefined>(undefined);
const TaskActionsContext = createContext<TaskContextType['actions'] | undefined>(undefined);

// Provider 组件
interface TaskProviderProps {
  children: ReactNode;
  cacheTimeout?: number;
  enableOptimisticUpdates?: boolean;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({
  children,
  cacheTimeout = 3 * 60 * 1000, // 3分钟缓存
  enableOptimisticUpdates = true
}) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // 使用 ref 存储最新的 state，避免 useCallback 依赖导致函数重新创建
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 生成缓存键
  const generateCacheKey = useCallback((filters: TaskState['filters']) => {
    return JSON.stringify(filters);
  }, []);

  // 检查缓存有效性
  const isCacheValid = useCallback((key: string) => {
    const cached = stateRef.current.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < cacheTimeout;
  }, [cacheTimeout]);

  // 加载任务列表
  const loadTasks = useCallback(async (
    filters: Partial<TaskState['filters']> = {},
    forceRefresh = false
  ) => {
    const mergedFilters = { ...stateRef.current.filters, ...filters };
    const cacheKey = generateCacheKey(mergedFilters);

    // 检查缓存
    if (!forceRefresh && isCacheValid(cacheKey)) {
      const cached = stateRef.current.cache.get(cacheKey);
      if (cached) {
        dispatch({ type: 'SET_TASKS', payload: cached.data });
        errorLogger.debug('task', 'TaskContext: 使用缓存数据', {
          cacheKey,
          taskCount: cached.data.length
        });
        return;
      }
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await taskService.getTasks(mergedFilters);

      dispatch({ type: 'SET_TASKS', payload: response.tasks });
      dispatch({ type: 'SET_CACHE', payload: { key: cacheKey, data: response.tasks } });

      errorLogger.info('task', 'TaskContext: 任务加载成功', {
        taskCount: response.tasks.length,
        filters: mergedFilters
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载任务失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      errorLogger.error('task', 'TaskContext: 任务加载失败', {
        error: errorMessage,
        filters: mergedFilters
      });
    }
  }, [generateCacheKey, isCacheValid]);

  // 按ID加载任务
  const loadTaskById = useCallback(async (id: number): Promise<Task> => {
    try {
      const task = await taskService.getTaskById(id);
      
      // 更新本地状态中的任务
      dispatch({ type: 'UPDATE_TASK', payload: task });
      
      errorLogger.debug('task', 'TaskContext: 任务详情加载成功', {
        taskId: id,
        title: task.title
      });
      
      return task;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载任务失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      errorLogger.error('task', 'TaskContext: 任务详情加载失败', {
        error: errorMessage,
        taskId: id
      });
      
      throw error;
    }
  }, []);

  // 创建任务
  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const newTask = await taskService.createTask(taskData);

      dispatch({ type: 'ADD_TASK', payload: newTask });
      dispatch({ type: 'CLEAR_CACHE' });

      errorLogger.info('task', 'TaskContext: 任务创建成功', {
        taskId: newTask.id,
        title: newTask.title
      });

      return newTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建任务失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      errorLogger.error('task', 'TaskContext: 任务创建失败', {
        error: errorMessage,
        taskData
      });

      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 更新任务
  const updateTask = useCallback(async (
    id: number,
    updates: Partial<Task>,
    optimistic = enableOptimisticUpdates
  ) => {
    // 乐观更新
    if (optimistic) {
      dispatch({ type: 'SET_OPTIMISTIC_UPDATE', payload: { id, updates } });
      const currentTask = stateRef.current.tasks.find(task => task.id === id);
      if (currentTask) {
        dispatch({ type: 'UPDATE_TASK', payload: { ...currentTask, ...updates } });
      }
    }

    try {
      const updatedTask = await taskService.updateTask(id, updates);

      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      dispatch({ type: 'CLEAR_OPTIMISTIC_UPDATE', payload: id });
      dispatch({ type: 'CLEAR_CACHE' });

      errorLogger.info('task', 'TaskContext: 任务更新成功', {
        taskId: id,
        updates
      });
    } catch (error) {
      // 回滚乐观更新
      if (optimistic) {
        dispatch({ type: 'CLEAR_OPTIMISTIC_UPDATE', payload: id });
        await loadTasks({}, true); // 重新加载以恢复正确状态
      }

      const errorMessage = error instanceof Error ? error.message : '更新任务失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      errorLogger.error('task', 'TaskContext: 任务更新失败', {
        error: errorMessage,
        taskId: id,
        updates
      });

      throw error;
    }
  }, [loadTasks, enableOptimisticUpdates]);

  // 删除任务
  const deleteTask = useCallback(async (id: number) => {
    try {
      await taskService.deleteTask(id);

      dispatch({ type: 'DELETE_TASK', payload: id });
      dispatch({ type: 'CLEAR_CACHE' });

      errorLogger.info('task', 'TaskContext: 任务删除成功', {
        taskId: id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除任务失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      errorLogger.error('task', 'TaskContext: 任务删除失败', {
        error: errorMessage,
        taskId: id
      });

      throw error;
    }
  }, []);

  // 批量更新任务
  const batchUpdateTasks = useCallback(async (
    updates: Array<{ id: number; data: Partial<Task> }>
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const updatedTasks = await taskService.batchUpdateTasks(updates);

      dispatch({ type: 'BATCH_UPDATE_TASKS', payload: updatedTasks });
      dispatch({ type: 'CLEAR_CACHE' });

      errorLogger.info('task', 'TaskContext: 批量更新成功', {
        updateCount: updates.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量更新失败';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      errorLogger.error('task', 'TaskContext: 批量更新失败', {
        error: errorMessage,
        updateCount: updates.length
      });

      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 选择任务
  const selectTask = useCallback((task: Task | null) => {
    dispatch({ type: 'SET_SELECTED_TASK', payload: task });

    errorLogger.debug('task', 'TaskContext: 任务选择', {
      taskId: task?.id,
      title: task?.title
    });
  }, []);

  // 设置筛选器
  const setFilters = useCallback((filters: Partial<TaskState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
    loadTasks(filters);
  }, [loadTasks]);

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // 刷新统计信息
  const refreshStatistics = useCallback(() => {
    loadTasks({}, true);
  }, [loadTasks]);

  // 清除缓存
  const invalidateCache = useCallback(() => {
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);

  // 自动清理过期缓存
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const validEntries = new Map();

      for (const [key, value] of stateRef.current.cache.entries()) {
        if (now - value.timestamp < cacheTimeout) {
          validEntries.set(key, value);
        }
      }

      if (validEntries.size < stateRef.current.cache.size) {
        dispatch({ type: 'CLEAR_CACHE' });
        for (const [key, value] of validEntries.entries()) {
          dispatch({ type: 'SET_CACHE', payload: { key, data: value.data } });
        }

        errorLogger.debug('task', 'TaskContext: 清理过期缓存', {
          originalSize: stateRef.current.cache.size,
          newSize: validEntries.size
        });
      }
    }, cacheTimeout);

    return () => clearInterval(cleanupInterval);
  }, [cacheTimeout]);

  // actions 对象只创建一次，永远不变
  const actions = useMemo(() => {
    console.log('✨✨✨ [TaskContext] Creating actions object - THIS SHOULD ONLY APPEAR ONCE');
    return {
      loadTasks,
      loadTaskById,
      createTask,
      updateTask,
      deleteTask,
      batchUpdateTasks,
      selectTask,
      setFilters,
      clearError,
      refreshStatistics,
      invalidateCache
    };
  }, [
    loadTasks,
    loadTaskById,
    createTask,
    updateTask,
    deleteTask,
    batchUpdateTasks,
    selectTask,
    setFilters,
    clearError,
    refreshStatistics,
    invalidateCache
  ]);

  return (
    <TaskStateContext.Provider value={state}>
      <TaskActionsContext.Provider value={actions}>
        {children}
      </TaskActionsContext.Provider>
    </TaskStateContext.Provider>
  );
};

// 基础 Hook - 兼容原有 API
export const useTaskContext = (): TaskContextType => {
  const state = useContext(TaskStateContext);
  const actions = useContext(TaskActionsContext);

  if (state === undefined || actions === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }

  return { state, actions };
};

// 选择器 Hooks
export const useTasks = () => {
  const { state } = useTaskContext();
  return state.tasks;
};

export const useSelectedTask = () => {
  const { state } = useTaskContext();
  return state.selectedTask;
};

export const useTaskStatistics = () => {
  const { state } = useTaskContext();
  return state.statistics;
};

export const useTaskLoading = () => {
  const { state } = useTaskContext();
  return state.loading;
};

export const useTaskError = () => {
  const { state } = useTaskContext();
  return state.error;
};

export const useTaskFilters = () => {
  const { state } = useTaskContext();
  return state.filters;
};