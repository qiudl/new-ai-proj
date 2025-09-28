import { BaseClient } from './base-client.js';
import { requiresPermission } from './permission-manager.js';
import { TimerData, ApiResponse } from './types.js';

export class TimerService extends BaseClient {

  // 开始计时
  // @requiresPermission('start_timer')
  async startTimer(taskId: number, description?: string): Promise<ApiResponse<TimerData>> {
    try {
      const payload: any = { 
        task_id: taskId,  // 修正参数名：taskId -> task_id
        title: description || `计时器-任务${taskId}`,  // 后端必需的title字段
        context: "dashboard"  // 添加必需的context字段
      };
      if (description) {
        // 将描述作为计时器的描述信息，而不是覆盖context
        payload.description = description;
      }

      const response = await this.makeRequest<{
        success?: boolean; // 后端统一计时接口可能不返回 success 字段
        timer_id?: number;
        timer_type?: string;
        message?: string;
        started_at?: string;
        data?: any;
      }>('POST', '/user/timer/start', payload);

      // 兼容后端统一计时器返回格式：顶层即为结果字段，不一定包含 success/data 嵌套
      const timerId = (response as any)?.timer_id;
      const startedAt = (response as any)?.started_at;
      const ok = (response as any)?.success === undefined ? (timerId !== undefined) : !!(response as any)?.success;

      if (ok && timerId !== undefined) {
        const timerData: TimerData = {
          id: timerId,
          task_id: taskId,
          started_at: startedAt || new Date().toISOString(),
          description: description
        };

        return {
          success: true,
          data: timerData,
          task_id: taskId,
          timer_id: timerId,
          started_at: startedAt,
          description: description,
          message: (response as any)?.message || `⏱️ 任务 "${taskId}" 开始计时`
        };
      } else {
        return {
          success: false,
          error: (response as any)?.error || '开始计时失败'
        } as ApiResponse<TimerData>;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `开始计时失败: ${error.message || error}`
      };
    }
  }

  // 停止计时
  // @requiresPermission('stop_timer')
  async stopTimer(taskId?: number): Promise<ApiResponse<TimerData>> {
    try {
      // Backend StopTimer handler doesn't accept any payload - it just stops the current running timer for the authenticated user
      // The taskId parameter is ignored as per the backend implementation
      const response = await this.makeRequest<{
        success: boolean;
        timer_id: number;
        timer_type: string;
        message: string;
        started_at: string;
        data: {
          actual_work_duration: number;
          efficiency: number;
          pause_count: number;
          pause_total: number;
          total_duration: number;
        };
      }>('POST', '/user/timer/stop', {});

      if (response && response.success) {
        const timerData: TimerData = {
          id: response.timer_id || 0,
          task_id: taskId || 0,
          started_at: response.started_at || '', 
          stopped_at: new Date().toISOString(),
          duration_seconds: response.data?.total_duration || 0
        };

        const durationFormatted = this.formatDuration(response.data?.total_duration || 0);

        return {
          success: true,
          data: timerData,
          task_id: taskId,
          timer_id: response.timer_id,
          started_at: response.started_at,
          stopped_at: new Date().toISOString(),
          duration_seconds: response.data?.total_duration || 0,
          duration_formatted: durationFormatted,
          message: response.message || `⏹️ 计时已停止 (用时: ${durationFormatted})`
        };
      } else {
        // Handle API error responses gracefully
        if (response && !response.success) {
          // Return the API error response as-is without additional wrapping
          return {
            success: false,
            error: response.error || '停止计时失败'
          } as ApiResponse<TimerData>;
        }
        return { success: false, error: '停止计时失败' } as ApiResponse<TimerData>;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `停止计时失败: ${error.message || error}`
      };
    }
  }

  // 获取当前计时状态（兼容多计时器改造后的返回）
  async getCurrentTimer(): Promise<ApiResponse<{ active_timers: TimerData[] }>> {
    try {
      // 统一计时接口返回的是最近一个活动计时器（running/paused），不带 success 包装
      const resp = await this.makeRequest<any>('GET', '/user/timer/current');

      // 如果后端直接返回计时器对象（无 success 字段）
      if (resp && (resp as any).id !== undefined) {
        const t = resp as any;
        const active: TimerData = {
          id: t.id,
          task_id: t.target_id || 0,
          started_at: t.start_time,
          description: t.description,
          duration_seconds: t.elapsed_seconds
        };
        return {
          success: true,
          data: { active_timers: [active] },
          active_count: 1,
          timers: [t],
          message: '⏰ 存在一个活动计时器'
        };
      }

      // 若按旧格式返回（带 success/data/active_timers）
      if ((resp as any)?.success && (resp as any)?.data?.active_timers) {
        const activeTimers: TimerData[] = (resp as any).data.active_timers.map((timer: any) => ({
          id: timer.timer_id,
          task_id: timer.task_id,
          started_at: timer.started_at,
          duration_seconds: timer.duration_seconds,
          description: timer.description
        }));
        return {
          success: true,
          data: { active_timers: activeTimers },
          active_count: activeTimers.length,
          timers: (resp as any).data.active_timers,
          message: activeTimers.length > 0 ? `⏰ 当前有 ${activeTimers.length} 个活跃计时器` : '📝 当前无活跃计时器'
        };
      }

      return { success: true, data: { active_timers: [] }, active_count: 0, timers: [], message: '📝 当前无活跃计时器' };
    } catch (error: any) {
      return {
        success: false,
        error: `获取当前计时状态失败: ${error.message || error}`
      };
    }
  }

  // 获取所有活跃计时器（running/paused）
  async getActiveTimers(): Promise<ApiResponse<{ active_timers: TimerData[] }>> {
    try {
      const resp = await this.makeRequest<any>('GET', '/user/timer/active');
      const timers = (resp as any)?.timers || [];
      if (Array.isArray(timers)) {
        const mapped: TimerData[] = timers.map((t: any) => ({
          id: t.id,
          task_id: t.target_id || 0,
          started_at: t.start_time,
          description: t.description,
          duration_seconds: t.elapsed_seconds
        }));
        return {
          success: true,
          data: { active_timers: mapped },
          active_count: mapped.length,
          timers,
          message: mapped.length > 0 ? `⏰ 当前有 ${mapped.length} 个活跃计时器` : '📝 当前无活跃计时器'
        };
      }
      // 兼容老格式
      if ((resp as any)?.success && (resp as any)?.data?.active_timers) {
        const activeTimers = (resp as any).data.active_timers as TimerData[];
        return { success: true, data: { active_timers: activeTimers }, active_count: activeTimers.length, timers: activeTimers } as any;
      }
      return { success: true, data: { active_timers: [] }, active_count: 0, timers: [], message: '📝 当前无活跃计时器' };
    } catch (error: any) {
      return { success: false, error: `获取活跃计时器失败: ${error.message || error}` };
    }
  }

  // 获取任务计时历史
  async getTaskTimerHistory(taskId: number, limit: number = 10, offset: number = 0): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', `/tasks/${taskId}/timers`, undefined, {
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (response.success && response.data) {
        const timers = response.data.timers || [];
        const total = response.data.total || timers.length;

        return {
          success: true,
          task_id: taskId,
          timers: timers,
          total: total,
          limit: limit,
          offset: offset,
          message: `📊 获取到任务 ${taskId} 的 ${timers.length} 条计时记录`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取任务计时历史失败: ${error.message || error}`
      };
    }
  }

  // 获取计时器统计信息
  async getTimerStats(taskId?: number, dateFrom?: string, dateTo?: string): Promise<ApiResponse> {
    try {
      const params: any = {};
      if (taskId) params.task_id = taskId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await this.makeRequest('GET', '/timers/stats', undefined, params);

      if (response.success && response.data) {
        return {
          success: true,
          stats: response.data,
          task_id: taskId,
          date_range: { from: dateFrom, to: dateTo },
          message: `📈 计时器统计信息获取成功${taskId ? ` (任务 ${taskId})` : ''}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取计时器统计失败: ${error.message || error}`
      };
    }
  }

  // 暂停计时器
  // @requiresPermission('pause_timer')
  async pauseTimer(timerId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PUT', `/timers/${timerId}/pause`);

      if (response.success) {
        return {
          success: true,
          timer_id: timerId,
          status: 'paused',
          message: `⏸️ 计时器 ${timerId} 已暂停`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `暂停计时器失败: ${error.message || error}`
      };
    }
  }

  // 恢复计时器
  // @requiresPermission('resume_timer')
  async resumeTimer(timerId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PUT', `/timers/${timerId}/resume`);

      if (response.success) {
        return {
          success: true,
          timer_id: timerId,
          status: 'active',
          message: `▶️ 计时器 ${timerId} 已恢复`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `恢复计时器失败: ${error.message || error}`
      };
    }
  }

  // 删除计时记录
  // @requiresPermission('delete_timer')
  async deleteTimer(timerId: number): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('DELETE', `/timers/${timerId}`);

      if (response.success) {
        return {
          success: true,
          timer_id: timerId,
          message: `🗑️ 计时记录 ${timerId} 已删除`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `删除计时记录失败: ${error.message || error}`
      };
    }
  }

  // 更新计时器描述
  // @requiresPermission('update_timer')
  async updateTimerDescription(timerId: number, description: string): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('PUT', `/timers/${timerId}`, {
        description: description
      });

      if (response.success) {
        return {
          success: true,
          timer_id: timerId,
          description: description,
          message: `📝 计时器 ${timerId} 描述已更新`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新计时器描述失败: ${error.message || error}`
      };
    }
  }

  // 获取今日工作报告（包含计时统计）
  async getDailyWorkReport(projectId: number = 1): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest('GET', '/mcp/get-daily-work-report', undefined, {
        projectId: projectId
      });

      if (response.success && response.data) {
        return {
          success: true,
          project_id: projectId,
          report: response.data,
          date: new Date().toISOString().split('T')[0],
          message: `📊 今日工作报告生成成功 (项目 ${projectId})`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取今日工作报告失败: ${error.message || error}`
      };
    }
  }

  // 批量停止计时器
  // @requiresPermission('stop_timer')
  async batchStopTimers(taskIds?: number[]): Promise<ApiResponse> {
    try {
      // 先获取当前活跃计时器
      const currentTimersResponse = await this.getCurrentTimer();
      if (!currentTimersResponse.success || !currentTimersResponse.data) {
        return { success: false, error: '获取当前计时器失败' };
      }

      const activeTimers = currentTimersResponse.data.active_timers;
      if (activeTimers.length === 0) {
        return {
          success: true,
          stopped_count: 0,
          message: '📝 当前无活跃计时器需要停止'
        };
      }

      // 过滤需要停止的计时器
      let timersToStop = activeTimers;
      if (taskIds && taskIds.length > 0) {
        timersToStop = activeTimers.filter(timer => taskIds.includes(timer.task_id));
      }

      if (timersToStop.length === 0) {
        return {
          success: true,
          stopped_count: 0,
          message: '📝 没有符合条件的计时器需要停止'
        };
      }

      // 批量停止计时器
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const timer of timersToStop) {
        try {
          const result = await this.stopTimer(timer.task_id);
          results.push({ task_id: timer.task_id, success: result.success, result });
          if (result.success) successCount++;
          else errorCount++;
        } catch (error) {
          results.push({ task_id: timer.task_id, success: false, error: error.message });
          errorCount++;
        }
      }

      return {
        success: errorCount === 0,
        total_processed: timersToStop.length,
        success_count: successCount,
        error_count: errorCount,
        results: results,
        message: `⏹️ 批量停止计时器完成: 成功 ${successCount} 个，失败 ${errorCount} 个`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `批量停止计时器失败: ${error.message || error}`
      };
    }
  }

  // 格式化时长
  public formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '0秒';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}秒`);
    
    return parts.join('');
  }

  // 计算工作效率
  async calculateWorkEfficiency(taskId: number, dateFrom?: string, dateTo?: string): Promise<ApiResponse> {
    try {
      // 获取任务计时历史
      const historyResponse = await this.getTaskTimerHistory(taskId, 100, 0);
      if (!historyResponse.success) {
        return historyResponse;
      }

      const timers = historyResponse.timers || [];
      
      // 过滤日期范围
      let filteredTimers = timers;
      if (dateFrom || dateTo) {
        filteredTimers = timers.filter(timer => {
          const timerDate = new Date(timer.started_at).toISOString().split('T')[0];
          if (dateFrom && timerDate < dateFrom) return false;
          if (dateTo && timerDate > dateTo) return false;
          return true;
        });
      }

      // 计算统计数据
      const totalDuration = filteredTimers.reduce((sum, timer) => sum + (timer.duration_seconds || 0), 0);
      const sessionCount = filteredTimers.length;
      const averageSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;
      
      // 按日期分组
      const dailyStats = {};
      filteredTimers.forEach(timer => {
        const date = new Date(timer.started_at).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { duration: 0, sessions: 0 };
        }
        dailyStats[date].duration += timer.duration_seconds || 0;
        dailyStats[date].sessions += 1;
      });

      return {
        success: true,
        task_id: taskId,
        date_range: { from: dateFrom, to: dateTo },
        efficiency_stats: {
          total_duration: totalDuration,
          total_duration_formatted: this.formatDuration(totalDuration),
          session_count: sessionCount,
          average_session_duration: averageSessionDuration,
          average_session_duration_formatted: this.formatDuration(Math.round(averageSessionDuration)),
          daily_stats: dailyStats,
          working_days: Object.keys(dailyStats).length
        },
        message: `📈 任务 ${taskId} 的工作效率分析完成`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `计算工作效率失败: ${error.message || error}`
      };
    }
  }
}