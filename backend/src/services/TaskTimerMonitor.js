/**
 * 任务计时器监控服务
 * 功能：
 * 1. 监控正在计时的任务
 * 2. 检查任务是否超过预估工期
 * 3. 自动暂停超时任务
 * 4. 提供暂停任务查看接口
 */

const EventEmitter = require('events');

class TaskTimerMonitor extends EventEmitter {
  constructor(taskManager, timerService) {
    super();
    this.taskManager = taskManager;
    this.timerService = timerService;
    this.monitorInterval = null;
    this.checkIntervalMs = 60000; // 默认每分钟检查一次
    this.pausedTasks = new Map(); // 存储被自动暂停的任务
    this.isMonitoring = false;
  }

  /**
   * 启动监控服务
   * @param {number} interval - 检查间隔(毫秒)
   */
  startMonitoring(interval = 60000) {
    if (this.isMonitoring) {
      console.log('⚠️ 监控服务已经在运行');
      return;
    }

    this.checkIntervalMs = interval;
    this.isMonitoring = true;
    
    console.log(`🚀 启动任务计时器监控服务，检查间隔：${interval / 1000}秒`);
    
    // 立即执行一次检查
    this.checkActiveTimers();
    
    // 设置定时检查
    this.monitorInterval = setInterval(() => {
      this.checkActiveTimers();
    }, this.checkIntervalMs);
  }

  /**
   * 停止监控服务
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isMonitoring = false;
      console.log('🛑 任务计时器监控服务已停止');
    }
  }

  /**
   * 检查所有活动的计时器
   */
  async checkActiveTimers() {
    try {
      // 获取所有活动的计时器
      const activeTimers = await this.timerService.getActiveTimers();
      
      if (!activeTimers || activeTimers.length === 0) {
        return;
      }

      console.log(`🔍 检查 ${activeTimers.length} 个活动计时器...`);

      for (const timer of activeTimers) {
        await this.checkTimerOvertime(timer);
      }
    } catch (error) {
      console.error('❌ 检查计时器时出错:', error);
      this.emit('error', error);
    }
  }

  /**
   * 检查单个计时器是否超时
   * @param {Object} timer - 计时器对象
   */
  async checkTimerOvertime(timer) {
    try {
      const { taskId, startTime, elapsedTime } = timer;
      
      // 获取任务详情
      const task = await this.taskManager.getTask(taskId);
      
      if (!task) {
        console.warn(`⚠️ 任务 ${taskId} 不存在`);
        return;
      }

      // 获取任务的预估工期（小时）
      const estimatedHours = task.custom_fields?.estimated_hours || 
                            task.estimated_hours || 
                            0;
      
      if (estimatedHours === 0) {
        // 没有设置预估工期，不进行自动暂停
        return;
      }

      // 计算已用时间（小时）
      const elapsedHours = this.calculateElapsedHours(startTime, elapsedTime);
      
      // 检查是否超时
      if (elapsedHours >= estimatedHours) {
        await this.pauseOvertimeTask(task, timer, elapsedHours, estimatedHours);
      } else {
        // 计算剩余时间并发出警告
        const remainingHours = estimatedHours - elapsedHours;
        
        // 如果剩余时间少于15分钟，发出警告
        if (remainingHours <= 0.25) {
          this.emit('warning', {
            taskId,
            taskTitle: task.title,
            remainingMinutes: Math.round(remainingHours * 60),
            message: `任务 "${task.title}" 即将超过预估工期`
          });
        }
      }
    } catch (error) {
      console.error(`❌ 检查任务 ${timer.taskId} 超时状态时出错:`, error);
    }
  }

  /**
   * 暂停超时任务
   * @param {Object} task - 任务对象
   * @param {Object} timer - 计时器对象
   * @param {number} elapsedHours - 已用时间（小时）
   * @param {number} estimatedHours - 预估时间（小时）
   */
  async pauseOvertimeTask(task, timer, elapsedHours, estimatedHours) {
    try {
      const pauseInfo = {
        taskId: task.id,
        taskTitle: task.title,
        pausedAt: new Date().toISOString(),
        reason: 'overtime',
        elapsedHours: elapsedHours,
        estimatedHours: estimatedHours,
        overtimeHours: elapsedHours - estimatedHours,
        timerInfo: timer
      };

      // 暂停任务
      await this.taskManager.updateTask(task.id, {
        status: 'on_hold',
        'custom_fields.pause_reason': '超过预估工期自动暂停',
        'custom_fields.paused_at': pauseInfo.pausedAt,
        'custom_fields.overtime_hours': pauseInfo.overtimeHours
      }, `自动暂停：已用时 ${elapsedHours.toFixed(2)} 小时，超过预估工期 ${estimatedHours} 小时`);

      // 停止计时器
      await this.timerService.stopTimer(task.id);

      // 记录暂停信息
      this.pausedTasks.set(task.id, pauseInfo);

      // 发出暂停事件
      this.emit('taskPaused', pauseInfo);

      console.log(`⏸️ 任务 "${task.title}" 已自动暂停 - 超时 ${pauseInfo.overtimeHours.toFixed(2)} 小时`);

      // 添加时间轴事件
      await this.taskManager.addTimelineEvent(
        task.id,
        'auto_paused',
        `任务因超过预估工期自动暂停。已用时：${elapsedHours.toFixed(2)}小时，预估：${estimatedHours}小时`,
        {
          elapsed_hours: elapsedHours,
          estimated_hours: estimatedHours,
          overtime_hours: pauseInfo.overtimeHours
        },
        true
      );
    } catch (error) {
      console.error(`❌ 暂停任务 ${task.id} 时出错:`, error);
      throw error;
    }
  }

  /**
   * 计算已用时间（小时）
   * @param {string} startTime - 开始时间
   * @param {number} elapsedTime - 已经过的毫秒数
   * @returns {number} 小时数
   */
  calculateElapsedHours(startTime, elapsedTime = 0) {
    const start = new Date(startTime);
    const now = new Date();
    const totalMs = (now - start) + (elapsedTime || 0);
    return totalMs / (1000 * 60 * 60);
  }

  /**
   * 获取所有暂停的任务
   * @param {Object} filters - 过滤条件
   * @returns {Array} 暂停任务列表
   */
  async getPausedTasks(filters = {}) {
    const {
      reason = null,
      projectId = null,
      dateRange = null,
      includeManuallyPaused = false
    } = filters;

    let pausedTasks = [];

    // 从内存中获取自动暂停的任务
    for (const [taskId, pauseInfo] of this.pausedTasks) {
      if (reason && pauseInfo.reason !== reason) continue;
      
      if (dateRange) {
        const pausedDate = new Date(pauseInfo.pausedAt);
        if (dateRange.startDate && pausedDate < new Date(dateRange.startDate)) continue;
        if (dateRange.endDate && pausedDate > new Date(dateRange.endDate)) continue;
      }

      pausedTasks.push(pauseInfo);
    }

    // 如果需要包含手动暂停的任务
    if (includeManuallyPaused) {
      const allTasks = await this.taskManager.getAllTasks({ status: 'on_hold', projectId });
      
      for (const task of allTasks) {
        // 检查是否已在自动暂停列表中
        if (!this.pausedTasks.has(task.id)) {
          pausedTasks.push({
            taskId: task.id,
            taskTitle: task.title,
            pausedAt: task.custom_fields?.paused_at || task.updated_at,
            reason: 'manual',
            elapsedHours: task.custom_fields?.actual_hours || 0,
            estimatedHours: task.custom_fields?.estimated_hours || 0,
            overtimeHours: 0
          });
        }
      }
    }

    // 按暂停时间排序（最新的在前）
    pausedTasks.sort((a, b) => new Date(b.pausedAt) - new Date(a.pausedAt));

    return pausedTasks;
  }

  /**
   * 恢复暂停的任务
   * @param {string} taskId - 任务ID
   * @param {Object} options - 恢复选项
   */
  async resumePausedTask(taskId, options = {}) {
    const {
      adjustEstimate = false,
      newEstimatedHours = null,
      notes = ''
    } = options;

    try {
      const task = await this.taskManager.getTask(taskId);
      
      if (!task) {
        throw new Error(`任务 ${taskId} 不存在`);
      }

      if (task.status !== 'on_hold') {
        throw new Error(`任务 ${taskId} 不在暂停状态`);
      }

      const updates = {
        status: 'in_progress',
        'custom_fields.pause_reason': null,
        'custom_fields.resumed_at': new Date().toISOString()
      };

      // 如果需要调整预估工期
      if (adjustEstimate && newEstimatedHours !== null) {
        updates['custom_fields.estimated_hours'] = newEstimatedHours;
      }

      // 更新任务状态
      await this.taskManager.updateTask(taskId, updates, notes || '恢复任务执行');

      // 从暂停列表中移除
      if (this.pausedTasks.has(taskId)) {
        const pauseInfo = this.pausedTasks.get(taskId);
        this.pausedTasks.delete(taskId);
        
        // 发出恢复事件
        this.emit('taskResumed', {
          ...pauseInfo,
          resumedAt: new Date().toISOString(),
          adjustedEstimate: adjustEstimate ? newEstimatedHours : null
        });
      }

      // 重新启动计时器（如果需要）
      if (options.restartTimer) {
        await this.timerService.startTimer(taskId, `继续任务：${task.title}`);
      }

      console.log(`▶️ 任务 "${task.title}" 已恢复执行`);

      return task;
    } catch (error) {
      console.error(`❌ 恢复任务 ${taskId} 时出错:`, error);
      throw error;
    }
  }

  /**
   * 获取监控统计信息
   */
  getMonitoringStats() {
    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.checkIntervalMs,
      pausedTasksCount: this.pausedTasks.size,
      pausedTasks: Array.from(this.pausedTasks.values()).map(task => ({
        taskId: task.taskId,
        taskTitle: task.taskTitle,
        overtimeHours: task.overtimeHours,
        pausedAt: task.pausedAt
      }))
    };
  }

  /**
   * 清理暂停任务记录
   * @param {number} daysOld - 清理多少天前的记录
   */
  cleanupOldPausedTasks(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let removedCount = 0;
    for (const [taskId, pauseInfo] of this.pausedTasks) {
      if (new Date(pauseInfo.pausedAt) < cutoffDate) {
        this.pausedTasks.delete(taskId);
        removedCount++;
      }
    }

    console.log(`🗑️ 清理了 ${removedCount} 个旧的暂停任务记录`);
    return removedCount;
  }
}

module.exports = TaskTimerMonitor;
