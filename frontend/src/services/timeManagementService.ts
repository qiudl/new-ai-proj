import api from './api';
import { Task, TaskStatus } from '../types/task';
import { Project } from '../types/project';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';

// 扩展 dayjs 插件
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

// 环境配置
const isDevelopment = process.env.NODE_ENV === 'development';
const MOCK_API_BASE_URL = 'http://localhost:8888/api';

// 创建专门用于统计的API实例
const createStatsApi = () => {
  if (isDevelopment) {
    // 开发环境使用模拟服务器
    const mockApi = {
      get: async (url: string) => {
        const fullUrl = `${MOCK_API_BASE_URL}${url}`;
        try {
          const response = await fetch(fullUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return { data: await response.json() };
        } catch (error) {
          console.error('模拟API调用失败:', error);
          throw error;
        }
      }
    };
    return mockApi;
  } else {
    // 生产环境使用正常API
    return api;
  }
};

const statsApi = createStatsApi();

/**
 * 今日任务统计数据接口
 */
export interface TodayTaskStats {
  // 基础统计
  totalTasks: number;           // 今日总任务数
  completedTasks: number;       // 已完成任务数
  inProgressTasks: number;      // 进行中任务数
  todoTasks: number;           // 待办任务数
  overdueTasks: number;        // 逾期任务数
  
  // 完成率和效率
  completionRate: number;      // 完成率 (%)
  onTimeCompletionRate: number; // 按时完成率 (%)
  
  // 时间统计
  totalPlannedTime: number;    // 计划总时间(分钟)
  totalActualTime: number;     // 实际总时间(分钟)
  totalRemainingTime: number;  // 剩余计划时间(分钟)
  timeEfficiency: number;      // 时间效率 (实际时间/计划时间 * 100%)
  
  // 优先级分布
  priorityDistribution: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
    unset: number;
  };
  
  // 工作负载
  estimatedWorkload: number;   // 预估剩余工作量(小时)
  avgTaskDuration: number;     // 平均任务时长(分钟)
  
  // 趋势对比
  yesterdayCompletion: number; // 昨日完成任务数
  weeklyTrend: number;         // 周平均完成率
  
  // 详细任务列表
  todayTasks: Task[];          // 今日所有相关任务
  urgentTasks: Task[];         // 紧急任务
  upcomingDeadlines: Task[];   // 即将到期任务(明天到期)
}

/**
 * 时间管理统计服务
 */
export class TimeManagementService {
  
  /**
   * 获取今日任务统计数据
   */
  static async getTodayTaskStats(): Promise<TodayTaskStats> {
    try {
      ' : '生产环境');
      
      // 优先尝试调用后端统计API
      const response = await statsApi.get('/statistics/today-stats');
      
      if (response.data) {
        // 转换API数据为前端格式
        const apiData = response.data;
        const todayStats: TodayTaskStats = {
          totalTasks: apiData.totalTasks || 0,
          completedTasks: apiData.completedTasks || 0,
          inProgressTasks: apiData.inProgressTasks || 0,
          todoTasks: apiData.todoTasks || 0,
          overdueTasks: apiData.overdueTasks || 0,
          completionRate: Math.round(apiData.completionRate || 0),
          onTimeCompletionRate: Math.round(apiData.onTimeCompletionRate || 0),
          totalPlannedTime: apiData.totalPlannedTime || 0,
          totalActualTime: apiData.totalActualTime || 0,
          totalRemainingTime: apiData.totalRemainingTime || 0,
          timeEfficiency: Math.round(apiData.timeEfficiency || 0),
          priorityDistribution: apiData.priorityDistribution || {
            urgent: 0,
            high: 0,
            medium: 0,
            low: 0,
            unset: 0
          },
          estimatedWorkload: Math.round((apiData.estimatedWorkload || 0) * 10) / 10,
          avgTaskDuration: Math.round(apiData.avgTaskDuration || 0),
          yesterdayCompletion: apiData.yesterdayCompletion || 0,
          weeklyTrend: Math.round(apiData.weeklyTrend || 0),
          todayTasks: [], // 从特殊任务中提取
          urgentTasks: this.convertToTasks(apiData.urgentTasks || []),
          upcomingDeadlines: this.convertToTasks(apiData.upcomingDeadlines || [])
        };
        
        // 合并所有任务到 todayTasks
        todayStats.todayTasks = [...todayStats.urgentTasks, ...todayStats.upcomingDeadlines];
        
        return todayStats;
      }
      
      // 如果API返回空数据，降级到前端计算
      console.warn('⚠️ 统计API返回空数据，降级到前端计算');
      return this.getFallbackStats();
      
    } catch (error) {
      console.error('❌ 统计API调用失败，降级到前端计算:', error);
      return this.getFallbackStats();
    }
  }

  /**
   * 转换API任务数据为前端Task格式
   */
  private static convertToTasks(apiTasks: unknown[]): Task[] {
    return apiTasks.map(apiTask => ({
      id: apiTask.id,
      title: apiTask.title,
      description: '',
      status: apiTask.status as TaskStatus,
      project_id: apiTask.project_id,
      assignee_id: apiTask.assignee_id,
      assignee_name: apiTask.assignee_name,
      parent_id: apiTask.parent_id || undefined,
      task_level: apiTask.task_level || 0,
      sort_order: apiTask.sort_order || 0,
      due_date: apiTask.due_date,
      created_at: apiTask.created_at,
      updated_at: apiTask.updated_at,
      custom_fields: apiTask.custom_fields || {},
      project_name: apiTask.project_name
    }));
  }

  /**
   * 降级方案：使用前端计算统计数据
   */
  private static async getFallbackStats(): Promise<TodayTaskStats> {
    try {
      // 获取所有任务数据
      const allTasks = await this.getAllTasks();
      
      // 获取今日相关任务
      const todayTasks = this.filterTodayTasks(allTasks);
      
      // 计算基础统计
      const basicStats = this.calculateBasicStats(todayTasks);
      
      // 计算时间统计
      const timeStats = this.calculateTimeStats(todayTasks);
      
      // 计算优先级分布
      const priorityDistribution = this.calculatePriorityDistribution(todayTasks);
      
      // 计算趋势数据
      const trendStats = await this.calculateTrendStats(allTasks);
      
      // 获取特殊任务列表
      const specialTasks = this.getSpecialTasks(allTasks);
      
      return {
        ...basicStats,
        ...timeStats,
        priorityDistribution,
        ...trendStats,
        ...specialTasks,
        todayTasks
      };
    } catch (error) {
      console.error('前端降级方案也失败了:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * 获取所有任务数据
   */
  static async getAllTasks(): Promise<Task[]> {
    try {
      // 先获取项目数据
      const projectsResponse = await api.get('/projects?page=1&page_size=100');
      const projects = projectsResponse.data?.data || [];

      if (projects.length === 0) {
        return [];
      }

      // 为每个项目获取任务数据
      const taskPromises = projects.map((project: Project) => 
        api.get(`/projects/${project.id}/tasks?page=1&page_size=100`).catch(error => {
          console.warn(`获取项目 ${project.id} 任务失败:`, error);
          return { data: { data: [] } };
        })
      );
      
      const taskResponses = await Promise.all(taskPromises);
      
      // 合并所有任务数据
      return taskResponses.reduce((allTasks, response) => {
        const projectTasks = response.data?.data || [];
        return allTasks.concat(projectTasks);
      }, []);
    } catch (error) {
      console.error('获取任务数据失败:', error);
      return [];
    }
  }

  /**
   * 筛选今日相关任务
   * 规则：
   * 1. 今日到期的任务
   * 2. 今日创建的任务  
   * 3. 今日更新的任务
   * 4. 正在进行中的任务(不限日期)
   * 5. 逾期未完成的任务
   */
  private static filterTodayTasks(allTasks: Task[]): Task[] {
    const today = dayjs().startOf('day');
    const tomorrow = today.add(1, 'day');
    
    return allTasks.filter(task => {
      // 排除已取消的任务
      if (task.status === 'cancelled') return false;
      
      // 今日到期的任务
      if (task.due_date) {
        const dueDate = dayjs(task.due_date);
        if (dueDate.isSame(today, 'day')) return true;
      }
      
      // 今日创建的任务
      if (task.created_at) {
        const createdDate = dayjs(task.created_at);
        if (createdDate.isSame(today, 'day')) return true;
      }
      
      // 今日更新的任务(且不是创建日期)
      if (task.updated_at && task.updated_at !== task.created_at) {
        const updatedDate = dayjs(task.updated_at);
        if (updatedDate.isSame(today, 'day')) return true;
      }
      
      // 正在进行中的任务
      if (task.status === 'in_progress') return true;
      
      // 逾期未完成的任务
      if (task.due_date && task.status !== 'completed') {
        const dueDate = dayjs(task.due_date);
        if (dueDate.isBefore(today, 'day')) return true;
      }
      
      return false;
    });
  }

  /**
   * 计算基础统计数据
   */
  private static calculateBasicStats(todayTasks: Task[]) {
    const totalTasks = todayTasks.length;
    const completedTasks = todayTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = todayTasks.filter(task => task.status === 'in_progress').length;
    const todoTasks = todayTasks.filter(task => task.status === 'todo').length;
    
    // 计算逾期任务
    const today = dayjs().startOf('day');
    const overdueTasks = todayTasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      return dayjs(task.due_date).isBefore(today, 'day');
    }).length;
    
    // 计算完成率
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // 计算按时完成率(在截止日期前完成的任务占比)
    const onTimeCompletedTasks = todayTasks.filter(task => {
      if (task.status !== 'completed' || !task.due_date || !task.updated_at) return false;
      const dueDate = dayjs(task.due_date).endOf('day');
      const completedDate = dayjs(task.updated_at);
      return completedDate.isSameOrBefore(dueDate);
    }).length;
    
    const tasksWithDueDate = todayTasks.filter(task => task.due_date && task.status === 'completed').length;
    const onTimeCompletionRate = tasksWithDueDate > 0 ? Math.round((onTimeCompletedTasks / tasksWithDueDate) * 100) : 100;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      completionRate,
      onTimeCompletionRate
    };
  }

  /**
   * 计算时间相关统计
   */
  private static calculateTimeStats(todayTasks: Task[]) {
    let totalPlannedTime = 0;      // 总计划时间(分钟)
    let totalActualTime = 0;       // 总实际时间(分钟)
    let totalRemainingTime = 0;    // 剩余时间(分钟)
    
    todayTasks.forEach(task => {
      // 计划时间(预估小时数转换为分钟)
      const estimatedHours = task.estimated_hours || task.custom_fields?.estimated_hours || 0;
      const plannedMinutes = (typeof estimatedHours === 'number' ? estimatedHours : 0) * 60;
      totalPlannedTime += plannedMinutes;
      
      // 实际时间
      const actualHours = task.actual_hours || 0;
      const actualMinutes = (typeof actualHours === 'number' ? actualHours : 0) * 60;
      totalActualTime += actualMinutes;
      
      // 如果有计时器记录的时间，使用计时器时间
      if (task.total_time_seconds) {
        totalActualTime += Math.round(task.total_time_seconds / 60);
      }
      
      // 剩余时间(仅计算未完成任务)
      if (task.status !== 'completed') {
        totalRemainingTime += plannedMinutes;
      }
    });
    
    // 计算时间效率
    const timeEfficiency = totalPlannedTime > 0 ? 
      Math.round((totalActualTime / totalPlannedTime) * 100) : 0;
    
    // 计算预估剩余工作量(小时)
    const estimatedWorkload = Math.round(totalRemainingTime / 60 * 10) / 10;
    
    // 计算平均任务时长
    const completedTasksCount = todayTasks.filter(task => task.status === 'completed').length;
    const avgTaskDuration = completedTasksCount > 0 ? 
      Math.round(totalActualTime / completedTasksCount) : 0;
    
    return {
      totalPlannedTime,
      totalActualTime,
      totalRemainingTime,
      timeEfficiency,
      estimatedWorkload,
      avgTaskDuration
    };
  }

  /**
   * 计算优先级分布
   */
  private static calculatePriorityDistribution(todayTasks: Task[]) {
    const distribution = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
      unset: 0
    };
    
    todayTasks.forEach(task => {
      const priority = task.custom_fields?.priority || task.priority || 'unset';
      if (priority in distribution) {
        distribution[priority as keyof typeof distribution]++;
      } else {
        distribution.unset++;
      }
    });
    
    return distribution;
  }

  /**
   * 计算趋势统计
   */
  private static async calculateTrendStats(allTasks: Task[]) {
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    
    // 昨日完成任务数
    const yesterdayCompleted = allTasks.filter(task => {
      if (task.status !== 'completed' || !task.updated_at) return false;
      const completedDate = dayjs(task.updated_at);
      return completedDate.isSame(yesterday, 'day');
    }).length;
    
    // 计算本周平均完成率
    const weekStart = today.startOf('week');
    const weekDays: number[] = [];
    
    for (let i = 0; i < 7; i++) {
      const day = weekStart.add(i, 'day');
      if (day.isAfter(today)) break; // 不计算未来日期
      
      const dayTasks = allTasks.filter(task => {
        if (!task.due_date) return false;
        return dayjs(task.due_date).isSame(day, 'day');
      });
      
      const dayCompleted = dayTasks.filter(task => task.status === 'completed').length;
      const dayTotal = dayTasks.length;
      const dayRate = dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0;
      
      weekDays.push(dayRate);
    }
    
    const weeklyTrend = weekDays.length > 0 ? 
      Math.round(weekDays.reduce((sum, rate) => sum + rate, 0) / weekDays.length) : 0;
    
    return {
      yesterdayCompletion: yesterdayCompleted,
      weeklyTrend
    };
  }

  /**
   * 获取特殊任务列表
   */
  private static getSpecialTasks(allTasks: Task[]) {
    const today = dayjs().startOf('day');
    const tomorrow = today.add(1, 'day');
    
    // 紧急任务(高优先级 + 未完成)
    const urgentTasks = allTasks.filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      const priority = task.custom_fields?.priority || task.priority;
      return priority === 'urgent' || priority === 'high';
    }).slice(0, 10); // 最多显示10个
    
    // 明天到期的任务
    const upcomingDeadlines = allTasks.filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled' || !task.due_date) return false;
      const dueDate = dayjs(task.due_date);
      return dueDate.isSame(tomorrow, 'day');
    }).slice(0, 5); // 最多显示5个
    
    return {
      urgentTasks,
      upcomingDeadlines
    };
  }

  /**
   * 获取空统计数据(用于错误降级)
   */
  private static getEmptyStats(): TodayTaskStats {
    return {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      todoTasks: 0,
      overdueTasks: 0,
      completionRate: 0,
      onTimeCompletionRate: 0,
      totalPlannedTime: 0,
      totalActualTime: 0,
      totalRemainingTime: 0,
      timeEfficiency: 0,
      priorityDistribution: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        unset: 0
      },
      estimatedWorkload: 0,
      avgTaskDuration: 0,
      yesterdayCompletion: 0,
      weeklyTrend: 0,
      todayTasks: [],
      urgentTasks: [],
      upcomingDeadlines: []
    };
  }

  /**
   * 获取实时任务统计(用于定时刷新)
   */
  static async getQuickStats(): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    inProgressTasks: number;
  }> {
    try {
      const allTasks = await this.getAllTasks();
      const todayTasks = this.filterTodayTasks(allTasks);
      
      const totalTasks = todayTasks.length;
      const completedTasks = todayTasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = todayTasks.filter(task => task.status === 'in_progress').length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return {
        totalTasks,
        completedTasks,
        completionRate,
        inProgressTasks
      };
    } catch (error) {
      console.error('获取快速统计失败:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        inProgressTasks: 0
      };
    }
  }

  /**
   * 获取时间效率分析
   */
  static async getTimeEfficiencyAnalysis(): Promise<{
    plannedVsActual: { planned: number; actual: number }[];
    dailyEfficiency: { date: string; efficiency: number }[];
    avgEfficiency: number;
  }> {
    try {
      const allTasks = await this.getAllTasks();
      const completedTasks = allTasks.filter(task => task.status === 'completed');
      
      // 计划vs实际时间对比
      const plannedVsActual = completedTasks.map(task => {
        const planned = (task.estimated_hours || 0) * 60;
        const actual = (task.actual_hours || 0) * 60 + (task.total_time_seconds || 0) / 60;
        return { planned, actual };
      });
      
      // 每日效率趋势(最近7天)
      const dailyEfficiency: Array<{date: string, efficiency: number}> = [];
      const today = dayjs();
      
      for (let i = 6; i >= 0; i--) {
        const date = today.subtract(i, 'day');
        const dayTasks = completedTasks.filter(task => {
          if (!task.updated_at) return false;
          return dayjs(task.updated_at).isSame(date, 'day');
        });
        
        if (dayTasks.length > 0) {
          const totalPlanned = dayTasks.reduce((sum, task) => sum + ((task.estimated_hours || 0) * 60), 0);
          const totalActual = dayTasks.reduce((sum, task) => {
            return sum + ((task.actual_hours || 0) * 60) + ((task.total_time_seconds || 0) / 60);
          }, 0);
          
          const efficiency = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 100;
          dailyEfficiency.push({
            date: date.format('MM-DD'),
            efficiency: Math.round(efficiency)
          });
        }
      }
      
      // 平均效率
      const avgEfficiency = dailyEfficiency.length > 0 ?
        Math.round(dailyEfficiency.reduce((sum, day) => sum + day.efficiency, 0) / dailyEfficiency.length) : 100;
      
      return {
        plannedVsActual,
        dailyEfficiency,
        avgEfficiency
      };
    } catch (error) {
      console.error('获取时间效率分析失败:', error);
      return {
        plannedVsActual: [],
        dailyEfficiency: [],
        avgEfficiency: 100
      };
    }
  }
}