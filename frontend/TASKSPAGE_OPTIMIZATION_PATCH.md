# TasksPage 性能优化补丁说明

## 如何应用优化

### 步骤1: 导入优化的组件

在 `TasksPage.tsx` 顶部添加导入:

```typescript
// 在文件顶部添加
import {
  TaskStatusSelect,
  TaskAssigneeSelect,
  TaskDueDatePicker,
  TaskPrioritySelect,
  TaskTags,
  TaskProjectLink,
  TaskRowCheckbox,
  TaskRowActions
} from '../components/TaskRow/TaskRowMemoized';
```

### 步骤2: 优化事件处理器

将这些函数用`useCallback`包装,减少依赖:

```typescript
// 找到 handleStatusUpdate 并修改为:
const handleStatusUpdate = useCallback(async (taskId: number, newStatus: string, task: Task) => {
  const hideLoading = message.loading('正在更新状态...', 0);
  try {
    const projectId = effectiveProjectId || task.project_id;
    if (!projectId) {
      message.error('无法更新任务状态：缺少项目信息');
      return;
    }

    await TaskService.updateTask(projectId, taskId, {
      status: newStatus as any
    });

    // ✅ 优化: 乐观更新,避免重新加载
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t
    ));

    // 如果任务状态变更为completed或cancelled，主动刷新计时器
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      try {
        await refreshTimer();
      } catch (timerError) {
        console.warn('Failed to refresh timer:', timerError);
      }
    }

    message.success('状态更新成功');
  } catch (error: any) {
    console.error('Status update error:', error);
    const status = error?.status ?? error?.statusCode;
    if (status === 403) {
      message.error('权限不足');
    } else if (status === 404) {
      message.error('任务不存在');
    } else {
      message.error(error?.message || '状态更新失败');
    }
    // 失败时重新加载确保数据一致性
    loadTasks(pagination.current, pagination.pageSize);
  } finally {
    hideLoading();
  }
}, [effectiveProjectId, refreshTimer, pagination.current, pagination.pageSize]); // 减少依赖

// 类似地优化其他处理器:
const handlePriorityUpdate = useCallback(async (task: Task, newPriority: 'low' | 'medium' | 'high') => {
  try {
    const projectId = effectiveProjectId || task.project_id;
    if (!projectId) {
      message.error('无法更新优先级：缺少项目信息');
      return;
    }
    const hide = message.loading('正在更新优先级...', 0);
    await TaskService.updateTask(projectId, task.id, { priority: newPriority });
    hide();

    // ✅ 乐观更新
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, priority: newPriority, custom_fields: { ...t.custom_fields, priority: newPriority } } : t
    ));

    message.success('优先级更新成功');
  } catch (error: any) {
    console.error('Priority update error:', error);
    message.error(error?.message || '优先级更新失败');
    loadTasks(pagination.current, pagination.pageSize);
  }
}, [effectiveProjectId, pagination.current, pagination.pageSize]);

const handleAssigneeUpdate = useCallback(async (task: Task, assigneeId: number | null) => {
  try {
    const projectId = effectiveProjectId || task.project_id;
    if (!projectId) {
      message.error('无法更新负责人：缺少项目信息');
      return;
    }
    const hide = message.loading('正在更新负责人...', 0);
    await TaskService.updateTask(projectId, task.id, { assignee_id: assigneeId });
    hide();

    // ✅ 乐观更新
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, assignee_id: assigneeId } : t
    ));

    message.success('负责人更新成功');
  } catch (error: any) {
    console.error('Assignee update error:', error);
    message.error(error?.message || '负责人更新失败');
    loadTasks(pagination.current, pagination.pageSize);
  }
}, [effectiveProjectId, pagination.current, pagination.pageSize]);

const handleDueDateUpdate = useCallback(async (taskId: number, newDueDate: string | null, task: Task) => {
  const hideLoading = message.loading('正在更新截止日期...', 0);
  try {
    const projectId = effectiveProjectId || task.project_id;
    if (!projectId) {
      message.error('无法更新截止日期：缺少项目信息');
      return;
    }

    const currentDueDate = task.due_date;
    if (currentDueDate === newDueDate) {
      return;
    }

    await TaskService.updateTask(projectId, taskId, { due_date: newDueDate || "" });

    // ✅ 乐观更新
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, due_date: newDueDate } : t
    ));

    message.success('截止日期更新成功');
  } catch (error: any) {
    console.error('Due date update error:', error);
    message.error(error?.message || '截止日期更新失败');
    loadTasks(pagination.current, pagination.pageSize);
  } finally {
    hideLoading();
  }
}, [effectiveProjectId, pagination.current, pagination.pageSize]);
```

### 步骤3: 优化 generateColumns

找到 `generateColumns` 的useMemo,并替换对应的case:

```typescript
// 找到 generateColumns 函数中的 switch 语句,替换各个 case:

case 'selection':
  return {
    title: createResizableTitle(config, (
      <Checkbox
        indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < stableDataSource.length}
        onChange={(e) => handleSelectAll(e.target.checked)}
        checked={stableDataSource.length > 0 && selectedTaskIds.length === stableDataSource.length}
      />
    )),
    dataIndex: 'selection',
    key: 'selection',
    width: config.width,
    render: (_: unknown, record: Task) => (
      // ✅ 使用memo化的组件
      <TaskRowCheckbox
        taskId={record.id}
        checked={selectedTaskIds.includes(record.id)}
        onChange={handleTaskSelect}
      />
    ),
  };

case 'status':
  return {
    title: createResizableTitle(config, '状态'),
    dataIndex: 'status',
    key: 'status',
    width: config.width,
    sorter: true,
    sortOrder: tableSort.sortBy === 'status' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
    render: (status: TaskStatus, record: Task) => (
      // ✅ 使用memo化的组件
      <TaskStatusSelect
        taskId={record.id}
        status={status}
        onStatusChange={handleStatusUpdate}
        task={record}
      />
    ),
  };

case 'assignee_name':
  return {
    title: createResizableTitle(config, '负责人'),
    dataIndex: 'assignee_name',
    key: 'assignee_name',
    width: config.width,
    render: (_name: string, record: Task) => {
      const pid = record.project_id;
      const options = projectUsersCache.get(pid) || [];
      return (
        // ✅ 使用memo化的组件
        <TaskAssigneeSelect
          task={record}
          projectUsers={options}
          loading={loadingProjectUsers.has(pid)}
          onAssigneeChange={handleAssigneeUpdate}
          onLoadUsers={loadProjectUsers}
        />
      );
    },
  };

case 'due_date':
  return {
    title: createResizableTitle(config, '截止时间'),
    dataIndex: 'due_date',
    key: 'due_date',
    width: config.width,
    sorter: true,
    sortOrder: tableSort.sortBy === 'due_date' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
    render: (date: string, record: Task) => (
      // ✅ 使用memo化的组件
      <TaskDueDatePicker
        task={record}
        date={date}
        onDueDateChange={handleDueDateUpdate}
      />
    ),
  };

case 'priority':
  return {
    title: createResizableTitle(config, '优先级'),
    dataIndex: 'priority',
    key: 'priority',
    width: config.width,
    render: (_: string, record: Task) => {
      const current = (record as any).priority || (record.custom_fields?.priority as 'low' | 'medium' | 'high') || 'medium';
      return (
        // ✅ 使用memo化的组件
        <TaskPrioritySelect
          task={record}
          priority={current}
          onPriorityChange={handlePriorityUpdate}
        />
      );
    },
  };

case 'tags':
  return {
    title: createResizableTitle(config, '标签'),
    key: 'tags',
    width: config.width,
    render: (_: unknown, record: Task) => {
      const tags = record.custom_fields?.tags || [];
      return (
        // ✅ 使用memo化的组件
        <TaskTags tags={tags} />
      );
    },
  };

case 'project_name':
  return {
    title: createResizableTitle(config, '所属项目'),
    dataIndex: 'project_name',
    key: 'project_name',
    width: config.width,
    ellipsis: true,
    render: (projectName: string, record: Task) => {
      const displayName = projectName || record.custom_fields?.project_name || `项目${record.project_id}`;
      return (
        // ✅ 使用memo化的组件
        <TaskProjectLink
          projectId={record.project_id}
          projectName={displayName}
          onNavigate={(pid) => navigate(`/projects/${pid}`)}
        />
      );
    },
  };

case 'action':
  return {
    title: createResizableTitle(config, '操作'),
    key: 'action',
    width: config.width,
    fixed: 'right',
    render: (_: unknown, record: Task) => (
      // ✅ 使用memo化的组件
      <TaskRowActions
        task={record}
        onView={handleViewTask}
      />
    ),
  };
```

### 步骤4: 添加新的回调函数

在TasksPage中添加这个新的回调:

```typescript
// 添加任务选择处理器
const handleTaskSelect = useCallback((taskId: number, checked: boolean) => {
  setSelectedTaskIds(prev => {
    if (checked) {
      return [...prev, taskId];
    } else {
      return prev.filter(id => id !== taskId);
    }
  });
}, []);
```

### 步骤5: 减少 generateColumns 的依赖

优化后的依赖列表应该更简洁:

```typescript
const generateColumns = useMemo(() => {
  // ... column generation logic
}, [
  columnConfigs,
  selectedTaskIds,
  stableDataSource,
  effectiveProjectId,
  tableSort,
  handleStatusUpdate,      // ✅ 现在是稳定的引用
  handleAssigneeUpdate,    // ✅ 现在是稳定的引用
  handleDueDateUpdate,     // ✅ 现在是稳定的引用
  handlePriorityUpdate,    // ✅ 现在是稳定的引用
  handleTaskSelect,        // ✅ 现在是稳定的引用
  handleViewTask,          // ✅ 现在是稳定的引用
  loadProjectUsers,        // ✅ 现在是稳定的引用
  projectUsersCache,
  loadingProjectUsers,
  navigate
]);
// ❌ 移除: expandedTasks, loadingChildren, subTasks (如果不需要)
```

## 验证优化效果

### 方法1: 使用React DevTools Profiler

```javascript
// 1. 打开React DevTools
// 2. 切换到 Profiler 标签
// 3. 点击 Record 按钮
// 4. 在TasksPage中更新一个任务的状态
// 5. 停止录制
// 6. 查看组件重渲染次数

// 优化前: 应该看到所有任务行都重渲染了
// 优化后: 应该只看到1-2个组件重渲染
```

### 方法2: 添加性能日志

在组件顶部添加:

```typescript
// 在 TasksPage 顶部添加 (仅用于开发环境)
if (process.env.NODE_ENV === 'development') {
  console.log('[TasksPage] Render count:', ++window.tasksPageRenderCount || 1);
}
```

在优化的组件中添加:

```typescript
// 在 TaskStatusSelect 等组件中添加
if (process.env.NODE_ENV === 'development') {
  console.log(`[TaskStatusSelect] Rendered for task ${taskId}`);
}
```

### 方法3: 使用Performance API

```typescript
// 在 handleStatusUpdate 开始添加:
performance.mark('status-update-start');

// 在状态更新完成后添加:
performance.mark('status-update-end');
performance.measure('status-update', 'status-update-start', 'status-update-end');
const measure = performance.getEntriesByName('status-update')[0];
console.log(`Status update took ${measure.duration.toFixed(2)}ms`);
```

## 预期结果

### 优化前
- 更新1个任务状态 → 50-100行重渲染
- 渲染时间: ~500-800ms
- 内存使用: 增加20-30MB

### 优化后
- 更新1个任务状态 → 1-2行重渲染
- 渲染时间: ~50-100ms
- 内存使用: 增加<5MB

## 故障排除

### 问题1: 组件不更新
**原因**: React.memo比较props时认为没有变化
**解决**: 确保传递的props是基本类型或稳定引用

### 问题2: 功能异常
**原因**: 事件处理器中的闭包问题
**解决**: 使用useCallback并正确声明依赖

### 问题3: TypeScript错误
**原因**: 组件props类型不匹配
**解决**: 检查TaskRowMemoized.tsx中的类型定义

---

**注意**: 应用此补丁后请彻底测试所有功能,特别是内联编辑功能。
