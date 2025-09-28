import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { TaskService } from '../services/taskService';
import { Task } from '../types/task';
import { 
  HierarchicalTaskManager, 
  HierarchicalTaskWithDocument, 
  HierarchicalStats 
} from '../utils/HierarchicalTaskManager';

export interface HierarchicalFilterState {
  search: string;
  projectId?: number;
  status?: string;
  documentStatus?: string;
  level?: number;
  expandedState?: 'expanded' | 'collapsed' | 'leaf';
}

export interface UseHierarchicalTasksResult {
  // 数据状态
  tasks: HierarchicalTaskWithDocument[];
  loading: boolean;
  error: string | null;
  stats: HierarchicalStats | null;
  
  // 筛选状态
  filters: HierarchicalFilterState;
  setFilters: (filters: Partial<HierarchicalFilterState>) => void;
  
  // 操作方法
  loadTasks: (projectIds: number[]) => Promise<void>;
  expandNode: (taskId: number) => Promise<void>;
  collapseNode: (taskId: number) => void;
  expandAll: () => Promise<void>;
  collapseAll: () => void;
  smartExpand: () => Promise<void>;
  expandToLevel: (level: number) => Promise<void>;
  refreshTasks: () => Promise<void>;
  
  // 实用方法
  getTaskPath: (taskId: number) => string;
  isTaskVisible: (taskId: number) => boolean;
  getExpandedKeys: () => Set<number>;
}

export const useHierarchicalTasks = (): UseHierarchicalTasksResult => {
  const [tasks, setTasks] = useState<HierarchicalTaskWithDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<HierarchicalStats | null>(null);
  const [filters, setFiltersState] = useState<HierarchicalFilterState>({
    search: '',
  });
  
  const managerRef = useRef(new HierarchicalTaskManager());
  const projectIdsRef = useRef<number[]>([]);

  const manager = managerRef.current;

  // 加载任务数据
  const loadTasks = useCallback(async (projectIds: number[]) => {
    setLoading(true);
    setError(null);
    projectIdsRef.current = projectIds;

    try {
      const allTasks: Task[] = [];
      
      // 加载所有项目的任务
      for (const projectId of projectIds) {
        try {
          const response = await TaskService.getTasks(projectId, { 
            page_size: 1000 // 获取所有任务
          });
          const projectTasks = response.data || [];
          
          // 为任务添加项目信息
          const tasksWithProject = projectTasks.map(task => ({
            ...task,
            projectId,
          }));
          
          allTasks.push(...tasksWithProject);
        } catch (error) {
          console.error(`加载项目 ${projectId} 的任务失败:`, error);
        }
      }

      // 构建树形结构
      const hierarchicalTasks = manager.buildTree(allTasks);
      
      // 加载文档信息
      await loadDocumentInfo(hierarchicalTasks);
      
      // 应用筛选
      const filteredTasks = applyFilters(hierarchicalTasks, filters);
      setTasks(filteredTasks);
      
      // 计算统计信息
      const taskStats = manager.calculateStats(filteredTasks);
      setStats(taskStats);
      
    } catch (error) {
      console.error('加载任务失败:', error);
      setError(error instanceof Error ? error.message : '加载任务失败');
      message.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [manager, filters]);

  // 加载文档信息
  const loadDocumentInfo = async (tasks: HierarchicalTaskWithDocument[]) => {
    const CONCURRENCY = 16;
    
    const loadTaskDocuments = async (task: HierarchicalTaskWithDocument) => {
      try {
        const response = await fetch(
          `/api/v1/projects/${task.project_id}/tasks/${task.id}/documents`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const documents = data?.data || [];
          manager.updateTaskDocuments(task.id, documents);
        }
      } catch (error) {
        console.error(`加载任务 ${task.id} 的文档失败:`, error);
      }
    };

    // 分批并发加载
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      const chunk = tasks.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(loadTaskDocuments));
    }
  };

  // 应用筛选条件
  const applyFilters = (
    tasks: HierarchicalTaskWithDocument[], 
    filterState: HierarchicalFilterState
  ): HierarchicalTaskWithDocument[] => {
    let filtered = [...tasks];

    // 关键词搜索
    if (filterState.search?.trim()) {
      const keyword = filterState.search.trim().toLowerCase();
      
      if (keyword.startsWith('#')) {
        // ID搜索
        const id = parseInt(keyword.substring(1));
        if (!isNaN(id)) {
          filtered = filtered.filter(task => task.id === id);
        }
      } else {
        // 常规搜索
        filtered = filtered.filter(task =>
          task.title.toLowerCase().includes(keyword) ||
          task.description?.toLowerCase().includes(keyword) ||
          task.id.toString().includes(keyword)
        );
      }
    }

    // 项目筛选
    if (filterState.projectId) {
      filtered = filtered.filter(task => task.project_id === filterState.projectId);
    }

    // 状态筛选
    if (filterState.status) {
      filtered = filtered.filter(task => task.status === filterState.status);
    }

    // 文档状态筛选
    if (filterState.documentStatus === 'with-doc') {
      filtered = filtered.filter(task => task.documentCount > 0);
    } else if (filterState.documentStatus === 'without-doc') {
      filtered = filtered.filter(task => task.documentCount === 0);
    }

    // 层级筛选
    if (filterState.level !== undefined) {
      filtered = filtered.filter(task => task.level === filterState.level);
    }

    // 展开状态筛选
    if (filterState.expandedState === 'expanded') {
      filtered = filtered.filter(task => task.hasChildren && task.expanded);
    } else if (filterState.expandedState === 'collapsed') {
      filtered = filtered.filter(task => task.hasChildren && !task.expanded);
    } else if (filterState.expandedState === 'leaf') {
      filtered = filtered.filter(task => !task.hasChildren);
    }

    return manager.flattenForDisplay(filtered);
  };

  // 展开节点
  const expandNode = useCallback(async (taskId: number) => {
    const projectId = projectIdsRef.current[0]; // 使用第一个项目ID
    if (!projectId) return;

    try {
      await manager.expandNode(taskId, projectId);
      
      // 重新应用筛选和更新显示
      const allTasks = Array.from(manager['tasks'].values())
        .filter(task => task.level === 0);
      const filteredTasks = applyFilters(allTasks, filters);
      setTasks(filteredTasks);
      
    } catch (error) {
      console.error('展开任务失败:', error);
      message.error('展开任务失败');
    }
  }, [manager, filters]);

  // 折叠节点
  const collapseNode = useCallback((taskId: number) => {
    manager.collapseNode(taskId);
    
    // 重新应用筛选和更新显示
    const allTasks = Array.from(manager['tasks'].values())
      .filter(task => task.level === 0);
    const filteredTasks = applyFilters(allTasks, filters);
    setTasks(filteredTasks);
  }, [manager, filters]);

  // 全部展开
  const expandAll = useCallback(async () => {
    const projectId = projectIdsRef.current[0];
    if (!projectId) return;

    try {
      setLoading(true);
      await manager.expandAll(projectId);
      
      // 重新应用筛选和更新显示
      const allTasks = Array.from(manager['tasks'].values())
        .filter(task => task.level === 0);
      const filteredTasks = applyFilters(allTasks, filters);
      setTasks(filteredTasks);
      
      message.success('已展开所有任务');
    } catch (error) {
      console.error('展开所有任务失败:', error);
      message.error('展开所有任务失败');
    } finally {
      setLoading(false);
    }
  }, [manager, filters]);

  // 全部折叠
  const collapseAll = useCallback(() => {
    manager.collapseAll();
    
    // 重新应用筛选和更新显示
    const allTasks = Array.from(manager['tasks'].values())
      .filter(task => task.level === 0);
    const filteredTasks = applyFilters(allTasks, filters);
    setTasks(filteredTasks);
    
    message.success('已折叠所有任务');
  }, [manager, filters]);

  // 智能展开
  const smartExpand = useCallback(async () => {
    const projectId = projectIdsRef.current[0];
    if (!projectId) return;

    try {
      setLoading(true);
      await manager.smartExpand(projectId);
      
      // 重新应用筛选和更新显示
      const allTasks = Array.from(manager['tasks'].values())
        .filter(task => task.level === 0);
      const filteredTasks = applyFilters(allTasks, filters);
      setTasks(filteredTasks);
      
      message.success('已智能展开有文档的任务');
    } catch (error) {
      console.error('智能展开失败:', error);
      message.error('智能展开失败');
    } finally {
      setLoading(false);
    }
  }, [manager, filters]);

  // 展开到指定层级
  const expandToLevel = useCallback(async (level: number) => {
    const projectId = projectIdsRef.current[0];
    if (!projectId) return;

    try {
      setLoading(true);
      await manager.expandToLevel(level, projectId);
      
      // 重新应用筛选和更新显示
      const allTasks = Array.from(manager['tasks'].values())
        .filter(task => task.level === 0);
      const filteredTasks = applyFilters(allTasks, filters);
      setTasks(filteredTasks);
      
      message.success(`已展开到第 ${level + 1} 级`);
    } catch (error) {
      console.error('展开到指定层级失败:', error);
      message.error('展开到指定层级失败');
    } finally {
      setLoading(false);
    }
  }, [manager, filters]);

  // 刷新任务
  const refreshTasks = useCallback(async () => {
    if (projectIdsRef.current.length > 0) {
      await loadTasks(projectIdsRef.current);
    }
  }, [loadTasks]);

  // 设置筛选条件
  const setFilters = useCallback((newFilters: Partial<HierarchicalFilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFiltersState(updatedFilters);
    
    // 重新应用筛选
    const allTasks = Array.from(manager['tasks'].values())
      .filter(task => task.level === 0);
    const filteredTasks = applyFilters(allTasks, updatedFilters);
    setTasks(filteredTasks);
    
    // 重新计算统计信息
    const taskStats = manager.calculateStats(filteredTasks);
    setStats(taskStats);
  }, [filters, manager]);

  // 实用方法
  const getTaskPath = useCallback((taskId: number) => {
    return manager.getTaskPath(taskId);
  }, [manager]);

  const isTaskVisible = useCallback((taskId: number) => {
    return manager.isTaskVisible(taskId);
  }, [manager]);

  const getExpandedKeys = useCallback(() => {
    return manager.getExpandedKeys();
  }, [manager]);

  // 监听筛选条件变化
  useEffect(() => {
    if (tasks.length > 0) {
      const filteredTasks = applyFilters(tasks, filters);
      setTasks(filteredTasks);
      
      const taskStats = manager.calculateStats(filteredTasks);
      setStats(taskStats);
    }
  }, [filters, manager]);

  return {
    // 数据状态
    tasks,
    loading,
    error,
    stats,
    
    // 筛选状态
    filters,
    setFilters,
    
    // 操作方法
    loadTasks,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    smartExpand,
    expandToLevel,
    refreshTasks,
    
    // 实用方法
    getTaskPath,
    isTaskVisible,
    getExpandedKeys,
  };
};