import { TaskMCPServer } from './task-mcp.js';

async function findGanttTasks() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔍 搜索甘特图相关任务...');
    
    // Search for tasks containing "甘特图" keywords
    const ganttSearchResult = await taskServer.findTaskByName('甘特图');
    
    if (ganttSearchResult.success) {
      console.log(`\n📋 找到 ${ganttSearchResult.total} 个甘特图相关任务:`);
      
      ganttSearchResult.tasks.forEach(task => {
        console.log(`\n📌 任务 ${task.id}: ${task.title}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   描述: ${task.description.substring(0, 100)}...`);
        console.log(`   项目ID: ${task.project_id}`);
        console.log(`   父任务ID: ${task.parent_id || '无'}`);
      });
      
      // Look specifically for tasks 300, 301, 302
      const targetTasks = ganttSearchResult.tasks.filter(task => {
        const title = task.title.toLowerCase();
        return title.includes('层级关系可视化') || 
               title.includes('交互式任务编辑') || 
               title.includes('项目全局甘特图');
      });
      
      console.log(`\n🎯 找到目标任务 (300-302):`);
      targetTasks.forEach(task => {
        console.log(`   任务 ${task.id}: ${task.title}`);
      });
      
      return targetTasks;
    } else {
      console.log('❌ 搜索失败:', ganttSearchResult.error);
      return [];
    }
  } catch (error) {
    console.error('❌ 搜索过程中出错:', error.message);
    return [];
  }
}

findGanttTasks();