import { useState, useCallback, useEffect } from 'react';
import { Task, TaskRequest, TaskStatus } from '../types/task';
import { TaskService } from '../services/taskService';
import { TaskHierarchyService } from '../services/taskHierarchyService';
import { message } from 'antd';

interface TaskHierarchyInfo {
  task: Task;
  parent?: Task;
  children: Task[];
  siblings: Task[];
}

interface UseTaskHierarchyReturn {
  hierarchyInfo: TaskHierarchyInfo | null;
  loading: boolean;
  refreshHierarchy: () => Promise<void>;
  createChildTask: (childTask: TaskRequest) => Promise<Task>;
  updateTaskWithHierarchy: (taskId: number, updates: Partial<TaskRequest>) => Promise<Task>;
  deleteTaskWithHierarchy: (taskId: number) => Promise<void>;
  updateTasksWithTimer: (parentTaskId: number, isTimerRunning: boolean) => Promise<void>;
}

/**
 * 任务层级管理Hook
 * 提供父子任务关联逻辑的React Hook接口
 */
export function useTaskHierarchy(
  projectId: number,
  taskId?: number
): UseTaskHierarchyReturn {
  const [hierarchyInfo, setHierarchyInfo] = useState<TaskHierarchyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 刷新层级信息
  const refreshHierarchy = useCallback(async () => {
    if (!taskId) {
      setHierarchyInfo(null);
      return;
    }

    setLoading(true);
    try {
      const info = await TaskHierarchyService.getTaskHierarchyInfo(projectId, taskId);
      setHierarchyInfo(info);
    } catch (error: any) {
      console.error('Failed to load task hierarchy:', error);
      message.error(`加载任务层级信息失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  // 创建子任务
  const createChildTask = useCallback(async (childTask: TaskRequest): Promise<Task> => {
    if (!taskId) {
      throw new Error('Parent task ID is required');
    }

    try {
      const createdTask = await TaskHierarchyService.createChildTask(projectId, taskId, childTask);
      message.success('子任务创建成功');
      
      // 刷新层级信息
      await refreshHierarchy();
      
      return createdTask;
    } catch (error: any) {
      message.error(`创建子任务失败: ${error.message}`);
      throw error;
    }
  }, [projectId, taskId, refreshHierarchy]);

  // 更新任务（带层级逻辑）
  const updateTaskWithHierarchy = useCallback(async (
    targetTaskId: number, 
    updates: Partial<TaskRequest>
  ): Promise<Task> => {
    try {
      const updatedTask = await TaskHierarchyService.updateTaskWithHierarchyLogic(
        projectId, 
        targetTaskId, 
        updates
      );
      
      message.success('任务更新成功');
      
      // 刷新层级信息
      await refreshHierarchy();
      
      return updatedTask;
    } catch (error: any) {
      message.error(`更新任务失败: ${error.message}`);
      throw error;
    }
  }, [projectId, refreshHierarchy]);

  // 删除任务（带层级逻辑）
  const deleteTaskWithHierarchy = useCallback(async (targetTaskId: number): Promise<void> => {
    try {
      await TaskHierarchyService.deleteTaskWithHierarchyLogic(projectId, targetTaskId);
      message.success('任务删除成功');
      
      // 刷新层级信息
      await refreshHierarchy();
    } catch (error: any) {
      message.error(`删除任务失败: ${error.message}`);
      throw error;
    }
  }, [projectId, refreshHierarchy]);

  // 计时器状态更新
  const updateTasksWithTimer = useCallback(async (
    parentTaskId: number, 
    isTimerRunning: boolean
  ): Promise<void> => {
    try {
      await TaskHierarchyService.updateTasksWithTimer(projectId, parentTaskId, isTimerRunning);
      
      if (isTimerRunning) {
        message.info('已启动计时，相关子任务状态已更新为进行中');
      }
      
      // 刷新层级信息
      await refreshHierarchy();
    } catch (error: any) {
      message.error(`更新计时状态失败: ${error.message}`);
      throw error;
    }
  }, [projectId, refreshHierarchy]);

  // 初始加载
  useEffect(() => {
    refreshHierarchy();
  }, [refreshHierarchy]);

  return {
    hierarchyInfo,
    loading,
    refreshHierarchy,
    createChildTask,
    updateTaskWithHierarchy,
    deleteTaskWithHierarchy,
    updateTasksWithTimer
  };
}

/**
 * 任务状态管理Hook
 * 专门处理任务状态变更时的层级逻辑
 */
export function useTaskStatusHierarchy(projectId: number) {
  const [updating, setUpdating] = useState(false);

  // 更新任务状态（自动处理父子任务关联）
  const updateTaskStatus = useCallback(async (
    taskId: number,
    newStatus: string,
    cascadeToChildren: boolean = false
  ) => {
    setUpdating(true);
    try {
      // 使用层级服务更新状态
      await TaskHierarchyService.updateTaskWithHierarchyLogic(projectId, taskId, {
        status: newStatus as TaskStatus
      });

      // 根据业务逻辑显示相应提示
      if (newStatus === 'in_progress') {
        message.info('任务已开始，相关父子任务状态已同步更新');
      } else if (newStatus === 'completed') {
        message.success('任务已完成，正在检查父任务完成状态');
      }

    } catch (error: any) {
      message.error(`更新任务状态失败: ${error.message}`);
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [projectId]);

  return {
    updateTaskStatus,
    updating
  };
}

/**
 * 任务截止时间管理Hook
 * 处理截止时间变更时的父子任务逻辑
 */
export function useTaskDueDateHierarchy(projectId: number) {
  const [updating, setUpdating] = useState(false);

  // 更新任务截止时间（自动处理父子关系）
  const updateTaskDueDate = useCallback(async (
    taskId: number,
    newDueDate: string
  ) => {
    setUpdating(true);
    try {
      await TaskHierarchyService.updateTaskWithHierarchyLogic(projectId, taskId, {
        due_date: newDueDate
      });

      message.success('截止时间已更新');
    } catch (error: any) {
      message.error(`更新截止时间失败: ${error.message}`);
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [projectId]);

  return {
    updateTaskDueDate,
    updating
  };
}
