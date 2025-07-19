/**
 * 数据格式化工具函数
 */

import { Task, TaskStatus } from '../types/task';
import { Project } from '../types/project';

// 时间格式化
export const formatTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMonths > 0) {
    return `${diffMonths}个月前`;
  } else if (diffWeeks > 0) {
    return `${diffWeeks}周前`;
  } else if (diffDays > 0) {
    return `${diffDays}天前`;
  } else if (diffHours > 0) {
    return `${diffHours}小时前`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}分钟前`;
  } else {
    return '刚刚';
  }
};

// 格式化日期为易读格式
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (targetDate.getTime() === today.getTime()) {
    return '今天';
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  }
};

// 格式化任务状态
export const formatTaskStatus = (status: TaskStatus): { text: string; color: string } => {
  const statusMap = {
    'todo': { text: '待办', color: '#faad14' },
    'in_progress': { text: '进行中', color: '#1890ff' },
    'completed': { text: '已完成', color: '#52c41a' },
    'cancelled': { text: '已取消', color: '#8c8c8c' }
  };
  return statusMap[status] || { text: '未知', color: '#d9d9d9' };
};

// 格式化优先级
export const formatPriority = (priority: string): { text: string; color: string } => {
  const priorityMap = {
    'urgent': { text: '紧急', color: '#ff4d4f' },
    'high': { text: '高', color: '#fa541c' },
    'medium': { text: '中', color: '#fa8c16' },
    'low': { text: '低', color: '#52c41a' }
  };
  return priorityMap[priority as keyof typeof priorityMap] || { text: '未设置', color: '#d9d9d9' };
};

// 格式化工时
export const formatHours = (hours: number): string => {
  if (hours === 0) return '0小时';
  if (hours < 1) return `${Math.round(hours * 60)}分钟`;
  if (hours >= 8) {
    const days = Math.floor(hours / 8);
    const remainingHours = hours % 8;
    if (remainingHours === 0) {
      return `${days}天`;
    } else {
      return `${days}天${remainingHours}小时`;
    }
  }
  return `${hours}小时`;
};

// 格式化百分比
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  const percentage = Math.round((value / total) * 100);
  return `${percentage}%`;
};

// 计算任务完成率
export const calculateCompletionRate = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter(task => task.status === 'completed');
  return Math.round((completedTasks.length / tasks.length) * 100);
};

// 计算项目进度
export const calculateProjectProgress = (project: Project, tasks: Task[]): {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  progress: number;
} => {
  const projectTasks = tasks.filter(task => task.project_id === project.id);
  const completedTasks = projectTasks.filter(task => task.status === 'completed');
  const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress');
  const todoTasks = projectTasks.filter(task => task.status === 'todo');
  
  return {
    totalTasks: projectTasks.length,
    completedTasks: completedTasks.length,
    inProgressTasks: inProgressTasks.length,
    todoTasks: todoTasks.length,
    progress: calculateCompletionRate(projectTasks)
  };
};

// 判断任务是否逾期
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date || task.status === 'completed') return false;
  return new Date(task.due_date) < new Date();
};

// 计算剩余天数
export const getDaysRemaining = (dueDate: string): number => {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 格式化剩余天数
export const formatDaysRemaining = (dueDate: string): { text: string; color: string; urgent: boolean } => {
  const days = getDaysRemaining(dueDate);
  
  if (days < 0) {
    return { text: `逾期${Math.abs(days)}天`, color: '#ff4d4f', urgent: true };
  } else if (days === 0) {
    return { text: '今天到期', color: '#fa541c', urgent: true };
  } else if (days === 1) {
    return { text: '明天到期', color: '#fa8c16', urgent: true };
  } else if (days <= 3) {
    return { text: `${days}天后到期`, color: '#faad14', urgent: true };
  } else if (days <= 7) {
    return { text: `${days}天后到期`, color: '#1890ff', urgent: false };
  } else {
    return { text: `${days}天后到期`, color: '#52c41a', urgent: false };
  }
};

// 格式化数字
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// 获取任务难度描述
export const getDifficultyDescription = (difficulty: number): { text: string; color: string } => {
  if (difficulty >= 9) return { text: '极难', color: '#722ed1' };
  if (difficulty >= 7) return { text: '困难', color: '#fa541c' };
  if (difficulty >= 5) return { text: '中等', color: '#fa8c16' };
  if (difficulty >= 3) return { text: '简单', color: '#52c41a' };
  return { text: '很简单', color: '#13c2c2' };
};

// 获取工作负载状态
export const getWorkloadStatus = (hours: number): { text: string; color: string; level: 'low' | 'medium' | 'high' | 'critical' } => {
  if (hours >= 50) {
    return { text: '严重超载', color: '#ff4d4f', level: 'critical' };
  } else if (hours >= 40) {
    return { text: '重负载', color: '#fa541c', level: 'high' };
  } else if (hours >= 20) {
    return { text: '中负载', color: '#fa8c16', level: 'medium' };
  } else {
    return { text: '轻负载', color: '#52c41a', level: 'low' };
  }
};

// 计算趋势
export const calculateTrend = (current: number, previous: number): { 
  percentage: number; 
  trend: 'up' | 'down' | 'stable';
  color: string;
} => {
  if (previous === 0) {
    return { percentage: 0, trend: 'stable', color: '#8c8c8c' };
  }
  
  const percentage = Math.round(((current - previous) / previous) * 100);
  
  if (percentage > 5) {
    return { percentage, trend: 'up', color: '#52c41a' };
  } else if (percentage < -5) {
    return { percentage: Math.abs(percentage), trend: 'down', color: '#ff4d4f' };
  } else {
    return { percentage: Math.abs(percentage), trend: 'stable', color: '#8c8c8c' };
  }
};

// 生成颜色基于值
export const getColorByValue = (value: number, max: number, colorScheme: 'progress' | 'priority' | 'status' = 'progress'): string => {
  const ratio = value / max;
  
  switch (colorScheme) {
    case 'progress':
      if (ratio >= 0.8) return '#52c41a';
      if (ratio >= 0.6) return '#faad14';
      if (ratio >= 0.3) return '#fa8c16';
      return '#ff4d4f';
    
    case 'priority':
      if (ratio >= 0.8) return '#ff4d4f';
      if (ratio >= 0.6) return '#fa541c';
      if (ratio >= 0.3) return '#fa8c16';
      return '#52c41a';
    
    case 'status':
      if (ratio >= 0.8) return '#722ed1';
      if (ratio >= 0.6) return '#1890ff';
      if (ratio >= 0.3) return '#13c2c2';
      return '#52c41a';
    
    default:
      return '#1890ff';
  }
};

// 安全的除法运算
export const safeDivide = (numerator: number, denominator: number, defaultValue: number = 0): number => {
  return denominator === 0 ? defaultValue : numerator / denominator;
};

// 截断文本
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
