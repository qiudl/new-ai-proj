import api from './api';
import { Task, TimelineEvent, TaskStatus } from '../types/task';
import { Project } from '../types/project';
import { timerCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

// Helper to robustly extract arrays from various API response shapes
function extractArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload.data)) return payload.data as T[];
  if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data as T[];
  if (payload && Array.isArray(payload.items)) return payload.items as T[];
  return [] as T[];
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
}

// 新的周报数据接口，匹配后端API响应
export interface WeeklyDashboardStats {
  date_range: {
    start_date: string;
    end_date: string;
    week_number: number;
    year: number;
  };
  summary: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    completion_rate: number;
    projects_involved: number;
  };
  task_stats: {
    todo: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  project_stats: Array<{
    project_id: number;
    project_name: string;
    task_count: number;
    completed_count: number;
    completion_rate: number;
  }>;
  daily_stats: Array<{
    date: string;
    tasks_created: number;
    tasks_completed: number;
    tasks_updated: number;
  }>;
  top_tasks: Array<{
    id: number;
    project_id: number;
    project_name: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    updated_at: string;
  }>;
  trends: {
    task_creation_trend: number;
    completion_rate_trend: number;
    productivity_trend: string;
  };
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
   * 获取当前用户ID（从认证token或上下文中获取）
   */
  private static getCurrentUserId(): number {
    // 这里应该从token或全局状态中获取用户ID
    // 暂时返回默认值，实际使用时需要根据认证系统调整
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id || 1;
      }
    } catch (error) {
      console.warn('Failed to get user ID from token:', error);
    }
    return 1; // 默认用户ID
  }

  /**
   * 获取当前周的开始日期
   */
  private static getCurrentWeekStart(): string {
    const now = new Date();
    const weekday = now.getDay(); // 0 = Sunday
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday; // Make Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    return monday.toISOString().split('T')[0];
  }

  /**
   * 获取当前周的结束日期
   */
  private static getCurrentWeekEnd(): string {
    const now = new Date();
    const weekday = now.getDay(); // 0 = Sunday
    const sundayOffset = weekday === 0 ? 0 : 7 - weekday; // Make Sunday = 6
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + sundayOffset);
    return sunday.toISOString().split('T')[0];
  }
  /**
   * 获取周报统计数据（新API，带缓存）
   */
  static async getWeeklyStats(startDate?: string, endDate?: string, projectId?: number): Promise<WeeklyDashboardStats> {
    // 获取用户ID用于缓存键（假设从token或上下文中获取）
    const userId = this.getCurrentUserId();
    
    // 使用默认日期范围如果未提供
    const finalStartDate = startDate || this.getCurrentWeekStart();
    const finalEndDate = endDate || this.getCurrentWeekEnd();
    
    // 检查缓存
    const cached = timerCache.getWeeklyDashboard(userId, finalStartDate, finalEndDate, projectId);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();
      if (finalStartDate) params.append('start_date', finalStartDate);
      if (finalEndDate) params.append('end_date', finalEndDate);
      if (projectId) params.append('project_id', projectId.toString());
      
      const queryString = params.toString();
      const url = `/dashboard/weekly-stats${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      // 处理API响应结构：{ success: true, data: {...} }
      let data = response as any;
      if ((response as any) && (response as any).data) {
        data = (response as any).data;
      }
      
      // 验证响应数据结构
      if (!data || typeof data !== 'object') {
        console.error('Invalid response data:', data);
        throw new Error('Invalid response format from weekly stats API');
      }
      
      if (!(data as any).summary) {
        console.error('Response missing summary field:', data);
        throw new Error('Weekly stats response missing summary field');
      }
      
      // 缓存结果
      timerCache.cacheWeeklyDashboard(userId, finalStartDate, finalEndDate, projectId, data as any);
      
      return data as any;
    } catch (error) {
      console.error('Error fetching weekly dashboard stats:', error);
      throw new Error('Failed to fetch weekly dashboard statistics: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * 获取工作台统计数据（优化版，使用新API和缓存）
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const userId = this.getCurrentUserId();
    
    // 检查缓存
    const cached = timerCache.getDashboard(userId);
    if (cached) {
      return cached;
    }

    try {
      // 使用新的周报API获取数据
      const weeklyStats = await this.getWeeklyStats();
      
      // 添加数据验证和智能结构检测
      if (!weeklyStats) {
        console.warn('Weekly stats data is null, falling back to old method');
        throw new Error('No weekly stats data received');
      }
      
      // 检测实际的数据结构
      let summaryData;
      if (weeklyStats.summary) {
        // 标准结构：{ summary: {...} }
        summaryData = weeklyStats.summary;
      } else if ((weeklyStats as any).total_tasks !== undefined) {
        // 扁平结构：直接就是summary数据
        summaryData = weeklyStats;
      } else {
        console.warn('Weekly stats has unexpected structure:', weeklyStats);
        throw new Error('Invalid weekly stats response structure');
      }
      
      // 转换为旧接口格式以保持兼容性
      const dashboardStats: DashboardStats = {
        totalProjects: summaryData.projects_involved || 0,
        totalTasks: summaryData.total_tasks || 0,
        completedTasks: summaryData.completed_tasks || 0,
        inProgressTasks: summaryData.in_progress_tasks || 0,
        todoTasks: summaryData.pending_tasks || 0,
        overdueTasks: summaryData.overdue_tasks || 0,
        completionRate: Math.round(summaryData.completion_rate || 0)
      };
      
      // 缓存结果
      timerCache.cacheDashboard(userId, dashboardStats);
      
      return dashboardStats;
    } catch (error) {
      console.error('Error fetching dashboard stats from new API, falling back to old method:', error);
      // 如果新API失败，回退到旧方法
      return this.getDashboardStatsLegacy();
    }
  }

  /**
   * 获取工作台统计数据（旧版本，作为降级策略）
   */
  static async getDashboardStatsLegacy(): Promise<DashboardStats> {
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects: Project[] = extractArray<Project>(projectsResponse);

      // 如果没有项目，返回空统计
      if (projects.length === 0) {
        return this.getEmptyStats();
      }

      // 为每个项目获取任务数据，使用Promise.allSettled避免单个项目失败影响整体
      const taskPromises = projects.map((project: unknown) => 
        api.get(`/projects/${(project as any).id}/tasks?page=1&page_size=100`).catch(error => {
          console.warn(`Failed to load tasks for project ${(project as any).id}:`, error);
          return { data: { data: [] } }; // 返回空数组作为降级
        })
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      const tasks: Task[] = taskResponses.reduce((allTasks: Task[], response: any) => {
        const projectTasks = extractArray<Task>(response);
        return allTasks.concat(projectTasks);
      }, [] as Task[]);

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
      console.error('Error fetching legacy dashboard stats:', error);
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
   * 获取最近活动（带缓存）
   */
  static async getRecentActivities(limit: number = 5): Promise<TimelineEvent[]> {
    const userId = this.getCurrentUserId();
    
    // 检查缓存
    const cached = timerCache.getRecentActivities(userId, limit);
    if (cached) {
      return cached;
    }
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
      const activities = events
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
        .slice(0, limit);
      
      // 缓存结果
      timerCache.cacheRecentActivities(userId, limit, activities as any);
      
      return activities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // 返回空数组作为降级
      return [];
    }
  }

  /**
   * 获取按状态分组的任务（带缓存）
   */
  static async getTasksByStatus(): Promise<TasksByStatus> {
    const userId = this.getCurrentUserId();
    
    // 检查缓存
    const cached = timerCache.getTasksByStatus(userId);
    if (cached) {
      return cached;
    }
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects: any[] = extractArray<any>(projectsResponse);

      // 为每个项目获取任务数据
      const taskPromises = projects.map((project: any) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=100`)
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      const tasks: Task[] = taskResponses.reduce((allTasks: Task[], response: any) => {
        const projectTasks = extractArray<Task>(response);
        return allTasks.concat(projectTasks);
      }, [] as Task[]);

      const tasksByStatus = {
        todo: tasks.filter((task: Task) => task.status === 'todo'),
        in_progress: tasks.filter((task: Task) => task.status === 'in_progress'),
        completed: tasks.filter((task: Task) => task.status === 'completed'),
        cancelled: tasks.filter((task: Task) => task.status === 'cancelled')
      };
      
      // 缓存结果
      timerCache.cacheTasksByStatus(userId, tasksByStatus);
      
      return tasksByStatus;
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      throw new Error('Failed to fetch tasks by status');
    }
  }

  /**
   * 获取项目进度信息（带缓存）
   */
  static async getProjectProgress(): Promise<ProjectProgressInfo[]> {
    const userId = this.getCurrentUserId();
    
    // 检查缓存
    const cached = timerCache.getProjectProgress(userId);
    if (cached) {
      return cached;
    }
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects: any[] = extractArray<any>(projectsResponse);

      // 为每个项目获取任务数据并计算进度
      const progressPromises = projects.map(async (project: any) => {
        const tasksResponse = await api.get(`/projects/${project.id}/tasks?page=1&page_size=100`);
        const projectTasks: Task[] = extractArray<Task>(tasksResponse);
        
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

      const projectProgress = await Promise.all(progressPromises);
      
      // 缓存结果
      timerCache.cacheProjectProgress(userId, projectProgress as any);
      
      return projectProgress;
    } catch (error) {
      console.error('Error fetching project progress:', error);
      // 返回空数组作为降级
      return [];
    }
  }

  /**
   * 获取用户工作负载（带缓存）
   */
  static async getUserWorkload(): Promise<UserWorkload[]> {
    const userId = this.getCurrentUserId();
    
    // 检查缓存
    const cached = timerCache.getUserWorkload(userId);
    if (cached) {
      return cached;
    }
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects: any[] = extractArray<any>(projectsResponse);

      // 为每个项目获取任务数据
      const taskPromises = projects.map((project: any) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=100`)
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      const tasks: Task[] = taskResponses.reduce((allTasks: Task[], response: any) => {
        const projectTasks = extractArray<Task>(response);
        return allTasks.concat(projectTasks);
      }, [] as Task[]);

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
      const userWorkload = Array.from(userTasksMap.values()).map(user => {
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
      
      // 缓存结果
      timerCache.cacheUserWorkload(userId, userWorkload as any);
      
      return userWorkload;
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
      const payload: any = await api.get('/projects?page=1&page_size=100');
      // axios interceptor in api.ts returns body.data directly when wrapped
      // Normalize to array
      if (Array.isArray(payload)) return payload;
      if (payload?.data && Array.isArray(payload.data)) return payload.data;
      return [];
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
      const projectsResponse: any = await api.get('/projects?page=1&page_size=1000');
      const projects = Array.isArray(projectsResponse)
        ? projectsResponse
        : (Array.isArray(projectsResponse?.data) ? projectsResponse.data : []);

      if (projects.length === 0) {
        console.warn('⚠️ getAllTasks - 没有项目，返回空任务列表');
        return [];
      }

      // 为每个项目获取任务数据，使用Promise.allSettled避免单个失败影响全部
      const taskPromises = projects.map((project: any) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=1000`)
          .catch(error => {
            console.warn(`⚠️ 获取项目 ${project.id} 任务失败:`, error);
            return { data: { data: [] } }; // 返回空结果而不是失败
          })
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      const allTasks = taskResponses.reduce((accumulator: any[], response: any) => {
        const projectTasks = Array.isArray(response) ? response : [];
        return accumulator.concat(projectTasks);
      }, [] as any[]);
      
      return allTasks;
    } catch (error) {
      console.error('❌ getAllTasks - 获取任务失败:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  /**
   * 获取项目的任务
   */
  static async getProjectTasks(projectId: number): Promise<Task[]> {
    try {
      const response: any = await api.get(`/projects/${projectId}/tasks?page=1&page_size=100`);
      return Array.isArray(response) ? response : [];
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
        draft: 0,
        planning: 0,
        todo: 0,
        in_progress: 0,
        testing: 0,
        completed: 0,
        cancelled: 0,
        on_hold: 0,
        suspended: 0,
        blocked: 0,
        archived: 0
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
