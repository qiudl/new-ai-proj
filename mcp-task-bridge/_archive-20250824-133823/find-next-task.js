import { TaskMCPServer } from './task-mcp.js';

async function findNextTask() {
  const taskServer = new TaskMCPServer();
  
  try {
    // 获取任务165信息
    const task165 = await taskServer.findTaskById(165);
    console.log('📋 任务165信息:');
    console.log('ID:', task165.id);
    console.log('标题:', task165.title);
    console.log('状态:', task165.status);
    console.log('父任务ID:', task165.parent_id);
    console.log('');
    
    // 获取父任务信息
    const parentTask = await taskServer.findTaskById(task165.parent_id);
    console.log('🎯 父任务45信息:');
    console.log('标题:', parentTask.title);
    console.log('状态:', parentTask.status);
    console.log('');
    
    // 获取所有同级任务
    const siblingTasks = await taskServer.getTasksByParentId(task165.parent_id);
    console.log('📝 任务45下的所有子任务:');
    
    siblingTasks.forEach(task => {
      const priority = task.custom_fields?.priority || 'medium';
      const status = task.status;
      const statusIcon = status === 'completed' ? '✅' : 
                        status === 'in_progress' ? '🔄' : 
                        status === 'todo' ? '📋' : '❓';
      console.log(`${statusIcon} ID:${task.id} [${status}] [${priority}] ${task.title}`);
    });
    
    console.log('');
    console.log('🔍 寻找下一个候选任务:');
    
    // 找出未完成的同级任务
    const pendingTasks = siblingTasks.filter(task => 
      task.status !== 'completed' && task.status !== 'cancelled' && task.id !== 165
    );
    
    if (pendingTasks.length > 0) {
      console.log('找到', pendingTasks.length, '个未完成的同级任务:');
      pendingTasks.forEach(task => {
        const priority = task.custom_fields?.priority || 'medium';
        console.log(`🎯 ID:${task.id} [${task.status}] [${priority}] ${task.title}`);
      });
      
      // 推荐下一个任务（按优先级和状态）
      const todoTasks = pendingTasks.filter(task => task.status === 'todo');
      const inProgressTasks = pendingTasks.filter(task => task.status === 'in_progress');
      
      console.log('');
      console.log('📋 推荐下一任务:');
      if (inProgressTasks.length > 0) {
        const nextTask = inProgressTasks[0];
        console.log(`🔄 继续进行中的任务: ID:${nextTask.id} - ${nextTask.title}`);
      } else if (todoTasks.length > 0) {
        const nextTask = todoTasks[0];
        console.log(`📋 开始新任务: ID:${nextTask.id} - ${nextTask.title}`);
      }
    } else {
      console.log('❌ 没有找到未完成的同级任务');
      console.log('✅ 父任务45的所有子任务可能都已完成');
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 运行函数
findNextTask();