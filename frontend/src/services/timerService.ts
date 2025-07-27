import api from './api';
import {
  TimerStartRequest,
  TimerStartResponse,
  TimerStopResponse,
  TimerCurrentResponse,
  TimerStatsResponse,
  TaskOption
} from '../types/timer';

class TimerService {
  // Start timer for a specific task
  static async startTimer(taskId: number): Promise<TimerStartResponse> {
    const request: TimerStartRequest = { task_id: taskId };
    const response = await api.post('timer/start', request);
    // Handle API response format: {success: true, data: {...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerStartResponse;
    }
    return response as unknown as TimerStartResponse;
  }

  // Stop current timer
  static async stopTimer(): Promise<TimerStopResponse> {
    const response = await api.post('timer/stop');
    // Handle API response format: {success: true, data: {...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerStopResponse;
    }
    return response as unknown as TimerStopResponse;
  }

  // Get current timer status
  static async getCurrentTimer(): Promise<TimerCurrentResponse> {
    const response = await api.get('timer/current');
    // Handle API response format: {success: true, data: {is_running: true, ...}}
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data as TimerCurrentResponse;
    }
    // Fallback for direct response
    return response as unknown as TimerCurrentResponse;
  }

  // Get timer statistics
  static async getTimerStats(): Promise<TimerStatsResponse> {
    const response = await api.get('timer/stats');
    return response as unknown as TimerStatsResponse;
  }

  // Get available tasks for timer selection from all accessible projects
  static async getAvailableTasks(): Promise<TaskOption[]> {
    try {
      // Note: Since we removed global task endpoint, we get tasks from user's accessible projects
      // This approach maintains functionality while keeping tasks project-scoped
      
      // First, get user's projects
      const projectsResponse = await api.get('projects?limit=100');
      
      if (!projectsResponse?.data || !Array.isArray(projectsResponse.data)) {
        console.warn('No projects found for user');
        return [];
      }
      
      const projects = projectsResponse.data;
      
      // Get tasks from all user projects
      const allTasks: any[] = [];
      
      for (const project of projects) {
        try {
          const tasksResponse = await api.get(`projects/${project.id}/tasks?status=todo,in_progress&limit=50`);
          
          if (tasksResponse?.data?.data && Array.isArray(tasksResponse.data.data)) {
            allTasks.push(...tasksResponse.data.data);
          }
        } catch (error) {
          console.warn(`Failed to get tasks from project ${project.id}:`, error);
          // Continue with other projects
        }
      }
      
      // Transform the response to TaskOption format
      return allTasks.map((task: any) => ({
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