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

  // Get available tasks for timer selection
  static async getAvailableTasks(): Promise<TaskOption[]> {
    try {
      // Get all tasks with todo or in_progress status
      const response = await api.get('tasks?status=todo,in_progress&limit=100');
      console.log('TimerService.getAvailableTasks response:', response);
      
      // Extract tasks from the response structure
      let tasks: any[] = [];
      if (response?.data?.data && Array.isArray(response.data.data)) {
        tasks = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        tasks = response.data;
      } else if (Array.isArray(response)) {
        tasks = response;
      } else {
        console.warn('Unexpected response format:', response);
        return [];
      }
      
      // Transform the response to TaskOption format
      return tasks.map((task: any) => ({
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