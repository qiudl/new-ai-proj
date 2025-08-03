import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function searchAIGanttTasks() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('=== 搜索AI和甘特图相关的已完成任务 ===');
    console.log();
    
    // 获取所有任务
    const allTasksResult = await taskServer.listTasks(1);
    const allTasks = allTasksResult.tasks || [];
    
    console.log(`📊 项目中总任务数: ${allTasks.length}`);
    console.log();
    
    // 搜索关键词
    const keywords = [
      'ai', 'AI', '甘特图', 'gantt', 'Gantt', 
      '依赖', 'dependency', '分析', 'analysis',
      '关系', 'relation', '智能', 'smart',
      '自动', 'auto', '生成', 'generate'
    ];
    
    console.log('🔍 搜索关键词:', keywords.join(', '));
    console.log();
    
    // 搜索相关任务
    const relevantTasks = allTasks.filter(task => {
      const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
    
    console.log(`📋 找到 ${relevantTasks.length} 个相关任务:`);
    console.log();
    
    // 按状态分组显示
    const completedTasks = relevantTasks.filter(task => task.status === 'completed');
    const inProgressTasks = relevantTasks.filter(task => task.status === 'in_progress');
    const todoTasks = relevantTasks.filter(task => task.status === 'todo');
    
    if (completedTasks.length > 0) {
      console.log(`✅ 已完成的相关任务 (${completedTasks.length}个):`);
      completedTasks
        .sort((a, b) => b.id - a.id) // 按ID倒序，最新的在前
        .forEach(task => {
          const priority = task.custom_fields?.priority || 'medium';
          console.log(`   ✅ ID:${task.id} [${priority}] ${task.title}`);
        });
      console.log();
    }
    
    if (inProgressTasks.length > 0) {
      console.log(`🔄 进行中的相关任务 (${inProgressTasks.length}个):`);
      inProgressTasks.forEach(task => {
        const priority = task.custom_fields?.priority || 'medium';
        console.log(`   🔄 ID:${task.id} [${priority}] ${task.title}`);
      });
      console.log();
    }
    
    if (todoTasks.length > 0) {
      console.log(`📋 待办的相关任务 (${todoTasks.length}个):`);
      todoTasks.forEach(task => {
        const priority = task.custom_fields?.priority || 'medium';
        console.log(`   📋 ID:${task.id} [${priority}] ${task.title}`);
      });
      console.log();
    }
    
    // 特别关注甘特图和依赖关系相关的任务
    const ganttTasks = relevantTasks.filter(task => {
      const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
      return searchText.includes('甘特') || searchText.includes('gantt') || 
             searchText.includes('依赖') || searchText.includes('dependency');
    });
    
    if (ganttTasks.length > 0) {
      console.log('🎯 特别关注 - 甘特图/依赖关系相关任务:');
      ganttTasks.forEach(task => {
        const statusIcon = task.status === 'completed' ? '✅' : 
                          task.status === 'in_progress' ? '🔄' : '📋';
        const priority = task.custom_fields?.priority || 'medium';
        console.log(`   ${statusIcon} ID:${task.id} [${task.status}] [${priority}] ${task.title}`);
      });
      console.log();
      
      // 显示最相关的已完成任务详情
      const completedGanttTasks = ganttTasks.filter(task => task.status === 'completed');
      if (completedGanttTasks.length > 0) {
        console.log('📖 最相关的已完成任务详情:');
        const mostRelevant = completedGanttTasks.sort((a, b) => b.id - a.id)[0];
        return mostRelevant;
      }
    }
    
    // 如果没有找到甘特图相关的，返回最新的AI相关已完成任务
    if (completedTasks.length > 0) {
      console.log('📖 最新的AI相关已完成任务:');
      const latest = completedTasks.sort((a, b) => b.id - a.id)[0];
      return latest;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ 搜索失败:', error.message);
    return null;
  }
}

// 执行搜索并获取详细信息
searchAIGanttTasks().then(async (relevantTask) => {
  if (relevantTask) {
    console.log();
    console.log('🔍 获取任务详细描述...');
    console.log(`📋 任务 ${relevantTask.id}: ${relevantTask.title}`);
    
    if (relevantTask.description) {
      console.log();
      console.log('📝 任务描述:');
      console.log(relevantTask.description.substring(0, 1000) + (relevantTask.description.length > 1000 ? '...' : ''));
    }
    
    console.log();
    console.log('💡 这个任务可能就是你要找的AI扩展功能！');
  } else {
    console.log('❌ 没有找到相关的AI/甘特图任务');
  }
});