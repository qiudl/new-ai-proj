/**
 * 暂停任务查看API路由
 * 提供查看和管理暂停任务的接口
 */

const express = require('express');
const router = express.Router();

/**
 * 初始化路由
 * @param {TaskTimerMonitor} timerMonitor - 计时器监控服务实例
 * @param {TaskManager} taskManager - 任务管理器实例
 */
function initializePausedTasksRoutes(timerMonitor, taskManager) {
  
  /**
   * GET /api/paused-tasks
   * 获取所有暂停的任务列表
   */
  router.get('/paused-tasks', async (req, res) => {
    try {
      const {
        reason,
        projectId,
        startDate,
        endDate,
        includeManual = 'false'
      } = req.query;

      const filters = {
        reason: reason || null,
        projectId: projectId ? parseInt(projectId) : null,
        dateRange: (startDate || endDate) ? {
          startDate,
          endDate
        } : null,
        includeManuallyPaused: includeManual === 'true'
      };

      const pausedTasks = await timerMonitor.getPausedTasks(filters);

      res.json({
        success: true,
        data: pausedTasks,
        count: pausedTasks.length,
        filters: filters
      });
    } catch (error) {
      console.error('Error fetching paused tasks:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/paused-tasks/stats
   * 获取暂停任务的统计信息
   */
  router.get('/paused-tasks/stats', async (req, res) => {
    try {
      const stats = timerMonitor.getMonitoringStats();
      
      // 添加额外的统计信息
      const pausedTasks = await timerMonitor.getPausedTasks({ includeManuallyPaused: true });
      
      const enhancedStats = {
        ...stats,
        totalPausedTasks: pausedTasks.length,
        pausedByReason: {
          overtime: pausedTasks.filter(t => t.reason === 'overtime').length,
          manual: pausedTasks.filter(t => t.reason === 'manual').length
        },
        totalOvertimeHours: pausedTasks
          .filter(t => t.reason === 'overtime')
          .reduce((sum, t) => sum + (t.overtimeHours || 0), 0)
      };

      res.json({
        success: true,
        data: enhancedStats
      });
    } catch (error) {
      console.error('Error fetching paused tasks stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/paused-tasks/:taskId
   * 获取特定暂停任务的详细信息
   */
  router.get('/paused-tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      
      // 获取任务详情
      const task = await taskManager.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // 获取暂停信息
      const pausedTasks = await timerMonitor.getPausedTasks({ includeManuallyPaused: true });
      const pauseInfo = pausedTasks.find(pt => pt.taskId === taskId);

      if (!pauseInfo) {
        return res.status(404).json({
          success: false,
          error: 'Task is not paused'
        });
      }

      // 获取任务时间轴
      const timeline = await taskManager.getTaskTimeline(taskId, {
        eventTypes: ['auto_paused', 'updated', 'created']
      });

      res.json({
        success: true,
        data: {
          task: task,
          pauseInfo: pauseInfo,
          timeline: timeline
        }
      });
    } catch (error) {
      console.error('Error fetching paused task details:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/paused-tasks/:taskId/resume
   * 恢复暂停的任务
   */
  router.post('/paused-tasks/:taskId/resume', async (req, res) => {
    try {
      const { taskId } = req.params;
      const {
        adjustEstimate = false,
        newEstimatedHours = null,
        restartTimer = false,
        notes = ''
      } = req.body;

      const resumedTask = await timerMonitor.resumePausedTask(taskId, {
        adjustEstimate,
        newEstimatedHours,
        restartTimer,
        notes
      });

      res.json({
        success: true,
        message: `Task "${resumedTask.title}" has been resumed`,
        data: resumedTask
      });
    } catch (error) {
      console.error('Error resuming paused task:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/paused-tasks/cleanup
   * 清理旧的暂停任务记录
   */
  router.post('/paused-tasks/cleanup', async (req, res) => {
    try {
      const { daysOld = 30 } = req.body;
      
      const removedCount = timerMonitor.cleanupOldPausedTasks(daysOld);

      res.json({
        success: true,
        message: `Cleaned up ${removedCount} old paused task records`,
        removedCount: removedCount
      });
    } catch (error) {
      console.error('Error cleaning up paused tasks:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/monitoring/status
   * 获取监控服务状态
   */
  router.get('/monitoring/status', (req, res) => {
    try {
      const status = timerMonitor.getMonitoringStats();
      
      res.json({
        success: true,
        data: {
          isRunning: status.isMonitoring,
          checkInterval: status.checkInterval,
          checkIntervalSeconds: status.checkInterval / 1000,
          pausedTasksCount: status.pausedTasksCount
        }
      });
    } catch (error) {
      console.error('Error fetching monitoring status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/monitoring/start
   * 启动监控服务
   */
  router.post('/monitoring/start', (req, res) => {
    try {
      const { interval = 60000 } = req.body;
      
      timerMonitor.startMonitoring(interval);

      res.json({
        success: true,
        message: 'Monitoring service started',
        checkInterval: interval
      });
    } catch (error) {
      console.error('Error starting monitoring service:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/monitoring/stop
   * 停止监控服务
   */
  router.post('/monitoring/stop', (req, res) => {
    try {
      timerMonitor.stopMonitoring();

      res.json({
        success: true,
        message: 'Monitoring service stopped'
      });
    } catch (error) {
      console.error('Error stopping monitoring service:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

module.exports = initializePausedTasksRoutes;
