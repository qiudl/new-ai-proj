import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function findTask165Siblings() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('=== 查找任务165的兄弟任务 ===');
    console.log();
    
    // 1. 首先获取任务165的详细信息，特别是parent_id
    const task165 = await taskServer.findTaskById(165);
    console.log('📋 任务165信息:');
    console.log(`   ID: ${task165.id}`);
    console.log(`   标题: ${task165.title}`);
    console.log(`   状态: ${task165.status}`);
    console.log(`   父任务ID: ${task165.parent_id || '无'}`);
    console.log();
    
    // 2. 如果任务165有父任务，找到所有兄弟任务
    if (task165.parent_id) {
      console.log(`🔍 查找父任务 ${task165.parent_id} 下的所有子任务...`);
      
      // 获取所有任务，然后筛选出同一个父任务的子任务
      const allTasksResult = await taskServer.listTasks();
      const allTasks = allTasksResult.tasks || [];
      
      // 筛选出相同父任务的所有子任务（包括165本身）
      const siblingTasks = allTasks.filter(task => 
        task.parent_id === task165.parent_id
      );
      
      console.log(`📊 父任务 ${task165.parent_id} 下共有 ${siblingTasks.length} 个子任务:`);
      console.log();
      
      // 显示所有兄弟任务
      siblingTasks
        .sort((a, b) => a.id - b.id) // 按ID排序
        .forEach(task => {
          const isCurrent = task.id === 165 ? '👈 当前' : '';
          const statusIcon = task.status === 'completed' ? '✅' : 
                           task.status === 'in_progress' ? '🔄' : '📋';
          const priority = task.custom_fields?.priority || 'medium';
          
          console.log(`${statusIcon} ID:${task.id} [${task.status}] [${priority}] ${task.title} ${isCurrent}`);
        });
      
      console.log();
      
      // 3. 找出下一个应该执行的兄弟任务
      console.log('🎯 推荐下一个兄弟任务:');
      
      // 除了165外的其他兄弟任务
      const otherSiblings = siblingTasks.filter(task => task.id !== 165);
      
      // 优先选择in_progress状态的任务
      const inProgressSiblings = otherSiblings.filter(task => task.status === 'in_progress');
      if (inProgressSiblings.length > 0) {
        const nextTask = inProgressSiblings[0];
        console.log(`🔄 继续进行中的兄弟任务: ID:${nextTask.id} - ${nextTask.title}`);
        return nextTask;
      }
      
      // 然后选择todo状态的任务（按ID排序，选择最小的）
      const todoSiblings = otherSiblings.filter(task => task.status === 'todo');
      if (todoSiblings.length > 0) {
        const nextTask = todoSiblings.sort((a, b) => a.id - b.id)[0];
        console.log(`📋 开始下一个待办兄弟任务: ID:${nextTask.id} - ${nextTask.title}`);
        return nextTask;
      }
      
      console.log('✅ 所有兄弟任务都已完成');
      
    } else {
      console.log('⚠️  任务165没有父任务，这是一个顶级任务');
      console.log('📝 建议查找同项目下的其他顶级任务或创建新的相关任务');
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 运行函数
findTask165Siblings().then(nextTask => {
  if (nextTask) {
    console.log();
    console.log('🚀 下一步操作建议:');
    console.log(`   1. 读取任务${nextTask.id}的详细信息`);
    console.log(`   2. 分析任务要求和当前状态`);
    console.log(`   3. 开始执行任务${nextTask.id}`);
  }
});