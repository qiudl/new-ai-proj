import { useCallback, useState } from 'react';
import { message } from 'antd';
import { useTaskContext } from '../contexts/TaskContext';
import { Task } from '../types/task';
import { errorLogger } from '../utils/ErrorLogger';

/**
 * 增强的任务操作 Hook
 * 
 * 提供常用的任务操作方法，包括：
 * - 状态切换
 * - 优先级管理
 * - 批量操作
 * - 任务复制/移动
 * - 智能推荐
 */
export const useTaskOperations = () => {
  const { state, actions } = useTaskContext();
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});

  // 设置操作加载状态
  const setLoading = useCallback((operation: string, loading: boolean) => {
    setOperationLoading(prev => ({ ...prev, [operation]: loading }));
  }, []);

  // 快速状态切换
  const toggleTaskStatus = useCallback(async (taskId: number, targetStatus?: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const statusMap: Record<string, string> = {
      'todo': 'in_progress',
      'in_progress': 'completed',
      'completed': 'todo',
      'on_hold': 'in_progress'
    };

    const newStatus = targetStatus || statusMap[task.status] || 'in_progress';

    setLoading(`toggle-${taskId}`, true);
    
    try {
      await actions.updateTask(taskId, { status: newStatus }, true);
      message.success(`任务状态已更新为: ${newStatus}`);
      
      errorLogger.info('task', 'useTaskOperations: 状态切换成功', {
        taskId,
        oldStatus: task.status,
        newStatus
      });
    } catch (error) {
      message.error('状态更新失败');
    } finally {
      setLoading(`toggle-${taskId}`, false);
    }
  }, [state.tasks, actions, setLoading]);

  // 设置任务优先级
  const setTaskPriority = useCallback(async (taskId: number, priority: string) => {
    setLoading(`priority-${taskId}`, true);
    
    try {
      await actions.updateTask(taskId, { priority }, true);
      message.success(`优先级已设置为: ${priority}`);
      
      errorLogger.info('task', 'useTaskOperations: 优先级设置成功', {
        taskId,
        priority
      });
    } catch (error) {
      message.error('优先级设置失败');
    } finally {
      setLoading(`priority-${taskId}`, false);
    }
  }, [actions, setLoading]);

  // 复制任务
  const duplicateTask = useCallback(async (taskId: number, modifications?: Partial<Task>) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    setLoading(`duplicate-${taskId}`, true);
    
    try {
      const newTaskData = {
        title: `${task.title} (副本)`,
        description: task.description,
        priority: task.priority,
        project_id: task.project_id,
        parent_id: task.parent_id,
        ...modifications
      };

      const newTask = await actions.createTask(newTaskData);
      message.success(`任务已复制: ${newTask.title}`);
      
      errorLogger.info('task', 'useTaskOperations: 任务复制成功', {
        originalTaskId: taskId,
        newTaskId: newTask.id
      });
      
      return newTask;
    } catch (error) {
      message.error('任务复制失败');
    } finally {
      setLoading(`duplicate-${taskId}`, false);
    }
  }, [state.tasks, actions, setLoading]);

  // 移动任务到其他项目
  const moveTaskToProject = useCallback(async (taskId: number, projectId: number) => {
    setLoading(`move-${taskId}`, true);
    
    try {
      await actions.updateTask(taskId, { project_id: projectId });
      message.success('任务已移动到新项目');
      
      errorLogger.info('task', 'useTaskOperations: 任务移动成功', {
        taskId,
        projectId
      });
    } catch (error) {
      message.error('任务移动失败');
    } finally {
      setLoading(`move-${taskId}`, false);
    }
  }, [actions, setLoading]);

  // 批量状态更新
  const batchUpdateStatus = useCallback(async (taskIds: number[], status: string) => {
    setLoading('batch-status', true);
    
    try {
      const updates = taskIds.map(id => ({ id, data: { status } }));
      await actions.batchUpdateTasks(updates);
      message.success(`已将 ${taskIds.length} 个任务状态更新为: ${status}`);
      
      errorLogger.info('task', 'useTaskOperations: 批量状态更新成功', {
        taskIds,
        status,
        count: taskIds.length
      });
    } catch (error) {
      message.error('批量状态更新失败');
    } finally {
      setLoading('batch-status', false);
    }
  }, [actions, setLoading]);

  // 批量优先级更新
  const batchUpdatePriority = useCallback(async (taskIds: number[], priority: string) => {
    setLoading('batch-priority', true);
    
    try {
      const updates = taskIds.map(id => ({ id, data: { priority } }));
      await actions.batchUpdateTasks(updates);
      message.success(`已将 ${taskIds.length} 个任务优先级设置为: ${priority}`);
      
      errorLogger.info('task', 'useTaskOperations: 批量优先级更新成功', {
        taskIds,
        priority,
        count: taskIds.length
      });
    } catch (error) {
      message.error('批量优先级更新失败');
    } finally {
      setLoading('batch-priority', false);
    }
  }, [actions, setLoading]);

  // 批量删除
  const batchDeleteTasks = useCallback(async (taskIds: number[]) => {
    setLoading('batch-delete', true);
    
    try {
      await Promise.all(taskIds.map(id => actions.deleteTask(id)));
      message.success(`已删除 ${taskIds.length} 个任务`);
      
      errorLogger.info('task', 'useTaskOperations: 批量删除成功', {
        taskIds,
        count: taskIds.length
      });
    } catch (error) {
      message.error('批量删除失败');
    } finally {
      setLoading('batch-delete', false);
    }
  }, [actions, setLoading]);

  // 设置任务截止日期
  const setTaskDueDate = useCallback(async (taskId: number, dueDate: string | null) => {
    setLoading(`due-date-${taskId}`, true);
    
    try {
      await actions.updateTask(taskId, { due_date: dueDate }, true);
      message.success(dueDate ? '截止日期已设置' : '截止日期已清除');
      
      errorLogger.info('task', 'useTaskOperations: 截止日期设置成功', {
        taskId,
        dueDate
      });
    } catch (error) {
      message.error('截止日期设置失败');
    } finally {
      setLoading(`due-date-${taskId}`, false);
    }
  }, [actions, setLoading]);

  // 添加任务标签
  const addTaskTag = useCallback(async (taskId: number, tag: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentTags = task.tags || [];
    if (currentTags.includes(tag)) {
      message.warning('标签已存在');
      return;
    }

    setLoading(`tag-${taskId}`, true);
    
    try {
      const newTags = [...currentTags, tag];
      await actions.updateTask(taskId, { tags: newTags }, true);
      message.success(`已添加标签: ${tag}`);
      
      errorLogger.info('task', 'useTaskOperations: 标签添加成功', {
        taskId,
        tag
      });
    } catch (error) {
      message.error('标签添加失败');
    } finally {
      setLoading(`tag-${taskId}`, false);
    }
  }, [state.tasks, actions, setLoading]);

  // 移除任务标签
  const removeTaskTag = useCallback(async (taskId: number, tag: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentTags = task.tags || [];
    const newTags = currentTags.filter(t => t !== tag);

    setLoading(`tag-${taskId}`, true);
    
    try {
      await actions.updateTask(taskId, { tags: newTags }, true);
      message.success(`已移除标签: ${tag}`);
      
      errorLogger.info('task', 'useTaskOperations: 标签移除成功', {
        taskId,
        tag
      });
    } catch (error) {
      message.error('标签移除失败');
    } finally {
      setLoading(`tag-${taskId}`, false);
    }
  }, [state.tasks, actions, setLoading]);

  // 分配任务给用户
  const assignTask = useCallback(async (taskId: number, assigneeId: number | null) => {
    setLoading(`assign-${taskId}`, true);
    
    try {
      await actions.updateTask(taskId, { assignee_id: assigneeId }, true);
      message.success(assigneeId ? '任务已分配' : '任务分配已清除');
      
      errorLogger.info('task', 'useTaskOperations: 任务分配成功', {
        taskId,
        assigneeId
      });
    } catch (error) {
      message.error('任务分配失败');
    } finally {
      setLoading(`assign-${taskId}`, false);
    }
  }, [actions, setLoading]);

  // 获取智能推荐操作
  const getRecommendedActions = useCallback((taskId: number) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return [];

    const recommendations = [];
    const now = new Date();

    // 基于任务状态的推荐
    if (task.status === 'todo' && !task.assignee_id) {
      recommendations.push({
        type: 'assign',
        title: '分配负责人',
        description: '为任务指定负责人以确保执行',
        priority: 'high'
      });
    }

    // 基于截止日期的推荐
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1 && task.status !== 'completed') {
        recommendations.push({
          type: 'urgent',
          title: '紧急任务',
          description: '任务即将到期，建议优先处理',
          priority: 'critical'
        });
      }
    }

    // 基于优先级的推荐
    if (!task.priority || task.priority === 'low') {
      recommendations.push({
        type: 'priority',
        title: '设置优先级',
        description: '为任务设置合适的优先级',
        priority: 'medium'
      });
    }

    // 基于描述的推荐
    if (!task.description || task.description.length < 20) {
      recommendations.push({
        type: 'description',
        title: '完善描述',
        description: '添加详细的任务描述',
        priority: 'medium'
      });
    }

    return recommendations;
  }, [state.tasks]);

  return {
    // 操作方法
    toggleTaskStatus,
    setTaskPriority,
    duplicateTask,
    moveTaskToProject,
    setTaskDueDate,
    addTaskTag,
    removeTaskTag,
    assignTask,
    
    // 批量操作
    batchUpdateStatus,
    batchUpdatePriority,
    batchDeleteTasks,
    
    // 智能推荐
    getRecommendedActions,
    
    // 加载状态
    operationLoading,
    isLoading: (operation: string) => operationLoading[operation] || false
  };
};