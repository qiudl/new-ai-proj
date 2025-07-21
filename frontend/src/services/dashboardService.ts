import api from './api';
import { Task, TimelineEvent, TaskStatus } from '../types/task';
import { Project } from '../types/project';

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface ProjectProgressInfo extends Project {
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

export interface UserWorkload {
  id: number;
  name: string;
  todoTasks: number;
  inProgressTasks: number;
  totalEstimatedHours: number;
}

export interface TasksByStatus {
  todo: Task[];
  in_progress: Task[];
  completed: Task[];
  cancelled: Task[];
}

export class DashboardService {
  /**
   * 获取工作台统计数据（带降级策略）
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects = projectsResponse.data?.data || [];

      // 如果没有项目，返回空统计
      if (projects.length === 0) {
        return this.getEmptyStats();
      }

      // 为每个项目获取任务数据，使用Promise.allSettled避免单个项目失败影响整体
      const taskPromises = projects.map((project: any) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=100`).catch(error => {
          console.warn(`Failed to load tasks for project ${project.id}:`, error);
          return { data: { data: [] } }; // 返回空数组作为降级
        })
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      const tasks = taskResponses.reduce((allTasks, response) => {
        const projectTasks = response.data?.data || [];
        return allTasks.concat(projectTasks);
      }, []);

      // 计算统计数据
      const totalProjects = projects.length;
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task: Task) => task.status === 'completed').length;
      const inProgressTasks = tasks.filter((task: Task) => task.status === 'in_progress').length;
      const todoTasks = tasks.filter((task: Task) => task.status === 'todo').length;
      
      // 计算逾期任务
      const today = new Date();
      const overdueTasks = tasks.filter((task: Task) => {
        if (!task.due_date || task.status === 'completed') return false;
        return new Date(task.due_date) < today;
      }).length;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        totalProjects,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasks,
        completionRate
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // 返回空统计作为降级，而不是抛出错误
      return this.getEmptyStats();
    }
  }

  /**
   * 获取空的统计数据（用于降级处理）
   */
  private static getEmptyStats(): DashboardStats {
    return {
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      todoTasks: 0,
      overdueTasks: 0,
      completionRate: 0
    };
  }

  /**
   * 获取最近活动
   */
  static async getRecentActivities(limit: number = 5): Promise<TimelineEvent[]> {
    try {
      // 模拟从任务数据生成活动事件，因为后端没有timeline端点
      const tasks = await this.getAllTasks();
      
      // 基于任务的created_at和updated_at生成时间线事件
      const events: TimelineEvent[] = [];
      
      tasks.forEach((task: Task) => {
        // 任务创建事件
        events.push({
          id: task.id * 1000 + 1, // 生成唯一ID
          task_id: task.id,
          event_type: 'created',
          event_date: task.created_at,
          description: `创建了任务「${task.title}」`,
          user_id: task.assignee_id,
          metadata: { status: task.status },
          username: task.assignee_name || '未知用户',
          task_title: task.title
        });

        // 如果任务已完成，添加完成事件
        if (task.status === 'completed' && task.updated_at !== task.created_at) {
          events.push({
            id: task.id * 1000 + 2,
            task_id: task.id,
            event_type: 'completed',
            event_date: task.updated_at,
            description: `完成了任务「${task.title}」`,
            user_id: task.assignee_id,
            metadata: { status: 'completed' },
            username: task.assignee_name || '未知用户',
            task_title: task.title
          });
        }

        // 如果更新时间不同于创建时间且未完成，添加更新事件
        if (task.updated_at !== task.created_at && task.status !== 'completed') {
          events.push({
            id: task.id * 1000 + 3,
            task_id: task.id,
            event_type: 'updated',
            event_date: task.updated_at,
            description: `更新了任务「${task.title}」`,
            user_id: task.assignee_id,
            metadata: { status: task.status },
            username: task.assignee_name || '未知用户',
            task_title: task.title
          });
        }
      });

      // 按时间排序并返回最新的几条
      return events
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // 返回空数组作为降级
      return [];
    }
  }

  /**
   * 获取按状态分组的任务
   */
  static async getTasksByStatus(): Promise<TasksByStatus> {
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects = projectsResponse.data?.data || [];

      // 为每个项目获取任务数据
      const taskPromises = projects.map((project: any) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=100`)
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      const tasks = taskResponses.reduce((allTasks, response) => {
        const projectTasks = response.data?.data || [];
        return allTasks.concat(projectTasks);
      }, []);

      return {
        todo: tasks.filter((task: Task) => task.status === 'todo'),
        in_progress: tasks.filter((task: Task) => task.status === 'in_progress'),
        completed: tasks.filter((task: Task) => task.status === 'completed'),
        cancelled: tasks.filter((task: Task) => task.status === 'cancelled')
      };
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      throw new Error('Failed to fetch tasks by status');
    }
  }

  /**
   * 获取项目进度信息
   */
  static async getProjectProgress(): Promise<ProjectProgressInfo[]> {
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects = projectsResponse.data?.data || [];

      // 为每个项目获取任务数据并计算进度
      const progressPromises = projects.map(async (project: any) => {
        const tasksResponse = await api.get(`/projects/${project.id}/tasks?page=1&page_size=100`);
        const projectTasks = tasksResponse.data?.data || [];
        
        const completedTasks = projectTasks.filter((task: Task) => task.status === 'completed');
        const totalTasks = projectTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

        return {
          ...project,
          totalTasks,
          completedTasks: completedTasks.length,
          progress
        };
      });

      return await Promise.all(progressPromises);
    } catch (error) {
      console.error('Error fetching project progress:', error);
      // 返回空数组作为降级
      return [];
    }
  }

  /**
   * 获取用户工作负载
   */
  static async getUserWorkload(): Promise<UserWorkload[]> {
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects = projectsResponse.data?.data || [];

      // 为每个项目获取任务数据
      const taskPromises = projects.map((project: any) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=100`)
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      const tasks = taskResponses.reduce((allTasks, response) => {
        const projectTasks = response.data?.data || [];
        return allTasks.concat(projectTasks);
      }, []);

      // 按负责人分组任务
      const userTasksMap = new Map<number, {
        id: number;
        name: string;
        tasks: Task[];
      }>();

      tasks.forEach((task: Task) => {
        if (task.assignee_id && task.status !== 'completed') {
          const userId = task.assignee_id;
          const userName = task.assignee_name || `用户${userId}`;

          if (!userTasksMap.has(userId)) {
            userTasksMap.set(userId, {
              id: userId,
              name: userName,
              tasks: []
            });
          }

          userTasksMap.get(userId)!.tasks.push(task);
        }
      });

      // 计算工作负载统计
      return Array.from(userTasksMap.values()).map(user => {
        const todoTasks = user.tasks.filter(task => task.status === 'todo').length;
        const inProgressTasks = user.tasks.filter(task => task.status === 'in_progress').length;
        
        // 计算总预估工时
        const totalEstimatedHours = user.tasks.reduce((sum, task) => {
          const estimatedHours = task.custom_fields?.estimated_hours || 0;
          return sum + (typeof estimatedHours === 'number' ? estimatedHours : 0);
        }, 0);

        return {
          id: user.id,
          name: user.name,
          todoTasks,
          inProgressTasks,
          totalEstimatedHours
        };
      });
    } catch (error) {
      console.error('Error fetching user workload:', error);
      // 返回空数组作为降级
      return [];
    }
  }

  /**
   * 获取所有项目
   */
  static async getAllProjects(): Promise<Project[]> {
    try {
      const response = await api.get('/projects?page=1&page_size=100');
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  /**
   * 获取所有任务
   */
  static async getAllTasks(): Promise<Task[]> {
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects = projectsResponse.data?.data || [];

      // 为每个项目获取任务数据
      const taskPromises = projects.map((project: any) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=100`)
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      return taskResponses.reduce((allTasks, response) => {
        const projectTasks = response.data?.data || [];
        return allTasks.concat(projectTasks);
      }, []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  /**
   * 获取项目的任务
   */
  static async getProjectTasks(projectId: number): Promise<Task[]> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks?page=1&page_size=100`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      throw new Error('Failed to fetch project tasks');
    }
  }

  /**
   * 获取逾期任务
   */
  static async getOverdueTasks(): Promise<Task[]> {
    try {
      // 获取所有任务
      const tasks = await this.getAllTasks();
      
      const today = new Date();
      return tasks.filter((task: Task) => {
        if (!task.due_date || task.status === 'completed') return false;
        return new Date(task.due_date) < today;
      });
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw new Error('Failed to fetch overdue tasks');
    }
  }

  /**
   * 获取即将到期的任务（指定天数内）
   */
  static async getUpcomingTasks(days: number = 3): Promise<Task[]> {
    try {
      // 获取所有任务
      const tasks = await this.getAllTasks();
      
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      return tasks.filter((task: Task) => {
        if (!task.due_date || task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= today && dueDate <= futureDate;
      });
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw new Error('Failed to fetch upcoming tasks');
    }
  }

  /**
   * 获取高优先级任务
   */
  static async getHighPriorityTasks(): Promise<Task[]> {
    try {
      // 获取所有任务
      const tasks = await this.getAllTasks();
      
      return tasks.filter((task: Task) => 
        task.custom_fields?.priority === 'high' && 
        task.status !== 'completed'
      );
    } catch (error) {
      console.error('Error fetching high priority tasks:', error);
      throw new Error('Failed to fetch high priority tasks');
    }
  }

  /**
   * 获取项目完成度排名
   */
  static async getProjectCompletionRanking(): Promise<ProjectProgressInfo[]> {
    try {
      const projectProgress = await this.getProjectProgress();
      return projectProgress.sort((a, b) => b.progress - a.progress);
    } catch (error) {
      console.error('Error fetching project completion ranking:', error);
      throw new Error('Failed to fetch project completion ranking');
    }
  }

  /**
   * 获取工作效率统计（本周vs上周）
   */
  static async getProductivityStats(): Promise<{
    thisWeek: { completed: number; created: number };
    lastWeek: { completed: number; created: number };
    improvement: number;
  }> {
    try {
      // 获取所有任务来分析趋势
      const tasks = await this.getAllTasks();

      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);

      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setMilliseconds(-1);

      // 统计本周完成的任务
      const thisWeekCompleted = tasks.filter((task: Task) => {
        if (task.status !== 'completed' || !task.updated_at) return false;
        const updatedDate = new Date(task.updated_at);
        return updatedDate >= thisWeekStart;
      }).length;

      // 统计上周完成的任务
      const lastWeekCompleted = tasks.filter((task: Task) => {
        if (task.status !== 'completed' || !task.updated_at) return false;
        const updatedDate = new Date(task.updated_at);
        return updatedDate >= lastWeekStart && updatedDate < thisWeekStart;
      }).length;

      // 统计本周创建的任务
      const thisWeekCreated = tasks.filter((task: Task) => {
        if (!task.created_at) return false;
        const createdDate = new Date(task.created_at);
        return createdDate >= thisWeekStart;
      }).length;

      // 统计上周创建的任务
      const lastWeekCreated = tasks.filter((task: Task) => {
        if (!task.created_at) return false;
        const createdDate = new Date(task.created_at);
        return createdDate >= lastWeekStart && createdDate < thisWeekStart;
      }).length;

      // 计算效率提升
      const improvement = lastWeekCompleted > 0 
        ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
        : 0;

      return {
        thisWeek: { completed: thisWeekCompleted, created: thisWeekCreated },
        lastWeek: { completed: lastWeekCompleted, created: lastWeekCreated },
        improvement
      };
    } catch (error) {
      console.error('Error fetching productivity stats:', error);
      // 返回默认值作为降级
      return {
        thisWeek: { completed: 0, created: 0 },
        lastWeek: { completed: 0, created: 0 },
        improvement: 0
      };
    }
  }

  /**
   * 获取今日任务
   */
  static async getTodayTasks(): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return tasks.filter((task: Task) => {
        if (task.status === 'completed') return false;
        
        // 检查到期日期是今天的任务
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate.getTime() === today.getTime()) return true;
        }
        
        // 检查今天创建的任务
        if (task.created_at) {
          const createdDate = new Date(task.created_at);
          createdDate.setHours(0, 0, 0, 0);
          if (createdDate.getTime() === today.getTime()) return true;
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error fetching today tasks:', error);
      throw new Error('Failed to fetch today tasks');
    }
  }

  /**
   * 获取本周任务
   */
  static async getThisWeekTasks(): Promise<Task[]> {
    try {
      const tasks = await this.getAllTasks();
      
      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);
      
      const nextWeekStart = new Date(thisWeekStart);
      nextWeekStart.setDate(thisWeekStart.getDate() + 7);

      return tasks.filter((task: Task) => {
        if (task.status === 'completed') return false;
        
        // 检查到期日期在本周的任务
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          if (dueDate >= thisWeekStart && dueDate < nextWeekStart) return true;
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error fetching this week tasks:', error);
      throw new Error('Failed to fetch this week tasks');
    }
  }

  /**
   * 获取任务统计摘要（用于快速显示）
   */
  static async getTaskSummary(): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      // 获取所有任务
      const tasks = await this.getAllTasks();

      const byStatus: Record<TaskStatus, number> = {
        todo: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      };

      const byPriority: Record<string, number> = {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        unset: 0
      };

      tasks.forEach((task: Task) => {
        // 按状态统计
        if (task.status in byStatus) {
          byStatus[task.status as TaskStatus]++;
        }

        // 按优先级统计
        const priority = task.custom_fields?.priority || 'unset';
        if (priority in byPriority) {
          byPriority[priority]++;
        } else {
          byPriority.unset++;
        }
      });

      return {
        total: tasks.length,
        byStatus,
        byPriority
      };
    } catch (error) {
      console.error('Error fetching task summary:', error);
      throw new Error('Failed to fetch task summary');
    }
  }
}
