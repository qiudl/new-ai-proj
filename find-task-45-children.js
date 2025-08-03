import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function findTask45Children() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('=== 查找任务45的子任务 ===');
    console.log();
    
    // 1. 直接查找任务45
    console.log('1. 查找任务45...');
    const task45 = await taskServer.findTaskById(45);
    console.log('✅ 找到任务45:');
    console.log('   ID:', task45.id);
    console.log('   标题:', task45.title);
    console.log('   状态:', task45.status);
    console.log('   父任务ID:', task45.parent_id || '无');
    console.log();
    
    // 2. 查找所有任务
    console.log('2. 获取所有任务并查找子任务...');
    const allTasksResult = await taskServer.listTasks();
    const allTasks = allTasksResult.tasks || [];
    
    // 3. 筛选任务45的子任务
    const children45 = allTasks.filter(task => task.parent_id === 45);
    
    console.log(`📊 任务45的子任务数量: ${children45.length}`);
    console.log();
    
    if (children45.length > 0) {
      console.log('📋 任务45的所有子任务:');
      children45
        .sort((a, b) => a.id - b.id) // 按ID排序
        .forEach(child => {
          const isCurrent165 = child.id === 165 ? ' 👈 当前任务' : '';
          const statusIcon = child.status === 'completed' ? '✅' : 
                            child.status === 'in_progress' ? '🔄' : '📋';
          const priority = child.custom_fields?.priority || 'medium';
          console.log(`   ${statusIcon} ID:${child.id} [${child.status}] [${priority}] ${child.title}${isCurrent165}`);
        });
      
      console.log();
      
      // 4. 找到任务165的兄弟任务
      const siblings = children45.filter(task => task.id !== 165);
      console.log(`🎯 任务165的兄弟任务 (${siblings.length}个):`);
      
      if (siblings.length > 0) {
        siblings.forEach(sibling => {
          const statusIcon = sibling.status === 'completed' ? '✅' : 
                            sibling.status === 'in_progress' ? '🔄' : '📋';
          const priority = sibling.custom_fields?.priority || 'medium';
          console.log(`   ${statusIcon} ID:${sibling.id} [${sibling.status}] [${priority}] ${sibling.title}`);
        });
        
        console.log();
        
        // 5. 推荐下一个任务
        console.log('🚀 推荐下一个兄弟任务:');
        
        // 优先选择in_progress状态的兄弟任务
        const inProgressSiblings = siblings.filter(s => s.status === 'in_progress');
        if (inProgressSiblings.length > 0) {
          const nextTask = inProgressSiblings[0];
          console.log(`🔄 继续进行中的兄弟任务: ID:${nextTask.id} - ${nextTask.title}`);
          return nextTask;
        }
        
        // 然后选择todo状态的兄弟任务
        const todoSiblings = siblings.filter(s => s.status === 'todo');
        if (todoSiblings.length > 0) {
          const nextTask = todoSiblings.sort((a, b) => a.id - b.id)[0]; // 选择ID最小的
          console.log(`📋 开始下一个待办兄弟任务: ID:${nextTask.id} - ${nextTask.title}`);
          return nextTask;
        }
        
        console.log('✅ 所有兄弟任务都已完成');
      } else {
        console.log('⚠️  任务165是任务45下的唯一子任务');
      }
    } else {
      console.log('⚠️  任务45没有子任务（可能数据查询有问题）');
    }
    
  } catch (error) {
    console.error('❌ 查找失败:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
}

// 执行查找
findTask45Children().then(nextTask => {
  if (nextTask) {
    console.log();
    console.log('📋 下一步操作建议:');
    console.log(`   1. 读取任务${nextTask.id}的详细信息`);
    console.log(`   2. 分析任务要求和当前状态`);  
    console.log(`   3. 开始执行任务${nextTask.id}`);
  }
});