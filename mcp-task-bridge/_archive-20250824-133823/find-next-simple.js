import { TaskMCPServer } from './task-mcp.js';

async function findNextTask() {
  const taskServer = new TaskMCPServer();
  
  try {
    // 获取所有任务
    const result = await taskServer.listTasks();
    const allTasks = result.tasks || [];
    console.log('📊 任务总数:', result.total || allTasks.length);
    console.log('');
    
    // 筛选未完成的任务
    const pendingTasks = allTasks.filter(task => 
      task.status === 'todo' || task.status === 'in_progress'
    );
    
    console.log('📋 未完成任务总数:', pendingTasks.length);
    console.log('');
    
    // 显示最近的未完成任务（按ID倒序）
    const recentTasks = pendingTasks
      .sort((a, b) => b.id - a.id)
      .slice(0, 8);
    
    console.log('🆕 最近的未完成任务:');
    recentTasks.forEach(task => {
      const status = task.status === 'in_progress' ? '🔄' : '📋';
      const priority = task.custom_fields?.priority || 'medium';
      console.log(`${status} ID:${task.id} [${task.status}] [${priority}] ${task.title}`);
    });
    
    console.log('');
    
    // 查找正在进行中的任务
    const inProgressTasks = pendingTasks.filter(task => task.status === 'in_progress');
    console.log('🔄 正在进行中的任务 (' + inProgressTasks.length + '个):');
    inProgressTasks.forEach(task => {
      const priority = task.custom_fields?.priority || 'medium';
      console.log(`🔄 ID:${task.id} [${priority}] ${task.title}`);
    });
    
    console.log('');
    console.log('🎯 推荐下一个任务:');
    
    // 除了任务165外的其他进行中任务
    const otherInProgress = inProgressTasks.filter(task => task.id !== 165);
    if (otherInProgress.length > 0) {
      const nextTask = otherInProgress[0];
      console.log('🔄 继续进行中的任务: ID:' + nextTask.id + ' - ' + nextTask.title);
    } else {
      // 选择最新的todo任务
      const todoTasks = pendingTasks.filter(task => task.status === 'todo');
      if (todoTasks.length > 0) {
        const nextTask = todoTasks.sort((a, b) => b.id - a.id)[0];
        console.log('📋 开始最新的todo任务: ID:' + nextTask.id + ' - ' + nextTask.title);
      } else {
        console.log('✅ 没有找到待执行任务');
      }
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 运行函数
findNextTask();