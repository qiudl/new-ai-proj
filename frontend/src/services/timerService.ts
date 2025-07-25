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
    return response as unknown as TimerStartResponse;
  }

  // Stop current timer
  static async stopTimer(): Promise<TimerStopResponse> {
    const response = await api.post('timer/stop');
    return response as unknown as TimerStopResponse;
  }

  // Get current timer status
  static async getCurrentTimer(): Promise<TimerCurrentResponse> {
    const response = await api.get('timer/current');
    return response as unknown as TimerCurrentResponse;
  }

  // Get timer statistics
  static async getTimerStats(): Promise<TimerStatsResponse> {
    const response = await api.get('timer/stats');
    return response as unknown as TimerStatsResponse;
  }

  // Get available tasks for timer selection
  static async getAvailableTasks(): Promise<TaskOption[]> {
    // Get all tasks with todo or in_progress status
    const response = await api.get('tasks?status=todo,in_progress&limit=50');
    
    // Transform the response to TaskOption format - response already contains the data due to interceptor
    if (response?.data && Array.isArray(response.data)) {
      return response.data.map((task: any) => ({
        id: task.id,
        title: task.title,
        project_name: task.project_name || 'Unknown Project',
        status: task.status
      }));
    } else if (Array.isArray(response)) {
      // Handle case where response is directly the array
      return response.map((task: any) => ({
        id: task.id,
        title: task.title,
        project_name: task.project_name || 'Unknown Project',
        status: task.status
      }));
    }
    
    return [];
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