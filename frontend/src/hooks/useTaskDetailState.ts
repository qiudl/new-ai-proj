import { useState, useCallback, useRef } from 'react';
import { Task, TaskUpdate, TimelineEvent } from '../types/task';

/**
 * 任务详情页统一状态管理Hook
 * 目标：减少状态数量，优化内存使用
 */

// 任务基本信息状态
interface TaskState {
  task: Task | null;
  loading: boolean;
  error: string | null;
}

// 文档相关状态
interface DocumentState {
  exists: boolean | null;
  count: number;
  loading: boolean;
}

// 关系任务状态
interface RelationState {
  subtasks: Task[];
  siblings: Task[];
  parent: Task | null;
  related: Task[];
  loading: boolean;
  error: string | null;
}

// 完成统计状态
interface CompletionState {
  totalSubtasks: number;
  completedSubtasks: number;
  inProgressSubtasks: number;
  todoSubtasks: number;
  completionRate: number;
  loading: boolean;
}

// UI状态
interface UIState {
  activeTab: string;
  expandedSubtasks: boolean;
  expandedSiblings: boolean;
  taskModalVisible: boolean;
  taskModalMode: 'edit' | 'createSubtask' | 'createSibling';
  archiveModalVisible: boolean;
  bulkSubTaskModalVisible: boolean;
  modalLoading: boolean;
}

// 历史和时间线状态
interface HistoryState {
  taskUpdates: TaskUpdate[];
  timelineEvents: TimelineEvent[];
  loading: boolean;
}

// 项目信息状态
interface ProjectState {
  projectInfo: any | null;
  loading: boolean;
}

export const useTaskDetailState = () => {
  // 合并后的状态
  const [taskState, setTaskState] = useState<TaskState>({
    task: null,
    loading: true,
    error: null
  });

  const [documentState, setDocumentState] = useState<DocumentState>({
    exists: null,
    count: 0,
    loading: false
  });

  const [relationState, setRelationState] = useState<RelationState>({
    subtasks: [],
    siblings: [],
    parent: null,
    related: [],
    loading: false,
    error: null
  });

  const [completionState, setCompletionState] = useState<CompletionState>({
    totalSubtasks: 0,
    completedSubtasks: 0,
    inProgressSubtasks: 0,
    todoSubtasks: 0,
    completionRate: 0,
    loading: false
  });

  const [uiState, setUIState] = useState<UIState>({
    activeTab: 'info',
    expandedSubtasks: false,
    expandedSiblings: false,
    taskModalVisible: false,
    taskModalMode: 'edit',
    archiveModalVisible: false,
    bulkSubTaskModalVisible: false,
    modalLoading: false
  });

  const [historyState, setHistoryState] = useState<HistoryState>({
    taskUpdates: [],
    timelineEvents: [],
    loading: false
  });

  const [projectState, setProjectState] = useState<ProjectState>({
    projectInfo: null,
    loading: false
  });

  // 缓存引用，避免重复创建对象
  const stateRefs = useRef({
    taskState,
    documentState,
    relationState,
    completionState,
    uiState,
    historyState,
    projectState
  });

  // 更新引用
  stateRefs.current = {
    taskState,
    documentState,
    relationState,
    completionState,
    uiState,
    historyState,
    projectState
  };

  // 优化的更新函数，使用部分更新避免全量替换
  const updateTaskState = useCallback((updates: Partial<TaskState>) => {
    setTaskState(prev => {
      // 仅在实际有变化时更新
      const hasChanges = Object.keys(updates).some(key => 
        prev[key as keyof TaskState] !== updates[key as keyof TaskState]
      );
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updateDocumentState = useCallback((updates: Partial<DocumentState>) => {
    setDocumentState(prev => {
      const hasChanges = Object.keys(updates).some(key => 
        prev[key as keyof DocumentState] !== updates[key as keyof DocumentState]
      );
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updateRelationState = useCallback((updates: Partial<RelationState>) => {
    setRelationState(prev => {
      const hasChanges = Object.keys(updates).some(key => {
        const oldVal = prev[key as keyof RelationState];
        const newVal = updates[key as keyof RelationState];
        // 特别处理数组比较
        if (Array.isArray(oldVal) && Array.isArray(newVal)) {
          return oldVal.length !== newVal.length || 
                 oldVal.some((item, index) => item.id !== newVal[index]?.id);
        }
        return oldVal !== newVal;
      });
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updateCompletionState = useCallback((updates: Partial<CompletionState>) => {
    setCompletionState(prev => {
      const hasChanges = Object.keys(updates).some(key => 
        prev[key as keyof CompletionState] !== updates[key as keyof CompletionState]
      );
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updateUIState = useCallback((updates: Partial<UIState>) => {
    setUIState(prev => {
      const hasChanges = Object.keys(updates).some(key => 
        prev[key as keyof UIState] !== updates[key as keyof UIState]
      );
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updateHistoryState = useCallback((updates: Partial<HistoryState>) => {
    setHistoryState(prev => {
      const hasChanges = Object.keys(updates).some(key => {
        const oldVal = prev[key as keyof HistoryState];
        const newVal = updates[key as keyof HistoryState];
        if (Array.isArray(oldVal) && Array.isArray(newVal)) {
          return oldVal.length !== newVal.length;
        }
        return oldVal !== newVal;
      });
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  const updateProjectState = useCallback((updates: Partial<ProjectState>) => {
    setProjectState(prev => {
      const hasChanges = Object.keys(updates).some(key => 
        prev[key as keyof ProjectState] !== updates[key as keyof ProjectState]
      );
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  // 计算完成统计的辅助函数
  const calculateCompletionStats = useCallback((subtasks: Task[]) => {
    const stats = {
      totalSubtasks: subtasks.length,
      completedSubtasks: subtasks.filter(t => t.status === 'completed').length,
      inProgressSubtasks: subtasks.filter(t => t.status === 'in_progress').length,
      todoSubtasks: subtasks.filter(t => t.status === 'todo').length,
      completionRate: 0,
      loading: false
    };
    
    if (stats.totalSubtasks > 0) {
      stats.completionRate = Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100);
    }
    
    updateCompletionState(stats);
  }, [updateCompletionState]);

  // 重置所有状态（组件卸载时使用）
  const resetAllState = useCallback(() => {
    setTaskState({ task: null, loading: true, error: null });
    setDocumentState({ exists: null, count: 0, loading: false });
    setRelationState({ subtasks: [], siblings: [], parent: null, related: [], loading: false, error: null });
    setCompletionState({ totalSubtasks: 0, completedSubtasks: 0, inProgressSubtasks: 0, todoSubtasks: 0, completionRate: 0, loading: false });
    setUIState({ activeTab: 'info', expandedSubtasks: false, expandedSiblings: false, taskModalVisible: false, taskModalMode: 'edit', archiveModalVisible: false, bulkSubTaskModalVisible: false, modalLoading: false });
    setHistoryState({ taskUpdates: [], timelineEvents: [], loading: false });
    setProjectState({ projectInfo: null, loading: false });
  }, []);

  // 获取当前所有状态的快照（用于调试）
  const getStateSnapshot = useCallback(() => {
    return {
      task: taskState,
      document: documentState,
      relation: relationState,
      completion: completionState,
      ui: uiState,
      history: historyState,
      project: projectState
    };
  }, [taskState, documentState, relationState, completionState, uiState, historyState, projectState]);

  return {
    // 状态
    taskState,
    documentState,
    relationState,
    completionState,
    uiState,
    historyState,
    projectState,
    
    // 更新函数
    updateTaskState,
    updateDocumentState,
    updateRelationState,
    updateCompletionState,
    updateUIState,
    updateHistoryState,
    updateProjectState,
    
    // 辅助函数
    calculateCompletionStats,
    resetAllState,
    getStateSnapshot
  };
};
