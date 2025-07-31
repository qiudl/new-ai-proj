import api from './api';
import { Task, TaskRequest, APIResponse } from '../types/task';
import { Modal } from 'antd';

/**
 * 父子任务关联逻辑服务
 * 处理父子任务之间的状态同步、截止时间继承等业务逻辑
 */
export class TaskHierarchyService {
  
  /**
   * 创建子任务时的逻辑处理
   * 1. 子任务的截止时间默认继承父任务
   */
  static async createChildTask(
    projectId: number, 
    parentId: number, 
    childTask: TaskRequest
  ): Promise<Task> {
    // 设置父子关系
    childTask.parent_id = parentId;
    
    // 使用专门的子任务创建API端点
    const response = await api.post(
      `/projects/${projectId}/tasks/child`,
      childTask
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create child task');
    }
    
    return response.data!;
  }
  
  /**
   * 更新任务时的逻辑处理
   * 2. 子任务的截止时间大于父任务时，父任务的截止时间变更为子任务的截止时间，但要弹窗让用户确认
   */
  static async updateTaskWithHierarchyLogic(
    projectId: number,
    taskId: number,
    updates: Partial<TaskRequest>
  ): Promise<Task> {
    // 使用专门的层级更新API端点
    const response = await api.put(
      `/projects/${projectId}/tasks/${taskId}/hierarchy`,
      updates
    );
    
    // 检查是否需要用户确认父任务截止时间更新
    if (response.status === 202 && response.data.data?.requires_parent_update) {
      const parentTask = response.data.parent_task;
      const childDueDate = response.data.child_due_date;
      
      const confirmed = await this.showDueDateUpdateConfirmModal(
        updates.title || 'Unknown Task',
        parentTask.title,
        childDueDate
      );
      
      if (confirmed) {
        // 用户确认后，更新父任务截止时间
        await api.put(`/projects/${projectId}/tasks/parent/due-date`, {
          parent_task_id: parentTask.id,
          new_due_date: childDueDate,
          project_id: projectId
        });
      }
      
      // 重新执行基本更新
      const finalResponse = await api.put(
        `/projects/${projectId}/tasks/${taskId}`,
        updates
      );
      
      if (!finalResponse.data.success) {
        throw new Error(finalResponse.data.error?.message || 'Failed to update task');
      }
      
      return finalResponse.data!;
    }
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update task');
    }
    
    return response.data!;
  }
  
  /**
   * 显示截止时间更新确认对话框
   */
  private static showDueDateUpdateConfirmModal(
    childTaskTitle: string,
    parentTaskTitle: string,
    newDueDate: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      Modal.confirm({
        title: '更新父任务截止时间',
        content: `子任务 "${childTaskTitle}" 的截止时间已设置为 ${newDueDate}，此时间晚于父任务 "${parentTaskTitle}" 的截止时间。是否将父任务的截止时间也更新为 ${newDueDate}？`,
        okText: '确认更新',
        cancelText: '不更新',
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }
  
  /**
   * 删除任务时的清理逻辑
   */
  static async deleteTaskWithHierarchyLogic(
    projectId: number,
    taskId: number
  ): Promise<void> {
    // 获取任务信息
    const taskResponse = await api.get(
      `/projects/${projectId}/tasks/${taskId}`
    );
    
    if (!taskResponse.data.success) {
      throw new Error(taskResponse.data.error?.message || 'Failed to fetch task');
    }
    
    const task = taskResponse.data!;
    
    // 执行删除
    const response = await api.delete(
      `/projects/${projectId}/tasks/${taskId}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete task');
    }
    
    // 如果是子任务被删除，通知后端更新父任务状态
    if (task.parent_id) {
      try {
        await api.post(`/projects/${projectId}/tasks/${task.parent_id}/refresh-status`);
      } catch (error) {
        console.warn('Failed to refresh parent task status:', error);
      }
    }
  }
  
  /**
   * 批量更新任务状态（用于计时器功能）
   */
  static async updateTasksWithTimer(
    projectId: number,
    parentTaskId: number,
    isTimerRunning: boolean
  ): Promise<void> {
    try {
      const response: APIResponse = await api.post(`/projects/${projectId}/tasks/timer/update`, {
        project_id: projectId,
        parent_task_id: parentTaskId,
        is_timer_running: isTimerRunning
      });
      
      if (!response.data.success) {
        console.error('Failed to update tasks with timer:', response.data.error);
      }
    } catch (error) {
      console.error('Failed to update tasks with timer:', error);
    }
  }
  
  /**
   * 获取任务层级信息
   */
  static async getTaskHierarchyInfo(
    projectId: number,
    taskId: number
  ): Promise<{
    task: Task;
    parent?: Task;
    children: Task[];
    siblings: Task[];
  }> {
    const [taskResponse, childrenResponse] = await Promise.all([
      api.get(`/projects/${projectId}/tasks/${taskId}`) as Promise<APIResponse<Task>>,
      api.get(`/projects/${projectId}/tasks/${taskId}/children`) as Promise<APIResponse<Task[]>>
    ]);
    
    if (!taskResponse.success) {
      throw new Error(taskResponse.error?.message || 'Failed to fetch task');
    }
    
    const task = taskResponse.data!;
    const children = childrenResponse.success ? childrenResponse.data! : [];
    
    let parent: Task | undefined;
    let siblings: Task[] = [];
    
    if (task.parent_id) {
      const parentResponse = await api.get(`/projects/${projectId}/tasks/${task.parent_id}`) as APIResponse<Task>;
      if (parentResponse.success) {
        parent = parentResponse.data!;
        
        // 获取兄弟任务
        const siblingsResponse = await api.get(`/projects/${projectId}/tasks/${task.parent_id}/children`) as APIResponse<Task[]>;
        if (siblingsResponse.success) {
          siblings = siblingsResponse.data!.filter((t: Task) => t.id !== taskId);
        }
      }
    }
    
    return {
      task,
      parent,
      children,
      siblings
    };
  }
}
