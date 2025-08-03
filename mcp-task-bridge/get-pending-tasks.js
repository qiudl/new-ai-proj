import { TaskMCPServer } from './task-mcp.js';

async function getPendingTasks() {
  const taskServer = new TaskMCPServer();
  
  try {
    // 获取项目1的所有任务
    const allTasks = await taskServer.getTasksByProjectId(1);
    console.log('📊 项目1任务总数:', allTasks.length);
    console.log('');
    
    // 筛选未完成的任务
    const pendingTasks = allTasks.filter(task => 
      task.status === 'todo' || task.status === 'in_progress'
    );
    
    console.log('📋 未完成任务总数:', pendingTasks.length);
    console.log('');
    
    // 找出最新创建的未完成任务（按ID倒序，因为ID越大表示越晚创建）
    const recentTasks = pendingTasks
      .sort((a, b) => b.id - a.id)
      .slice(0, 10);
    
    console.log('🆕 最近的未完成任务 (按创建时间倒序):');
    recentTasks.forEach(task => {
      const status = task.status === 'in_progress' ? '🔄' : '📋';
      const priority = task.custom_fields?.priority || 'medium';
      console.log(`${status} ID:${task.id} [${status === '🔄' ? 'in_progress' : 'todo'}] [${priority}] ${task.title}`);
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
    
    // 推荐策略：优先选择进行中的任务，然后选择最新的todo任务
    if (inProgressTasks.length > 0) {
      // 除了任务165外的其他进行中任务
      const otherInProgress = inProgressTasks.filter(task => task.id !== 165);
      if (otherInProgress.length > 0) {
        const nextTask = otherInProgress[0];
        console.log(`🔄 继续进行中的任务: ID:${nextTask.id} - ${nextTask.title}`);
      } else {
        // 如果只有165在进行中，选择最新的todo任务
        const todoTasks = pendingTasks.filter(task => task.status === 'todo');
        if (todoTasks.length > 0) {
          const nextTask = todoTasks.sort((a, b) => b.id - a.id)[0];
          console.log(`📋 开始最新的todo任务: ID:${nextTask.id} - ${nextTask.title}`);
        }
      }
    } else {
      console.log('✅ 没有正在进行中的任务');
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 运行函数
getPendingTasks();