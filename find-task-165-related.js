import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function findTask165RelatedTasks() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('=== 查找任务165的相关后续任务 ===');
    console.log();
    
    // 1. 获取任务165信息
    const task165 = await taskServer.findTaskById(165);
    console.log('📋 任务165信息:');
    console.log(`   ID: ${task165.id}`);
    console.log(`   标题: ${task165.title}`);
    console.log(`   状态: ${task165.status}`);
    console.log(`   优先级: ${task165.custom_fields?.priority || 'medium'}`);
    console.log(`   父任务ID: ${task165.parent_id || '无'}`);
    console.log();
    
    // 2. 获取所有任务
    const allTasksResult = await taskServer.listTasks();
    const allTasks = allTasksResult.tasks || [];
    
    // 3. 由于parent_id无效，使用其他策略查找相关任务
    console.log('🔍 由于父子关系无效，使用以下策略查找相关任务:');
    console.log();
    
    // 策略1: 查找同项目下的其他未完成任务
    const pendingTasks = allTasks.filter(task => 
      task.id !== 165 && 
      (task.status === 'todo' || task.status === 'in_progress')
    );
    
    console.log(`📊 项目中其他未完成任务 (${pendingTasks.length}个):`);
    
    // 按优先级和状态排序
    const sortedTasks = pendingTasks.sort((a, b) => {
      // 优先级排序 (high > medium > low)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.custom_fields?.priority || 'medium'];
      const bPriority = priorityOrder[b.custom_fields?.priority || 'medium'];
      
      // 状态排序 (in_progress > todo)
      const statusOrder = { in_progress: 2, todo: 1 };
      const aStatus = statusOrder[a.status];
      const bStatus = statusOrder[b.status];
      
      // 先按状态，再按优先级，最后按ID
      if (aStatus !== bStatus) return bStatus - aStatus;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return a.id - b.id;
    });
    
    // 显示前10个相关任务
    const topTasks = sortedTasks.slice(0, 10);
    topTasks.forEach((task, index) => {
      const statusIcon = task.status === 'in_progress' ? '🔄' : '📋';
      const priority = task.custom_fields?.priority || 'medium';
      const rank = index === 0 ? '👑' : `${index + 1}.`;
      
      console.log(`   ${rank} ${statusIcon} ID:${task.id} [${task.status}] [${priority}] ${task.title}`);
    });
    
    console.log();
    
    // 4. 推荐下一个任务
    if (sortedTasks.length > 0) {
      const nextTask = sortedTasks[0];
      console.log('🎯 推荐下一个任务:');
      console.log(`   🚀 ID:${nextTask.id} - ${nextTask.title}`);
      console.log(`   📊 状态: ${nextTask.status}`);
      console.log(`   🔥 优先级: ${nextTask.custom_fields?.priority || 'medium'}`);
      console.log();
      
      console.log('💡 推荐理由:');
      if (nextTask.status === 'in_progress') {
        console.log('   - 任务已在进行中，应该优先完成');
      }
      if (nextTask.custom_fields?.priority === 'high') {
        console.log('   - 高优先级任务，需要优先处理');
      }
      console.log(`   - 任务ID ${nextTask.id} 相对较新，可能与任务165相关`);
      
      return nextTask;
    } else {
      console.log('✅ 项目中没有其他未完成任务');
      return null;
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    return null;
  }
}

// 执行查找并提供下一步建议
findTask165RelatedTasks().then(nextTask => {
  if (nextTask) {
    console.log();
    console.log('📋 下一步操作:');
    console.log(`   1. 使用MCP读取任务${nextTask.id}详情: taskServer.findTaskById(${nextTask.id})`);
    console.log(`   2. 分析任务要求和实现计划`);
    console.log(`   3. 开始执行任务${nextTask.id}`);
    console.log();
    console.log('🔧 MCP命令示例:');
    console.log(`   const task = await taskServer.findTaskById(${nextTask.id});`);
    console.log(`   console.log(task.title, task.description);`);
  }
});