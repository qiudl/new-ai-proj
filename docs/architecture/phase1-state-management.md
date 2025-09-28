# TaskDetailPage 状态管理架构设计

## 🎯 设计目标

1. **统一状态管理**: 通过Context集中管理页面状态
2. **性能优化**: 避免不必要的重渲染
3. **类型安全**: 完整的TypeScript类型定义
4. **易于测试**: 状态逻辑与UI分离
5. **渐进式更新**: 支持局部状态更新

## 📦 Context架构设计

### 主Context结构

```typescript
// contexts/TaskDetailContext.tsx

interface TaskDetailContextValue {
  // ========== 核心数据 ==========
  task: Task | null;
  project: Project | null;
  
  // ========== 关系数据 ==========
  relations: {
    parent: Task | null;
    subtasks: Task[];
    siblings: Task[];
    loading: boolean;
    error: Error | null;
  };
  
  // ========== 文档数据 ==========
  documents: {
    list: DocumentItem[];
    count: number;
    loading: boolean;
    error: Error | null;
    hasMore: boolean;
    page: number;
  };
  
  // ========== 时间线数据 ==========
  timeline: {
    events: TimelineEvent[];
    loading: boolean;
    error: Error | null;
    hasMore: boolean;
    page: number;
  };
  
  // ========== 统计数据 ==========
  statistics: {
    completion: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
      rate: number;
    };
    efficiency: {
      estimatedHours: number;
      actualHours: number;
      variance: number;
    };
    loading: boolean;
  };
  
  // ========== UI状态 ==========
  ui: {
    activeTab: string;
    sidebarCollapsed: boolean;
    modals: {
      edit: boolean;
      delete: boolean;
      archive: boolean;
      bulkImport: boolean;
      documentEdit: boolean;
    };
    expandedNodes: string[];
    selectedItems: number[];
  };
  
  // ========== 加载状态 ==========
  loading: {
    task: boolean;
    project: boolean;
    initial: boolean;
    refresh: boolean;
  };
  
  // ========== 错误状态 ==========
  errors: {
    task: Error | null;
    project: Error | null;
    global: Error | null;
  };
  
  // ========== 操作方法 ==========
  actions: TaskDetailActions;
}

interface TaskDetailActions {
  // 数据操作
  loadTask: () => Promise<void>;
  refreshTask: () => Promise<void>;
  updateTask: (updates: Partial<Task>) => Promise<void>;
  deleteTask: () => Promise<void>;
  archiveTask: () => Promise<void>;
  
  // 关系操作
  loadRelations: () => Promise<void>;
  addSubtask: (subtask: TaskRequest) => Promise<void>;
  updateSubtask: (id: number, updates: Partial<Task>) => Promise<void>;
  deleteSubtask: (id: number) => Promise<void>;
  
  // 文档操作
  loadDocuments: (page?: number) => Promise<void>;
  addDocument: (document: DocumentRequest) => Promise<void>;
  updateDocument: (id: number, content: string) => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;
  
  // 时间线操作
  loadTimeline: (page?: number) => Promise<void>;
  
  // UI操作
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  openModal: (modal: keyof TaskDetailContextValue['ui']['modals']) => void;
  closeModal: (modal: keyof TaskDetailContextValue['ui']['modals']) => void;
  toggleNode: (nodeId: string) => void;
  selectItem: (itemId: number) => void;
  clearSelection: () => void;
  
  // 批量操作
  batchUpdate: (operations: BatchOperation[]) => Promise<void>;
  reset: () => void;
}
```

### Context Provider实现

```typescript
export const TaskDetailProvider: React.FC<TaskDetailProviderProps> = ({ 
  children,
  projectId,
  taskId 
}) => {
  // 使用useReducer进行复杂状态管理
  const [state, dispatch] = useReducer(taskDetailReducer, initialState);
  
  // 创建稳定的actions对象
  const actions = useMemo(() => createActions(dispatch, projectId, taskId), [
    projectId, 
    taskId
  ]);
  
  // 组合context值
  const contextValue = useMemo(() => ({
    ...state,
    actions
  }), [state, actions]);
  
  // 初始化加载
  useEffect(() => {
    actions.loadTask();
  }, [taskId]);
  
  return (
    <TaskDetailContext.Provider value={contextValue}>
      {children}
    </TaskDetailContext.Provider>
  );
};
```

## 🔧 自定义Hooks设计

### 1. 核心数据Hooks

```typescript
// hooks/useTaskDetail.ts
export const useTaskDetail = () => {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error('useTaskDetail must be used within TaskDetailProvider');
  }
  
  return {
    task: context.task,
    loading: context.loading.task,
    error: context.errors.task,
    updateTask: context.actions.updateTask,
    deleteTask: context.actions.deleteTask,
    archiveTask: context.actions.archiveTask
  };
};
```

### 2. 关系管理Hooks

```typescript
// hooks/useTaskRelations.ts
export const useTaskRelations = () => {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error('useTaskRelations must be used within TaskDetailProvider');
  }
  
  return {
    parent: context.relations.parent,
    subtasks: context.relations.subtasks,
    siblings: context.relations.siblings,
    loading: context.relations.loading,
    error: context.relations.error,
    addSubtask: context.actions.addSubtask,
    updateSubtask: context.actions.updateSubtask,
    deleteSubtask: context.actions.deleteSubtask
  };
};
```

### 3. 文档管理Hooks

```typescript
// hooks/useTaskDocuments.ts
export const useTaskDocuments = () => {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error('useTaskDocuments must be used within TaskDetailProvider');
  }
  
  const { documents, actions } = context;
  
  // 分页加载
  const loadMore = useCallback(() => {
    if (!documents.loading && documents.hasMore) {
      actions.loadDocuments(documents.page + 1);
    }
  }, [documents, actions]);
  
  return {
    documents: documents.list,
    count: documents.count,
    loading: documents.loading,
    error: documents.error,
    hasMore: documents.hasMore,
    loadMore,
    addDocument: actions.addDocument,
    updateDocument: actions.updateDocument,
    deleteDocument: actions.deleteDocument
  };
};
```

### 4. UI状态Hooks

```typescript
// hooks/useTaskDetailUI.ts
export const useTaskDetailUI = () => {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error('useTaskDetailUI must be used within TaskDetailProvider');
  }
  
  const { ui, actions } = context;
  
  return {
    activeTab: ui.activeTab,
    sidebarCollapsed: ui.sidebarCollapsed,
    modals: ui.modals,
    setActiveTab: actions.setActiveTab,
    toggleSidebar: actions.toggleSidebar,
    openModal: actions.openModal,
    closeModal: actions.closeModal
  };
};
```

### 5. 统计数据Hooks

```typescript
// hooks/useTaskStatistics.ts
export const useTaskStatistics = () => {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error('useTaskStatistics must be used within TaskDetailProvider');
  }
  
  const { statistics } = context;
  
  // 计算衍生数据
  const progress = useMemo(() => {
    const { completion } = statistics;
    return {
      percentage: completion.total > 0 
        ? Math.round((completion.completed / completion.total) * 100)
        : 0,
      status: getProgressStatus(completion.rate),
      trend: calculateTrend(completion)
    };
  }, [statistics.completion]);
  
  return {
    completion: statistics.completion,
    efficiency: statistics.efficiency,
    progress,
    loading: statistics.loading
  };
};
```

### 6. 计时器Hooks

```typescript
// hooks/useTaskTimer.ts
export const useTaskTimer = (taskId: number) => {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const start = useCallback(async () => {
    try {
      const response = await TimerService.start(taskId);
      setTimer(response.data);
      setIsRunning(true);
      startTicking();
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  }, [taskId]);
  
  const pause = useCallback(async () => {
    try {
      await TimerService.pause(taskId);
      setIsRunning(false);
      stopTicking();
    } catch (error) {
      console.error('Failed to pause timer:', error);
    }
  }, [taskId]);
  
  const stop = useCallback(async () => {
    try {
      await TimerService.stop(taskId);
      setTimer(null);
      setIsRunning(false);
      stopTicking();
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  }, [taskId]);
  
  // 清理函数
  useEffect(() => {
    return () => {
      stopTicking();
    };
  }, []);
  
  return {
    timer,
    isRunning,
    start,
    pause,
    stop,
    duration: timer?.duration || 0
  };
};
```

## 📊 Reducer设计

```typescript
// reducers/taskDetailReducer.ts

type TaskDetailAction =
  | { type: 'SET_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> }
  | { type: 'SET_LOADING'; payload: { key: string; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: string; error: Error | null } }
  | { type: 'SET_RELATIONS'; payload: Partial<TaskDetailContextValue['relations']> }
  | { type: 'SET_DOCUMENTS'; payload: Partial<TaskDetailContextValue['documents']> }
  | { type: 'ADD_DOCUMENT'; payload: DocumentItem }
  | { type: 'UPDATE_DOCUMENT'; payload: { id: number; updates: Partial<DocumentItem> } }
  | { type: 'DELETE_DOCUMENT'; payload: number }
  | { type: 'SET_UI'; payload: Partial<TaskDetailContextValue['ui']> }
  | { type: 'TOGGLE_MODAL'; payload: { modal: string; visible: boolean } }
  | { type: 'SET_STATISTICS'; payload: Partial<TaskDetailContextValue['statistics']> }
  | { type: 'RESET' };

export const taskDetailReducer = (
  state: TaskDetailState,
  action: TaskDetailAction
): TaskDetailState => {
  switch (action.type) {
    case 'SET_TASK':
      return {
        ...state,
        task: action.payload,
        loading: { ...state.loading, task: false }
      };
      
    case 'UPDATE_TASK':
      if (!state.task) return state;
      return {
        ...state,
        task: { ...state.task, ...action.payload }
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error }
      };
      
    case 'SET_RELATIONS':
      return {
        ...state,
        relations: { ...state.relations, ...action.payload }
      };
      
    case 'SET_DOCUMENTS':
      return {
        ...state,
        documents: { ...state.documents, ...action.payload }
      };
      
    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: {
          ...state.documents,
          list: [...state.documents.list, action.payload],
          count: state.documents.count + 1
        }
      };
      
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: {
          ...state.documents,
          list: state.documents.list.map(doc =>
            doc.id === action.payload.id
              ? { ...doc, ...action.payload.updates }
              : doc
          )
        }
      };
      
    case 'DELETE_DOCUMENT':
      return {
        ...state,
        documents: {
          ...state.documents,
          list: state.documents.list.filter(doc => doc.id !== action.payload),
          count: state.documents.count - 1
        }
      };
      
    case 'SET_UI':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
      
    case 'TOGGLE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            [action.payload.modal]: action.payload.visible
          }
        }
      };
      
    case 'SET_STATISTICS':
      return {
        ...state,
        statistics: { ...state.statistics, ...action.payload }
      };
      
    case 'RESET':
      return initialState;
      
    default:
      return state;
  }
};
```

## 🎯 性能优化策略

### 1. Context分割

```typescript
// 将频繁更新的状态分离到独立的Context
export const TaskTimerProvider: React.FC = ({ children }) => {
  // 独立的计时器状态，避免影响其他组件
};

export const TaskDocumentProvider: React.FC = ({ children }) => {
  // 独立的文档状态，支持实时编辑
};
```

### 2. 选择性订阅

```typescript
// hooks/useTaskSelector.ts
export const useTaskSelector = <T>(
  selector: (state: TaskDetailContextValue) => T
): T => {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error('useTaskSelector must be used within TaskDetailProvider');
  }
  
  // 使用useMemo缓存选择结果
  return useMemo(() => selector(context), [context, selector]);
};

// 使用示例
const taskTitle = useTaskSelector(state => state.task?.title);
```

### 3. 批量更新

```typescript
// utils/batchUpdate.ts
export const batchUpdate = (
  dispatch: Dispatch<TaskDetailAction>,
  updates: TaskDetailAction[]
) => {
  // 使用unstable_batchedUpdates批量更新
  unstable_batchedUpdates(() => {
    updates.forEach(update => dispatch(update));
  });
};
```

### 4. 延迟加载

```typescript
// hooks/useLazyLoad.ts
export const useLazyLoadDocuments = () => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const { loadDocuments } = useTaskDocuments();
  
  useEffect(() => {
    if (shouldLoad) {
      loadDocuments();
    }
  }, [shouldLoad]);
  
  return {
    trigger: () => setShouldLoad(true),
    isLoaded: shouldLoad
  };
};
```

### 5. 缓存策略

```typescript
// utils/cache.ts
interface CacheConfig {
  ttl: number; // Time to live in ms
  key: string;
}

export class StateCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  set(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl
    });
  }
  
  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  invalidate(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## 📝 状态更新流程

### 典型更新流程示例

```typescript
// actions/taskActions.ts
export const createActions = (
  dispatch: Dispatch<TaskDetailAction>,
  projectId: number,
  taskId: number
) => {
  const updateTask = async (updates: Partial<Task>) => {
    try {
      // 1. 设置加载状态
      dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: true } });
      
      // 2. 乐观更新
      dispatch({ type: 'UPDATE_TASK', payload: updates });
      
      // 3. 发送API请求
      const response = await TaskService.updateTask(projectId, taskId, updates);
      
      // 4. 更新实际数据
      dispatch({ type: 'SET_TASK', payload: response.data });
      
      // 5. 清理加载状态
      dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: false } });
      
      // 6. 触发缓存失效
      cacheManager.invalidate(`task:${taskId}`);
      
    } catch (error) {
      // 7. 错误处理
      dispatch({ type: 'SET_ERROR', payload: { key: 'task', error } });
      
      // 8. 回滚乐观更新
      const originalTask = await TaskService.getTask(projectId, taskId);
      dispatch({ type: 'SET_TASK', payload: originalTask.data });
    }
  };
  
  return { updateTask };
};
```

## 🧪 测试策略

### 1. Context测试

```typescript
// __tests__/TaskDetailContext.test.tsx
describe('TaskDetailContext', () => {
  it('should provide initial state', () => {
    const { result } = renderHook(() => useTaskDetail(), {
      wrapper: ({ children }) => (
        <TaskDetailProvider projectId={1} taskId={1}>
          {children}
        </TaskDetailProvider>
      )
    });
    
    expect(result.current.task).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  
  it('should update task', async () => {
    const { result } = renderHook(() => useTaskDetail(), {
      wrapper: ({ children }) => (
        <TaskDetailProvider projectId={1} taskId={1}>
          {children}
        </TaskDetailProvider>
      )
    });
    
    await act(async () => {
      await result.current.updateTask({ title: 'New Title' });
    });
    
    expect(result.current.task?.title).toBe('New Title');
  });
});
```

### 2. Hooks测试

```typescript
// __tests__/useTaskRelations.test.ts
describe('useTaskRelations', () => {
  it('should manage subtasks', async () => {
    const { result } = renderHook(() => useTaskRelations(), {
      wrapper: TestWrapper
    });
    
    await act(async () => {
      await result.current.addSubtask({ title: 'New Subtask' });
    });
    
    expect(result.current.subtasks).toHaveLength(1);
    expect(result.current.subtasks[0].title).toBe('New Subtask');
  });
});
```

## ✅ 验收标准

### 功能要求
- [ ] 所有状态操作都有对应的TypeScript类型
- [ ] 支持乐观更新和错误回滚
- [ ] 实现状态持久化（可选）
- [ ] 支持状态时间旅行调试（开发环境）

### 性能要求
- [ ] 减少50%以上的不必要重渲染
- [ ] 状态更新延迟小于100ms
- [ ] 内存占用优化20%

### 代码质量
- [ ] 100% TypeScript覆盖
- [ ] 单元测试覆盖率80%以上
- [ ] 文档完整清晰

---

*文档创建时间: 2025-09-28*
*架构师: Claude Code Assistant*