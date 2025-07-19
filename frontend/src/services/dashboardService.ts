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
   * 获取工作台统计数据
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // 并发获取项目和任务数据
      const [projectsResponse, tasksResponse] = await Promise.all([
        api.get('/projects'),
        api.get('/tasks')
      ]);

      const projects = projectsResponse.data?.data || [];
      const tasks = tasksResponse.data?.data || [];

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
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * 获取最近活动
   */
  static async getRecentActivities(limit: number = 5): Promise<TimelineEvent[]> {
    try {
      // 获取所有项目的时间轴事件
      const projectsResponse = await api.get('/projects');
      const projects = projectsResponse.data?.data || [];
      
      if (projects.length === 0) {
        return [];
      }

      // 为每个项目获取时间轴事件
      const timelinePromises = projects.map((project: Project) => 
        api.get(`/projects/${project.id}/timeline?page_size=${Math.ceil(limit / projects.length)}`)
      );

      const timelineResponses = await Promise.all(timelinePromises);
      
      // 合并所有时间轴事件
      const allEvents: TimelineEvent[] = [];
      timelineResponses.forEach(response => {
        if (response.data?.data?.data) {
          allEvents.push(...response.data.data.data);
        }
      });

      // 按时间排序并返回最新的几条
      return allEvents
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw new Error('Failed to fetch recent activities');
    }
  }

  /**
   * 获取按状态分组的任务
   */
  static async getTasksByStatus(): Promise<TasksByStatus> {
    try {
      const response = await api.get('/tasks');
      const tasks = response.data?.data || [];

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
      const [projectsResponse, tasksResponse] = await Promise.all([
        api.get('/projects'),
        api.get('/tasks')
      ]);

      const projects = projectsResponse.data?.data || [];
      const allTasks = tasksResponse.data?.data || [];

      return projects.map((project: Project) => {
        const projectTasks = allTasks.filter((task: Task) => task.project_id === project.id);
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
    } catch (error) {
      console.error('Error fetching project progress:', error);
      throw new Error('Failed to fetch project progress');
    }
  }

  /**
   * 获取用户工作负载
   */
  static async getUserWorkload(): Promise<UserWorkload[]> {
    try {
      const response = await api.get('/tasks');
      const tasks = response.data?.data || [];

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
      throw new Error('Failed to fetch user workload');
    }
  }

  /**
   * 获取所有项目
   */
  static async getAllProjects(): Promise<Project[]> {
    try {
      const response = await api.get('/projects');
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
      const response = await api.get('/tasks');
      return response.data?.data || [];
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
      const response = await api.get(`/projects/${projectId}/tasks`);
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
      const response = await api.get('/tasks');
      const tasks = response.data?.data || [];
      
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
      const response = await api.get('/tasks');
      const tasks = response.data?.data || [];
      
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
      const response = await api.get('/tasks');
      const tasks = response.data?.data || [];
      
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
      const tasksResponse = await api.get('/tasks');
      const tasks = tasksResponse.data?.data || [];

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
      throw new Error('Failed to fetch productivity statistics');
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
      const response = await api.get('/tasks');
      const tasks = response.data?.data || [];

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
