import api from './api';
import {
  TimerStartRequest,
  TimerStartResponse,
  TimerStopResponse,
  TimerPauseResponse,
  TimerResumeResponse,
  TimerCurrentResponse,
  TimerStatsResponse,
  TaskOption
} from '../types/timer';

class TimerService {
  // Start timer for a specific task
  static async startTimer(taskId: number): Promise<TimerStartResponse> {
    const request: TimerStartRequest = { task_id: taskId };
    const response = await api.post('/timer/start', request);
    // Handle API response format: {success: true, data: {...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerStartResponse;
    }
    return response as unknown as TimerStartResponse;
  }

  // Stop current timer (Phase 4: Use unified API)
  static async stopTimer(): Promise<TimerStopResponse> {
    const response = await api.post('/user/timer/stop');
    // Handle API response format: {success: true, data: {...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerStopResponse;
    }
    return response as unknown as TimerStopResponse;
  }

  // Pause current timer (Phase 4: Use unified API)
  static async pauseTimer(): Promise<TimerPauseResponse> {
    const response = await api.post('/user/timer/pause');
    // Handle API response format: {success: true, data: {...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerPauseResponse;
    }
    return response as unknown as TimerPauseResponse;
  }

  // Resume current timer (Phase 4: Use unified API)
  static async resumeTimer(): Promise<TimerResumeResponse> {
    const response = await api.post('/user/timer/resume');
    // Handle API response format: {success: true, data: {...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerResumeResponse;
    }
    return response as unknown as TimerResumeResponse;
  }

  // Get current timer status (Phase 4: Use unified API)
  static async getCurrentTimer(): Promise<TimerCurrentResponse> {
    const response = await api.get('/user/timer/current');
    // Handle API response format: {success: true, data: {is_running: true, ...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerCurrentResponse;
    }
    // Fallback for direct response
    return response as unknown as TimerCurrentResponse;
  }

  // Get timer statistics
  static async getTimerStats(): Promise<TimerStatsResponse> {
    try {
      const response = await api.get('/timer/stats');
      
      // Handle API response format: {success: true, data: {...}}
      let data: Record<string, unknown>;
      if (response && typeof response === 'object' && 'data' in response) {
        data = response.data;
      } else {
        data = response;
      }
      
      // Ensure the response has the correct structure with safe defaults
      return {
        today_total_seconds: data?.today_total_seconds || 0,
        today_formatted_time: data?.today_formatted_time || '00:00:00',
        completed_tasks_today: data?.completed_tasks_today || 0,
        in_progress_tasks: data?.in_progress_tasks || 0,
        recent_tasks: Array.isArray(data?.recent_tasks) ? data.recent_tasks : [],
        task_time_breakdown: Array.isArray(data?.task_time_breakdown) ? data.task_time_breakdown : []
      } as TimerStatsResponse;
      
    } catch (error) {
      console.error('Failed to get timer stats:', error);
      // Return safe defaults on error
      return {
        today_total_seconds: 0,
        today_formatted_time: '00:00:00',
        completed_tasks_today: 0,
        in_progress_tasks: 0,
        recent_tasks: [],
        task_time_breakdown: []
      } as TimerStatsResponse;
    }
  }

  // Get weekly report with real daily statistics
  static async getWeeklyReport(startDate: string, endDate: string): Promise<any> {
    try {
      const response = await api.get(`/timer/weekly?start_date=${startDate}&end_date=${endDate}`);
      
      // Handle API response format: {success: true, data: {...}}
      let data: Record<string, unknown>;
      if (response && typeof response === 'object' && 'data' in response) {
        data = response.data;
      } else {
        data = response;
      }
      
      return data;
      
    } catch (error) {
      console.error('Failed to get weekly report:', error);
      // Return safe defaults on error
      return {
        weekly_stats: {
          total_time_seconds: 0,
          total_formatted_time: '00:00:00',
          average_daily_seconds: 0,
          average_daily_formatted: '00:00:00',
          total_tasks: 0,
          active_days: 0
        },
        daily_stats: [],
        task_time_entries: [],
        project_stats: []
      };
    }
  }

  // Get available tasks for timer selection from all accessible projects
  static async getAvailableTasks(): Promise<TaskOption[]> {
    try {
      // Note: Since we removed global task endpoint, we get tasks from user's accessible projects
      // This approach maintains functionality while keeping tasks project-scoped
      
      // First, get user's projects
      const projectsResponse = await api.get('/projects?limit=100');
      
      if (!projectsResponse?.data || !Array.isArray(projectsResponse.data)) {
        console.warn('No projects found for user');
        return [];
      }
      
      const projects = projectsResponse.data;
      
      // Get tasks from all user projects
      const allTasks: unknown[] = [];
      
      for (const project of projects) {
        try {
          const tasksResponse = await api.get(`/projects/${project.id}/tasks?status=todo,in_progress&limit=50`);
          
          if (tasksResponse?.data?.data && Array.isArray(tasksResponse.data.data)) {
            allTasks.push(...tasksResponse.data.data);
          }
        } catch (error) {
          console.warn(`Failed to get tasks from project ${project.id}:`, error);
          // Continue with other projects
        }
      }
      
      // Transform the response to TaskOption format
      return allTasks.map((task: unknown) => ({
        id: task.id,
        title: task.title,
        project_name: task.project_name || 'Unknown Project',
        status: task.status
      }));
    } catch (error) {
      console.error('Failed to get available tasks:', error);
      return [];
    }
  }

  // Format seconds to HH:MM:SS
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Parse formatted time string to seconds
  static parseDuration(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Calculate elapsed seconds from start time
  static getElapsedSeconds(startTime: Date): number {
    return Math.floor((Date.now() - startTime.getTime()) / 1000);
  }

  // Get today's date string for filtering
  static getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

export default TimerService;