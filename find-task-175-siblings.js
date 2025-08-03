import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function findTask175Siblings() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('=== 查询任务175的兄弟任务 ===');
    console.log();
    
    // 1. 获取任务175详情
    const task175 = await taskServer.findTaskById(175);
    console.log('📋 任务175详细信息:');
    console.log('   ID:', task175.id);
    console.log('   标题:', task175.title);
    console.log('   状态:', task175.status);
    console.log('   优先级:', task175.custom_fields?.priority || 'medium');
    console.log('   父任务ID:', task175.parent_id || '无');
    console.log();
    
    if (task175.parent_id) {
      // 2. 获取父任务信息
      console.log(`🔍 获取父任务 ${task175.parent_id} 的详情...`);
      const parentTask = await taskServer.findTaskById(task175.parent_id);
      console.log('📋 父任务详情:');
      console.log('   ID:', parentTask.id);
      console.log('   标题:', parentTask.title);
      console.log('   状态:', parentTask.status);
      console.log();
      
      // 3. 获取所有任务并筛选兄弟任务
      const allTasksResult = await taskServer.listTasks(1);
      const allTasks = allTasksResult.tasks || [];
      
      // 找到所有同父任务的子任务
      const siblings = allTasks.filter(task => task.parent_id === task175.parent_id);
      
      console.log(`📊 父任务 ${task175.parent_id} 下共有 ${siblings.length} 个子任务:`);
      siblings
        .sort((a, b) => a.id - b.id)
        .forEach(sibling => {
          const isCurrent = sibling.id === 175 ? ' 👈 当前任务' : '';
          const statusIcon = sibling.status === 'completed' ? '✅' : 
                           sibling.status === 'in_progress' ? '🔄' : '📋';
          const priority = sibling.custom_fields?.priority || 'medium';
          console.log(`   ${statusIcon} ID:${sibling.id} [${sibling.status}] [${priority}] ${sibling.title}${isCurrent}`);
        });
      
      console.log();
      
      // 4. 推荐下一个兄弟任务
      const otherSiblings = siblings.filter(task => task.id !== 175);
      console.log(`🎯 任务175的兄弟任务 (${otherSiblings.length}个):`);
      
      if (otherSiblings.length > 0) {
        otherSiblings.forEach(sibling => {
          const statusIcon = sibling.status === 'completed' ? '✅' : 
                           sibling.status === 'in_progress' ? '🔄' : '📋';
          const priority = sibling.custom_fields?.priority || 'medium';
          console.log(`   ${statusIcon} ID:${sibling.id} [${sibling.status}] [${priority}] ${sibling.title}`);
        });
        
        console.log();
        console.log('🚀 推荐下一个兄弟任务:');
        
        // 优先选择in_progress状态
        const inProgress = otherSiblings.filter(s => s.status === 'in_progress');
        if (inProgress.length > 0) {
          const next = inProgress[0];
          console.log(`🔄 继续进行中: ID:${next.id} - ${next.title}`);
          return next;
        } else {
          // 然后选择todo状态
          const todo = otherSiblings.filter(s => s.status === 'todo');
          if (todo.length > 0) {
            const next = todo.sort((a, b) => a.id - b.id)[0];
            console.log(`📋 开始待办: ID:${next.id} - ${next.title}`);
            return next;
          } else {
            console.log('✅ 所有兄弟任务都已完成');
          }
        }
      } else {
        console.log('⚠️  任务175是父任务下的唯一子任务');
      }
      
    } else {
      console.log('⚠️  任务175没有父任务，这是一个顶级任务');
      console.log('📝 建议查找同项目下的其他相关任务');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

// 执行查询
findTask175Siblings().then(nextTask => {
  if (nextTask) {
    console.log();
    console.log('📋 下一步操作建议:');
    console.log(`   1. 读取任务${nextTask.id}的详细信息`);
    console.log(`   2. 分析任务要求和当前状态`);  
    console.log(`   3. 开始执行任务${nextTask.id}`);
  }
});