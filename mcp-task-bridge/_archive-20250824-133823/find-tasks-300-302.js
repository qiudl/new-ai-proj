import { TaskMCPServer } from './task-mcp.js';

async function findTasks300302() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔍 搜索任务 300-302...');
    
    // Try to find tasks by ID directly
    const taskIds = [300, 301, 302];
    const foundTasks = [];
    
    for (const taskId of taskIds) {
      try {
        const task = await taskServer.findTaskById(taskId);
        if (task) {
          console.log(`\n✅ 找到任务 ${taskId}: ${task.title}`);
          console.log(`   状态: ${task.status}`);
          console.log(`   父任务ID: ${task.parent_id || '无'}`);
          foundTasks.push(task);
        }
      } catch (error) {
        console.log(`❌ 任务 ${taskId} 不存在:`, error.message);
      }
    }
    
    // Also search by keywords for subtasks
    console.log('\n🔍 搜索子任务关键词...');
    const keywords = ['层级关系可视化', '交互式任务编辑', '项目全局甘特图'];
    
    for (const keyword of keywords) {
      try {
        const searchResult = await taskServer.findTaskByName(keyword);
        if (searchResult.success && searchResult.tasks.length > 0) {
          console.log(`\n📋 关键词 "${keyword}" 找到 ${searchResult.tasks.length} 个任务:`);
          searchResult.tasks.forEach(task => {
            if (!foundTasks.find(t => t.id === task.id)) {
              console.log(`   任务 ${task.id}: ${task.title}`);
              foundTasks.push(task);
            }
          });
        }
      } catch (error) {
        console.log(`❌ 搜索关键词 "${keyword}" 失败:`, error.message);
      }
    }
    
    console.log(`\n📊 总计找到 ${foundTasks.length} 个相关任务`);
    return foundTasks;
    
  } catch (error) {
    console.error('❌ 搜索过程中出错:', error.message);
    return [];
  }
}

findTasks300302();