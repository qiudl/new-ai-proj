import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function debugTask165Parent() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('=== 调试任务165的父子关系 ===');
    console.log();
    
    // 1. 获取任务165详情
    const task165 = await taskServer.findTaskById(165);
    console.log('📋 任务165详细信息:');
    console.log('   ID:', task165.id);
    console.log('   标题:', task165.title);
    console.log('   状态:', task165.status);
    console.log('   父任务ID:', task165.parent_id);
    console.log('   项目ID:', task165.project_id);
    console.log();
    
    // 2. 如果有父任务，获取父任务详情
    if (task165.parent_id) {
      console.log(`🔍 获取父任务 ${task165.parent_id} 的详情...`);
      try {
        const parentTask = await taskServer.findTaskById(task165.parent_id);
        console.log('📋 父任务详情:');
        console.log('   ID:', parentTask.id);
        console.log('   标题:', parentTask.title);
        console.log('   状态:', parentTask.status);
        console.log('   父任务ID:', parentTask.parent_id || '无');
        console.log();
      } catch (error) {
        console.log('❌ 无法获取父任务详情:', error.message);
      }
    }
    
    // 3. 获取所有任务并分析父子关系
    console.log('🔍 获取所有任务并分析父子关系...');
    const allTasksResult = await taskServer.listTasks();
    const allTasks = allTasksResult.tasks || [];
    
    console.log(`📊 项目中总任务数: ${allTasks.length}`);
    console.log();
    
    // 4. 查找所有有parent_id的任务
    const tasksWithParent = allTasks.filter(task => task.parent_id);
    console.log(`📋 有父任务的任务数: ${tasksWithParent.length}`);
    
    // 5. 按parent_id分组显示
    const parentGroups = {};
    tasksWithParent.forEach(task => {
      if (!parentGroups[task.parent_id]) {
        parentGroups[task.parent_id] = [];
      }
      parentGroups[task.parent_id].push(task);
    });
    
    console.log('📊 父子任务分组:');
    Object.keys(parentGroups).forEach(parentId => {
      console.log(`   父任务 ${parentId}:`);
      parentGroups[parentId].forEach(child => {
        const isCurrent165 = child.id === 165 ? ' 👈 当前' : '';
        console.log(`     - ID:${child.id} [${child.status}] ${child.title}${isCurrent165}`);
      });
    });
    
    console.log();
    
    // 6. 特别检查parent_id=45的所有任务
    const parent45Children = allTasks.filter(task => task.parent_id === 45);
    console.log(`🎯 父任务45的所有子任务 (${parent45Children.length}个):`);
    parent45Children.forEach(task => {
      const isCurrent = task.id === 165 ? ' 👈 当前' : '';
      const statusIcon = task.status === 'completed' ? '✅' : 
                       task.status === 'in_progress' ? '🔄' : '📋';
      console.log(`   ${statusIcon} ID:${task.id} [${task.status}] ${task.title}${isCurrent}`);
    });
    
    // 7. 如果有其他子任务，推荐下一个
    const otherChildren = parent45Children.filter(task => task.id !== 165);
    if (otherChildren.length > 0) {
      console.log();
      console.log('🚀 推荐下一个兄弟任务:');
      
      // 优先选择in_progress
      const inProgress = otherChildren.filter(task => task.status === 'in_progress');
      if (inProgress.length > 0) {
        const next = inProgress[0];
        console.log(`🔄 继续进行中: ID:${next.id} - ${next.title}`);
        return next;
      }
      
      // 然后选择todo
      const todo = otherChildren.filter(task => task.status === 'todo');
      if (todo.length > 0) {
        const next = todo.sort((a, b) => a.id - b.id)[0];
        console.log(`📋 开始待办: ID:${next.id} - ${next.title}`);
        return next;
      }
      
      console.log('✅ 其他兄弟任务都已完成');
    } else {
      console.log();
      console.log('⚠️  任务165是父任务45下的唯一子任务');
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    console.error(error.stack);
  }
}

// 执行调试
debugTask165Parent();