/**
 * 测试任务计时器监控功能
 */

const TaskManager = require('../services/TaskManager');
const TaskTimerMonitor = require('../services/TaskTimerMonitor');

// 模拟计时器服务
class MockTimerService {
  constructor() {
    this.timers = new Map();
  }

  async startTimer(taskId, description = '') {
    const timer = {
      taskId,
      startTime: new Date().toISOString(),
      elapsedTime: 0,
      description,
      isActive: true
    };
    this.timers.set(taskId, timer);
    console.log(`⏱️ 计时器已启动 - 任务ID: ${taskId}`);
    return timer;
  }

  async stopTimer(taskId) {
    const timer = this.timers.get(taskId);
    if (timer) {
      timer.isActive = false;
      timer.stoppedAt = new Date().toISOString();
      console.log(`⏹️ 计时器已停止 - 任务ID: ${taskId}`);
    }
    return timer;
  }

  async getActiveTimers() {
    return Array.from(this.timers.values()).filter(t => t.isActive);
  }

  // 模拟时间流逝
  simulateTimeElapse(taskId, hours) {
    const timer = this.timers.get(taskId);
    if (timer) {
      // 将开始时间往前推
      const startDate = new Date(timer.startTime);
      startDate.setHours(startDate.getHours() - hours);
      timer.startTime = startDate.toISOString();
      timer.elapsedTime = hours * 60 * 60 * 1000; // 转换为毫秒
      console.log(`⏭️ 模拟时间流逝 ${hours} 小时 - 任务ID: ${taskId}`);
    }
  }
}

async function runTests() {
  console.log('========================================');
  console.log('📋 开始测试任务计时器监控功能');
  console.log('========================================\n');

  // 初始化服务
  const taskManager = new TaskManager();
  const timerService = new MockTimerService();
  const timerMonitor = new TaskTimerMonitor(taskManager, timerService);

  // 监听事件
  timerMonitor.on('warning', (info) => {
    console.log(`⚠️ 警告：${info.message}`);
    console.log(`   剩余时间：${info.remainingMinutes} 分钟`);
  });

  timerMonitor.on('taskPaused', (info) => {
    console.log(`📊 任务自动暂停事件：`);
    console.log(`   任务：${info.taskTitle}`);
    console.log(`   超时：${info.overtimeHours.toFixed(2)} 小时`);
  });

  timerMonitor.on('error', (error) => {
    console.error('❌ 监控错误：', error.message);
  });

  try {
    // 测试1：创建测试任务
    console.log('\n📝 测试1：创建测试任务');
    console.log('----------------------------------------');
    
    const task1 = await taskManager.createTask({
      title: '开发用户认证模块',
      description: '实现用户登录、注册和密码重置功能',
      custom_fields: {
        priority: 'high',
        estimated_hours: 2 // 预估2小时完成
      }
    });
    console.log(`✅ 创建任务：${task1.title} (ID: ${task1.id})`);
    console.log(`   预估工期：${task1.custom_fields.estimated_hours} 小时`);

    const task2 = await taskManager.createTask({
      title: '编写API文档',
      description: '为所有API接口编写详细文档',
      custom_fields: {
        priority: 'medium',
        estimated_hours: 1 // 预估1小时完成
      }
    });
    console.log(`✅ 创建任务：${task2.title} (ID: ${task2.id})`);
    console.log(`   预估工期：${task2.custom_fields.estimated_hours} 小时`);

    const task3 = await taskManager.createTask({
      title: '代码审查',
      description: '审查团队提交的代码',
      custom_fields: {
        priority: 'low'
        // 没有设置预估工期
      }
    });
    console.log(`✅ 创建任务：${task3.title} (ID: ${task3.id})`);
    console.log(`   预估工期：未设置`);

    // 测试2：启动计时器
    console.log('\n⏱️ 测试2：启动任务计时器');
    console.log('----------------------------------------');
    
    await timerService.startTimer(task1.id, task1.title);
    await timerService.startTimer(task2.id, task2.title);
    await timerService.startTimer(task3.id, task3.title);

    // 测试3：启动监控服务
    console.log('\n🚀 测试3：启动监控服务');
    console.log('----------------------------------------');
    
    timerMonitor.startMonitoring(5000); // 每5秒检查一次（测试用）

    // 测试4：模拟时间流逝 - 任务1超时
    console.log('\n⏭️ 测试4：模拟任务1超时（2.5小时）');
    console.log('----------------------------------------');
    
    timerService.simulateTimeElapse(task1.id, 2.5);
    
    // 手动触发检查
    await timerMonitor.checkActiveTimers();

    // 测试5：模拟时间流逝 - 任务2接近超时
    console.log('\n⏭️ 测试5：模拟任务2接近超时（0.9小时）');
    console.log('----------------------------------------');
    
    timerService.simulateTimeElapse(task2.id, 0.9);
    
    // 手动触发检查
    await timerMonitor.checkActiveTimers();

    // 测试6：获取暂停任务列表
    console.log('\n📋 测试6：获取暂停任务列表');
    console.log('----------------------------------------');
    
    const pausedTasks = await timerMonitor.getPausedTasks({
      includeManuallyPaused: false
    });
    
    console.log(`找到 ${pausedTasks.length} 个自动暂停的任务：`);
    pausedTasks.forEach(pt => {
      console.log(`  - ${pt.taskTitle}`);
      console.log(`    超时：${pt.overtimeHours.toFixed(2)} 小时`);
      console.log(`    暂停时间：${pt.pausedAt}`);
    });

    // 测试7：获取监控统计
    console.log('\n📊 测试7：获取监控统计');
    console.log('----------------------------------------');
    
    const stats = timerMonitor.getMonitoringStats();
    console.log('监控服务统计：');
    console.log(`  运行状态：${stats.isMonitoring ? '运行中' : '已停止'}`);
    console.log(`  检查间隔：${stats.checkInterval / 1000} 秒`);
    console.log(`  暂停任务数：${stats.pausedTasksCount}`);

    // 测试8：恢复暂停的任务
    console.log('\n▶️ 测试8：恢复暂停的任务');
    console.log('----------------------------------------');
    
    if (pausedTasks.length > 0) {
      const taskToResume = pausedTasks[0];
      const resumedTask = await timerMonitor.resumePausedTask(taskToResume.taskId, {
        adjustEstimate: true,
        newEstimatedHours: 4, // 调整预估为4小时
        restartTimer: true,
        notes: '调整预估工期后恢复任务'
      });
      
      console.log(`✅ 任务 "${resumedTask.title}" 已恢复`);
      console.log(`   新预估工期：4 小时`);
    }

    // 测试9：手动暂停任务
    console.log('\n⏸️ 测试9：手动暂停任务');
    console.log('----------------------------------------');
    
    await taskManager.updateTask(task2.id, {
      status: 'on_hold',
      'custom_fields.pause_reason': '等待需求确认'
    }, '手动暂停任务');
    console.log(`✅ 任务 "${task2.title}" 已手动暂停`);

    // 测试10：获取包含手动暂停的任务列表
    console.log('\n📋 测试10：获取所有暂停任务（包括手动）');
    console.log('----------------------------------------');
    
    const allPausedTasks = await timerMonitor.getPausedTasks({
      includeManuallyPaused: true
    });
    
    console.log(`找到 ${allPausedTasks.length} 个暂停的任务：`);
    allPausedTasks.forEach(pt => {
      console.log(`  - ${pt.taskTitle} [${pt.reason === 'overtime' ? '自动' : '手动'}]`);
    });

    // 测试11：清理旧记录
    console.log('\n🗑️ 测试11：清理旧的暂停记录');
    console.log('----------------------------------------');
    
    const removedCount = timerMonitor.cleanupOldPausedTasks(0); // 清理今天之前的记录
    console.log(`清理了 ${removedCount} 个旧记录`);

    // 停止监控服务
    console.log('\n🛑 停止监控服务');
    console.log('----------------------------------------');
    timerMonitor.stopMonitoring();

  } catch (error) {
    console.error('\n❌ 测试过程中出错：', error);
  }

  console.log('\n========================================');
  console.log('✅ 测试完成');
  console.log('========================================');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
